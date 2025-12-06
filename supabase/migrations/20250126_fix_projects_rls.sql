-- Fix RLS policies for projects table
-- This allows organization members to create projects within their organizations

-- Drop existing project policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
    DROP POLICY IF EXISTS "Org members can create projects" ON public.projects;
    DROP POLICY IF EXISTS "Project creators can update" ON public.projects;
    DROP POLICY IF EXISTS "Project creators can delete" ON public.projects;
    DROP POLICY IF EXISTS "Users can view organization projects" ON public.projects;
    DROP POLICY IF EXISTS "Organization members can create projects" ON public.projects;
END $$;

-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Organization members can view projects in their organizations
CREATE POLICY "Users can view organization projects"
    ON public.projects FOR SELECT
    USING (
        org_id IN (
            SELECT om.org_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    );

-- Policy 2: Organization members can create projects in their organizations
CREATE POLICY "Organization members can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT om.org_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Policy 3: Project creators can update their projects
CREATE POLICY "Project creators can update"
    ON public.projects FOR UPDATE
    USING (created_by = auth.uid());

-- Policy 4: Project creators can delete their projects
CREATE POLICY "Project creators can delete"
    ON public.projects FOR DELETE
    USING (created_by = auth.uid());

-- Also fix organization_members RLS to allow viewing members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
END $$;

-- Allow users to view all members of organizations they belong to
CREATE POLICY "Users can view organization members"
    ON public.organization_members FOR SELECT
    USING (
        org_id IN (
            SELECT om2.org_id
            FROM public.organization_members om2
            WHERE om2.user_id = auth.uid()
        )
    );
