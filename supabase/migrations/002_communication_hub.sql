-- =====================================================
-- Workflow360 Communication Hub Schema
-- Version: 2.0.0
-- Adds: Channels, Messages, Reactions, DMs, Realtime
-- Run AFTER 001_complete_schema.sql
-- =====================================================

-- =====================================================
-- ENUM TYPES FOR COMMUNICATION
-- =====================================================
DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('public', 'private', 'announcement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_member_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'system', 'task_ref', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE dm_message_type AS ENUM ('text', 'file', 'task_ref');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CHANNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    type channel_type NOT NULL DEFAULT 'public',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS channels_org_id_idx ON public.channels(organization_id);
CREATE INDEX IF NOT EXISTS channels_project_id_idx ON public.channels(project_id);
CREATE INDEX IF NOT EXISTS channels_type_idx ON public.channels(type);
CREATE INDEX IF NOT EXISTS channels_created_by_idx ON public.channels(created_by);

-- =====================================================
-- CHANNEL MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role channel_member_role NOT NULL DEFAULT 'member',
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS channel_members_channel_id_idx ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS channel_members_user_id_idx ON public.channel_members(user_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type NOT NULL DEFAULT 'text',
    metadata JSONB,
    parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reply_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_channel_id_created_at_idx ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_parent_message_id_idx ON public.messages(parent_message_id);

-- =====================================================
-- MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON public.message_reactions(message_id);

-- =====================================================
-- DIRECT MESSAGE THREADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dm_threads_org_id_idx ON public.direct_message_threads(organization_id);

-- =====================================================
-- DIRECT MESSAGE PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_message_participants (
    thread_id UUID NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS dm_participants_user_id_idx ON public.direct_message_participants(user_id);

-- =====================================================
-- DIRECT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type dm_message_type NOT NULL DEFAULT 'text',
    metadata JSONB,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dm_thread_id_created_at_idx ON public.direct_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_sender_id_idx ON public.direct_messages(sender_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_direct_messages_updated_at ON public.direct_messages;
CREATE TRIGGER update_direct_messages_updated_at BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: AUTO-INCREMENT REPLY COUNT ON THREAD REPLY
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_message_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS increment_message_reply_count ON public.messages;
CREATE TRIGGER increment_message_reply_count
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.increment_reply_count();

-- =====================================================
-- TRIGGER: DECREMENT REPLY COUNT ON THREAD REPLY DELETE
-- =====================================================
CREATE OR REPLACE FUNCTION public.decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.parent_message_id IS NOT NULL THEN
        UPDATE public.messages
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.parent_message_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decrement_message_reply_count ON public.messages;
CREATE TRIGGER decrement_message_reply_count
    AFTER DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.decrement_reply_count();

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is a member of a channel
CREATE OR REPLACE FUNCTION public.user_is_channel_member(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id AND user_id = auth.uid()
    );
$$;

-- Check if user can access a channel (member OR public channel in their org)
CREATE OR REPLACE FUNCTION public.user_can_access_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        -- Direct member
        SELECT 1 FROM public.channel_members
        WHERE channel_id = p_channel_id AND user_id = auth.uid()
    ) OR EXISTS (
        -- Public channel in user's org
        SELECT 1 FROM public.channels c
        JOIN public.organization_members om ON om.org_id = c.organization_id
        WHERE c.id = p_channel_id
        AND c.type = 'public'
        AND om.user_id = auth.uid()
        AND c.is_archived = false
    );
$$;

-- Check if user is a DM thread participant
CREATE OR REPLACE FUNCTION public.user_is_dm_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.direct_message_participants
        WHERE thread_id = p_thread_id AND user_id = auth.uid()
    );
$$;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: CHANNELS
-- =====================================================
DROP POLICY IF EXISTS "Users can view channels in their org" ON public.channels;
DROP POLICY IF EXISTS "Org admins/managers can create channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can update channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can delete channels" ON public.channels;

-- Users can see public channels in their org + channels they are members of
CREATE POLICY "Users can view channels in their org"
    ON public.channels FOR SELECT
    TO authenticated
    USING (
        -- Public/announcement channels in user's org
        (type IN ('public', 'announcement') AND public.user_is_org_member(organization_id))
        OR
        -- Private channels user is a member of
        public.user_is_channel_member(id)
    );

-- Org members can create channels (admins/managers enforced in app)
CREATE POLICY "Org members can create channels"
    ON public.channels FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_is_org_member(organization_id)
        AND created_by = auth.uid()
    );

-- Channel creator or org admins can update
CREATE POLICY "Channel creators can update channels"
    ON public.channels FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = channels.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Channel creator or org admins can delete
CREATE POLICY "Channel creators can delete channels"
    ON public.channels FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE org_id = channels.organization_id
            AND user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- RLS POLICIES: CHANNEL MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can add members" ON public.channel_members;
DROP POLICY IF EXISTS "Channel admins can update members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can leave or admins can remove" ON public.channel_members;

CREATE POLICY "Users can view channel members"
    ON public.channel_members FOR SELECT
    TO authenticated
    USING (public.user_can_access_channel(channel_id));

CREATE POLICY "Users can join public channels"
    ON public.channel_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.channels c
            JOIN public.organization_members om ON om.org_id = c.organization_id
            WHERE c.id = channel_id
            AND om.user_id = auth.uid()
            AND c.type = 'public'
        )
    );

CREATE POLICY "Channel admins can add members"
    ON public.channel_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.channels c
            WHERE c.id = channel_members.channel_id
            AND c.created_by = auth.uid()
        )
    );

CREATE POLICY "Channel admins can update members"
    ON public.channel_members FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

CREATE POLICY "Users can leave or admins can remove"
    ON public.channel_members FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- =====================================================
-- RLS POLICIES: MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Channel members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON public.messages;

CREATE POLICY "Users can view messages in accessible channels"
    ON public.messages FOR SELECT
    TO authenticated
    USING (public.user_can_access_channel(channel_id));

CREATE POLICY "Channel members can send messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.user_can_access_channel(channel_id)
    );

CREATE POLICY "Senders can update own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- =====================================================
-- RLS POLICIES: MESSAGE REACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view reactions in accessible channels" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions in accessible channels"
    ON public.message_reactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
            AND public.user_can_access_channel(m.channel_id)
        )
    );

CREATE POLICY "Users can add reactions"
    ON public.message_reactions FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
            AND public.user_can_access_channel(m.channel_id)
        )
    );

CREATE POLICY "Users can remove own reactions"
    ON public.message_reactions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGE THREADS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own DM threads" ON public.direct_message_threads;
DROP POLICY IF EXISTS "Org members can create DM threads" ON public.direct_message_threads;

CREATE POLICY "Users can view own DM threads"
    ON public.direct_message_threads FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(id));

CREATE POLICY "Org members can create DM threads"
    ON public.direct_message_threads FOR INSERT
    TO authenticated
    WITH CHECK (public.user_is_org_member(organization_id));

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGE PARTICIPANTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own DM participants" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can add DM participants" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can update own DM read status" ON public.direct_message_participants;

CREATE POLICY "Users can view own DM participants"
    ON public.direct_message_participants FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(thread_id));

CREATE POLICY "Users can add DM participants"
    ON public.direct_message_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR public.user_is_dm_participant(thread_id)
    );

CREATE POLICY "Users can update own DM read status"
    ON public.direct_message_participants FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: DIRECT MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view DMs in their threads" ON public.direct_messages;
DROP POLICY IF EXISTS "Participants can send DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders can update own DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders can delete own DMs" ON public.direct_messages;

CREATE POLICY "Users can view DMs in their threads"
    ON public.direct_messages FOR SELECT
    TO authenticated
    USING (public.user_is_dm_participant(thread_id));

CREATE POLICY "Participants can send DMs"
    ON public.direct_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.user_is_dm_participant(thread_id)
    );

CREATE POLICY "Senders can update own DMs"
    ON public.direct_messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete own DMs"
    ON public.direct_messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());

-- =====================================================
-- TRIGGER: AUTO-CREATE DEFAULT CHANNEL FOR ORGANIZATION
-- When a new org member is added, ensure a #general channel exists
-- and add the member to it
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_create_org_default_channel()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_id UUID;
BEGIN
    -- Check if a #general channel exists for the org
    SELECT id INTO v_channel_id
    FROM public.channels
    WHERE organization_id = NEW.org_id
    AND project_id IS NULL
    AND name = 'general'
    LIMIT 1;

    -- Create it if it doesn't exist
    IF v_channel_id IS NULL THEN
        INSERT INTO public.channels (organization_id, name, display_name, description, type, created_by)
        VALUES (
            NEW.org_id,
            'general',
            'General',
            'Default channel for organization-wide discussions',
            'public',
            NEW.user_id
        )
        RETURNING id INTO v_channel_id;
    END IF;

    -- Add the new member to the #general channel
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_org_channel ON public.organization_members;
CREATE TRIGGER auto_create_org_channel
    AFTER INSERT ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_org_default_channel();

-- =====================================================
-- TRIGGER: AUTO-CREATE DEFAULT CHANNEL FOR PROJECT
-- When a new project member is added, ensure a #general channel exists
-- and add the member to it
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_create_project_default_channel()
RETURNS TRIGGER AS $$
DECLARE
    v_channel_id UUID;
    v_org_id UUID;
BEGIN
    -- Get the org_id for this project
    SELECT org_id INTO v_org_id
    FROM public.projects
    WHERE id = NEW.project_id;

    -- Check if a #general channel exists for the project
    SELECT id INTO v_channel_id
    FROM public.channels
    WHERE project_id = NEW.project_id
    AND name = 'general'
    LIMIT 1;

    -- Create it if it doesn't exist
    IF v_channel_id IS NULL THEN
        INSERT INTO public.channels (organization_id, project_id, name, display_name, description, type, created_by)
        VALUES (
            v_org_id,
            NEW.project_id,
            'general',
            'General',
            'Default channel for project discussions',
            'public',
            NEW.user_id
        )
        RETURNING id INTO v_channel_id;
    END IF;

    -- Add the new member to the project's #general channel
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_project_channel ON public.project_members;
CREATE TRIGGER auto_create_project_channel
    AFTER INSERT ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_project_default_channel();

-- =====================================================
-- ENABLE SUPABASE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;

-- =====================================================
-- STORAGE BUCKET: CHAT ATTACHMENTS
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to chat-attachments
CREATE POLICY "Authenticated users can upload chat files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can view chat files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================
-- GRANT PERMISSIONS FOR NEW FUNCTIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.user_is_channel_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_channel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_dm_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reply_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_reply_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_org_default_channel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_project_default_channel() TO authenticated;

-- =====================================================
-- COMMUNICATION HUB MIGRATION COMPLETE
-- =====================================================
