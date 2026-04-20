"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getUnreadMailCount } from "@/lib/mail/mail";

export function useMailUnread(orgId: string | null) {
  const [unreadMailCount, setUnreadMailCount] = useState(0);
  const channelRef = useRef<any>(null);

  const refresh = useCallback(async () => {
    if (!orgId) {
      setUnreadMailCount(0);
      return;
    }
    try {
      const count = await getUnreadMailCount(orgId);
      setUnreadMailCount(count);
    } catch (err) {
      console.error("Error fetching unread mail count:", err);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      setUnreadMailCount(0);
      return;
    }

    refresh();

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;

      const channel = (supabase as any)
        .channel(`mail-unread:${user.id}:${orgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "mail_recipients",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            // Any change to recipient rows — refetch accurate count
            refresh();
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId, refresh]);

  return { unreadMailCount, refresh };
}
