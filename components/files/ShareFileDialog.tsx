"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Building2,
  Users,
  Search,
  X,
  Lock,
  Loader2,
  Shield,
  Download,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  shareFile,
  getFileShares,
  updateSharePermission,
  revokeShare,
  type FileShare,
} from "@/lib/files/sharing";
import { notifyFileShared } from "@/lib/notifications/triggers";
import { getOrganizationMembers } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { FileRecord } from "@/lib/files/files";

// =====================================================
// Types
// =====================================================

type ShareMode = "private" | "org" | "member";
type Permission = "view" | "download" | "edit";

const PERMISSION_CONFIG: Record<Permission, { label: string; icon: typeof Shield; color: string }> = {
  view: { label: "View", icon: Shield, color: "text-blue-500" },
  download: { label: "Download", icon: Download, color: "text-green-500" },
  edit: { label: "Edit", icon: Pencil, color: "text-orange-500" },
};

// =====================================================
// Props
// =====================================================

interface ShareFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileRecord | null;
  orgId: string;
}

// =====================================================
// Main Component
// =====================================================

export function ShareFileDialog({
  open,
  onOpenChange,
  file,
  orgId,
}: ShareFileDialogProps) {
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [permission, setPermission] = useState<Permission>("view");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  // Existing shares
  const [shares, setShares] = useState<FileShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  // Member search
  const [searchQuery, setSearchQuery] = useState("");
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  }>>([]);

  // Load existing shares
  const loadShares = useCallback(async () => {
    if (!file) return;
    setSharesLoading(true);
    try {
      const data = await getFileShares(file.id);
      setShares(data);
    } catch (err: any) {
      toast.error("Failed to load shares", { description: err.message });
    } finally {
      setSharesLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (open && file) {
      loadShares();
      setShareMode("private");
      setPermission("view");
      setExpiresAt("");
      setSelectedUsers([]);
      setSearchQuery("");
    }
  }, [open, file, loadShares]);

  // Load org members when searching
  useEffect(() => {
    if (shareMode !== "member" || !open) return;

    let cancelled = false;
    setMembersLoading(true);

    (async () => {
      try {
        const members = await getOrganizationMembers(orgId);
        if (!cancelled) {
          setOrgMembers(members || []);
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [shareMode, open, orgId]);

  // Filtered members
  const filteredMembers = orgMembers.filter((m: any) => {
    if (!searchQuery) return true;
    const user = m.users;
    if (!user) return false;
    const q = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q)
    );
  });

  // Share handler
  const handleShare = async () => {
    if (!file) return;
    if (shareMode === "member" && selectedUsers.length === 0) {
      toast.error("Please select at least one person to share with");
      return;
    }

    setLoading(true);
    try {
      if (shareMode === "member") {
        // Share with each selected user
        for (const user of selectedUsers) {
          await shareFile(file.id, {
            type: "member",
            userId: user.id,
            permission,
            expiresAt: expiresAt || undefined,
          });
        }

        // Send notifications
        supabase.auth.getUser().then(({ data: { user: authUser } }) => {
          if (authUser) {
            const sharerName =
              orgMembers.find((m: any) => m.users?.id === authUser.id)?.users?.full_name ||
              authUser.email?.split("@")[0] || "Someone";
            for (const user of selectedUsers) {
              notifyFileShared(
                file.id,
                file.name,
                user.id,
                { id: authUser.id, name: sharerName },
                orgId
              ).catch(() => {});
            }
          }
        });

        toast.success("File shared", {
          description: `Shared with ${selectedUsers.map(u => u.full_name).join(", ")}.`,
        });
      } else {
        await shareFile(file.id, {
          type: shareMode,
          permission,
          expiresAt: expiresAt || undefined,
        });

        toast.success("File shared", {
          description:
            shareMode === "org"
              ? "Anyone in the organization can access this file."
              : "Anyone in the project can access this file.",
        });
      }

      await loadShares();
      setSelectedUsers([]);
      setSearchQuery("");
      setExpiresAt("");
    } catch (err: any) {
      toast.error("Failed to share", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Update permission
  const handleUpdatePermission = async (
    shareId: string,
    newPermission: Permission
  ) => {
    try {
      await updateSharePermission(shareId, newPermission);
      setShares((prev) =>
        prev.map((s) =>
          s.id === shareId ? { ...s, permission: newPermission } : s
        )
      );
      toast.success("Permission updated");
    } catch (err: any) {
      toast.error("Failed to update", { description: err.message });
    }
  };

  // Revoke share
  const handleRevoke = async (shareId: string) => {
    try {
      await revokeShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Share revoked");
    } catch (err: any) {
      toast.error("Failed to revoke", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            {file ? `Share "${file.name}" with others.` : "Share this file."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Access level */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Who can access</Label>
            <Select value={shareMode} onValueChange={(v) => { setShareMode(v as ShareMode); setSelectedUsers([]); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> My Eyes Only</span>
                </SelectItem>
                <SelectItem value="member">
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Specific People</span>
                </SelectItem>
                <SelectItem value="org">
                  <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Entire Organization</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Member picker */}
          {shareMode === "member" && (
            <div className="space-y-2">
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" className="gap-1 pr-1">
                      {user.full_name || user.email}
                      <button
                        onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-36 overflow-y-auto border rounded-lg">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (() => {
                  const available = filteredMembers.filter((m: any) =>
                    m.users && !selectedUsers.some((s) => s.id === m.users.id)
                  );
                  return available.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      {searchQuery ? "No members found" : selectedUsers.length > 0 ? "All members selected" : "Search for members"}
                    </p>
                  ) : (
                    available.map((m: any) => {
                      const user = m.users;
                      return (
                        <button
                          key={user.id}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                          onClick={() => setSelectedUsers((prev) => [...prev, {
                            id: user.id, full_name: user.full_name, email: user.email, avatar_url: user.avatar_url,
                          }])}
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-medium text-primary">{user.full_name?.[0]?.toUpperCase() || "?"}</span>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm truncate">{user.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </button>
                      );
                    })
                  );
                })()}
              </div>
            </div>
          )}

          {shareMode === "private" && (
            <p className="text-sm text-muted-foreground">Only you can access this file. No one else in the organization can see it.</p>
          )}

          {shareMode === "org" && (
            <p className="text-sm text-muted-foreground">All members of this organization will have access to this file.</p>
          )}

          {/* Permission & Share button — hidden for "My Eyes Only" */}
          {shareMode !== "private" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Permission</Label>
                <Select value={permission} onValueChange={(v) => setPermission(v as Permission)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleShare}
                disabled={loading || (shareMode === "member" && selectedUsers.length === 0)}
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sharing...</> : "Share"}
              </Button>
            </>
          )}

          {/* People with access */}
          {shares.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">People with access</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {shares.map((share) => {
                  const permConfig = PERMISSION_CONFIG[share.permission];
                  return (
                    <div key={share.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-primary">
                          {share.share_type === "org" ? "All" : share.shared_with_user?.full_name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {share.share_type === "org" ? "Entire Organization" : share.shared_with_user?.full_name || "Unknown"}
                        </p>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${permConfig.color}`}>{permConfig.label}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(share.id)}
                        title="Remove access"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
