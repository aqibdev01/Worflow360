-- Complete RLS fix to avoid infinite recursion
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Drop ALL existing policies to start fresh
-- ============================================

-- Drop organization_members policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own org memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;

-- Drop projects policies
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view organization projects" ON public.projects;
DROP POLICY IF EXISTS "Organization members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can update" ON public.projects;
DROP POLICY IF EXISTS "Project creators can delete" ON public.projects;

-- Drop project_members policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project creators can remove members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;

-- Drop organizations policies
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can delete" ON public.organizations;

-- Drop users policies
DROP POLICY IF EXISTS "users_view_own" ON public.users;
DROP POLICY IF EXISTS "users_view_all" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- ============================================
-- STEP 2: Enable RLS on all tables
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create USERS table policies (no recursion possible)
-- ============================================

-- All authenticated users can view all users (needed for search)
CREATE POLICY "users_view_all"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert their own profile
CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- ============================================
-- STEP 4: Create ORGANIZATIONS table policies
-- ============================================

-- Users can view organizations they own OR are members of
-- Using a simple owner check + subquery that doesn't cause recursion
CREATE POLICY "Users can view organizations"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Any authenticated user can create an organization
CREATE POLICY "Users can create organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Only owners can update their organizations
CREATE POLICY "Org owners can update"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

-- Only owners can delete their organizations
CREATE POLICY "Org owners can delete"
    ON public.organizations FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- ============================================
-- STEP 5: Create ORGANIZATION_MEMBERS table policies
-- Key: Avoid self-referential queries!
-- ============================================

-- Users can view their own membership records (no recursion)
CREATE POLICY "Users can view own org memberships"
    ON public.organization_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can view other members ONLY if they are also in that org
-- This uses a security definer function to avoid recursion
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

-- View all members of orgs user belongs to (using function to avoid recursion)
CREATE POLICY "Users can view org members"
    ON public.organization_members FOR SELECT
    TO authenticated
    USING (public.user_is_org_member(org_id));

-- Organization owners can add members
CREATE POLICY "Org owners can add members"
    ON public.organization_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
        OR user_id = auth.uid()  -- Users can add themselves (via invite code)
    );

-- Organization owners can update members
CREATE POLICY "Org owners can update members"
    ON public.organization_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
    );

-- Organization owners can remove members, or users can remove themselves
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

-- ============================================
-- STEP 6: Create PROJECTS table policies
-- ============================================

-- Helper function to check org membership (avoids recursion)
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

-- Users can view projects in organizations they belong to
CREATE POLICY "Users can view organization projects"
    ON public.projects FOR SELECT
    TO authenticated
    USING (public.user_is_org_member_for_project(org_id));

-- Organization members can create projects
CREATE POLICY "Org members can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_is_org_member_for_project(org_id)
        AND created_by = auth.uid()
    );

-- Project creators can update their projects
CREATE POLICY "Project creators can update"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- Project creators can delete their projects
CREATE POLICY "Project creators can delete"
    ON public.projects FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- ============================================
-- STEP 7: Create PROJECT_MEMBERS table policies
-- ============================================

-- Helper function to check project membership
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

-- Users can view their own project memberships
CREATE POLICY "Users can view own project memberships"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can view all members of projects they belong to
CREATE POLICY "Users can view project members"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (public.user_is_project_member(project_id));

-- Project creators can add members
CREATE POLICY "Project creators can add members"
    ON public.project_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
        OR user_id = auth.uid()  -- Users can add themselves
    );

-- Project creators can update members
CREATE POLICY "Project creators can update members"
    ON public.project_members FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND created_by = auth.uid()
        )
    );

-- Project creators can remove members, or users can remove themselves
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

-- ============================================
-- DONE! All RLS policies are now set up without recursion
-- ============================================
