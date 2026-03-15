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
import { getOrganizationMembers } from "@/lib/database";
import type { FileRecord } from "@/lib/files/files";

// =====================================================
// Types
// =====================================================

type ShareMode = "org" | "project" | "member";
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
  const [shareMode, setShareMode] = useState<ShareMode>("member");
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
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null>(null);

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
      setShareMode("member");
      setPermission("view");
      setExpiresAt("");
      setSelectedUser(null);
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
    if (shareMode === "member" && !selectedUser) {
      toast.error("Please select a person to share with");
      return;
    }

    setLoading(true);
    try {
      await shareFile(file.id, {
        type: shareMode,
        userId: shareMode === "member" ? selectedUser!.id : undefined,
        permission,
        expiresAt: expiresAt || undefined,
      });

      toast.success("File shared", {
        description:
          shareMode === "org"
            ? "Anyone in the organization can access this file."
            : shareMode === "project"
              ? "Anyone in the project can access this file."
              : `Shared with ${selectedUser!.full_name}.`,
      });

      // Reload shares
      await loadShares();

      // Reset form
      setSelectedUser(null);
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
          {/* Share mode toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Share with</Label>
            <div className="flex gap-2">
              <Button
                variant={shareMode === "org" ? "secondary" : "outline"}
                size="sm"
                className="flex-1 gap-1.5 h-9"
                onClick={() => {
                  setShareMode("org");
                  setSelectedUser(null);
                }}
              >
                <Building2 className="h-3.5 w-3.5" />
                Organization
              </Button>
              {file?.project_id && (
                <Button
                  variant={shareMode === "project" ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 gap-1.5 h-9"
                  onClick={() => {
                    setShareMode("project");
                    setSelectedUser(null);
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  Project
                </Button>
              )}
              <Button
                variant={shareMode === "member" ? "secondary" : "outline"}
                size="sm"
                className="flex-1 gap-1.5 h-9"
                onClick={() => setShareMode("member")}
              >
                <Users className="h-3.5 w-3.5" />
                Specific People
              </Button>
            </div>
          </div>

          {/* Member search (only for "member" mode) */}
          {shareMode === "member" && (
            <div className="space-y-2">
              {selectedUser ? (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Avatar
                    src={selectedUser.avatar_url || undefined}
                    alt={selectedUser.full_name}
                    fallback={selectedUser.full_name?.[0]?.toUpperCase() || "U"}
                    className="h-8 w-8"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedUser.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedUser.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 h-8 text-sm"
                      placeholder="Search members by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="max-h-32 overflow-y-auto border rounded-lg">
                    {membersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        {searchQuery ? "No members found" : "Type to search"}
                      </p>
                    ) : (
                      filteredMembers.map((m: any) => {
                        const user = m.users;
                        if (!user) return null;
                        return (
                          <button
                            key={user.id}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                            onClick={() =>
                              setSelectedUser({
                                id: user.id,
                                full_name: user.full_name,
                                email: user.email,
                                avatar_url: user.avatar_url,
                              })
                            }
                          >
                            <Avatar
                              src={user.avatar_url || undefined}
                              alt={user.full_name}
                              fallback={user.full_name?.[0]?.toUpperCase() || "U"}
                              className="h-6 w-6 text-[9px]"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm truncate">{user.full_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Permission & Expiry */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">Permission</Label>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as Permission)}
              >
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

            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">
                Expires (optional)
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Share button */}
          <Button
            className="w-full"
            onClick={handleShare}
            disabled={loading || (shareMode === "member" && !selectedUser)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sharing...
              </>
            ) : (
              <>Share</>
            )}
          </Button>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Shares
              </p>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {shares.map((share) => {
                  const permConfig = PERMISSION_CONFIG[share.permission];
                  const isExpired =
                    share.expires_at && new Date(share.expires_at) < new Date();

                  return (
                    <div
                      key={share.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Share type icon */}
                      {share.share_type === "org" ? (
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                      ) : share.share_type === "project" ? (
                        <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                          <Users className="h-3.5 w-3.5 text-green-600" />
                        </div>
                      ) : share.shared_with_user ? (
                        <Avatar
                          src={share.shared_with_user.avatar_url || undefined}
                          alt={share.shared_with_user.full_name}
                          fallback={
                            share.shared_with_user.full_name?.[0]?.toUpperCase() || "U"
                          }
                          className="h-7 w-7 text-[10px]"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {share.share_type === "org"
                            ? "Everyone in org"
                            : share.share_type === "project"
                              ? "Everyone in project"
                              : share.shared_with_user?.full_name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${permConfig.color}`}
                          >
                            {permConfig.label}
                          </Badge>
                          {isExpired && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">
                              Expired
                            </Badge>
                          )}
                          {share.expires_at && !isExpired && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(share.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Permission change */}
                      <Select
                        value={share.permission}
                        onValueChange={(v) =>
                          handleUpdatePermission(share.id, v as Permission)
                        }
                      >
                        <SelectTrigger className="h-6 w-20 text-[10px] border-none bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="download">Download</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Revoke */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(share.id)}
                        title="Revoke"
                      >
                        <Trash2 className="h-3 w-3" />
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
