import { supabase } from "./supabase";

// =====================================================
// Channel Operations
// =====================================================

export async function getOrgChannels(orgId: string) {
  const { data, error } = await (supabase as any)
    .from("channels")
    .select("*, channel_members(count)")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("channel_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function getProjectChannels(projectId: string) {
  const { data, error } = await (supabase as any)
    .from("channels")
    .select("*, channel_members(count)")
    .eq("project_id", projectId)
    .eq("is_archived", false)
    .order("channel_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function createChannel(data: {
  name: string;
  description?: string;
  channel_type: string;
  visibility?: string;
  org_id?: string;
  project_id?: string;
  created_by: string;
}) {
  const { data: channel, error } = await (supabase as any)
    .from("channels")
    .insert({
      name: data.name,
      description: data.description || null,
      channel_type: data.channel_type,
      visibility: data.visibility || "public",
      org_id: data.org_id || null,
      project_id: data.project_id || null,
      created_by: data.created_by,
    })
    .select()
    .single();

  if (error) throw error;

  // Add creator as admin member
  await (supabase as any)
    .from("channel_members")
    .insert({
      channel_id: channel.id,
      user_id: data.created_by,
      role: "admin",
    });

  return channel;
}

export async function archiveChannel(channelId: string) {
  const { error } = await (supabase as any)
    .from("channels")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", channelId);

  if (error) throw error;
}

export async function getChannelMembers(channelId: string) {
  const { data, error } = await (supabase as any)
    .from("channel_members")
    .select("*, users(id, email, full_name, avatar_url)")
    .eq("channel_id", channelId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function addChannelMember(channelId: string, userId: string) {
  const { error } = await (supabase as any)
    .from("channel_members")
    .insert({ channel_id: channelId, user_id: userId, role: "member" });

  if (error && !error.message?.includes("duplicate")) throw error;
}

export async function removeChannelMember(channelId: string, userId: string) {
  const { error } = await (supabase as any)
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function addAllOrgMembersToChannel(channelId: string, orgId: string) {
  // Get all org members
  const { data: orgMembers, error: membersError } = await (supabase as any)
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId);

  if (membersError) throw membersError;

  // Add each member to the channel
  const inserts = (orgMembers as any[]).map((m: any) => ({
    channel_id: channelId,
    user_id: m.user_id,
    role: "member",
  }));

  if (inserts.length > 0) {
    const { error } = await (supabase as any)
      .from("channel_members")
      .upsert(inserts, { onConflict: "channel_id,user_id" });
    if (error) throw error;
  }
}

export async function addAllProjectMembersToChannel(channelId: string, projectId: string) {
  const { data: projectMembers, error: membersError } = await (supabase as any)
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  if (membersError) throw membersError;

  const inserts = (projectMembers as any[]).map((m: any) => ({
    channel_id: channelId,
    user_id: m.user_id,
    role: "member",
  }));

  if (inserts.length > 0) {
    const { error } = await (supabase as any)
      .from("channel_members")
      .upsert(inserts, { onConflict: "channel_id,user_id" });
    if (error) throw error;
  }
}

// =====================================================
// Message Operations
// =====================================================

export async function getMessages(
  channelId: string,
  limit: number = 50,
  before?: string
) {
  let query = (supabase as any)
    .from("messages")
    .select("*, users(id, email, full_name, avatar_url), message_attachments(*), message_reactions(*)")
    .eq("channel_id", channelId)
    .is("parent_message_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as any[]).reverse();
}

export async function getThreadReplies(parentMessageId: string) {
  const { data, error } = await (supabase as any)
    .from("messages")
    .select("*, users(id, email, full_name, avatar_url), message_attachments(*), message_reactions(*)")
    .eq("parent_message_id", parentMessageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function sendMessage(data: {
  channel_id: string;
  sender_id: string;
  content: string;
  parent_message_id?: string;
  message_type?: string;
}) {
  const { data: message, error } = await (supabase as any)
    .from("messages")
    .insert({
      channel_id: data.channel_id,
      sender_id: data.sender_id,
      content: data.content,
      parent_message_id: data.parent_message_id || null,
      message_type: data.message_type || "text",
    })
    .select("*, users(id, email, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return message;
}

export async function editMessage(messageId: string, content: string) {
  const { error } = await (supabase as any)
    .from("messages")
    .update({
      content,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await (supabase as any)
    .from("messages")
    .update({
      is_deleted: true,
      content: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw error;
}

// =====================================================
// Reactions
// =====================================================

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const { error } = await (supabase as any)
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: userId, emoji });

  if (error && !error.message?.includes("duplicate")) throw error;
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  const { error } = await (supabase as any)
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji);

  if (error) throw error;
}

// =====================================================
// Mentions
// =====================================================

export async function createMentions(messageId: string, userIds: string[]) {
  if (userIds.length === 0) return;

  const inserts = userIds.map((uid) => ({
    message_id: messageId,
    mentioned_user_id: uid,
  }));

  const { error } = await (supabase as any)
    .from("message_mentions")
    .insert(inserts);

  if (error) throw error;
}

// =====================================================
// Read Tracking
// =====================================================

export async function updateLastRead(channelId: string, userId: string) {
  const { error } = await (supabase as any)
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getUnreadCounts(userId: string, channelIds: string[]) {
  if (channelIds.length === 0) return {};

  const counts: Record<string, number> = {};

  for (const channelId of channelIds) {
    // Get user's last_read_at for this channel
    const { data: membership } = await (supabase as any)
      .from("channel_members")
      .select("last_read_at")
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .single();

    if (membership?.last_read_at) {
      const { count } = await (supabase as any)
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", channelId)
        .gt("created_at", membership.last_read_at)
        .neq("sender_id", userId)
        .eq("is_deleted", false);

      counts[channelId] = count || 0;
    }
  }

  return counts;
}

// =====================================================
// File Attachments
// =====================================================

export async function uploadChatFile(
  channelId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const ext = file.name.split(".").pop();
  const fileName = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(fileName, file);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("chat-attachments")
    .getPublicUrl(fileName);

  return { path: fileName, url: urlData.publicUrl };
}

export async function createAttachmentRecord(data: {
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}) {
  const { error } = await (supabase as any)
    .from("message_attachments")
    .insert(data);

  if (error) throw error;
}
