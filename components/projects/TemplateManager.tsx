"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Code,
  Megaphone,
  Folder,
  Loader2,
  X,
  AlertTriangle,
  FolderKanban,
  GripVertical,
} from "lucide-react";
import {
  getAvailableTemplates,
  createTemplate,
  deleteTemplate,
  type ProjectTemplate,
} from "@/lib/projects/templates";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateManagerProps {
  orgId: string;
  currentUserId: string;
  isAdmin: boolean;
}

interface NewTaskInput {
  title: string;
  description: string;
  priority: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "engineering", label: "Engineering" },
  { value: "marketing", label: "Marketing" },
  { value: "design", label: "Design" },
  { value: "operations", label: "Operations" },
];

const COLOR_OPTIONS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
];

const ICON_OPTIONS = [
  { value: "code", label: "Code", Icon: Code },
  { value: "megaphone", label: "Megaphone", Icon: Megaphone },
  { value: "folder", label: "Folder", Icon: Folder },
];

function getTemplateIcon(icon: string) {
  switch (icon) {
    case "code":
      return Code;
    case "megaphone":
      return Megaphone;
    default:
      return Folder;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TemplateManager({
  orgId,
  currentUserId,
  isAdmin,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newIcon, setNewIcon] = useState("folder");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [newTasks, setNewTasks] = useState<NewTaskInput[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getAvailableTemplates(orgId);
      setTemplates(data);
    } catch (err) {
      console.error("Error loading templates:", err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [orgId]);

  const resetCreateForm = () => {
    setNewName("");
    setNewDescription("");
    setNewCategory("general");
    setNewIcon("folder");
    setNewColor("#3B82F6");
    setNewTasks([]);
    setTaskTitle("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (newTasks.length === 0) {
      toast.error("Add at least one task to the template");
      return;
    }

    setCreating(true);
    try {
      await createTemplate(orgId, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        icon: newIcon,
        color: newColor,
        created_by: currentUserId,
        tasks: newTasks.map((t, i) => ({
          title: t.title,
          description: t.description || undefined,
          priority: t.priority,
          sort_order: i + 1,
        })),
      });
      toast.success("Template created successfully");
      setCreateOpen(false);
      resetCreateForm();
      loadTemplates();
    } catch (err) {
      console.error("Error creating template:", err);
      toast.error("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success("Template deleted");
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const addTask = () => {
    if (!taskTitle.trim()) return;
    setNewTasks([
      ...newTasks,
      { title: taskTitle.trim(), description: "", priority: "medium" },
    ]);
    setTaskTitle("");
  };

  const removeTask = (index: number) => {
    setNewTasks(newTasks.filter((_, i) => i !== index));
  };

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-brand-purple" />
          <h3 className="text-base font-semibold text-navy-900">
            Project Templates
          </h3>
          <span className="text-sm text-muted-foreground">
            ({templates.length})
          </span>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-brand-blue hover:bg-brand-blue/90 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* System Templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                System Templates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((tmpl) => {
                  const TIcon = getTemplateIcon(tmpl.icon);
                  const taskCount = tmpl.template_tasks?.length || 0;
                  return (
                    <Card key={tmpl.id} className="relative">
                      <CardContent className="p-5">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: tmpl.color + "20" }}
                        >
                          <TIcon
                            className="h-5 w-5"
                            style={{ color: tmpl.color }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{tmpl.name}</h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 capitalize"
                          >
                            {tmpl.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {tmpl.description}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FolderKanban className="h-3 w-3" />
                          {taskCount} task{taskCount !== 1 ? "s" : ""}
                        </div>
                        <Badge
                          variant="outline"
                          className="absolute top-3 right-3 text-[10px] px-1.5 py-0"
                        >
                          System
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Templates */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Organization Templates
            </h4>
            {customTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <LayoutTemplate className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No custom templates yet.
                    {isAdmin && " Create one to help your team get started faster."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTemplates.map((tmpl) => {
                  const TIcon = getTemplateIcon(tmpl.icon);
                  const taskCount = tmpl.template_tasks?.length || 0;
                  return (
                    <Card key={tmpl.id} className="relative group">
                      <CardContent className="p-5">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: tmpl.color + "20" }}
                        >
                          <TIcon
                            className="h-5 w-5"
                            style={{ color: tmpl.color }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{tmpl.name}</h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 capitalize"
                          >
                            {tmpl.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {tmpl.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FolderKanban className="h-3 w-3" />
                            {taskCount} task{taskCount !== 1 ? "s" : ""}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                              onClick={() => setDeleteTarget(tmpl)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Template Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateForm();
          setCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-brand-blue" />
              Create Template
            </DialogTitle>
            <DialogDescription>
              Create a reusable project template with pre-defined tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tmpl-name">Template Name</Label>
              <Input
                id="tmpl-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Product Launch"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="tmpl-desc">Description</Label>
              <Textarea
                id="tmpl-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={2}
              />
            </div>

            {/* Category & Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={newIcon} onValueChange={setNewIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      newColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              <Label>Template Tasks ({newTasks.length})</Label>
              <div className="flex gap-2">
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTask}
                  disabled={!taskTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {newTasks.length > 0 && (
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {newTasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground w-5">
                        {index + 1}.
                      </span>
                      <span className="text-sm flex-1 truncate">
                        {task.title}
                      </span>
                      <Select
                        value={task.priority}
                        onValueChange={(v) => {
                          const updated = [...newTasks];
                          updated[index].priority = v;
                          setNewTasks(updated);
                        }}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue/90 gap-2"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-navy-900">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone. Existing projects created from this
              template will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
