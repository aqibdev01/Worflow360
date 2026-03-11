"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOrgChannels,
  getProjectChannels,
  getUnreadCounts,
} from "@/lib/chat-database";

interface ChannelData {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  visibility: string;
  org_id: string | null;
  project_id: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  channel_members?: { count: number }[];
}

export function useChannels(
  scope: "org" | "project",
  scopeId: string,
  userId: string
) {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    try {
      const data =
        scope === "org"
          ? await getOrgChannels(scopeId)
          : await getProjectChannels(scopeId);

      setChannels(data);

      // Auto-select the default channel if none selected
      if (!selectedChannelId && data.length > 0) {
        const defaultChannel = data.find(
          (c: any) =>
            c.channel_type === (scope === "org" ? "org_default" : "project_default")
        );
        setSelectedChannelId(defaultChannel?.id || data[0].id);
      }

      // Load unread counts
      if (userId && data.length > 0) {
        const channelIds = data.map((c: any) => c.id);
        const counts = await getUnreadCounts(userId, channelIds);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error("Error loading channels:", error);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, userId, selectedChannelId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    unreadCounts,
    setUnreadCounts,
    loading,
    refreshChannels: loadChannels,
  };
}
