"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "@/components/communication/ChatWindow";

export default function ChannelPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const channelId = params.channelId as string;
  const { user } = useAuth();

  return (
    <ChatWindow
      channelId={channelId}
      currentUserId={user?.id || ""}
      orgId={orgId}
    />
  );
}
