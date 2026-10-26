/**
 * Improvement Engine
 * Generates 3 to 5 honest, actionable suggestions based on actual missing skills and evidentiary gaps.
 * Strictly adheres to ethical guidelines: NEVER suggests fabricating skills or credentials.
 */

export function generateImprovementSuggestions({
  missingRequiredSkills = [],
  missingPreferredSkills = [],
  matchedRequiredSkills = [],
  parsedResume,
  jdAnalysis,
}) {
  const suggestions = [];
  const importantMissingQualifications = [];

  // 1. Missing Required Skills (Highest Priority)
  if (missingRequiredSkills.length > 0) {
    const topMissing = missingRequiredSkills.slice(0, 3).map((s) => s.requirement);
    importantMissingQualifications.push(
      ...missingRequiredSkills.slice(0, 4).map((s) => `Required skill missing: ${s.requirement}`)
    );

    suggestions.push({
      type: 'missing_skills',
      title: 'Address Core Technical Requirements',
      description: `Target role strongly requires ${topMissing.join(', ')}. If you have used these technologies in coursework or projects, add verifiable bullet points detailing your implementation. If new to you, consider building a project demonstrating these tools.`,
      priority: 'High',
    });
  }

  // 2. Skills mentioned only in list but not demonstrated
  const listedOnly = matchedRequiredSkills.filter(
    (s) => s.matched && s.section === 'skills'
  );
  if (listedOnly.length > 0) {
    const names = listedOnly.slice(0, 3).map((s) => s.canonicalName);
    suggestions.push({
      type: 'demonstrate_skills',
      title: 'Back Listed Skills with Project Evidence',
      description: `Skills such as ${names.join(', ')} appear in your skills list but lack corresponding project or work experience bullet points. Demonstrating how you applied them with measurable outcomes increases recruiter confidence.`,
      priority: 'Medium',
    });
  }

  // 3. Experience / Project alignment gaps
  const minExp = jdAnalysis?.minExperienceYears || 0;
  if (minExp > 2 && (!parsedResume.sections.experienceText || parsedResume.sections.experienceText.length < 100)) {
    importantMissingQualifications.push(`Role requires ${minExp}+ years experience, but few professional roles are listed.`);
    suggestions.push({
      type: 'experience_gap',
      title: 'Highlight Professional Scope & Ownership',
      description: `This role targets candidates with ${minExp}+ years of practical experience. Focus bullet points on system architecture, production deployments, and team collaboration to showcase senior-level ownership.`,
      priority: 'High',
    });
  }

  // 4. Quantifiable Impact & Google XYZ Formula
  const hasMetrics = /%\s*|\b\d+\s*(?:ms|sec|users|clients|revenue|k)\b/i.test(
    parsedResume.sections.experienceText + ' ' + parsedResume.sections.projectsText
  );
  if (!hasMetrics) {
    suggestions.push({
      type: 'quantify_impact',
      title: 'Quantify Achievements with Data Points',
      description: `Strengthen bullet points by adding specific business or technical metrics (e.g. "Reduced API response latency by 35%" or "Served 5,000+ active users").`,
      priority: 'Medium',
    });
  }

  // 5. Preferred Skills Enhancement
  if (missingPreferredSkills.length > 0 && suggestions.length < 5) {
    const topPref = missingPreferredSkills.slice(0, 2).map((s) => s.requirement);
    suggestions.push({
      type: 'preferred_skills',
      title: 'Incorporate Bonus / Nice-to-Have Technologies',
      description: `The job description highlights ${topPref.join(' & ')} as preferred qualifications. If you have adjacent experience, highlight transferable concepts in your summary.`,
      priority: 'Low',
    });
  }

  // Fallback generic suggestion if needed to ensure 3-5 suggestions
  if (suggestions.length < 3) {
    suggestions.push({
      type: 'tailoring',
      title: 'Tailor Summary to Target Position',
      description: `Include a 2-3 sentence professional summary at the top of your resume explicitly targeting the ${jdAnalysis?.jobTitle || 'software'} role to capture recruiter attention during initial 6-second scans.`,
      priority: 'Low',
    });
  }

  return {
    suggestions: suggestions.slice(0, 5),
    importantMissingQualifications,
  };
}
