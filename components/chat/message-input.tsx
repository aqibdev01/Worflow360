"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, createMentions, uploadChatFile, createAttachmentRecord } from "@/lib/chat-database";
import { toast } from "sonner";

interface MemberSuggestion {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface MessageInputProps {
  channelId: string;
  currentUserId: string;
  parentMessageId?: string;
  channelMembers?: MemberSuggestion[];
  placeholder?: string;
  onMessageSent?: () => void;
}

export function MessageInput({
  channelId,
  currentUserId,
  parentMessageId,
  channelMembers = [],
  placeholder = "Type a message...",
  onMessageSent,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
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
      // Find the @ symbol before cursor
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

      // Focus and set cursor
      setTimeout(() => {
        textarea.focus();
        const newPos = atIndex + mentionText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [content]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      // Only trigger if @ is at start or preceded by space
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
      // Send the message
      const msg = await sendMessage({
        channel_id: channelId,
        sender_id: currentUserId,
        content: trimmed || "(file)",
        parent_message_id: parentMessageId,
      });

      // Extract mentions and create mention records
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionedIds: string[] = [];
      let match;
      while ((match = mentionRegex.exec(trimmed)) !== null) {
        mentionedIds.push(match[2]);
      }
      if (mentionedIds.length > 0) {
        await createMentions(msg.id, mentionedIds);
      }

      // Upload staged files
      for (const file of stagedFiles) {
        try {
          const { path } = await uploadChatFile(channelId, file);
          await createAttachmentRecord({
            message_id: msg.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: path,
          });
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
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
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter((f) => {
      if (f.size > maxSize) {
        toast.error(`${f.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setStagedFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  return (
    <div className="relative border-t bg-white px-4 py-3">
      {/* Mention popover */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
          {filteredMembers.map((member, idx) => (
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
              <span className="text-muted-foreground text-xs">
                {member.email}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {stagedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border text-xs"
            >
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() =>
                  setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

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
          disabled={sending || (!content.trim() && stagedFiles.length === 0)}
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1">
        Press Enter to send, Shift+Enter for new line. Type @ to mention someone.
      </p>
    </div>
  );
}
