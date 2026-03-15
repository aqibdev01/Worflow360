"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ComposeMailForm } from "@/components/mail/ComposeMailForm";

export default function ComposeMailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;

  // Pre-fill from reply/forward/draft
  const replyTo = searchParams.get("replyTo") || undefined;
  const subject = searchParams.get("subject") || undefined;
  const quotedBody = searchParams.get("quotedBody") || undefined;
  const draftId = searchParams.get("draft") || undefined;

  return (
    <div className="flex flex-col h-full">
      <ComposeMailForm
        orgId={orgId}
        replyToUserId={replyTo}
        initialSubject={subject}
        quotedBody={quotedBody}
        draftId={draftId}
      />
    </div>
  );
}
