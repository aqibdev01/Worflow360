-- =====================================================
-- MIGRATION 008: AI MODULE FIELDS
-- =====================================================
-- Extends the existing schema with columns and tables
-- required by AI modules (M6 Decomposition, M10 Assignment,
-- M11 Bottleneck Detection).
--
-- Existing enums used as-is:
--   task_status  : 'todo','in_progress','review','done','blocked'
--   task_priority: 'low','medium','high','urgent'
--   sprint_status: 'planned','active','completed','cancelled'
-- =====================================================

-- ==========================
-- NEW ENUM TYPES
-- ==========================

DO $$ BEGIN
    CREATE TYPE decomposition_status AS ENUM ('none','suggested','partially_accepted','fully_accepted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE skill_level AS ENUM ('beginner','intermediate','expert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE decomposition_review_status AS ENUM ('pending','accepted','partially_accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. ALTER TABLE tasks — AI columns
-- =====================================================

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS story_points SMALLINT,
    ADD COLUMN IF NOT EXISTS estimated_days NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS actual_days NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS complexity_score NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS ai_suggested_assignee_id UUID,
    ADD COLUMN IF NOT EXISTS ai_assignee_confidence NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS parent_task_id UUID,
    ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS decomposition_status decomposition_status DEFAULT 'none';

-- Constraints
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_story_points_fibonacci
        CHECK (story_points IS NULL OR story_points IN (1,2,3,5,8,13));

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_complexity_score_range
        CHECK (complexity_score IS NULL OR (complexity_score >= 0.00 AND complexity_score <= 1.00));

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_ai_assignee_confidence_range
        CHECK (ai_assignee_confidence IS NULL OR (ai_assignee_confidence >= 0.00 AND ai_assignee_confidence <= 1.00));

-- Foreign keys
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_ai_suggested_assignee_fk
        FOREIGN KEY (ai_suggested_assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_parent_task_fk
        FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- =====================================================
-- 2. ALTER TABLE sprints — AI columns
-- =====================================================

ALTER TABLE public.sprints
    ADD COLUMN IF NOT EXISTS velocity NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS capacity NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS ai_risk_score NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS ai_risk_factors JSONB,
    ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

ALTER TABLE public.sprints
    ADD CONSTRAINT sprints_ai_risk_score_range
        CHECK (ai_risk_score IS NULL OR (ai_risk_score >= 0.00 AND ai_risk_score <= 1.00));

-- =====================================================
-- 3. CREATE TABLE user_skills
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    level skill_level NOT NULL DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_skills_unique UNIQUE (user_id, skill)
);

-- =====================================================
-- 4. CREATE TABLE ai_task_decompositions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_task_decompositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    suggested_subtasks JSONB NOT NULL,
    model_version TEXT NOT NULL,
    confidence_score NUMERIC(3,2),
    status decomposition_review_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ai_task_decompositions
    ADD CONSTRAINT ai_decompositions_confidence_range
        CHECK (confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00));

-- =====================================================
-- 5. CREATE TABLE ai_assignment_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_assignment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    suggested_assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confidence_score NUMERIC(3,2),
    scoring_breakdown JSONB,
    was_accepted BOOLEAN,
    final_assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_assignment_logs
    ADD CONSTRAINT ai_assignment_confidence_range
        CHECK (confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00));

-- =====================================================
-- 6. CREATE TABLE ai_bottleneck_reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_bottleneck_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    risk_level risk_level NOT NULL,
    risk_score NUMERIC(3,2),
    bottlenecks JSONB NOT NULL,
    recommendations JSONB,
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_bottleneck_reports
    ADD CONSTRAINT ai_bottleneck_risk_score_range
        CHECK (risk_score IS NULL OR (risk_score >= 0.00 AND risk_score <= 1.00));

-- =====================================================
-- INDEXES
-- =====================================================

-- Tasks: AI-related lookups
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx ON public.tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS tasks_sprint_status_idx ON public.tasks(sprint_id, status);

-- User skills
CREATE INDEX IF NOT EXISTS user_skills_user_id_idx ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS user_skills_skill_idx ON public.user_skills(skill);

-- AI bottleneck reports
CREATE INDEX IF NOT EXISTS ai_bottleneck_sprint_id_idx ON public.ai_bottleneck_reports(sprint_id);
CREATE INDEX IF NOT EXISTS ai_bottleneck_project_id_idx ON public.ai_bottleneck_reports(project_id);

-- AI assignment logs
CREATE INDEX IF NOT EXISTS ai_assignment_task_id_idx ON public.ai_assignment_logs(task_id);

-- AI decompositions
CREATE INDEX IF NOT EXISTS ai_decompositions_parent_task_idx ON public.ai_task_decompositions(parent_task_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_decompositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_bottleneck_reports ENABLE ROW LEVEL SECURITY;

-- user_skills: users can manage their own skills; project members can view teammates' skills
CREATE POLICY "Users can manage own skills"
    ON public.user_skills FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project members can view teammate skills"
    ON public.user_skills FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm1
            JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
            WHERE pm1.user_id = auth.uid()
              AND pm2.user_id = user_skills.user_id
        )
    );

-- ai_task_decompositions: project members can view; admins/leads can manage
CREATE POLICY "Project members can view decompositions"
    ON public.ai_task_decompositions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = ai_task_decompositions.parent_task_id
              AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project leads can manage decompositions"
    ON public.ai_task_decompositions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = ai_task_decompositions.parent_task_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'lead')
        )
    );

-- ai_assignment_logs: project members can view
CREATE POLICY "Project members can view assignment logs"
    ON public.ai_assignment_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = ai_assignment_logs.task_id
              AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project leads can manage assignment logs"
    ON public.ai_assignment_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = ai_assignment_logs.task_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'lead')
        )
    );

-- ai_bottleneck_reports: project members can view
CREATE POLICY "Project members can view bottleneck reports"
    ON public.ai_bottleneck_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = ai_bottleneck_reports.project_id
              AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project leads can manage bottleneck reports"
    ON public.ai_bottleneck_reports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = ai_bottleneck_reports.project_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('owner', 'lead')
        )
    );
