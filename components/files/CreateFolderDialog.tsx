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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFolder } from "@/lib/files/folders";
import { toast } from "sonner";
import { Check } from "lucide-react";

const PRESET_COLORS = [
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#10B981" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Orange", hex: "#F59E0B" },
  { name: "Red", hex: "#EF4444" },
  { name: "Pink", hex: "#EC4899" },
];

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId?: string | null;
  parentFolderId?: string | null;
  onFolderCreated: () => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  orgId,
  projectId,
  parentFolderId,
  onFolderCreated,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    setLoading(true);
    try {
      await createFolder(orgId, {
        name: name.trim(),
        projectId: projectId || undefined,
        parentFolderId: parentFolderId || undefined,
        color: color || customColor || undefined,
      });

      toast.success("Folder created", {
        description: `"${name.trim()}" has been created.`,
      });

      // Reset form
      setName("");
      setColor(null);
      setCustomColor("");
      onOpenChange(false);
      onFolderCreated();
    } catch (err: any) {
      toast.error("Failed to create folder", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedColor = color || customColor || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              {parentFolderId
                ? "Create a subfolder inside the current folder."
                : projectId
                  ? "Create a new folder in this project."
                  : "Create a new organization-level folder."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Folder Name */}
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g., Design Assets"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {/* No color option */}
                <button
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    !selectedColor
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-muted hover:border-foreground/50"
                  }`}
                  onClick={() => {
                    setColor(null);
                    setCustomColor("");
                  }}
                  title="No color"
                >
                  {!selectedColor && <Check className="h-3.5 w-3.5" />}
                </button>

                {/* Preset colors */}
                {PRESET_COLORS.map((pc) => (
                  <button
                    key={pc.hex}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedColor === pc.hex
                        ? "ring-2 ring-foreground/20"
                        : "hover:scale-110"
                    }`}
                    style={{
                      backgroundColor: pc.hex,
                      borderColor:
                        selectedColor === pc.hex ? pc.hex : "transparent",
                    }}
                    onClick={() => {
                      setColor(pc.hex);
                      setCustomColor("");
                    }}
                    title={pc.name}
                  >
                    {selectedColor === pc.hex && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                ))}

                {/* Custom hex input */}
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-8 w-24 text-xs"
                    placeholder="#hex"
                    value={customColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomColor(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        setColor(null); // deselect preset
                      }
                    }}
                    maxLength={7}
                  />
                  {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: customColor }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
