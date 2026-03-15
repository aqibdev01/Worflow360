"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getUnreadMailCount } from "@/lib/mail/mail";

export function useMailUnread(orgId: string | null) {
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const channelRef = useRef<any>(null);

  // ── Fetch initial count ─────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!orgId) return;

    try {
      const count = await getUnreadMailCount(orgId);
      setUnreadMailCount(count);
    } catch (err) {
      console.error("Error fetching unread mail count:", err);
    }
  }, [orgId]);

  // ── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;

    refresh();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = (supabase as any)
        .channel(`mail-unread:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mail_recipients",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // New mail received — increment
            setUnreadMailCount((prev) => prev + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "mail_recipients",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload: any) => {
            const oldRow = payload.old;
            const newRow = payload.new;

            // Detect read status change
            if (oldRow && newRow) {
              if (!oldRow.is_read && newRow.is_read) {
                // Marked as read — decrement
                setUnreadMailCount((prev) => Math.max(0, prev - 1));
              } else if (oldRow.is_read && !newRow.is_read) {
                // Marked as unread — increment
                setUnreadMailCount((prev) => prev + 1);
              }
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "mail_recipients",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload: any) => {
            const deleted = payload.old;
            if (deleted && !deleted.is_read) {
              setUnreadMailCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId, refresh]);

  return { unreadMailCount, refresh };
}
