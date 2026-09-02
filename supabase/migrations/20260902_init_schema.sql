-- supabase/migrations/20260902_init_schema.sql
-- AI Placement Mentor complete database schema with pgvector & RLS

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    leetcode_username TEXT,
    codeforces_username TEXT,
    gfg_username TEXT,
    codechef_username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Resumes Table
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_url TEXT,
    raw_text TEXT,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Job Descriptions Table
CREATE TABLE IF NOT EXISTS public.job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_text TEXT,
    source_url TEXT,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Gap Reports Table
CREATE TABLE IF NOT EXISTS public.gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    jd_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT,
    match_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_focus_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Roadmaps Table
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.gap_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL,
    estimated_weeks INTEGER NOT NULL DEFAULT 4,
    weeks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Interview Sessions Table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.gap_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed')),
    target_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_turn_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Interview Turns Table
CREATE TABLE IF NOT EXISTS public.interview_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    target_skill TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    answer TEXT NOT NULL DEFAULT '',
    feedback TEXT,
    score NUMERIC(4, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tracker Stats Table
CREATE TABLE IF NOT EXISTS public.tracker_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codeforces', 'gfg', 'codechef')),
    username TEXT NOT NULL,
    solved INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(8, 2),
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tracker_stats_user_platform_unique UNIQUE (user_id, platform)
);

-- 10. Readiness Scores Table (Historical snapshots)
CREATE TABLE IF NOT EXISTS public.readiness_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL,
    resume_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    skill_gap_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    coding_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    interview_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Learning Resources & Knowledge Documents for RAG
CREATE TABLE IF NOT EXISTS public.learning_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT,
    resource_type TEXT NOT NULL DEFAULT 'article',
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gap_reports_user_id ON public.gap_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_gap_reports_created ON public.gap_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_report ON public.interview_sessions(report_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_turns_session ON public.interview_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_tracker_stats_user ON public.tracker_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_readiness_scores_user_date ON public.readiness_scores(user_id, recorded_at DESC);

-- Vector Indexing (HNSW / IVFFlat for cosine distance)
CREATE INDEX IF NOT EXISTS idx_learning_resources_embedding ON public.learning_resources 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding ON public.knowledge_documents 
USING hnsw (embedding vector_cosine_ops);

-- RAG Vector Search RPC
CREATE OR REPLACE FUNCTION match_learning_resources (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  topic text,
  title text,
  content text,
  url text,
  resource_type text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lr.id,
    lr.topic,
    lr.title,
    lr.content,
    lr.url,
    lr.resource_type,
    1 - (lr.embedding <=> query_embedding) AS similarity
  FROM public.learning_resources lr
  WHERE lr.embedding IS NOT NULL AND 1 - (lr.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Resumes
CREATE POLICY "Users can manage own resumes" ON public.resumes
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Job Descriptions
CREATE POLICY "Users can manage own JDs" ON public.job_descriptions
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Gap Reports
CREATE POLICY "Users can manage own gap reports" ON public.gap_reports
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Roadmaps
CREATE POLICY "Users can view own roadmaps" ON public.roadmaps
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Interview Sessions
CREATE POLICY "Users can manage own interview sessions" ON public.interview_sessions
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Interview Turns
CREATE POLICY "Users can manage turns for own sessions" ON public.interview_turns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions s
            WHERE s.id = session_id AND (s.user_id = auth.uid() OR s.user_id IS NULL)
        )
    );

-- Tracker Stats
CREATE POLICY "Users can manage own tracker stats" ON public.tracker_stats
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Readiness Scores
CREATE POLICY "Users can view own readiness scores" ON public.readiness_scores
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Knowledge & Learning Resources are publicly readable
CREATE POLICY "Public read learning resources" ON public.learning_resources
    FOR SELECT USING (true);

CREATE POLICY "Public read knowledge documents" ON public.knowledge_documents
    FOR SELECT USING (true);
