"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification as deleteNotificationFn,
  type Notification,
} from "@/lib/notifications/notifications";
import { toast } from "sonner";

export function useNotifications(orgId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<any>(null);

  // ── Fetch initial data ──────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!orgId) return;

    setIsLoading(true);
    try {
      const [result, count] = await Promise.all([
        getNotifications(orgId, { page: 1 }),
        getUnreadCount(orgId),
      ]);
      setNotifications(result.notifications);
      setUnreadCount(count);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  // ── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;

    refresh();

    // Get current user for filter
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = (supabase as any)
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const newNotification = payload.new as Notification;

            // Only include if it belongs to the current org
            if (newNotification.organization_id !== orgId) return;

            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Show toast
            toast(newNotification.title, {
              description: newNotification.body || undefined,
              action: newNotification.link
                ? {
                    label: "View",
                    onClick: () => {
                      window.location.href = newNotification.link!;
                    },
                  }
                : undefined,
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const updated = payload.new as Notification;
            if (updated.organization_id !== orgId) return;

            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const deleted = payload.old as { id: string };
            setNotifications((prev) =>
              prev.filter((n) => n.id !== deleted.id)
            );
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

  // ── Actions ─────────────────────────────────────────────────────────────

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking notification read:", err);
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!orgId) return;

    try {
      await markAllNotificationsRead(orgId);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  }, [orgId]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const wasUnread = notifications.find(
          (n) => n.id === notificationId && !n.is_read
        );
        await deleteNotificationFn(notificationId);
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notificationId)
        );
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Error deleting notification:", err);
      }
    },
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    deleteNotification,
    refresh,
  };
}
