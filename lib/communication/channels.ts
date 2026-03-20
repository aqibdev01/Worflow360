import { supabase } from "../supabase";

// =====================================================
// Channel Operations
// =====================================================

export async function getOrgChannels(orgId: string) {
  const { data, error } = await (supabase as any)
    .from("channels")
    .select("*, channel_members(count)")
    .eq("organization_id", orgId)
    .is("project_id", null)
    .eq("is_archived", false)
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
    .order("name", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function createChannel(
  orgId: string,
  data: {
    name: string;
    display_name: string;
    description?: string;
    type?: "public" | "private" | "announcement";
    project_id?: string;
    created_by: string;
  }
) {
  // Insert channel — .select() works because RLS SELECT policy includes created_by check
  const { data: channel, error } = await (supabase as any)
    .from("channels")
    .insert({
      organization_id: orgId,
      project_id: data.project_id || null,
      name: data.name,
      display_name: data.display_name,
      description: data.description || null,
      type: data.type || "public",
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

export async function updateChannel(
  channelId: string,
  data: { name?: string; display_name?: string; description?: string; type?: "public" | "private" | "announcement" }
) {
  const { data: channel, error } = await (supabase as any)
    .from("channels")
    .update(data)
    .eq("id", channelId)
    .select()
    .single();

  if (error) throw error;
  return channel;
}

export async function deleteChannel(channelId: string) {
  const { error } = await (supabase as any)
    .from("channels")
    .delete()
    .eq("id", channelId);

  if (error) throw error;
}

export async function joinChannel(channelId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("channel_members")
    .insert({ channel_id: channelId, user_id: user.id, role: "member" });

  if (error && !error.message?.includes("duplicate")) throw error;
}

export async function leaveChannel(channelId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId)
    .eq("user_id", user.id);

  if (error) throw error;
}

export async function archiveChannel(channelId: string) {
  const { error } = await (supabase as any)
    .from("channels")
    .update({ is_archived: true })
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
  const { data: orgMembers, error: membersError } = await (supabase as any)
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId);

  if (membersError) throw membersError;

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
