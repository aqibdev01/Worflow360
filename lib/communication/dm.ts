import { supabase } from "../supabase";

// =====================================================
// Direct Message Operations
// =====================================================

async function resolveUserId(currentUserId?: string): Promise<string> {
  if (currentUserId && currentUserId.length > 0) return currentUserId;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}


export async function getOrCreateDMThread(targetUserId: string, orgId: string, currentUserId?: string) {
  const userId = await resolveUserId(currentUserId);

  // Find all threads the current user is in for this org
  const { data: myThreads } = await (supabase as any)
    .from("direct_message_participants")
    .select("thread_id")
    .eq("user_id", userId);

  if (myThreads && myThreads.length > 0) {
    const threadIds = (myThreads as any[]).map((t: any) => t.thread_id);

    // Single query: find if target user shares any of these threads in this org
    const { data: sharedThreads } = await (supabase as any)
      .from("direct_message_participants")
      .select("thread_id, direct_message_threads(organization_id)")
      .eq("user_id", targetUserId)
      .in("thread_id", threadIds);

    if (sharedThreads) {
      const match = (sharedThreads as any[]).find(
        (t: any) => t.direct_message_threads?.organization_id === orgId
      );
      if (match) return match.thread_id as string;
    }
  }

  // No existing thread — create new
  // Use .select('id') and don't rely on RLS for the immediate return
  const { data: thread, error: threadError } = await (supabase as any)
    .from("direct_message_threads")
    .insert({ organization_id: orgId })
    .select("id")
    .single();

  if (threadError) throw threadError;
  if (!thread?.id) throw new Error("Failed to create DM thread — no ID returned");

  const threadId = thread.id as string;

  const { error: participantError } = await (supabase as any)
    .from("direct_message_participants")
    .insert([
      { thread_id: threadId, user_id: userId },
      { thread_id: threadId, user_id: targetUserId },
    ]);

  if (participantError) throw participantError;

  return threadId;
}

export async function getDMThreads(orgId: string, currentUserId?: string) {
  const userId = await resolveUserId(currentUserId);

  // Get all threads the user is a participant in for this org
  const { data: participations, error: partError } = await (supabase as any)
    .from("direct_message_participants")
    .select("thread_id")
    .eq("user_id", userId);

  if (partError) throw partError;
  if (!participations || participations.length === 0) return [];

  const threadIds = (participations as any[]).map((p: any) => p.thread_id);

  // Get thread details with participants and filter by org
  const { data: threads, error: threadError } = await (supabase as any)
    .from("direct_message_threads")
    .select(`
      *,
      direct_message_participants(
        user_id,
        last_read_at,
        users(id, email, full_name, avatar_url)
      )
    `)
    .in("id", threadIds)
    .eq("organization_id", orgId);

  if (threadError) throw threadError;
  if (!threads || threads.length === 0) return [];

  // For each thread, get the last message
  const threadsWithLastMessage = await Promise.all(
    (threads as any[]).map(async (thread: any) => {
      const { data: lastMsgArr } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const lastMsg = lastMsgArr?.[0] || null;

      return {
        ...thread,
        last_message: lastMsg || null,
        other_participants: (thread.direct_message_participants || []).filter(
          (p: any) => p.user_id !== userId
        ),
      };
    })
  );

  // Sort by last message time (most recent first)
  return threadsWithLastMessage.sort((a: any, b: any) => {
    const aTime = a.last_message?.created_at || a.created_at;
    const bTime = b.last_message?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export async function getDMMessages(
  threadId: string,
  limit: number = 50,
  before?: string
) {
  let query = (supabase as any)
    .from("direct_messages")
    .select("*, users:sender_id(id, email, full_name, avatar_url)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as any[]).reverse();
}

export async function sendDM(
  threadId: string,
  content: string,
  type: string = "text",
  metadata?: Record<string, any>,
  currentUserId?: string
) {
  const userId = await resolveUserId(currentUserId);

  const { data: message, error } = await (supabase as any)
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      sender_id: userId,
      content,
      type,
      metadata: metadata || null,
    })
    .select("*, users:sender_id(id, email, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return message;
}

export async function editDMMessage(messageId: string, content: string) {
  const { error } = await (supabase as any)
    .from("direct_messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
}

export async function deleteDMMessage(messageId: string) {
  const { error } = await (supabase as any)
    .from("direct_messages")
    .update({ is_deleted: true, content: "" })
    .eq("id", messageId);

  if (error) throw error;
}

export async function updateDMLastRead(threadId: string, currentUserId?: string) {
  const userId = await resolveUserId(currentUserId);

  const { error } = await (supabase as any)
    .from("direct_message_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", userId);

  if (error) throw error;
}
