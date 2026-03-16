"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getDMMessages, sendDM, updateDMLastRead } from "@/lib/communication/dm";

export interface DMMessageData {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  type: string;
  metadata: Record<string, any> | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useDMMessages(threadId: string | null) {
  const [messages, setMessages] = useState<DMMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const threadRef = useRef(threadId);
  const PAGE_SIZE = 50;

  useEffect(() => {
    threadRef.current = threadId;
  }, [threadId]);

  // Load initial messages
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasMore(true);

    getDMMessages(threadId, PAGE_SIZE)
      .then((data) => {
        if (!cancelled && threadRef.current === threadId) {
          setMessages(data || []);
          setHasMore((data || []).length >= PAGE_SIZE);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // Subscribe to realtime DM messages
  useEffect(() => {
    if (!threadId) return;

    const subscription = supabase
      .channel(`dm-messages:${threadId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload: any) => {
          // Fetch the full message with user details
          const { data: fullMsg } = await (supabase as any)
            .from("direct_messages")
            .select("*, users:sender_id(id, email, full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();

          if (fullMsg && threadRef.current === threadId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === fullMsg.id)) return prev;
              return [...prev, fullMsg];
            });
          }
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [threadId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!threadId || !hasMore || isLoading || messages.length === 0) return;

    const oldest = messages[0]?.created_at;
    if (!oldest) return;

    setIsLoading(true);
    try {
      const olderMessages = await getDMMessages(threadId, PAGE_SIZE, oldest);
      if ((olderMessages || []).length < PAGE_SIZE) setHasMore(false);
      setMessages((prev) => [...(olderMessages || []), ...prev]);
    } catch (err) {
      console.error("Error loading more DM messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, hasMore, isLoading, messages]);

  // Send a DM message
  const send = useCallback(
    async (content: string, type?: string, metadata?: Record<string, any>) => {
      if (!threadId) return;
      return sendDM(threadId, content, type, metadata);
    },
    [threadId]
  );

  // Mark as read
  const markRead = useCallback(async () => {
    if (!threadId) return;
    return updateDMLastRead(threadId);
  }, [threadId]);

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    send,
    markRead,
  };
}
