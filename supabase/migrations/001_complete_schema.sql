-- =====================================================
-- Workflow360 Complete Database Schema
-- Version: 1.0.0
-- Run this single migration file to set up the entire database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================
DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('admin', 'manager', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE project_role AS ENUM ('owner', 'lead', 'contributor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS organizations_invite_code_idx ON public.organizations(invite_code);

-- =====================================================
-- ORGANIZATION MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_org_id_idx ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_role_idx ON public.organization_members(role);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_org_id_idx ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects(created_by);

-- =====================================================
-- PROJECT CUSTOM ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS project_custom_roles_project_id_idx ON public.project_custom_roles(project_id);

-- =====================================================
-- PROJECT MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'contributor',
    custom_role TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_role_idx ON public.project_members(role);
CREATE INDEX IF NOT EXISTS project_members_custom_role_idx ON public.project_members(custom_role);

-- =====================================================
-- SPRINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status sprint_status NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS sprints_project_id_idx ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS sprints_status_idx ON public.sprints(status);
CREATE INDEX IF NOT EXISTS sprints_dates_idx ON public.sprints(start_date, end_date);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_sprint_id_idx ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks(created_by);

-- =====================================================
-- SPRINT EVENTS TABLE (for meetings, milestones, etc.)
-- =====================================================
DO $$ BEGIN
    CREATE TYPE sprint_event_type AS ENUM ('planning', 'daily_standup', 'review', 'retrospective', 'meeting', 'milestone', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.sprint_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type sprint_event_type NOT NULL DEFAULT 'meeting',
    event_date TIMESTAMPTZ NOT NULL,
    start_time TIME,
    end_time TIME,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sprint_events_sprint_id_idx ON public.sprint_events(sprint_id);
CREATE INDEX IF NOT EXISTS sprint_events_event_date_idx ON public.sprint_events(event_date);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprints_updated_at ON public.sprints;
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_events_updated_at ON public.sprint_events;
CREATE TRIGGER update_sprint_events_updated_at BEFORE UPDATE ON public.sprint_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER FOR TASK COMPLETION
-- =====================================================
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_completion_trigger ON public.tasks;
CREATE TRIGGER task_completion_trigger BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER HELPER FUNCTIONS (prevent recursion)
-- =====================================================

-- Check if user is member of an organization
CREATE OR REPLACE FUNCTION public.user_is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    );
$$;

-- Check if user is member of org for project operations
CREATE OR REPLACE FUNCTION public.user_is_org_member_for_project(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
    );
$$;

-- Check if user is member of a project
CREATE OR REPLACE FUNCTION public.user_is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id AND user_id = auth.uid()
    );
$$;

-- =====================================================
-- RLS POLICIES: USERS
-- =====================================================
DROP POLICY IF EXISTS "users_view_all" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_view_all"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- =====================================================
-- RLS POLICIES: ORGANIZATIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can delete" ON public.organizations;

CREATE POLICY "Users can view organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Org owners can update"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Org owners can delete"
    ON public.organizations FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- =====================================================
-- RLS POLICIES: ORGANIZATION MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own org memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can join or owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can remove members" ON public.organization_members;

CREATE POLICY "Users can view own org memberships"
    ON public.organization_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view org members"
    ON public.organization_members FOR SELECT
    TO authenticated
    USING (public.user_is_org_member(org_id));

CREATE POLICY "Users can join or owners can add members"
    ON public.organization_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Org owners can update members"
    ON public.organization_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Org owners can remove members"
    ON public.organization_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: PROJECTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view organization projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can update" ON public.projects;
DROP POLICY IF EXISTS "Project creators can delete" ON public.projects;

CREATE POLICY "Users can view organization projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (public.user_is_org_member_for_project(org_id));

CREATE POLICY "Org members can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_is_org_member_for_project(org_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Project creators can update"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "Project creators can delete"
    ON public.projects FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES: PROJECT MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can remove members" ON public.project_members;

CREATE POLICY "Users can view own project memberships"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view project members"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (public.user_is_project_member(project_id));

CREATE POLICY "Project creators can add members"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Project creators can update members"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Project creators can remove members"
    ON public.project_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: PROJECT CUSTOM ROLES
-- =====================================================
DROP POLICY IF EXISTS "Users can view project custom roles" ON public.project_custom_roles;
DROP POLICY IF EXISTS "Project creators can manage custom roles" ON public.project_custom_roles;

CREATE POLICY "Users can view project custom roles"
    ON public.project_custom_roles FOR SELECT
    TO authenticated
    USING (public.user_is_project_member(project_id));

CREATE POLICY "Project creators can manage custom roles"
    ON public.project_custom_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
    );

-- =====================================================
-- RLS POLICIES: TASKS
-- =====================================================
DROP POLICY IF EXISTS "Users can view project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

CREATE POLICY "Users can view project tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (public.user_is_project_member(project_id));

CREATE POLICY "Project members can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_project_member(project_id));

CREATE POLICY "Project members can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (public.user_is_project_member(project_id));

CREATE POLICY "Task creators can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = tasks.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- RLS POLICIES: SPRINTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view project sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project leads can create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project leads can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project leads can delete sprints" ON public.sprints;

CREATE POLICY "Users can view project sprints"
    ON public.sprints FOR SELECT
    TO authenticated
    USING (public.user_is_project_member(project_id));

CREATE POLICY "Project leads can create sprints"
    ON public.sprints FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

CREATE POLICY "Project leads can update sprints"
    ON public.sprints FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

CREATE POLICY "Project leads can delete sprints"
    ON public.sprints FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- RLS POLICIES: SPRINT EVENTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view sprint events" ON public.sprint_events;
DROP POLICY IF EXISTS "Project leads can manage sprint events" ON public.sprint_events;

CREATE POLICY "Users can view sprint events"
    ON public.sprint_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sprints s
            JOIN public.project_members pm ON pm.project_id = s.project_id
            WHERE s.id = sprint_events.sprint_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project leads can manage sprint events"
    ON public.sprint_events FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sprints s
            JOIN public.project_members pm ON pm.project_id = s.project_id
            WHERE s.id = sprint_events.sprint_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- RLS POLICIES: NOTIFICATIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =====================================================
-- INVITE CODE FUNCTIONS
-- =====================================================

-- Function to join organization by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.join_organization_by_invite_code(
    p_invite_code TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_org_name TEXT;
    v_existing_member BOOLEAN;
BEGIN
    -- Find organization by invite code (case insensitive)
    SELECT id, name INTO v_org_id, v_org_name
    FROM public.organizations
    WHERE UPPER(invite_code) = UPPER(p_invite_code);

    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid invite code'
        );
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = v_org_id AND user_id = p_user_id
    ) INTO v_existing_member;

    IF v_existing_member THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already a member of this organization'
        );
    END IF;

    -- Add user as member
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (v_org_id, p_user_id, 'member');

    RETURN json_build_object(
        'success', true,
        'org_id', v_org_id,
        'org_name', v_org_name
    );
END;
$$;

-- Function to get organization by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_organization_by_invite_code(p_invite_code TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    owner_id UUID,
    invite_code TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.description,
        o.owner_id,
        o.invite_code,
        o.created_at,
        o.updated_at
    FROM public.organizations o
    WHERE UPPER(o.invite_code) = UPPER(p_invite_code);
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization_by_invite_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_by_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_org_member_for_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_project_member(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
