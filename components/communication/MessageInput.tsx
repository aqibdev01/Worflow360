"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  Bold,
  Italic,
  Code,
  Terminal,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, uploadAttachment } from "@/lib/communication/messages";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberSuggestion {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface CommunicationMessageInputProps {
  channelId: string;
  currentUserId: string;
  parentMessageId?: string;
  channelMembers?: MemberSuggestion[];
  placeholder?: string;
  onMessageSent?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommunicationMessageInput({
  channelId,
  currentUserId,
  parentMessageId,
  channelMembers = [],
  placeholder = "Type a message...",
  onMessageSent,
}: CommunicationMessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  }, [content]);

  // ─── Typing indicator via Supabase Realtime Broadcast ───────────────────

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`typing:${channelId}`);

    channel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const userId = payload.payload?.user_id;
        const userName = payload.payload?.user_name;
        if (!userId || userId === currentUserId) return;

        setTypingUsers((prev) => {
          if (prev.includes(userName)) return prev;
          return [...prev, userName];
        });

        // Remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== userName));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return; // Throttle to every 2s
    lastTypingBroadcast.current = now;

    const channel = supabase.channel(`typing:${channelId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, user_name: "Someone" },
    });
  }, [channelId, currentUserId]);

  // ─── Mention filtering ─────────────────────────────────────────────────

  const filteredMembers = channelMembers.filter((m) => {
    const name = (m.full_name || m.email?.split("@")[0] || "").toLowerCase();
    return name.includes(mentionSearch.toLowerCase());
  });

  const insertMention = useCallback(
    (member: MemberSuggestion) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const value = content;
      const cursorPos = textarea.selectionStart;
      const beforeCursor = value.slice(0, cursorPos);
      const atIndex = beforeCursor.lastIndexOf("@");

      if (atIndex === -1) return;

      const displayName = member.full_name || member.email.split("@")[0];
      const mentionText = `@[${displayName}](${member.user_id}) `;
      const newContent =
        value.slice(0, atIndex) + mentionText + value.slice(cursorPos);

      setContent(newContent);
      setShowMentions(false);
      setMentionSearch("");

      setTimeout(() => {
        textarea.focus();
        const newPos = atIndex + mentionText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [content]
  );

  // ─── Formatting helpers ─────────────────────────────────────────────────

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const newContent =
      content.slice(0, start) + before + selected + after + content.slice(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // ─── Event handlers ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention nav
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((p) => (p < filteredMembers.length - 1 ? p + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((p) => (p > 0 ? p - 1 : filteredMembers.length - 1));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Broadcast typing
    if (value.trim()) broadcastTyping();

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      const charBefore = lastAt > 0 ? beforeCursor[lastAt - 1] : " ";
      if (
        (charBefore === " " || charBefore === "\n" || lastAt === 0) &&
        !afterAt.includes(" ")
      ) {
        setMentionSearch(afterAt);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && stagedFiles.length === 0) return;

    setSending(true);
    try {
      // Send text message
      if (trimmed) {
        await sendMessage(channelId, trimmed, "text", undefined, parentMessageId);
      }

      // Upload files as separate file messages
      if (stagedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of stagedFiles) {
          try {
            await uploadAttachment(file, channelId);
          } catch {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        setUploadingFiles(false);
      }

      setContent("");
      setStagedFiles([]);
      onMessageSent?.();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024;
    const valid = files.filter((f) => {
      if (f.size > maxSize) {
        toast.error(`${f.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setStagedFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  return (
    <div className="relative border-t bg-white">
      {/* Mention popover */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
          {filteredMembers.slice(0, 8).map((member, idx) => (
            <button
              key={member.user_id}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/50 ${
                idx === mentionIndex ? "bg-muted/50" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-medium text-white">
                  {(member.full_name || member.email)?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="font-medium">
                {member.full_name || member.email.split("@")[0]}
              </span>
              <span className="text-muted-foreground text-xs ml-auto">
                {member.email}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {stagedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-md border text-xs"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(0)}KB)
              </span>
              <button
                onClick={() =>
                  setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-muted-foreground hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-4 pt-2 pb-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => wrapSelection("**", "**")}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => wrapSelection("*", "*")}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => wrapSelection("`", "`")}
          title="Inline Code"
        >
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => wrapSelection("```\n", "\n```")}
          title="Code Block"
        >
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder:text-muted-foreground"
            style={{ maxHeight: 150 }}
            disabled={sending}
          />
        </div>

        <Button
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0 bg-brand-blue hover:bg-brand-blue/90"
          onClick={handleSend}
          disabled={sending || uploadingFiles || (!content.trim() && stagedFiles.length === 0)}
          title="Send message (Enter)"
        >
          {sending || uploadingFiles ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Typing indicator */}
      <div className="h-5 px-4 pb-1">
        {typingUsers.length > 0 && (
          <p className="text-[11px] text-muted-foreground animate-pulse">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : typingUsers.length === 2
              ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
              : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
          </p>
        )}
      </div>
    </div>
  );
}
