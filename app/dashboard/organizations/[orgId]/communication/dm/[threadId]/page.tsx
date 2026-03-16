"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DMWindow } from "@/components/communication/DMWindow";

export default function DMPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const threadId = params.threadId as string;
  const { user } = useAuth();

  return (
    <DMWindow
      threadId={threadId}
      currentUserId={user?.id || ""}
      orgId={orgId}
    />
  );
}
