"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOrgChannels,
  getProjectChannels,
  getUnreadCounts,
} from "@/lib/communication/channels";

interface ChannelData {
  id: string;
  organization_id: string;
  project_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  type: string;
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

      // Auto-select the #general channel if none selected
      if (!selectedChannelId && data.length > 0) {
        const generalChannel = data.find((c: any) => c.name === "general");
        setSelectedChannelId(generalChannel?.id || data[0].id);
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
