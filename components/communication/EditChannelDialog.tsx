"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Hash, Lock, Megaphone, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { updateChannel, deleteChannel } from "@/lib/communication/channels";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    type: string;
    created_by: string;
    organization_id: string;
  } | null;
  currentUserId: string;
  orgId: string;
  onUpdated: () => void;
}

export function EditChannelDialog({
  open,
  onOpenChange,
  channel,
  currentUserId,
  orgId,
  onUpdated,
}: EditChannelDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<"public" | "private" | "announcement">("public");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (channel && open) {
      setName(channel.name);
      setDescription(channel.description || "");
      setChannelType(channel.type as "public" | "private" | "announcement");
      setShowDeleteConfirm(false);
      setConfirmName("");
    }
  }, [channel, open]);

  const displayName = name
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleNameChange = (value: string) => {
    setName(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-_\s]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
    );
  };

  const handleSave = async () => {
    if (!channel || !name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setSaving(true);
    try {
      await updateChannel(channel.id, {
        name: name.trim(),
        display_name: displayName,
        description: description.trim() || undefined,
        type: channelType,
      });
      toast.success("Channel updated");
      onOpenChange(false);
      onUpdated();
    } catch (error: any) {
      console.error("Error updating channel:", error);
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("A channel with this name already exists");
      } else {
        toast.error("Failed to update channel");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!channel || confirmName !== channel.display_name) return;

    setDeleting(true);
    try {
      await deleteChannel(channel.id);
      toast.success("Channel deleted");
      onOpenChange(false);
      onUpdated();
      router.push(`/dashboard/organizations/${orgId}/communication`);
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Failed to delete channel");
    } finally {
      setDeleting(false);
    }
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
          <DialogDescription>
            Update the channel name, description, or type.
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Channel Name</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. general"
                  maxLength={80}
                />
                {name.trim() && (
                  <p className="text-xs text-muted-foreground">
                    #{name.trim()} — {displayName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  maxLength={250}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Channel Type</Label>
                <Select value={channelType} onValueChange={(v) => setChannelType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5" /> Public
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" /> Private
                      </div>
                    </SelectItem>
                    <SelectItem value="announcement">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-3.5 w-3.5" /> Announcement
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Channel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-semibold">Delete Channel</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <span className="font-semibold text-foreground">{channel.display_name}</span> and
                all its messages. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <Label className="text-sm">
                  Type <span className="font-mono font-semibold">{channel.display_name}</span> to confirm:
                </Label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Enter channel name"
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); setConfirmName(""); }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || confirmName !== channel.display_name}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Channel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
