"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleReaction } from "@/lib/communication/messages";
import { toast } from "sonner";

const QUICK_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🚀", "🔥", "💯"];

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  users?: { full_name: string | null; email: string } | null;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
}

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groups: Record<
    string,
    { count: number; hasOwn: boolean; users: string[] }
  > = {};

  reactions.forEach((r) => {
    if (!groups[r.emoji]) {
      groups[r.emoji] = { count: 0, hasOwn: false, users: [] };
    }
    groups[r.emoji].count++;
    if (r.user_id === currentUserId) groups[r.emoji].hasOwn = true;
    const name =
      r.users?.full_name || r.users?.email?.split("@")[0] || "Someone";
    groups[r.emoji].users.push(name);
  });

  const handleToggle = async (emoji: string) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch {
      toast.error("Failed to update reaction");
    }
  };

  if (Object.keys(groups).length === 0 && !showPicker) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {Object.entries(groups).map(([emoji, data]) => (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToggle(emoji)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  data.hasOwn
                    ? "bg-brand-blue/10 border-brand-blue/30 text-brand-blue"
                    : "bg-muted/50 border-border hover:bg-muted"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{data.count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[200px] text-xs"
            >
              <p className="font-medium">
                {emoji} {data.users.join(", ")}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Add reaction button */}
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-border hover:border-muted-foreground hover:bg-muted/50 transition-colors"
            title="Add reaction"
          >
            <SmilePlus className="h-3 w-3 text-muted-foreground" />
          </button>

          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-white border rounded-lg shadow-lg px-2 py-1.5 z-30">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleToggle(emoji);
                    setShowPicker(false);
                  }}
                  className="hover:scale-125 transition-transform text-base px-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Standalone reaction picker for the hover action toolbar
export function ReactionPicker({
  messageId,
  onClose,
}: {
  messageId: string;
  onClose: () => void;
}) {
  const handleToggle = async (emoji: string) => {
    try {
      await toggleReaction(messageId, emoji);
      onClose();
    } catch {
      toast.error("Failed to add reaction");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white border rounded-lg shadow-lg px-2 py-1.5 z-30">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          className="hover:scale-125 transition-transform text-base px-0.5"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
