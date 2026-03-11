"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getMessages, getThreadReplies } from "@/lib/chat-database";

interface MessageData {
  id: string;
  channel_id: string;
  sender_id: string;
  parent_message_id: string | null;
  content: string;
  message_type: string;
  reply_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  message_attachments?: any[];
  message_reactions?: any[];
}

export function useRealtimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<any>(null);

  // Load initial messages
  const loadMessages = useCallback(async () => {
    if (!channelId) return;

    setLoading(true);
    try {
      const data = await getMessages(channelId, 50);
      setMessages(data);
      setHasMore(data.length === 50);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Load older messages (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    try {
      const data = await getMessages(channelId, 50, oldestMessage.created_at);
      if (data.length < 50) setHasMore(false);
      setMessages((prev) => [...data, ...prev]);
    } catch (error) {
      console.error("Error loading more messages:", error);
    }
  }, [channelId, hasMore, messages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!channelId) return;

    loadMessages();

    // Set up realtime subscription
    const realtimeChannel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: any) => {
          // Fetch the full message with user data
          const { data: fullMessage } = await (supabase as any)
            .from("messages")
            .select("*, users(id, email, full_name, avatar_url), message_attachments(*), message_reactions(*)")
            .eq("id", payload.new.id)
            .single();

          if (fullMessage) {
            if (fullMessage.parent_message_id) {
              // It's a thread reply - update parent's reply_count
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === fullMessage.parent_message_id
                    ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                    : m
                )
              );
            } else {
              // Top-level message - add to list
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === fullMessage.id)) return prev;
                return [...prev, fullMessage];
              });
            }
          }
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: any) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            )
          );
        }
      )
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, loadMessages]);

  return {
    messages,
    setMessages,
    loading,
    hasMore,
    loadMore,
    refreshMessages: loadMessages,
  };
}

// Separate hook for thread replies
export function useThreadReplies(parentMessageId: string | null) {
  const [replies, setReplies] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReplies = useCallback(async () => {
    if (!parentMessageId) return;
    setLoading(true);
    try {
      const data = await getThreadReplies(parentMessageId);
      setReplies(data);
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      setLoading(false);
    }
  }, [parentMessageId]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  return { replies, setReplies, loading, refreshReplies: loadReplies };
}
