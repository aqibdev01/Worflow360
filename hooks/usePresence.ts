"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PresenceState {
  onlineUsers: Set<string>;
  isOnline: (userId: string) => boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePresence(
  currentUserId: string | null,
  orgId: string | null
): PresenceState {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUserId || !orgId) return;

    const channel = supabase.channel(`presence:${orgId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const userIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          userIds.add(key);
        });
        setOnlineUsers(userIds);
      })
      .on("presence", { event: "join" }, ({ key }: any) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key }: any) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, orgId]);

  const isOnline = (userId: string) => onlineUsers.has(userId);

  return { onlineUsers, isOnline };
}
