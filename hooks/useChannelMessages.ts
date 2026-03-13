"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  getMessages,
  getThreadMessages,
  sendMessage as sendMessageFn,
  editMessage as editMessageFn,
  deleteMessage as deleteMessageFn,
} from "@/lib/communication/messages";

export interface MessageData {
  id: string;
  channel_id: string;
  sender_id: string;
  parent_message_id: string | null;
  content: string;
  type: string;
  metadata: Record<string, any> | null;
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
  message_reactions?: any[];
}

export function useChannelMessages(channelId: string | null) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef(channelId);
  const PAGE_SIZE = 50;

  // Track channel changes
  useEffect(() => {
    channelRef.current = channelId;
  }, [channelId]);

  // Load initial messages
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasMore(true);

    getMessages(channelId, PAGE_SIZE)
      .then((data) => {
        if (!cancelled && channelRef.current === channelId) {
          setMessages(data);
          setHasMore(data.length >= PAGE_SIZE);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [channelId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!channelId) return;

    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
          // Only handle top-level messages (not thread replies) — unless we want to update reply_count
          if (newMsg.parent_message_id) {
            // Update parent's reply_count
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newMsg.parent_message_id
                  ? { ...m, reply_count: (m.reply_count || 0) + 1 }
                  : m
              )
            );
            return;
          }

          // Fetch the full message with sender info
          const { data: fullMsg } = await (supabase as any)
            .from("messages")
            .select("*, users(id, email, full_name, avatar_url), message_reactions(*)")
            .eq("id", newMsg.id)
            .single();

          if (fullMsg && channelRef.current === channelId) {
            setMessages((prev) => {
              // Deduplicate
              if (prev.some((m) => m.id === fullMsg.id)) return prev;
              return [...prev, fullMsg];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, ...updated }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  // Also subscribe to reaction changes
  useEffect(() => {
    if (!channelId) return;

    const subscription = supabase
      .channel(`reactions:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async (payload: any) => {
          const msgId = payload.new?.message_id || payload.old?.message_id;
          if (!msgId) return;

          // Refetch reactions for this message
          const { data: reactions } = await (supabase as any)
            .from("message_reactions")
            .select("*")
            .eq("message_id", msgId);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, message_reactions: reactions || [] }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore || isLoading || messages.length === 0) return;

    const oldest = messages[0]?.created_at;
    if (!oldest) return;

    setIsLoading(true);
    try {
      const olderMessages = await getMessages(channelId, PAGE_SIZE, oldest);
      if (olderMessages.length < PAGE_SIZE) setHasMore(false);
      setMessages((prev) => [...olderMessages, ...prev]);
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, hasMore, isLoading, messages]);

  const sendMessage = useCallback(
    async (content: string, type?: string, metadata?: Record<string, any>) => {
      if (!channelId) return;
      return sendMessageFn(channelId, content, type, metadata);
    },
    [channelId]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      return editMessageFn(messageId, content);
    },
    []
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      return deleteMessageFn(messageId);
    },
    []
  );

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}

// Thread replies hook
export function useThreadMessages(parentMessageId: string | null) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!parentMessageId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getThreadMessages(parentMessageId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [parentMessageId]);

  // Subscribe to new thread replies
  useEffect(() => {
    if (!parentMessageId) return;

    const subscription = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        async (payload: any) => {
          const { data: fullMsg } = await (supabase as any)
            .from("messages")
            .select("*, users(id, email, full_name, avatar_url), message_reactions(*)")
            .eq("id", payload.new.id)
            .single();

          if (fullMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === fullMsg.id)) return prev;
              return [...prev, fullMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [parentMessageId]);

  return { messages, isLoading };
}
