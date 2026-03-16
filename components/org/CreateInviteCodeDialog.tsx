"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, Check, LinkIcon } from "lucide-react";
import { generateInviteCode } from "@/lib/organizations/invites";
import { toast } from "sonner";

interface CreateInviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onCreated: () => void;
}

export function CreateInviteCodeDialog({
  open,
  onOpenChange,
  orgId,
  onCreated,
}: CreateInviteCodeDialogProps) {
  const [defaultRole, setDefaultRole] = useState<"member" | "manager">("member");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await generateInviteCode(orgId, {
        defaultRole,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt || null,
      });
      setCreatedCode(result.code);
      onCreated();
      toast.success("Invite code created!");
    } catch (err) {
      console.error("Error creating invite code:", err);
      toast.error("Failed to create invite code");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdCode) return;
    const link = `${window.location.origin}/dashboard/organizations/join?code=${createdCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setDefaultRole("member");
      setMaxUses("");
      setExpiresAt("");
      setCreatedCode(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-brand-blue" />
            Create Invite Link
          </DialogTitle>
        </DialogHeader>

        {createdCode ? (
          /* ── Success view ── */
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <p className="text-xs text-emerald-600 font-medium mb-2">
                Invite code created successfully!
              </p>
              <p className="text-2xl font-mono font-bold text-navy-900 tracking-wider">
                {createdCode}
              </p>
            </div>
            <Button
              className="w-full bg-brand-blue hover:bg-brand-blue/90 gap-2"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Invite Link
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Share this link with team members so they can join the organization.
            </p>
          </div>
        ) : (
          /* ── Form view ── */
          <div className="space-y-4 py-2">
            {/* Default Role */}
            <div className="space-y-2">
              <Label>Default Role</Label>
              <Select
                value={defaultRole}
                onValueChange={(v) => setDefaultRole(v as "member" | "manager")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role assigned to users who join with this code.
              </p>
            </div>

            {/* Max Uses */}
            <div className="space-y-2">
              <Label>Max Uses</Label>
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for unlimited uses.
              </p>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label>Expires On</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for no expiration.
              </p>
            </div>
          </div>
        )}

        {!createdCode && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue/90 gap-2"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Code
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
