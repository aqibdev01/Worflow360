"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Archive, Trash2, Loader2 } from "lucide-react";
import { updateProjectDetails, deleteProject } from "@/lib/projects/update";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectDangerZoneProps {
  project: {
    id: string;
    name: string;
    status: string;
    organizations?: { id: string };
  };
  isOwner: boolean;
  onUpdated: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectDangerZone({
  project,
  isOwner,
  onUpdated,
}: ProjectDangerZoneProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isArchived = project.status === "archived";

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await updateProjectDetails(project.id, {
        status: isArchived ? "active" : "archived",
      });
      toast.success(
        isArchived
          ? "Project restored to active"
          : "Project archived successfully"
      );
      onUpdated();
    } catch (err) {
      console.error("Error archiving project:", err);
      toast.error("Failed to update project status");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== project.name) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted permanently");
      const orgId = project.organizations?.id;
      router.push(
        orgId
          ? `/dashboard/organizations/${orgId}`
          : "/dashboard"
      );
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
      </div>

      <div className="border border-red-200 rounded-xl divide-y divide-red-200">
        {/* Archive */}
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-navy-900">
              {isArchived ? "Restore Project" : "Archive Project"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isArchived
                ? "Restore this project to active status."
                : "Archive this project. It will be hidden from the default view but data is preserved."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 ${
              isArchived
                ? "border-brand-blue text-brand-blue hover:bg-brand-blue/5"
                : "border-amber-500 text-amber-600 hover:bg-amber-50"
            }`}
            onClick={handleArchive}
            disabled={archiving}
          >
            {archiving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </div>

        {/* Delete (owner only) */}
        {isOwner && (
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-navy-900">Delete Project</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete this project and all its data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-navy-900">{project.name}</span>{" "}
              and all associated tasks, sprints, and data. This action{" "}
              <span className="font-semibold text-red-600">cannot be undone</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-navy-900">{project.name}</span> to confirm:
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Enter project name"
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmName("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmName !== project.name}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
