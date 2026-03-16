-- =====================================================
-- Task File Attachments
-- =====================================================
-- Adds task_id column to files table so files can be
-- attached directly to tasks.

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Index for querying files by task
CREATE INDEX IF NOT EXISTS idx_files_task_id
  ON files (task_id)
  WHERE task_id IS NOT NULL;

-- RLS: allow project members to view task-attached files
CREATE POLICY "View task-attached files"
  ON files FOR SELECT
  USING (
    task_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = auth.uid()
      WHERE t.id = files.task_id
    )
  );

-- RLS: allow project contributors to attach files to tasks
CREATE POLICY "Upload task-attached files"
  ON files FOR INSERT
  WITH CHECK (
    task_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'lead', 'contributor')
      WHERE t.id = files.task_id
    )
  );
