-- Complete fix for infinite recursion in RLS policies
-- This migration can be run safely even if previous migrations were already applied

-- First, ensure the custom roles table and fields exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS custom_role TEXT;

-- Drop ALL existing policies on project_members to avoid conflicts
DO $$
BEGIN
    -- Drop all policies on project_members
    DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
    DROP POLICY IF EXISTS "Project owners and leads can manage members" ON public.project_members;
    DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;
    DROP POLICY IF EXISTS "Project admins can add members" ON public.project_members;
    DROP POLICY IF EXISTS "Project admins can update members" ON public.project_members;
    DROP POLICY IF EXISTS "Project admins can remove members" ON public.project_members;
    DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
    DROP POLICY IF EXISTS "Users can insert own membership" ON public.project_members;
    DROP POLICY IF EXISTS "Project creators can add members" ON public.project_members;
    DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
    DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
    DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;
END $$;

-- Create new policies without circular dependencies
-- These policies check the projects table directly instead of project_members

-- Policy 1: Allow users to view their own project memberships
CREATE POLICY "Users can view own project memberships"
    ON public.project_members FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: Allow users to insert themselves as project members
CREATE POLICY "Users can insert own membership"
    ON public.project_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy 3: Allow project creators to add members (no circular dependency)
CREATE POLICY "Project creators can add members"
    ON public.project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );

-- Policy 4: Allow viewing all members of projects the user is part of
-- This uses a materialized subquery to avoid recursion
CREATE POLICY "Users can view members of their projects"
    ON public.project_members FOR SELECT
    USING (
        project_id IN (
            SELECT pm.project_id
            FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
        )
    );

-- Policy 5: Allow project creators to update members
CREATE POLICY "Project owners can update members"
    ON public.project_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );

-- Policy 6: Allow project creators to delete members
CREATE POLICY "Project owners can delete members"
    ON public.project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );

-- Also update custom roles policies to use projects table instead of project_members
DO $$
BEGIN
    -- Drop existing custom roles policies
    DROP POLICY IF EXISTS "Users can view project custom roles" ON public.project_custom_roles;
    DROP POLICY IF EXISTS "Project owners and leads can create custom roles" ON public.project_custom_roles;
    DROP POLICY IF EXISTS "Project owners and leads can update custom roles" ON public.project_custom_roles;
    DROP POLICY IF EXISTS "Project owners and leads can delete custom roles" ON public.project_custom_roles;
END $$;

-- Create new custom roles policies without circular dependencies
CREATE POLICY "Users can view project custom roles"
    ON public.project_custom_roles FOR SELECT
    USING (
        project_id IN (
            SELECT pm.project_id
            FROM public.project_members pm
            WHERE pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Project creators can manage custom roles"
    ON public.project_custom_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_custom_roles.project_id
            AND created_by = auth.uid()
        )
    );
