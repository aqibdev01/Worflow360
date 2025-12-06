-- Workflow360 Database Schema Rollback
-- Version: 1.0.0
-- Description: Rollback script to remove all tables and types

-- WARNING: This will delete ALL data in the Workflow360 tables
-- Only run this if you need to completely reset the database

-- =====================================================
-- DROP POLICIES FIRST (RLS)
-- =====================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view org member profiles" ON public.users;

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org owners and admins can update" ON public.organizations;
DROP POLICY IF EXISTS "Only owners can delete organizations" ON public.organizations;

-- Organization members policies
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can remove members" ON public.organization_members;

-- Projects policies
DROP POLICY IF EXISTS "Users can view org projects" ON public.projects;
DROP POLICY IF EXISTS "Org managers and admins can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads and org admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners and org admins can delete projects" ON public.projects;

-- Project members policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners and leads can add members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners and leads can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners and leads can remove members" ON public.project_members;

-- Tasks policies
DROP POLICY IF EXISTS "Users can view project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators and project leads can delete tasks" ON public.tasks;

-- Sprints policies
DROP POLICY IF EXISTS "Users can view project sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project owners and leads can create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project owners and leads can update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Project owners and leads can delete sprints" ON public.sprints;

-- =====================================================
-- DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS set_task_completed_at();
DROP FUNCTION IF EXISTS is_org_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_project_member(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_org_role(UUID, UUID);

-- =====================================================
-- DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_sprints_updated_at ON public.sprints;
DROP TRIGGER IF EXISTS task_completion_trigger ON public.tasks;

-- =====================================================
-- DROP TABLES (in reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.sprints CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- DROP ENUMS (custom types)
-- =====================================================

DROP TYPE IF EXISTS sprint_status;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS project_role;
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS member_role;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

-- Note: This does not drop the uuid-ossp extension as it may be used by other schemas
-- If you want to remove it completely, uncomment the following line:
-- DROP EXTENSION IF EXISTS "uuid-ossp";

NOTIFY pgrst, 'reload schema';
