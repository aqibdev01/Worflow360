"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LinkIcon,
  Plus,
  Copy,
  Check,
  XCircle,
  Loader2,
  Infinity,
} from "lucide-react";
import {
  getOrgInviteCodes,
  revokeInviteCode,
} from "@/lib/organizations/invites";
import { CreateInviteCodeDialog } from "./CreateInviteCodeDialog";
import { toast } from "sonner";

interface InviteCodeManagerProps {
  orgId: string;
  isAdmin: boolean;
}

export function InviteCodeManager({ orgId, isAdmin }: InviteCodeManagerProps) {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    try {
      const data = await getOrgInviteCodes(orgId);
      setCodes(data);
    } catch (err) {
      console.error("Error loading invite codes:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const handleCopyLink = (code: string, id: string) => {
    const link = `${window.location.origin}/dashboard/organizations/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (codeId: string) => {
    setRevokingId(codeId);
    try {
      await revokeInviteCode(codeId);
      toast.success("Invite code revoked");
      loadCodes();
    } catch (err) {
      console.error("Error revoking invite code:", err);
      toast.error("Failed to revoke invite code");
    } finally {
      setRevokingId(null);
    }
  };

  const getStatus = (code: any): { label: string; variant: string } => {
    if (!code.is_active) {
      return { label: "Revoked", variant: "bg-red-50 text-red-600 border-red-200" };
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: "Expired", variant: "bg-amber-50 text-amber-600 border-amber-200" };
    }
    if (code.max_uses && code.use_count >= code.max_uses) {
      return { label: "Maxed", variant: "bg-gray-100 text-gray-600 border-gray-200" };
    }
    return { label: "Active", variant: "bg-emerald-50 text-emerald-600 border-emerald-200" };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-brand-blue" />
          <h3 className="text-base font-semibold text-navy-900">Invite Links</h3>
        </div>
        <Button
          size="sm"
          className="bg-brand-blue hover:bg-brand-blue/90 gap-1.5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Invite Link
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-8 bg-[#F8F9FC] rounded-xl border border-dashed">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No invite codes yet. Create one to invite team members.
          </p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Code
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Role
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Uses
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Expires
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const status = getStatus(code);
                const isUsable = status.label === "Active";

                return (
                  <tr
                    key={code.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-navy-900 tracking-wider">
                        {code.code}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        by {code.creator?.full_name || code.creator?.email?.split("@")[0] || "Unknown"}
                      </p>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <Badge
                        className={`capitalize ${
                          code.default_role === "manager"
                            ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {code.default_role}
                      </Badge>
                    </td>

                    {/* Uses */}
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-medium text-navy-900">
                        {code.use_count}
                      </span>
                      {" / "}
                      {code.max_uses ? (
                        code.max_uses
                      ) : (
                        <Infinity className="inline h-3.5 w-3.5" />
                      )}
                    </td>

                    {/* Expires */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {code.expires_at
                        ? new Date(code.expires_at).toLocaleDateString()
                        : "Never"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge className={status.variant}>{status.label}</Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleCopyLink(code.code, code.id)}
                        >
                          {copiedId === code.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        {isAdmin && isUsable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                            onClick={() => handleRevoke(code.id)}
                            disabled={revokingId === code.id}
                          >
                            {revokingId === code.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <CreateInviteCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId}
        onCreated={loadCodes}
      />
    </div>
  );
}
