-- =====================================================
-- File & Document Management
-- =====================================================

-- 1. File Folders
CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. File Versions
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. File Shares
CREATE TABLE IF NOT EXISTS file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('org', 'project', 'member')),
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'download', 'edit')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. File Stars
CREATE TABLE IF NOT EXISTS file_stars (
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (file_id, user_id)
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_files_org_project_folder
  ON files (organization_id, project_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by
  ON files (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_file_shares_file_id
  ON file_shares (file_id);

CREATE INDEX IF NOT EXISTS idx_file_folders_org_project_parent
  ON file_folders (organization_id, project_id, parent_folder_id);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id
  ON file_versions (file_id);

CREATE INDEX IF NOT EXISTS idx_file_stars_user_id
  ON file_stars (user_id);

-- =====================================================
-- Supabase Storage Bucket
-- =====================================================
-- Run via Supabase dashboard or SQL:
--   INSERT INTO storage.buckets (id, name, public, file_size_limit)
--   VALUES ('org-files', 'org-files', FALSE, 26214400);
--
-- 25 MB = 26214400 bytes, private by default.
-- Access controlled via signed URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org-files', 'org-files', FALSE, 26214400)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS Helper Functions
-- =====================================================

-- Check if user is a member of the organization
CREATE OR REPLACE FUNCTION user_is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Check if user is an org admin or manager
CREATE OR REPLACE FUNCTION user_is_org_admin_or_manager(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$;

-- Check if user is a project member
CREATE OR REPLACE FUNCTION user_is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

-- Check if user is a project contributor or above (owner/lead/contributor)
CREATE OR REPLACE FUNCTION user_is_project_contributor(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'lead', 'contributor')
  );
$$;

-- =====================================================
-- RLS Policies — file_folders
-- =====================================================

ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level folders visible to org members, project folders to project members
CREATE POLICY "View org-level folders"
  ON file_folders FOR SELECT
  USING (
    project_id IS NULL
    AND user_is_org_member(organization_id)
  );

CREATE POLICY "View project-level folders"
  ON file_folders FOR SELECT
  USING (
    project_id IS NOT NULL
    AND user_is_project_member(project_id)
  );

-- INSERT: org admins/managers can create org folders, project contributors+ can create project folders
CREATE POLICY "Create org-level folders"
  ON file_folders FOR INSERT
  WITH CHECK (
    project_id IS NULL
    AND user_is_org_admin_or_manager(organization_id)
  );

CREATE POLICY "Create project-level folders"
  ON file_folders FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND user_is_project_contributor(project_id)
  );

-- UPDATE: creator or org admin/manager for org folders, creator or project contributor+ for project folders
CREATE POLICY "Update org-level folders"
  ON file_folders FOR UPDATE
  USING (
    project_id IS NULL
    AND (
      created_by = auth.uid()
      OR user_is_org_admin_or_manager(organization_id)
    )
  );

CREATE POLICY "Update project-level folders"
  ON file_folders FOR UPDATE
  USING (
    project_id IS NOT NULL
    AND (
      created_by = auth.uid()
      OR user_is_project_contributor(project_id)
    )
  );

-- DELETE: creator or org admin/manager for org folders, creator or project contributor+ for project folders
CREATE POLICY "Delete org-level folders"
  ON file_folders FOR DELETE
  USING (
    project_id IS NULL
    AND (
      created_by = auth.uid()
      OR user_is_org_admin_or_manager(organization_id)
    )
  );

CREATE POLICY "Delete project-level folders"
  ON file_folders FOR DELETE
  USING (
    project_id IS NOT NULL
    AND (
      created_by = auth.uid()
      OR user_is_project_contributor(project_id)
    )
  );

-- =====================================================
-- RLS Policies — files
-- =====================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- SELECT: org-level files visible to org members, project files to project members
CREATE POLICY "View org-level files"
  ON files FOR SELECT
  USING (
    project_id IS NULL
    AND user_is_org_member(organization_id)
  );

CREATE POLICY "View project-level files"
  ON files FOR SELECT
  USING (
    project_id IS NOT NULL
    AND user_is_project_member(project_id)
  );

-- Also allow viewing files shared directly with the user
CREATE POLICY "View files shared with user"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM file_shares
      WHERE file_shares.file_id = files.id
        AND file_shares.share_type = 'member'
        AND file_shares.shared_with_user_id = auth.uid()
        AND (file_shares.expires_at IS NULL OR file_shares.expires_at > now())
    )
  );

-- INSERT: org admins/managers for org files, project contributors+ for project files
CREATE POLICY "Upload org-level files"
  ON files FOR INSERT
  WITH CHECK (
    project_id IS NULL
    AND user_is_org_admin_or_manager(organization_id)
  );

CREATE POLICY "Upload project-level files"
  ON files FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND user_is_project_contributor(project_id)
  );

-- UPDATE: uploader or org admin/manager for org files, uploader or project contributor+ for project files
CREATE POLICY "Update org-level files"
  ON files FOR UPDATE
  USING (
    project_id IS NULL
    AND (
      uploaded_by = auth.uid()
      OR user_is_org_admin_or_manager(organization_id)
    )
  );

CREATE POLICY "Update project-level files"
  ON files FOR UPDATE
  USING (
    project_id IS NOT NULL
    AND (
      uploaded_by = auth.uid()
      OR user_is_project_contributor(project_id)
    )
  );

-- DELETE: uploader or org admin/manager for org files, uploader or project contributor+ for project files
CREATE POLICY "Delete org-level files"
  ON files FOR DELETE
  USING (
    project_id IS NULL
    AND (
      uploaded_by = auth.uid()
      OR user_is_org_admin_or_manager(organization_id)
    )
  );

CREATE POLICY "Delete project-level files"
  ON files FOR DELETE
  USING (
    project_id IS NOT NULL
    AND (
      uploaded_by = auth.uid()
      OR user_is_project_contributor(project_id)
    )
  );

-- =====================================================
-- RLS Policies — file_versions
-- =====================================================

ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

-- SELECT: if user can view the parent file
CREATE POLICY "View file versions"
  ON file_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_versions.file_id
        AND (
          (files.project_id IS NULL AND user_is_org_member(files.organization_id))
          OR (files.project_id IS NOT NULL AND user_is_project_member(files.project_id))
        )
    )
  );

-- INSERT: if user can update the parent file
CREATE POLICY "Create file versions"
  ON file_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_versions.file_id
        AND (
          (files.project_id IS NULL AND (files.uploaded_by = auth.uid() OR user_is_org_admin_or_manager(files.organization_id)))
          OR (files.project_id IS NOT NULL AND (files.uploaded_by = auth.uid() OR user_is_project_contributor(files.project_id)))
        )
    )
  );

-- DELETE: same as insert
CREATE POLICY "Delete file versions"
  ON file_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_versions.file_id
        AND (
          (files.project_id IS NULL AND (files.uploaded_by = auth.uid() OR user_is_org_admin_or_manager(files.organization_id)))
          OR (files.project_id IS NOT NULL AND (files.uploaded_by = auth.uid() OR user_is_project_contributor(files.project_id)))
        )
    )
  );

-- =====================================================
-- RLS Policies — file_shares
-- =====================================================

ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;

-- SELECT: org-wide shares visible to org members, member shares visible to the target user or creator
CREATE POLICY "View org-wide shares"
  ON file_shares FOR SELECT
  USING (
    share_type = 'org'
    AND EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_shares.file_id
        AND user_is_org_member(files.organization_id)
    )
  );

CREATE POLICY "View project shares"
  ON file_shares FOR SELECT
  USING (
    share_type = 'project'
    AND EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_shares.file_id
        AND files.project_id IS NOT NULL
        AND user_is_project_member(files.project_id)
    )
  );

CREATE POLICY "View member shares"
  ON file_shares FOR SELECT
  USING (
    share_type = 'member'
    AND (
      shared_with_user_id = auth.uid()
      OR shared_by = auth.uid()
    )
  );

-- INSERT: file owner or org admin/manager can share
CREATE POLICY "Create file shares"
  ON file_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_shares.file_id
        AND (
          files.uploaded_by = auth.uid()
          OR user_is_org_admin_or_manager(files.organization_id)
        )
    )
  );

-- DELETE: share creator or org admin/manager can revoke
CREATE POLICY "Delete file shares"
  ON file_shares FOR DELETE
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_shares.file_id
        AND user_is_org_admin_or_manager(files.organization_id)
    )
  );

-- =====================================================
-- RLS Policies — file_stars
-- =====================================================

ALTER TABLE file_stars ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own stars
CREATE POLICY "View own stars"
  ON file_stars FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Create own stars"
  ON file_stars FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own stars"
  ON file_stars FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- Storage Policies for org-files bucket
-- =====================================================

-- Allow authenticated users to upload to org-files (path-level checks done in app)
CREATE POLICY "Authenticated users can upload to org-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'org-files');

-- Allow authenticated users to read from org-files (signed URLs enforce access)
CREATE POLICY "Authenticated users can read org-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'org-files');

-- Allow authenticated users to update their uploads in org-files
CREATE POLICY "Authenticated users can update org-files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'org-files');

-- Allow authenticated users to delete from org-files
CREATE POLICY "Authenticated users can delete org-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'org-files');
