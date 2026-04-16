"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ai_notice_dismissed";

interface AIDataNoticeProps {
  className?: string;
}

/**
 * A subtle, collapsible info banner shown the first time any AI feature
 * is used. Dismisses permanently via localStorage.
 *
 * Place this inside any AI feature panel:
 *   <AIDataNotice />
 */
export function AIDataNotice({ className }: AIDataNoticeProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to prevent flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <Alert variant="info" className={cn("relative", className)}>
      <ShieldCheck className="h-4 w-4" />
      <AlertTitle>Your privacy is protected</AlertTitle>
      <AlertDescription className="pr-8">
        AI features analyze your task and sprint data to provide suggestions.
        Your messages, files, and personal information are never used by or
        shared with AI.
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        onClick={handleDismiss}
        aria-label="Dismiss AI data notice"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Alert>
  );
}
