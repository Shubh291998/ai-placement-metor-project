-- supabase/migrations/20260904_auth_and_rls_hardening.sql
-- Hardens RLS policies to eliminate 'OR user_id IS NULL' security vulnerabilities,
-- enforces strict auth.uid() scoping, and adds auto-profile trigger on signup.

-- 1. Drop vulnerable permissive policies
DROP POLICY IF EXISTS "Users can manage own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can manage own JDs" ON public.job_descriptions;
DROP POLICY IF EXISTS "Users can manage own gap reports" ON public.gap_reports;
DROP POLICY IF EXISTS "Users can view own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can manage own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can manage own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can manage turns for own sessions" ON public.interview_turns;
DROP POLICY IF EXISTS "Users can manage own tracker stats" ON public.tracker_stats;
DROP POLICY IF EXISTS "Users can view own readiness scores" ON public.readiness_scores;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

-- 2. Strict User Scoped RLS Policies
-- Profiles: Users can read and update only their own profile
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Resumes: Users can only manage resumes where user_id matches authenticated UID
CREATE POLICY "Users can manage own resumes" ON public.resumes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Job Descriptions: Users can only manage JDs associated with their UID
CREATE POLICY "Users can manage own JDs" ON public.job_descriptions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Gap Reports: Users can only read and manage their own reports
CREATE POLICY "Users can manage own gap reports" ON public.gap_reports
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Roadmaps: Users can read and write their own roadmaps
CREATE POLICY "Users can manage own roadmaps" ON public.roadmaps
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Interview Sessions: Users can manage only their own sessions
CREATE POLICY "Users can manage own interview sessions" ON public.interview_sessions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Interview Turns: Strictly scoped through session ownership
CREATE POLICY "Users can manage turns for own sessions" ON public.interview_turns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

-- Tracker Stats: Strictly scoped to user_id
CREATE POLICY "Users can manage own tracker stats" ON public.tracker_stats
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Readiness Scores: Strictly scoped to user_id
CREATE POLICY "Users can view own readiness scores" ON public.readiness_scores
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Automatic Profile Creation Trigger on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
