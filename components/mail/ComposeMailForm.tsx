"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Save,
  X,
  Paperclip,
  Loader2,
  Plus,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  FileText,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  composeMail,
  saveDraft,
  updateDraft,
  sendDraft,
  getMail,
} from "@/lib/mail/mail";
import { getOrganizationMembers } from "@/lib/database";

// ── Types ───────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string;
}

interface ComposeMailFormProps {
  orgId: string;
  replyToUserId?: string;
  initialSubject?: string;
  quotedBody?: string;
  draftId?: string;
}

// ── Member Picker ───────────────────────────────────────────────────────────

function MemberPicker({
  members,
  selected,
  onSelect,
  onRemove,
  placeholder,
}: {
  members: OrgMember[];
  selected: OrgMember[];
  onSelect: (m: OrgMember) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = members.filter((m) => {
    if (selected.some((s) => s.id === m.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[40px] rounded-md border px-3 py-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((m) => (
          <Badge
            key={m.id}
            variant="secondary"
            className="gap-1 pr-1"
          >
            <span className="text-xs">{m.full_name || m.email.split("@")[0]}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(m.id);
              }}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-white shadow-lg">
          {filtered.slice(0, 10).map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(m);
                setSearch("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <Avatar
                src={m.avatar_url || undefined}
                alt={m.full_name || m.email}
                fallback={m.full_name?.[0]?.toUpperCase() || m.email[0]?.toUpperCase() || "?"}
                className="h-7 w-7"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.full_name || m.email.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {m.role && (
                <span className="text-[10px] text-muted-foreground/70 capitalize">{m.role}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Compose Form ────────────────────────────────────────────────────────────

export function ComposeMailForm({
  orgId,
  replyToUserId,
  initialSubject,
  quotedBody,
  draftId,
}: ComposeMailFormProps) {
  const router = useRouter();

  // Members
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Form state
  const [toRecipients, setToRecipients] = useState<OrgMember[]>([]);
  const [ccRecipients, setCcRecipients] = useState<OrgMember[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [mailType, setMailType] = useState<"direct" | "announcement" | "newsletter">("direct");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // State
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load org members ─────────────────────────────────────────────────

  useEffect(() => {
    setMembersLoading(true);
    getOrganizationMembers(orgId)
      .then((members) => {
        const mapped = (members || []).map((m: any) => ({
          id: m.users?.id || m.user_id,
          full_name: m.users?.full_name || null,
          email: m.users?.email || "",
          avatar_url: m.users?.avatar_url || null,
          role: m.role,
        }));
        setOrgMembers(mapped);
      })
      .catch(() => toast.error("Failed to load members"))
      .finally(() => setMembersLoading(false));
  }, [orgId]);

  // ── Pre-fill from reply/forward ──────────────────────────────────────

  useEffect(() => {
    if (replyToUserId && orgMembers.length > 0) {
      const replyMember = orgMembers.find((m) => m.id === replyToUserId);
      if (replyMember && !toRecipients.some((t) => t.id === replyMember.id)) {
        setToRecipients([replyMember]);
      }
    }
  }, [replyToUserId, orgMembers]);

  useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
  }, [initialSubject]);

  useEffect(() => {
    if (quotedBody && bodyRef.current) {
      bodyRef.current.innerHTML = quotedBody.replace(/\n/g, "<br>");
      setBody(quotedBody);
    }
  }, [quotedBody]);

  // ── Load draft ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!draftId) return;
    getMail(draftId)
      .then((draft) => {
        setSubject(draft.subject || "");
        if (bodyRef.current) {
          bodyRef.current.innerHTML = draft.body || "";
        }
        setBody(draft.body || "");
        setMailType(draft.type || "direct");
      })
      .catch(() => toast.error("Failed to load draft"));
  }, [draftId]);

  // ── Auto-save draft every 30s ────────────────────────────────────────

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const currentBody = bodyRef.current?.innerHTML || "";
      if (!subject && !currentBody) return;

      if (currentDraftId) {
        updateDraft(currentDraftId, {
          subject,
          body: currentBody,
          type: mailType,
        }).catch(() => {});
      } else {
        saveDraft(orgId, {
          subject,
          body: currentBody,
          type: mailType,
        })
          .then((draft) => setCurrentDraftId(draft.id))
          .catch(() => {});
      }
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [subject, mailType, orgId, currentDraftId]);

  // ── Actions ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    const mailBody = bodyRef.current?.innerHTML || "";

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    let toIds = toRecipients.map((m) => m.id);
    const ccIds = ccRecipients.map((m) => m.id);

    // For announcements, send to all org members
    if (mailType === "announcement") {
      toIds = orgMembers.map((m) => m.id);
    }

    if (toIds.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }

    setSending(true);
    try {
      if (currentDraftId) {
        // Update draft then send it
        await updateDraft(currentDraftId, {
          subject,
          body: mailBody,
          type: mailType,
        });
        await sendDraft(currentDraftId, { to: toIds, cc: ccIds });
      } else {
        await composeMail(orgId, {
          subject,
          body: mailBody,
          to: toIds,
          cc: ccIds.length > 0 ? ccIds : undefined,
          type: mailType,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }

      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      toast.success("Mail sent");
      router.push(`/dashboard/organizations/${orgId}/mail/sent`);
    } catch (err: any) {
      toast.error("Failed to send", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    const mailBody = bodyRef.current?.innerHTML || "";
    setSavingDraft(true);
    try {
      if (currentDraftId) {
        await updateDraft(currentDraftId, {
          subject,
          body: mailBody,
          type: mailType,
        });
      } else {
        const draft = await saveDraft(orgId, {
          subject,
          body: mailBody,
          type: mailType,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        setCurrentDraftId(draft.id);
      }
      toast.success("Draft saved");
    } catch (err: any) {
      toast.error("Failed to save draft", { description: err.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscard = () => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    router.push(`/dashboard/organizations/${orgId}/mail/inbox`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 25 * 1024 * 1024;
    const valid = files.filter((f) => {
      if (f.size > maxSize) {
        toast.error(`${f.name} exceeds 25MB limit`);
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Toolbar actions ──────────────────────────────────────────────────

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    bodyRef.current?.focus();
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
        <h2 className="text-lg font-semibold text-navy-900">New Message</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="gap-2"
          >
            {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            className="gap-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Discard
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gap-2 bg-brand-blue hover:bg-brand-blue/90"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 space-y-4">
          {/* Mail type toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground w-12">Type:</Label>
            <div className="flex gap-1 rounded-lg border p-0.5">
              {(["direct", "announcement", "newsletter"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMailType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    mailType === t
                      ? "bg-brand-blue text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "direct" ? "Direct" : t === "announcement" ? "Announcement" : "Newsletter"}
                </button>
              ))}
            </div>
          </div>

          {/* To */}
          <div className="flex items-start gap-2">
            <Label className="text-sm text-muted-foreground w-12 mt-2.5">To:</Label>
            <div className="flex-1">
              {mailType === "announcement" ? (
                <div className="flex items-center h-10 rounded-md border px-3 bg-muted/30">
                  <span className="text-sm text-muted-foreground">All organization members ({orgMembers.length})</span>
                </div>
              ) : (
                <MemberPicker
                  members={orgMembers}
                  selected={toRecipients}
                  onSelect={(m) => setToRecipients((prev) => [...prev, m])}
                  onRemove={(id) => setToRecipients((prev) => prev.filter((m) => m.id !== id))}
                  placeholder="Search members..."
                />
              )}
            </div>
            {!showCc && mailType === "direct" && (
              <button
                onClick={() => setShowCc(true)}
                className="mt-2 text-xs text-muted-foreground hover:text-brand-blue transition-colors"
              >
                + CC
              </button>
            )}
          </div>

          {/* CC */}
          {showCc && mailType === "direct" && (
            <div className="flex items-start gap-2">
              <Label className="text-sm text-muted-foreground w-12 mt-2.5">CC:</Label>
              <div className="flex-1">
                <MemberPicker
                  members={orgMembers}
                  selected={ccRecipients}
                  onSelect={(m) => setCcRecipients((prev) => [...prev, m])}
                  onRemove={(id) => setCcRecipients((prev) => prev.filter((m) => m.id !== id))}
                  placeholder="Add CC recipients..."
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground w-12">Subj:</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1"
            />
          </div>

          <Separator />

          {/* Rich text toolbar */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
            <button
              type="button"
              onClick={() => execCommand("bold")}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("italic")}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand("underline")}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              type="button"
              onClick={() => execCommand("insertUnorderedList")}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Body editor */}
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              setBody(bodyRef.current?.innerHTML || "");
            }}
            className="min-h-[300px] rounded-md border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue prose prose-sm max-w-none"
            data-placeholder="Write your message..."
            style={{
              // Placeholder via CSS
            }}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Attachments ({attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/20"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Placeholder style for contentEditable */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
