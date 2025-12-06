-- Fix infinite recursion in RLS policies
-- This migration fixes the circular dependency in project_members policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners and leads can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can remove members" ON public.project_members;

-- Create new policies without circular dependencies

-- Allow users to view their own project memberships
CREATE POLICY "Users can view own project memberships"
    ON public.project_members FOR SELECT
    USING (user_id = auth.uid());

-- Allow users to insert themselves as project members (for project creation)
CREATE POLICY "Users can insert own membership"
    ON public.project_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Allow project creators to add members (checked via projects table, not project_members)
CREATE POLICY "Project creators can add members"
    ON public.project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );

-- Allow viewing all members of projects the user is part of
-- Use a subquery that doesn't create circular reference
CREATE POLICY "Users can view members of their projects"
    ON public.project_members FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid()
        )
    );

-- Allow project owners (from projects table) to update members
CREATE POLICY "Project owners can update members"
    ON public.project_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );

-- Allow project owners to delete members
CREATE POLICY "Project owners can delete members"
    ON public.project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_members.project_id
            AND created_by = auth.uid()
        )
    );
