"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MessageCircle } from "lucide-react";
import { getOrganizationMembers } from "@/lib/database";
import { getOrCreateDMThread } from "@/lib/communication/dm";
import { toast } from "sonner";

interface NewDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentUserId: string;
  onDMCreated: (threadId: string) => void;
}

export function NewDMDialog({
  open,
  onOpenChange,
  orgId,
  currentUserId,
  onDMCreated,
}: NewDMDialogProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [startingDM, setStartingDM] = useState<string | null>(null);

  // Load org members when dialog opens
  useEffect(() => {
    if (!open || !orgId) return;
    setLoading(true);
    getOrganizationMembers(orgId)
      .then((data) => setMembers(data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open, orgId]);

  // Filter out current user and apply search
  const filteredMembers = useMemo(() => {
    const others = members.filter(
      (m: any) => m.user_id && m.user_id !== currentUserId
    );
    if (!search) return others;
    const q = search.toLowerCase();
    return others.filter((m: any) => {
      const name = m.users?.full_name || "";
      const email = m.users?.email || "";
      return (
        name.toLowerCase().includes(q) || email.toLowerCase().includes(q)
      );
    });
  }, [members, currentUserId, search]);

  const handleStartDM = async (targetUserId: string) => {
    setStartingDM(targetUserId);
    try {
      const threadId = await getOrCreateDMThread(targetUserId, orgId, currentUserId);
      onOpenChange(false);
      setSearch("");
      onDMCreated(threadId);
    } catch (err) {
      console.error("Error creating DM thread:", err);
      toast.error("Failed to start conversation");
    } finally {
      setStartingDM(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>
            Search for a team member to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Members list */}
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "No members found"
                    : "No other members in this organization"}
                </p>
              </div>
            ) : (
              filteredMembers.map((member: any) => {
                const user = member.users;
                const name =
                  user?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Unknown";
                const initials = user?.full_name
                  ? user.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : name[0]?.toUpperCase() || "?";
                const isStarting = startingDM === member.user_id;

                return (
                  <button
                    key={member.user_id}
                    onClick={() => handleStartDM(member.user_id)}
                    disabled={!!startingDM}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    {isStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
