"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  User,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { removeOrganizationMember } from "@/lib/database";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface OrgMemberTableProps {
  members: OrgMember[];
  currentUserId: string;
  isAdmin: boolean;
  orgName: string;
  onMembersChanged: () => void;
}

// ─── Role config ─────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  admin: {
    label: "Admin",
    color: "bg-violet-600/10 text-violet-600 border-violet-500/20",
    icon: ShieldCheck,
  },
  manager: {
    label: "Manager",
    color: "bg-indigo-600/10 text-indigo-600 border-indigo-500/20",
    icon: Shield,
  },
  member: {
    label: "Member",
    color: "bg-muted text-muted-foreground",
    icon: User,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgMemberTable({
  members,
  currentUserId,
  isAdmin,
  orgName,
  onMembersChanged,
}: OrgMemberTableProps) {
  const [search, setSearch] = useState("");
  const [removeMember, setRemoveMember] = useState<OrgMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = (
        m.users?.full_name ||
        m.users?.email ||
        ""
      ).toLowerCase();
      return !search || name.includes(search.toLowerCase());
    });
  }, [members, search]);

  const handleRemoveMember = async () => {
    if (!removeMember) return;
    setRemoving(true);
    try {
      await removeOrganizationMember(removeMember.id);
      toast.success(
        `${removeMember.users?.full_name || "Member"} has been removed`
      );
      setRemoveMember(null);
      onMembersChanged();
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-violet-600" />
        <h3 className="text-base font-semibold text-foreground">
          Team Members
        </h3>
        <span className="text-sm text-muted-foreground">
          ({members.length})
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                Member
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                Role
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                Joined
              </th>
              {isAdmin && (
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const displayName =
                member.users?.full_name ||
                member.users?.email?.split("@")[0] ||
                "Unknown";
              const initials = member.users?.full_name
                ? member.users.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : displayName[0]?.toUpperCase() || "?";
              const roleConf = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
              const isSelf = member.user_id === currentUserId;
              const joinedDate = new Date(member.joined_at).toLocaleDateString();

              return (
                <tr
                  key={member.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Member info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-white">
                          {initials}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {displayName}
                          {isSelf && (
                            <span className="text-xs text-muted-foreground ml-1.5">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <Badge className={`capitalize ${roleConf.color}`}>
                      {roleConf.label}
                    </Badge>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {joinedDate}
                  </td>

                  {/* Actions */}
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                          onClick={() => setRemoveMember(member)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {search || roleFilter !== "all"
                ? "No members match your filters"
                : "No members found"}
            </p>
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                {removeMember?.users?.full_name ||
                  removeMember?.users?.email?.split("@")[0]}
              </span>{" "}
              from {orgName}? They will lose access to all projects and channels
              in this organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveMember(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removing}
              className="gap-1.5"
            >
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
