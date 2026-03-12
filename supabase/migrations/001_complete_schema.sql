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
-- SECURITY QUESTION COLUMNS (for password reset)
-- =====================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS security_answer TEXT;

-- =====================================================
-- COMMUNICATION HUB: ENUM TYPES
-- =====================================================
DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('public', 'private', 'announcement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_member_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'system', 'task_ref', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE dm_message_type AS ENUM ('text', 'file', 'task_ref');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CHANNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    type channel_type NOT NULL DEFAULT 'public',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS channels_org_id_idx ON public.channels(organization_id);
CREATE INDEX IF NOT EXISTS channels_project_id_idx ON public.channels(project_id);
CREATE INDEX IF NOT EXISTS channels_type_idx ON public.channels(type);
CREATE INDEX IF NOT EXISTS channels_created_by_idx ON public.channels(created_by);

-- =====================================================
-- CHANNEL MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role channel_member_role NOT NULL DEFAULT 'member',
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS channel_members_channel_id_idx ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS channel_members_user_id_idx ON public.channel_members(user_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    metadata JSONB,
    parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reply_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_channel_id_created_at_idx ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_parent_message_id_idx ON public.messages(parent_message_id);

-- =====================================================
-- MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON public.message_reactions(message_id);

-- =====================================================
-- DIRECT MESSAGE THREADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dm_threads_org_id_idx ON public.direct_message_threads(organization_id);

-- =====================================================
-- DIRECT MESSAGE PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_message_participants (
    thread_id UUID NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS dm_participants_user_id_idx ON public.direct_message_participants(user_id);

-- =====================================================
-- DIRECT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type dm_message_type NOT NULL DEFAULT 'text',
    metadata JSONB,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dm_thread_id_created_at_idx ON public.direct_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_sender_id_idx ON public.direct_messages(sender_id);

-- =====================================================
-- COMMUNICATION HUB TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_direct_messages_updated_at ON public.direct_messages;
CREATE TRIGGER update_direct_messages_updated_at BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reply count auto-increment
CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_message_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS increment_message_reply_count ON public.messages;
CREATE TRIGGER increment_message_reply_count
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.increment_reply_count();

-- Reply count auto-decrement
CREATE OR REPLACE FUNCTION public.decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_message_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.parent_message_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decrement_message_reply_count ON public.messages;
CREATE TRIGGER decrement_message_reply_count
    AFTER DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.decrement_reply_count();

-- =====================================================
-- COMMUNICATION HUB RLS HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_is_channel_member(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.channels c
        JOIN public.organization_members om ON om.org_id = c.organization_id
        WHERE c.id = p_channel_id
        AND c.type = 'public'
        AND om.user_id = auth.uid()
        AND c.is_archived = false
    );
$$;

CREATE OR REPLACE FUNCTION public.user_is_dm_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.direct_message_participants
        WHERE thread_id = p_thread_id AND user_id = auth.uid()
    );
$$;

-- =====================================================
-- ENABLE RLS ON COMMUNICATION TABLES
-- =====================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: CHANNELS
-- =====================================================
DROP POLICY IF EXISTS "Users can view channels in their org" ON public.channels;
DROP POLICY IF EXISTS "Org members can create channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can update channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can delete channels" ON public.channels;

CREATE POLICY "Users can view channels in their org"
    ON public.channels FOR SELECT
    TO authenticated
    USING (
        (type IN ('public', 'announcement') AND public.user_is_org_member(organization_id))
        OR public.user_is_channel_member(id)
    );

CREATE POLICY "Org members can create channels"
    ON public.channels FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_is_org_member(organization_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Channel creators can update channels"
    ON public.channels FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = channels.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Channel creators can delete channels"
    ON public.channels FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = channels.organization_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- RLS POLICIES: CHANNEL MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can update members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can leave or admins can remove" ON public.channel_members;

CREATE POLICY "Users can view channel members"
    ON public.channel_members FOR SELECT
    TO authenticated
    USING (public.user_can_access_channel(channel_id));

CREATE POLICY "Users can join public channels"
    ON public.channel_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.channels c
            JOIN public.organization_members om ON om.org_id = c.organization_id
            WHERE c.id = channel_id
            AND om.user_id = auth.uid()
            AND c.type = 'public'
        )
    );

CREATE POLICY "Channel admins can add members"
    ON public.channel_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = channel_members.channel_id
            AND c.created_by = auth.uid()
        )
    );

CREATE POLICY "Channel admins can update members"
    ON public.channel_members FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

CREATE POLICY "Users can leave or admins can remove"
    ON public.channel_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- =====================================================
-- RLS POLICIES: MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Channel members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON public.messages;

CREATE POLICY "Users can view messages in accessible channels"
    ON public.messages FOR SELECT
    TO authenticated
    USING (public.user_can_access_channel(channel_id));

CREATE POLICY "Channel members can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.user_can_access_channel(channel_id)
    );

CREATE POLICY "Senders can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- =====================================================
-- RLS POLICIES: MESSAGE REACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view reactions in accessible channels" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions in accessible channels"
    ON public.message_reactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
            AND public.user_can_access_channel(m.channel_id)
        )
    );

CREATE POLICY "Users can add reactions"
    ON public.message_reactions FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
            AND public.user_can_access_channel(m.channel_id)
        )
    );

CREATE POLICY "Users can remove own reactions"
    ON public.message_reactions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGE THREADS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own DM threads" ON public.direct_message_threads;
DROP POLICY IF EXISTS "Org members can create DM threads" ON public.direct_message_threads;

CREATE POLICY "Users can view own DM threads"
    ON public.direct_message_threads FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(id));

CREATE POLICY "Org members can create DM threads"
    ON public.direct_message_threads FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_org_member(organization_id));

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGE PARTICIPANTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own DM participants" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can add DM participants" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can update own DM read status" ON public.direct_message_participants;

CREATE POLICY "Users can view own DM participants"
    ON public.direct_message_participants FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(thread_id));

CREATE POLICY "Users can add DM participants"
    ON public.direct_message_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR public.user_is_dm_participant(thread_id)
    );

CREATE POLICY "Users can update own DM read status"
    ON public.direct_message_participants FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view DMs in their threads" ON public.direct_messages;
DROP POLICY IF EXISTS "Participants can send DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders can update own DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders can delete own DMs" ON public.direct_messages;

CREATE POLICY "Users can view DMs in their threads"
    ON public.direct_messages FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(thread_id));

CREATE POLICY "Participants can send DMs"
    ON public.direct_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.user_is_dm_participant(thread_id)
    );

CREATE POLICY "Senders can update own DMs"
    ON public.direct_messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own DMs"
    ON public.direct_messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- =====================================================
-- TRIGGER: AUTO-CREATE DEFAULT ORG CHANNEL
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_create_org_default_channel()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    SELECT id INTO v_channel_id
    FROM public.channels
    WHERE organization_id = NEW.org_id
    AND project_id IS NULL
    AND name = 'general'
    LIMIT 1;

    IF v_channel_id IS NULL THEN
        INSERT INTO public.channels (organization_id, name, display_name, description, type, created_by)
        VALUES (
            NEW.org_id, 'general', 'General',
            'Default channel for organization-wide discussions',
            'public', NEW.user_id
        )
        RETURNING id INTO v_channel_id;
    END IF;

    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_org_channel ON public.organization_members;
CREATE TRIGGER auto_create_org_channel
    AFTER INSERT ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_org_default_channel();

-- =====================================================
-- TRIGGER: AUTO-CREATE DEFAULT PROJECT CHANNEL
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_create_project_default_channel()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_id UUID;
    v_org_id UUID;
BEGIN
    SELECT org_id INTO v_org_id
    FROM public.projects
    WHERE id = NEW.project_id;

    SELECT id INTO v_channel_id
    FROM public.channels
    WHERE project_id = NEW.project_id
    AND name = 'general'
    LIMIT 1;

    IF v_channel_id IS NULL THEN
        INSERT INTO public.channels (organization_id, project_id, name, display_name, description, type, created_by)
        VALUES (
            v_org_id, NEW.project_id, 'general', 'General',
            'Default channel for project discussions',
            'public', NEW.user_id
        )
        RETURNING id INTO v_channel_id;
    END IF;

    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_project_channel ON public.project_members;
CREATE TRIGGER auto_create_project_channel
    AFTER INSERT ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_project_default_channel();

-- =====================================================
-- ENABLE SUPABASE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;

-- =====================================================
-- STORAGE BUCKET: CHAT ATTACHMENTS (10MB limit)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can view chat files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

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
GRANT EXECUTE ON FUNCTION public.user_is_channel_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_dm_participant(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
