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
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendDM } from "@/lib/communication/dm";
import { notifyDMReceived } from "@/lib/notifications/triggers";
import { TaskRefPicker } from "./TaskRefPicker";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DMMessageInputProps {
  threadId: string;
  currentUserId: string;
  currentUserName?: string;
  otherParticipantIds?: string[];
  orgId: string;
  placeholder?: string;
  onMessageSent?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DMMessageInput({
  threadId,
  currentUserId,
  currentUserName,
  otherParticipantIds = [],
  orgId,
  placeholder = "Type a message...",
  onMessageSent,
}: DMMessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
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
    if (!threadId) return;

    const channel = supabase.channel(`dm-typing:${threadId}`);

    channel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const userId = payload.payload?.user_id;
        const userName = payload.payload?.user_name;
        if (!userId || userId === currentUserId) return;

        setTypingUsers((prev) => {
          if (prev.includes(userName)) return prev;
          return [...prev, userName];
        });

        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== userName));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, currentUserId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;

    const channel = supabase.channel(`dm-typing:${threadId}`);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, user_name: currentUserName || "Someone" },
    });
  }, [threadId, currentUserId]);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    if (value.trim()) broadcastTyping();
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && stagedFiles.length === 0) return;

    setSending(true);
    try {
      // Send text message
      if (trimmed) {
        await sendDM(threadId, trimmed, "text", undefined, currentUserId);
        // Notify other participants
        for (const recipientId of otherParticipantIds) {
          notifyDMReceived(
            recipientId,
            { id: currentUserId, name: currentUserName || "Someone" },
            trimmed,
            threadId,
            orgId
          ).catch(() => {});
        }
      }

      // Upload files as separate file messages
      if (stagedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of stagedFiles) {
          try {
            // Upload to Supabase Storage
            const fileName = `dm/${threadId}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("chat-attachments")
              .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("chat-attachments")
              .getPublicUrl(fileName);

            await sendDM(threadId, `📎 ${file.name}`, "file", {
              url: urlData.publicUrl,
              name: file.name,
              size: file.size,
              mimeType: file.type,
              storagePath: fileName,
            }, currentUserId);
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
    <div className="relative border-t bg-white dark:bg-slate-950">
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
          onClick={() => setShowTaskPicker(true)}
          title="Attach task"
        >
          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
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
            className="w-full resize-none rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-muted-foreground"
            style={{ maxHeight: 150 }}
            disabled={sending}
          />
        </div>

        <Button
          size="sm"
          className="h-9 w-9 p-0 flex-shrink-0 bg-indigo-600 hover:bg-indigo-600/90"
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
            {typingUsers[0]} is typing...
          </p>
        )}
      </div>

      {/* Task Reference Picker */}
      <TaskRefPicker
        open={showTaskPicker}
        onOpenChange={setShowTaskPicker}
        orgId={orgId}
        onTaskSelected={async (taskRef) => {
          try {
            const metadata = {
              taskId: taskRef.taskId,
              taskTitle: taskRef.taskTitle,
              projectName: taskRef.projectName,
              status: taskRef.status,
              assignee: taskRef.assignee,
              url: `/dashboard/organizations/${orgId}/projects/${taskRef.projectId}?tab=board&task=${taskRef.taskId}`,
            };
            await sendDM(threadId, `📋 ${taskRef.taskTitle}`, "task_ref", metadata, currentUserId);
            onMessageSent?.();
          } catch {
            toast.error("Failed to send task reference");
          }
        }}
      />
    </div>
  );
}
