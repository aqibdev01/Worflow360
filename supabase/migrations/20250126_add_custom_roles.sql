-- Add custom roles support to projects
-- This migration adds start_date, end_date, and custom roles to projects

-- Add start_date and end_date to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Create custom roles table for projects
CREATE TABLE IF NOT EXISTS public.project_custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS project_custom_roles_project_id_idx ON public.project_custom_roles(project_id);

-- Enable RLS on custom roles
ALTER TABLE public.project_custom_roles ENABLE ROW LEVEL SECURITY;

-- Users can view custom roles for projects they're members of
CREATE POLICY "Users can view project custom roles"
    ON public.project_custom_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = project_custom_roles.project_id
            AND user_id = auth.uid()
        )
    );

-- Project owners and leads can create custom roles
CREATE POLICY "Project owners and leads can create custom roles"
    ON public.project_custom_roles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = project_custom_roles.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- Project owners and leads can update custom roles
CREATE POLICY "Project owners and leads can update custom roles"
    ON public.project_custom_roles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = project_custom_roles.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- Project owners and leads can delete custom roles
CREATE POLICY "Project owners and leads can delete custom roles"
    ON public.project_custom_roles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = project_custom_roles.project_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'lead')
        )
    );

-- Add custom_role field to project_members for default and custom roles
ALTER TABLE public.project_members
ADD COLUMN IF NOT EXISTS custom_role TEXT;

-- Create index for custom roles
CREATE INDEX IF NOT EXISTS project_members_custom_role_idx ON public.project_members(custom_role);

GRANT ALL ON public.project_custom_roles TO anon, authenticated;
