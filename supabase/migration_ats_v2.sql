-- ====================================================================
-- Aplico ATS v2 Additive Database Migration
-- Safe additive schema changes for resume_analyses
-- ====================================================================

-- 1. Ensure resume_analyses table exists with standard base columns
CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id TEXT NOT NULL,
    resume_name TEXT NOT NULL,
    target_role TEXT,
    ats_score INTEGER DEFAULT 0,
    grade TEXT DEFAULT 'N/A',
    cgpa TEXT DEFAULT 'N/A',
    hiring_probability TEXT DEFAULT 'N/A',
    report_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_resume UNIQUE (user_id, resume_id)
);

-- 2. Additive columns for ATS v2 (never drops or modifies existing columns)
ALTER TABLE public.resume_analyses 
  ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v2',
  ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'High',
  ADD COLUMN IF NOT EXISTS jd_hash TEXT,
  ADD COLUMN IF NOT EXISTS jd_title TEXT;

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON public.resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON public.resume_analyses(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_engine ON public.resume_analyses(engine_version);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can view their own resume analyses"
    ON public.resume_analyses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can insert their own resume analyses"
    ON public.resume_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can update their own resume analyses"
    ON public.resume_analyses FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resume analyses" ON public.resume_analyses;
CREATE POLICY "Users can delete their own resume analyses"
    ON public.resume_analyses FOR DELETE
    USING (auth.uid() = user_id);
