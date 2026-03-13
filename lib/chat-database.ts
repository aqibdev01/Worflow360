// Re-export all communication functions for backward compatibility
// New code should import from @/lib/communication instead
import { supabase } from "./supabase";

export {
  getOrgChannels,
  getProjectChannels,
  createChannel,
  joinChannel,
  leaveChannel,
  archiveChannel,
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  addAllOrgMembersToChannel,
  addAllProjectMembersToChannel,
  updateLastRead,
  getUnreadCounts,
} from "./communication/channels";

export {
  getMessages,
  getThreadMessages as getThreadReplies,
  editMessage,
  deleteMessage,
  toggleReaction,
  uploadAttachment,
} from "./communication/messages";

export {
  getOrCreateDMThread,
  getDMThreads,
  getDMMessages,
  sendDM,
  updateDMLastRead,
} from "./communication/dm";

// Legacy sendMessage wrapper — old code passes an object, new code uses positional args
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
      type: data.message_type || "text",
    })
    .select("*, users(id, email, full_name, avatar_url)")
    .single();

  if (error) throw error;
  return message;
}

// Legacy reaction wrappers
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

// Legacy mentions — now stored as @[Name](userId) in message content, no separate table
export async function createMentions(_messageId: string, _userIds: string[]) {
  return;
}

// Legacy file upload wrapper
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

// Legacy attachment record — file info now stored in message.metadata
export async function createAttachmentRecord(_data: {
  message_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}) {
  return;
}
