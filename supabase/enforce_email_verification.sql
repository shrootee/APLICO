-- ====================================================================
-- Aplico Email Verification Enforcement Migration
-- Run this script in the Supabase SQL Editor
-- ====================================================================

-- 1. Helper function: Checks if the currently authenticated user has verified their email
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email_confirmed_at IS NOT NULL
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_email_verified() TO anon, authenticated;

-- 2. Update RLS policies for Applications table to require email verification
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
CREATE POLICY "Users can view their own applications"
    ON public.applications FOR SELECT
    USING (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
CREATE POLICY "Users can insert their own applications"
    ON public.applications FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
CREATE POLICY "Users can update their own applications"
    ON public.applications FOR UPDATE
    USING (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;
CREATE POLICY "Users can delete their own applications"
    ON public.applications FOR DELETE
    USING (auth.uid() = user_id AND public.is_email_verified());

-- 3. Update RLS policies for Application Requirements table
DROP POLICY IF EXISTS "Users can view their application requirements" ON public.application_requirements;
CREATE POLICY "Users can view their application requirements"
    ON public.application_requirements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.id = application_requirements.application_id
            AND applications.user_id = auth.uid()
            AND public.is_email_verified()
        )
    );

DROP POLICY IF EXISTS "Users can insert their application requirements" ON public.application_requirements;
CREATE POLICY "Users can insert their application requirements"
    ON public.application_requirements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.id = application_requirements.application_id
            AND applications.user_id = auth.uid()
            AND public.is_email_verified()
        )
    );

DROP POLICY IF EXISTS "Users can update their application requirements" ON public.application_requirements;
CREATE POLICY "Users can update their application requirements"
    ON public.application_requirements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.id = application_requirements.application_id
            AND applications.user_id = auth.uid()
            AND public.is_email_verified()
        )
    );

DROP POLICY IF EXISTS "Users can delete their application requirements" ON public.application_requirements;
CREATE POLICY "Users can delete their application requirements"
    ON public.application_requirements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.id = application_requirements.application_id
            AND applications.user_id = auth.uid()
            AND public.is_email_verified()
        )
    );

-- 4. Update RLS policies for Profile table
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profile;
CREATE POLICY "Users can view own profile"
    ON public.profile FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile if verified" ON public.profile;
CREATE POLICY "Users can update own profile if verified"
    ON public.profile FOR UPDATE
    USING (auth.uid() = id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profile;
CREATE POLICY "Users can insert own profile"
    ON public.profile FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Storage policies for application_resumes bucket
DROP POLICY IF EXISTS "Users can upload application resumes" ON storage.objects;
CREATE POLICY "Users can upload application resumes"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'application_resumes' AND auth.uid() = owner AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can view own application resumes" ON storage.objects;
CREATE POLICY "Users can view own application resumes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'application_resumes' AND auth.uid() = owner AND public.is_email_verified());
