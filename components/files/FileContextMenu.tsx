"use client";

import {
  Download,
  Trash2,
  FolderInput,
  Share2,
  Star,
  StarOff,
  Pencil,
  Eye,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileRecord } from "@/lib/files/files";

// =====================================================
// Bulk Action Toolbar
// =====================================================

interface BulkActionToolbarProps {
  selectedCount: number;
  onMove: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onMove,
  onDownload,
  onDelete,
  onClearSelection,
}: BulkActionToolbarProps) {
  if (selectedCount <= 1) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b">
      <span className="text-sm font-medium text-primary">
        {selectedCount} selected
      </span>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={onMove}
      >
        <FolderInput className="h-3.5 w-3.5" />
        Move
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={onDownload}
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onClearSelection}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// =====================================================
// Move to Folder Dialog
// =====================================================

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Folder, FolderOpen, ChevronRight, Home } from "lucide-react";
import type { FolderNode } from "@/lib/files/folders";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  currentFolderId: string | null;
  targetLabel: string;
  onMove: (targetFolderId: string | null) => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  targetLabel,
  onMove,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    setLoading(true);
    try {
      await onMove(selectedFolderId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {targetLabel}</DialogTitle>
          <DialogDescription>
            Select a destination folder.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto border rounded-lg">
          {/* Root option */}
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              selectedFolderId === null
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted"
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            <span>Root</span>
          </button>

          {/* Folder list (flat) */}
          {folders
            .filter((f) => f.id !== currentFolderId)
            .map((folder) => (
              <button
                key={folder.id}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  selectedFolderId === folder.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <Folder
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: folder.color || undefined }}
                />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}

          {folders.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No other folders available
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={loading || selectedFolderId === currentFolderId}
          >
            {loading ? "Moving..." : "Move Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
