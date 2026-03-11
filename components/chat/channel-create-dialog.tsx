"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createChannel, addAllOrgMembersToChannel, addAllProjectMembersToChannel } from "@/lib/chat-database";
import { toast } from "sonner";

interface ChannelCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "org" | "project";
  scopeId: string;
  currentUserId: string;
  onChannelCreated: () => void;
}

export function ChannelCreateDialog({
  open,
  onOpenChange,
  scope,
  scopeId,
  currentUserId,
  onChannelCreated,
}: ChannelCreateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setLoading(true);
    try {
      const channel = await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        channel_type: scope === "org" ? "org_custom" : "project_custom",
        visibility,
        org_id: scope === "org" ? scopeId : undefined,
        project_id: scope === "project" ? scopeId : undefined,
        created_by: currentUserId,
      });

      // For public channels, auto-add all members
      if (visibility === "public") {
        if (scope === "org") {
          await addAllOrgMembersToChannel(channel.id, scopeId);
        } else {
          await addAllProjectMembersToChannel(channel.id, scopeId);
        }
      }

      toast.success(`Channel #${name.trim()} created`);
      setName("");
      setDescription("");
      setVisibility("public");
      onOpenChange(false);
      onChannelCreated();
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error("Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for your {scope === "org" ? "organization" : "project"} team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Name *</label>
            <Input
              placeholder="e.g. design-discussion"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-_]/g, "-")
                    .replace(/-+/g, "-")
                )
              }
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
              maxLength={250}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Visibility</label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Public — All {scope === "org" ? "organization" : "project"} members can see and join
                </SelectItem>
                <SelectItem value="private">
                  Private — Only invited members can see
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
