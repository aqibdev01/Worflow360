-- Workflow360 Database Schema Migration
-- Version: 1.0.0
-- Description: Initial database schema with users, organizations, projects, tasks, and sprints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Extends Supabase auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
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

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS organizations_invite_code_idx ON public.organizations(invite_code);

-- =====================================================
-- ORGANIZATION MEMBERS TABLE
-- =====================================================
CREATE TYPE member_role AS ENUM ('admin', 'manager', 'member');

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS organization_members_org_id_idx ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_role_idx ON public.organization_members(role);

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS projects_org_id_idx ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects(created_by);

-- =====================================================
-- PROJECT MEMBERS TABLE
-- =====================================================
CREATE TYPE project_role AS ENUM ('owner', 'lead', 'contributor', 'viewer');

CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'contributor',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_role_idx ON public.project_members(role);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sprint_id UUID,
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

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_sprint_id_idx ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks(created_by);

-- =====================================================
-- SPRINTS TABLE
-- =====================================================
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');

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

-- Add foreign key constraint for tasks.sprint_id
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_sprint_id_fkey
FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS sprints_project_id_idx ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS sprints_status_idx ON public.sprints(status);
CREATE INDEX IF NOT EXISTS sprints_dates_idx ON public.sprints(start_date, end_date);

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

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints
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

CREATE TRIGGER task_completion_trigger BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS POLICIES
-- =====================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can view profiles of members in their organizations
CREATE POLICY "Users can view org member profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om1
            WHERE om1.user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.organization_members om2
                WHERE om2.user_id = users.id
                AND om2.org_id = om1.org_id
            )
        )
    );

-- =====================================================
-- ORGANIZATIONS POLICIES
-- =====================================================
-- Users can view organizations they're members of
CREATE POLICY "Users can view their organizations"
    ON public.organizations FOR SELECT
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = organizations.id
            AND user_id = auth.uid()
        )
    );

-- Users can create organizations
CREATE POLICY "Users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Organization owners and admins can update
CREATE POLICY "Org owners and admins can update"
    ON public.organizations FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = organizations.id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Only owners can delete organizations
CREATE POLICY "Only owners can delete organizations"
    ON public.organizations FOR DELETE
    USING (owner_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================
-- Function to check if user is org owner (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_org_owner(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = org_uuid AND owner_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is org admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = org_uuid
        AND user_id = user_uuid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is org member (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = org_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ORGANIZATION MEMBERS POLICIES
-- =====================================================
-- Users can view members of organizations they belong to
CREATE POLICY "Users can view org members"
    ON public.organization_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_org_member(org_id, auth.uid())
    );

-- Org owners and admins can add members
CREATE POLICY "Org owners and admins can add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_owner(org_id, auth.uid()) OR
        public.is_org_admin(org_id, auth.uid())
    );

-- Org owners and admins can update member roles
CREATE POLICY "Org owners and admins can update members"
    ON public.organization_members FOR UPDATE
    USING (
        public.is_org_owner(org_id, auth.uid()) OR
        public.is_org_admin(org_id, auth.uid())
    );

-- Org owners and admins can remove members, or users can remove themselves
CREATE POLICY "Org owners and admins can remove members"
    ON public.organization_members FOR DELETE
    USING (
        user_id = auth.uid() OR
        public.is_org_owner(org_id, auth.uid()) OR
        public.is_org_admin(org_id, auth.uid())
    );

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================
-- Users can view projects in organizations they belong to
CREATE POLICY "Users can view org projects"
    ON public.projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = projects.org_id
            AND user_id = auth.uid()
        )
    );

-- Org members with manager or admin role can create projects
CREATE POLICY "Org managers and admins can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = projects.org_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Project members with owner/lead role and org admins can update
CREATE POLICY "Project leads and org admins can update projects"
    ON public.projects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = projects.id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = projects.org_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Project owners and org admins can delete projects
CREATE POLICY "Project owners and org admins can delete projects"
    ON public.projects FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = projects.org_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- PROJECT MEMBERS POLICIES
-- =====================================================
-- Users can view project members if they're in the same project
CREATE POLICY "Users can view project members"
    ON public.project_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- Project owners/leads can add members
CREATE POLICY "Project owners and leads can add members"
    ON public.project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'lead')
        )
    );

-- Project owners/leads can update member roles
CREATE POLICY "Project owners and leads can update members"
    ON public.project_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'lead')
        )
    );

-- Project owners/leads can remove members, or users can remove themselves
CREATE POLICY "Project owners and leads can remove members"
    ON public.project_members FOR DELETE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- TASKS POLICIES
-- =====================================================
-- Users can view tasks in projects they're members of
CREATE POLICY "Users can view project tasks"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = tasks.project_id
            AND user_id = auth.uid()
        )
    );

-- Project members can create tasks
CREATE POLICY "Project members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = tasks.project_id
            AND user_id = auth.uid()
        )
    );

-- Project members can update tasks
CREATE POLICY "Project members can update tasks"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = tasks.project_id
            AND user_id = auth.uid()
        )
    );

-- Task creators and project owners/leads can delete tasks
CREATE POLICY "Task creators and project leads can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = tasks.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- SPRINTS POLICIES
-- =====================================================
-- Users can view sprints in projects they're members of
CREATE POLICY "Users can view project sprints"
    ON public.sprints FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
        )
    );

-- Project owners and leads can create sprints
CREATE POLICY "Project owners and leads can create sprints"
    ON public.sprints FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- Project owners and leads can update sprints
CREATE POLICY "Project owners and leads can update sprints"
    ON public.sprints FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- Project owners and leads can delete sprints
CREATE POLICY "Project owners and leads can delete sprints"
    ON public.sprints FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = sprints.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = project_uuid
        AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION public.get_user_org_role(org_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role::TEXT INTO user_role
    FROM public.organization_members
    WHERE org_id = org_uuid
    AND user_id = user_uuid;

    IF NOT FOUND THEN
        -- Check if user is owner
        IF EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_uuid AND owner_id = user_uuid
        ) THEN
            RETURN 'owner';
        END IF;
        RETURN NULL;
    END IF;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- =====================================================
-- Uncomment to add sample data for testing

-- INSERT INTO public.users (id, email, full_name) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'admin@workflow360.com', 'Admin User'),
-- ('00000000-0000-0000-0000-000000000002', 'manager@workflow360.com', 'Manager User'),
-- ('00000000-0000-0000-0000-000000000003', 'developer@workflow360.com', 'Developer User');

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
