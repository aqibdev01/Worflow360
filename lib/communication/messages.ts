import { supabase } from "../supabase";

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
    .select("*, users(id, email, full_name, avatar_url), message_reactions(*)")
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

export async function getThreadMessages(parentMessageId: string) {
  const { data, error } = await (supabase as any)
    .from("messages")
    .select("*, users(id, email, full_name, avatar_url), message_reactions(*)")
    .eq("parent_message_id", parentMessageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as any[];
}

export async function sendMessage(
  channelId: string,
  content: string,
  type: string = "text",
  metadata?: Record<string, any>,
  parentMessageId?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: message, error } = await (supabase as any)
    .from("messages")
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content,
      type,
      metadata: metadata || null,
      parent_message_id: parentMessageId || null,
    })
    .select("*, users(id, email, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return message;
}

export async function editMessage(messageId: string, content: string) {
  const { error } = await (supabase as any)
    .from("messages")
    .update({ content, is_edited: true })
    .eq("id", messageId);

  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await (supabase as any)
    .from("messages")
    .update({ is_deleted: true, content: "[deleted]" })
    .eq("id", messageId);

  if (error) throw error;
}

// =====================================================
// Reactions
// =====================================================

export async function toggleReaction(messageId: string, emoji: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if reaction already exists
  const { data: existing } = await (supabase as any)
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    // Remove reaction
    const { error } = await (supabase as any)
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return { action: "removed" as const };
  } else {
    // Add reaction
    const { error } = await (supabase as any)
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: user.id, emoji });
    if (error) throw error;
    return { action: "added" as const };
  }
}

// =====================================================
// File Attachments
// =====================================================

export async function uploadAttachment(file: File, channelId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Upload file to storage
  const ext = file.name.split(".").pop();
  const storagePath = `${user.id}/${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-attachments")
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("chat-attachments")
    .getPublicUrl(storagePath);

  // Send a file message with metadata
  const metadata = {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    storagePath,
  };

  const message = await sendMessage(channelId, file.name, "file", metadata);
  return message;
}
