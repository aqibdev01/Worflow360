"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Hash, Lock, Megaphone, Loader2 } from "lucide-react";
import { createChannel, addAllOrgMembersToChannel } from "@/lib/communication/channels";
import { getOrganizationProjects } from "@/lib/database";
import { toast } from "sonner";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentUserId: string;
  onChannelCreated: () => void;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  orgId,
  currentUserId,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<
    "public" | "private" | "announcement"
  >("public");
  const [projectId, setProjectId] = useState<string>("none");
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Load org projects for the scope dropdown
  useEffect(() => {
    if (!open || !orgId) return;
    setProjectsLoading(true);
    getOrganizationProjects(orgId)
      .then((data) => setProjects(data || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false));
  }, [open, orgId]);

  // Auto-slug the channel name
  const handleNameChange = (value: string) => {
    setName(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-_\s]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
    );
  };

  const slugPreview = name.trim() ? `#${name.trim()}` : "";
  const displayName = name
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setLoading(true);
    try {
      const channel = await createChannel(orgId, {
        name: name.trim(),
        display_name: displayName,
        description: description.trim() || undefined,
        type: channelType,
        project_id: projectId !== "none" ? projectId : undefined,
        created_by: currentUserId,
      });

      // For announcement channels, auto-add all org members
      if (channelType === "announcement") {
        await addAllOrgMembersToChannel(channel.id, orgId);
      }

      toast.success(`Channel ${slugPreview} created`);

      // Reset form
      setName("");
      setDescription("");
      setChannelType("public");
      setProjectId("none");
      onOpenChange(false);
      onChannelCreated();

      // Navigate to the new channel
      router.push(
        `/dashboard/organizations/${orgId}/communication/${channel.id}`
      );
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error("Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    {
      value: "public" as const,
      label: "Public",
      desc: "All org members can see and join",
      icon: Hash,
    },
    {
      value: "private" as const,
      label: "Private",
      desc: "Only invited members can see",
      icon: Lock,
    },
    {
      value: "announcement" as const,
      label: "Announcement",
      desc: "Only admins can post, everyone reads",
      icon: Megaphone,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for your team to communicate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Name *</label>
            <Input
              placeholder="e.g. design-discussion"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={80}
            />
            {slugPreview && (
              <p className="text-xs text-muted-foreground">
                Preview:{" "}
                <span className="font-mono text-brand-blue">
                  {slugPreview}
                </span>
                {displayName && (
                  <span className="ml-2 text-navy-900">
                    — {displayName}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Description */}
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

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = channelType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChannelType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                        : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected ? "text-brand-blue" : ""
                      }`}
                    />
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Scope */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Project Scope{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Organization-wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Organization-wide (no project)
                </SelectItem>
                {projectsLoading ? (
                  <SelectItem value="_loading" disabled>
                    Loading projects...
                  </SelectItem>
                ) : (
                  projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this channel to a specific project, or leave as org-wide.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="bg-brand-blue hover:bg-brand-blue/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
