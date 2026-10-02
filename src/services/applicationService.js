import { supabase } from '../lib/Supabase';

/**
 * Validates whether a string is a valid YYYY-MM-DD date.
 */
function isValidDateString(str) {
  if (!str || typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
}

/**
 * Validates whether a string is a valid UUID.
 */
function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Fetches real applications from Supabase database for the authenticated user.
 * Returns { data: Array, error: string | null }
 */
export async function fetchApplicationsFromSupabase() {
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionErr) {
      return { data: [], error: `Authentication session error: ${sessionErr.message}` };
    }

    if (!user || !isValidUUID(user.id)) {
      return { data: [], error: 'User is not logged in. Please sign in to access your saved applications.' };
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        application_requirements (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase DB Fetch Error]:', error);
      return { data: [], error: error.message };
    }

    const formattedApps = (data || []).map(formatSupabaseAppRecord);
    return { data: formattedApps, error: null };
  } catch (err) {
    console.error('[Supabase DB Fetch Exception]:', err);
    return { data: [], error: err.message || 'Failed to fetch applications from database.' };
  }
}

/**
 * Atomic Save Flow into Supabase PostgreSQL tables:
 * 1. INSERT into public.applications -> returns insertedApp.id
 * 2. INSERT into public.application_requirements using insertedApp.id
 */
export async function saveApplicationToSupabase(applicationData, userIdParam) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const authUser = session?.user;
  const activeUserId = authUser?.id || userIdParam;

  if (!activeUserId || !isValidUUID(activeUserId)) {
    const authErr = 'User session not found. Please log in to save applications to your account.';
    console.error('❌', authErr);
    throw new Error(authErr);
  }

  // Format & Sanitize Enums & Data Types to strictly match schema_applications.sql
  let dbStatus = applicationData.status || (applicationData.alreadyApplied ? 'Applied' : 'Saved');
  if (dbStatus === 'Interview') dbStatus = 'Interviewing';
  const validStatuses = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'];
  if (!validStatuses.includes(dbStatus)) dbStatus = 'Saved';

  const validJobTypes = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote', 'Hybrid'];
  const dbJobType = validJobTypes.includes(applicationData.jobType) ? applicationData.jobType : 'Full-time';

  const dbSource = applicationData.source === 'auto' ? 'auto' : 'manual';

  const dbDeadline = isValidDateString(applicationData.applicationDeadline)
    ? applicationData.applicationDeadline.trim()
    : null;

  const dbAppliedDate = isValidDateString(applicationData.appliedDate)
    ? applicationData.appliedDate.trim()
    : new Date().toISOString().split('T')[0];

  // STEP 1: INSERT INTO public.applications
  const appPayload = {
    user_id: activeUserId,
    company: applicationData.company.trim(),
    role: applicationData.role.trim(),
    location: applicationData.location ? applicationData.location.trim() : null,
    job_type: dbJobType,
    application_url: applicationData.applicationUrl ? applicationData.applicationUrl.trim() : null,
    application_deadline: dbDeadline,
    salary: applicationData.salary ? applicationData.salary.trim() : null,
    already_applied: Boolean(applicationData.alreadyApplied),
    status: dbStatus,
    source: dbSource,
    resume_used: applicationData.resumeUsed ? applicationData.resumeUsed.trim() : null,
    applied_date: dbAppliedDate,
    raw_jd: applicationData.rawJd ? applicationData.rawJd.trim() : null,
  };

  console.log('🚀 [SUPABASE SAVE STEP 1] Executing INSERT into public.applications');

  const { data: insertedApp, error: appError } = await supabase
    .from('applications')
    .insert([appPayload])
    .select('*')
    .single();

  if (appError) {
    console.error('❌ [SUPABASE SAVE STEP 1 FAILED] public.applications INSERT Error:', appError);
    throw new Error(`public.applications INSERT failed: ${appError.message}`);
  }

  if (!insertedApp || !insertedApp.id) {
    throw new Error('public.applications INSERT did not return a valid record ID.');
  }

  console.log('✅ [SUPABASE SAVE STEP 1 SUCCESS] public.applications record created! ID:', insertedApp.id);

  // STEP 2: INSERT INTO public.application_requirements using insertedApp.id
  const reqPayload = {
    application_id: insertedApp.id,
    required_skills: Array.isArray(applicationData.requiredSkills) ? applicationData.requiredSkills : [],
    preferred_skills: Array.isArray(applicationData.preferredSkills) ? applicationData.preferredSkills : [],
    experience_requirement: applicationData.experienceRequirement || null,
    education_requirement: applicationData.educationRequirement || null,
    keywords: Array.isArray(applicationData.keywords) ? applicationData.keywords : [],
    responsibilities: Array.isArray(applicationData.responsibilities) ? applicationData.responsibilities : [],
    qualifications: Array.isArray(applicationData.qualifications) ? applicationData.qualifications : [],
  };

  console.log('🚀 [SUPABASE SAVE STEP 2] Executing INSERT into public.application_requirements');

  const { data: insertedReq, error: reqError } = await supabase
    .from('application_requirements')
    .insert([reqPayload])
    .select('*')
    .single();

  if (reqError) {
    console.error('❌ [SUPABASE SAVE STEP 2 FAILED] public.application_requirements INSERT Error:', reqError);
    await supabase.from('applications').delete().eq('id', insertedApp.id);
    throw new Error(`public.application_requirements INSERT failed: ${reqError.message}`);
  }

  console.log('✅ [SUPABASE SAVE STEP 2 SUCCESS] Both tables saved successfully!');

  return formatSupabaseAppRecord({
    ...insertedApp,
    application_requirements: [insertedReq],
  });
}

/**
 * Updates application status in public.applications.
 */
export async function updateApplicationStatusInSupabase(appId, newStatus) {
  let dbStatus = newStatus;
  if (dbStatus === 'Interview') dbStatus = 'Interviewing';

  if (!isValidUUID(appId)) return;

  try {
    const { error } = await supabase
      .from('applications')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', appId);

    if (error) {
      console.error('[Supabase Status Update Error]:', error.message);
    }
  } catch (e) {
    console.error('[Supabase Status Update Exception]:', e);
  }
}

/**
 * Formats a raw Supabase database row into UI format.
 */
function formatSupabaseAppRecord(row) {
  let statusUi = row.status || 'Saved';
  if (statusUi === 'Interviewing') statusUi = 'Interview';

  const reqs = Array.isArray(row.application_requirements)
    ? row.application_requirements[0]
    : row.application_requirements || {};

  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location || 'Remote',
    status: statusUi,
    salary: row.salary || 'Not specified',
    resumeUsed: row.resume_used || 'Standard_Resume.pdf',
    appliedDate: row.applied_date || new Date().toISOString().split('T')[0],
    source: row.source === 'auto' ? 'Email-Assisted' : 'Manual',
    notes: row.raw_jd ? 'Extracted via AI from job description' : '',
    rawJd: row.raw_jd || '',
    requiredSkills: reqs.required_skills || [],
    preferredSkills: reqs.preferred_skills || [],
    experienceRequirement: reqs.experience_requirement || '',
    educationRequirement: reqs.education_requirement || '',
    keywords: reqs.keywords || [],
    responsibilities: reqs.responsibilities || [],
    qualifications: reqs.qualifications || [],
    created_at: row.created_at,
  };
}
