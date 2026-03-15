"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function MailIndexPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  useEffect(() => {
    router.replace(`/dashboard/organizations/${orgId}/mail/inbox`);
  }, [orgId, router]);

  return null;
}
