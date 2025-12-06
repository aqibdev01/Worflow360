-- COMPLETE RLS FIX - This will completely reset all policies
-- Run this in your Supabase SQL Editor

-- Step 1: Completely disable RLS temporarily
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (using CASCADE to force drop)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on project_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.project_members CASCADE';
    END LOOP;

    -- Drop all policies on project_custom_roles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_custom_roles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.project_custom_roles CASCADE';
    END LOOP;
END $$;

-- Step 3: Ensure columns exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS custom_role TEXT;

-- Step 4: Re-enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SIMPLE, NON-RECURSIVE policies for project_members
-- These policies NEVER reference project_members in their conditions

-- Allow users to see their own memberships
CREATE POLICY "view_own_memberships"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to insert their own membership (for when they create a project)
CREATE POLICY "insert_own_membership"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow project creators to add ANY member
-- This checks projects.created_by, NOT project_members
CREATE POLICY "creators_add_members"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow users to see members of projects they created
-- This checks projects.created_by, NOT project_members
CREATE POLICY "creators_view_all_members"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow project creators to update members
CREATE POLICY "creators_update_members"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow project creators to remove members
CREATE POLICY "creators_delete_members"
    ON public.project_members FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Step 6: Create SIMPLE policies for project_custom_roles
-- These also NEVER reference project_members

-- Allow project creators to view custom roles
CREATE POLICY "view_project_custom_roles"
    ON public.project_custom_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_custom_roles.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow project creators to create custom roles
CREATE POLICY "create_custom_roles"
    ON public.project_custom_roles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_custom_roles.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow project creators to update custom roles
CREATE POLICY "update_custom_roles"
    ON public.project_custom_roles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_custom_roles.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Allow project creators to delete custom roles
CREATE POLICY "delete_custom_roles"
    ON public.project_custom_roles FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_custom_roles.project_id
            AND p.created_by = auth.uid()
        )
    );

-- Step 7: Grant necessary permissions
GRANT ALL ON public.project_custom_roles TO authenticated;
GRANT ALL ON public.project_members TO authenticated;

-- Done! This should completely eliminate any recursion issues.
