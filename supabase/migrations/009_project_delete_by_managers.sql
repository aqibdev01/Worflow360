-- =====================================================
-- Allow project owners and leads to delete projects
-- Previously: only created_by (the original creator) could delete
-- Now: any project_member with role = 'owner' or 'lead' can delete
-- =====================================================

DROP POLICY IF EXISTS "Project creators can delete" ON public.projects;
DROP POLICY IF EXISTS "Project managers can delete" ON public.projects;

CREATE POLICY "Project managers can delete"
    ON public.projects FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = auth.uid()
              AND project_members.role IN ('owner', 'lead')
        )
    );
