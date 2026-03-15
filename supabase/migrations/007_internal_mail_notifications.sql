-- =====================================================
-- Internal Mail System & Notification Centre
-- =====================================================
-- NOTE: This migration replaces the old lightweight `notifications`
-- table (columns: read, message, type=notification_type enum) with
-- an expanded version (is_read, body, organization_id, metadata, etc.)

-- 1. Mail Messages
CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'announcement', 'newsletter')),
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mail Recipients
CREATE TABLE IF NOT EXISTS mail_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id UUID NOT NULL REFERENCES mail_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'archived', 'trash')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Mail Attachments
CREATE TABLE IF NOT EXISTS mail_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id UUID NOT NULL REFERENCES mail_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Replace old notifications table with expanded version
-- Drop old policies, indexes, and table first
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP INDEX IF EXISTS notifications_user_id_idx;
DROP INDEX IF EXISTS notifications_read_idx;
DROP INDEX IF EXISTS notifications_created_at_idx;
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned', 'task_status_changed', 'mentioned',
    'sprint_deadline', 'mail_received', 'member_joined',
    'project_invite', 'comment', 'file_shared'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_recipients_user_read_folder
  ON mail_recipients (recipient_id, is_read, folder);

CREATE INDEX IF NOT EXISTS idx_mail_messages_org_sender_sent
  ON mail_messages (organization_id, sender_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_recipients_mail_id
  ON mail_recipients (mail_id);

CREATE INDEX IF NOT EXISTS idx_mail_attachments_mail_id
  ON mail_attachments (mail_id);

CREATE INDEX IF NOT EXISTS idx_notifications_org_id
  ON notifications (organization_id);

-- =====================================================
-- Storage Bucket: mail-attachments
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mail-attachments', 'mail-attachments', FALSE, 26214400)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS: mail_messages
-- =====================================================
ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;

-- Sender can view their own messages (sent + drafts)
CREATE POLICY "Sender can view own messages"
  ON mail_messages FOR SELECT
  USING (sender_id = auth.uid());

-- Recipients can view sent messages they received
CREATE POLICY "Recipients can view received messages"
  ON mail_messages FOR SELECT
  USING (
    is_draft = FALSE
    AND EXISTS (
      SELECT 1 FROM mail_recipients
      WHERE mail_recipients.mail_id = mail_messages.id
        AND mail_recipients.recipient_id = auth.uid()
    )
  );

-- Announcements readable by all org members
CREATE POLICY "Org members can view announcements"
  ON mail_messages FOR SELECT
  USING (
    type = 'announcement'
    AND is_draft = FALSE
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = mail_messages.organization_id
        AND user_id = auth.uid()
    )
  );

-- Org members can create messages
CREATE POLICY "Org members can create messages"
  ON mail_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = mail_messages.organization_id
        AND user_id = auth.uid()
    )
  );

-- Sender can update own messages (drafts, sent_at)
CREATE POLICY "Sender can update own messages"
  ON mail_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Sender can delete own drafts
CREATE POLICY "Sender can delete own drafts"
  ON mail_messages FOR DELETE
  USING (sender_id = auth.uid() AND is_draft = TRUE);

-- =====================================================
-- RLS: mail_recipients
-- =====================================================
ALTER TABLE mail_recipients ENABLE ROW LEVEL SECURITY;

-- Recipients see only their own rows
CREATE POLICY "Users see own recipient rows"
  ON mail_recipients FOR SELECT
  USING (recipient_id = auth.uid());

-- Sender of the mail can insert recipients
CREATE POLICY "Mail sender can add recipients"
  ON mail_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mail_messages
      WHERE mail_messages.id = mail_recipients.mail_id
        AND mail_messages.sender_id = auth.uid()
    )
  );

-- Recipients can update their own rows (read, star, archive, folder)
CREATE POLICY "Recipients can update own rows"
  ON mail_recipients FOR UPDATE
  USING (recipient_id = auth.uid());

-- Recipients can delete (move to trash permanently) their own rows
CREATE POLICY "Recipients can delete own rows"
  ON mail_recipients FOR DELETE
  USING (recipient_id = auth.uid());

-- =====================================================
-- RLS: mail_attachments
-- =====================================================
ALTER TABLE mail_attachments ENABLE ROW LEVEL SECURITY;

-- Viewable by sender or recipients of the mail
CREATE POLICY "View mail attachments"
  ON mail_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mail_messages
      WHERE mail_messages.id = mail_attachments.mail_id
        AND (
          mail_messages.sender_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM mail_recipients
            WHERE mail_recipients.mail_id = mail_messages.id
              AND mail_recipients.recipient_id = auth.uid()
          )
        )
    )
  );

-- Sender can upload attachments
CREATE POLICY "Sender can upload attachments"
  ON mail_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mail_messages
      WHERE mail_messages.id = mail_attachments.mail_id
        AND mail_messages.sender_id = auth.uid()
    )
  );

-- Sender can delete attachments on drafts
CREATE POLICY "Sender can delete draft attachments"
  ON mail_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mail_messages
      WHERE mail_messages.id = mail_attachments.mail_id
        AND mail_messages.sender_id = auth.uid()
        AND mail_messages.is_draft = TRUE
    )
  );

-- =====================================================
-- RLS: notifications
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- System/app can insert (any authenticated user for now; app-level logic controls creation)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Users can update own notifications (mark read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- Supabase Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE mail_recipients;

-- =====================================================
-- Storage Policies: mail-attachments bucket
-- =====================================================
CREATE POLICY "Authenticated users can upload to mail-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'mail-attachments');

CREATE POLICY "Authenticated users can read mail-attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'mail-attachments');

CREATE POLICY "Authenticated users can delete mail-attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'mail-attachments');

-- =====================================================
-- updated_at trigger for mail_messages
-- =====================================================
CREATE TRIGGER set_mail_messages_updated_at
  BEFORE UPDATE ON mail_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Auto-delete old notifications (older than 60 days)
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_old_notifications()
RETURNS void AS $$
  DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '60 days';
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_old_notifications() TO authenticated;
