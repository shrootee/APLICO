-- ====================================================================
-- Aplico Application Tracker Database Schema
-- Paste this script into your Supabase SQL Editor
-- ====================================================================

-- 1. Create Custom Enum Types
DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM ('Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.job_type AS ENUM ('Full-time', 'Part-time', 'Internship', 'Contract', 'Remote', 'Hybrid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tracking_source AS ENUM ('manual', 'auto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT,
    job_type public.job_type DEFAULT 'Full-time',
    application_url TEXT,
    application_deadline DATE,
    salary TEXT,
    already_applied BOOLEAN DEFAULT false,
    status public.application_status DEFAULT 'Saved',
    source public.tracking_source DEFAULT 'manual',
    resume_used TEXT,
    applied_date DATE DEFAULT CURRENT_DATE,
    raw_jd TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Application Requirements Table (Normalized Detailed Extraction Data)
CREATE TABLE IF NOT EXISTS public.application_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE UNIQUE,
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    experience_requirement TEXT,
    education_requirement TEXT,
    keywords TEXT[] DEFAULT '{}',
    responsibilities TEXT[] DEFAULT '{}',
    qualifications TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_application_requirements_app_id ON public.application_requirements(application_id);

-- 5. Grant Base Table Permissions to Supabase API Roles (Required for PostgREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.applications TO anon, authenticated;
GRANT ALL ON TABLE public.application_requirements TO anon, authenticated;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_requirements ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Applications Table
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
CREATE POLICY "Users can view their own applications"
    ON public.applications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
CREATE POLICY "Users can insert their own applications"
    ON public.applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
CREATE POLICY "Users can update their own applications"
    ON public.applications FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;
CREATE POLICY "Users can delete their own applications"
    ON public.applications FOR DELETE
    USING (auth.uid() = user_id);

-- 8. RLS Policies for Application Requirements Table
DROP POLICY IF EXISTS "Users can view their application requirements" ON public.application_requirements;
CREATE POLICY "Users can view their application requirements"
    ON public.application_requirements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.applications
            WHERE applications.id = application_requirements.application_id
            AND applications.user_id = auth.uid()
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
        )
    );

-- 9. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('application_resumes', 'application_resumes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload application resumes" ON storage.objects;
CREATE POLICY "Users can upload application resumes"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'application_resumes' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can view own application resumes" ON storage.objects;
CREATE POLICY "Users can view own application resumes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'application_resumes' AND auth.uid() = owner);
