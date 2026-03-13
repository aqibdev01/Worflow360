"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getUnreadCounts } from "@/lib/communication/channels";

export function useUnreadCounts(userId: string | null, channelIds: string[]) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial unread counts
  const refresh = useCallback(async () => {
    if (!userId || channelIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    setIsLoading(true);
    try {
      const counts = await getUnreadCounts(userId, channelIds);
      setUnreadCounts(counts);
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, channelIds.join(",")]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to new messages to update counts in real-time
  useEffect(() => {
    if (!userId || channelIds.length === 0) return;

    const subscription = supabase
      .channel("unread-counter")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const newMsg = payload.new;
          // Only count messages in channels we're tracking, not from us, and not thread replies
          if (
            channelIds.includes(newMsg.channel_id) &&
            newMsg.sender_id !== userId &&
            !newMsg.parent_message_id
          ) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, channelIds.join(",")]);

  // Mark a channel as read (resets its count to 0)
  const markAsRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channelId]: 0,
    }));
  }, []);

  return { unreadCounts, isLoading, refresh, markAsRead };
}
