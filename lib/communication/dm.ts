import { supabase } from "../supabase";

// =====================================================
// Direct Message Operations
// =====================================================

export async function getOrCreateDMThread(targetUserId: string, orgId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Find existing thread between these two users in this org
  const { data: existingThreads } = await (supabase as any)
    .from("direct_message_participants")
    .select("thread_id")
    .eq("user_id", user.id);

  if (existingThreads && existingThreads.length > 0) {
    const threadIds = (existingThreads as any[]).map((t: any) => t.thread_id);

    // Check if target user is also a participant in any of these threads
    const { data: sharedThreads } = await (supabase as any)
      .from("direct_message_participants")
      .select("thread_id, direct_message_threads(organization_id)")
      .eq("user_id", targetUserId)
      .in("thread_id", threadIds);

    if (sharedThreads && sharedThreads.length > 0) {
      // Find thread in the correct org
      const matchingThread = (sharedThreads as any[]).find(
        (t: any) => t.direct_message_threads?.organization_id === orgId
      );
      if (matchingThread) {
        return matchingThread.thread_id as string;
      }
    }
  }

  // Create new thread
  const { data: thread, error: threadError } = await (supabase as any)
    .from("direct_message_threads")
    .insert({ organization_id: orgId })
    .select()
    .single();

  if (threadError) throw threadError;

  // Add both participants
  const { error: participantError } = await (supabase as any)
    .from("direct_message_participants")
    .insert([
      { thread_id: thread.id, user_id: user.id },
      { thread_id: thread.id, user_id: targetUserId },
    ]);

  if (participantError) throw participantError;

  return thread.id as string;
}

export async function getDMThreads(orgId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get all threads the user is a participant in for this org
  const { data: participations, error: partError } = await (supabase as any)
    .from("direct_message_participants")
    .select("thread_id")
    .eq("user_id", user.id);

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
      const { data: lastMsg } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...thread,
        last_message: lastMsg || null,
        // Filter out current user from participants for display
        other_participants: (thread.direct_message_participants || []).filter(
          (p: any) => p.user_id !== user.id
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
  metadata?: Record<string, any>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: message, error } = await (supabase as any)
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content,
      type,
      metadata: metadata || null,
    })
    .select("*, users:sender_id(id, email, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return message;
}

export async function updateDMLastRead(threadId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("direct_message_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (error) throw error;
}
