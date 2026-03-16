"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/files/files";
import type { UploadQueueItem } from "@/hooks/useFileUpload";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// =====================================================
// Drag-and-Drop Zone
// =====================================================

interface UploadZoneProps {
  children: React.ReactNode;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({
  children,
  onFilesDropped,
  disabled,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCountRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCountRef.current++;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCountRef.current = 0;
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        // Validate sizes before adding
        const validFiles: File[] = [];
        const oversized: string[] = [];

        for (const file of droppedFiles) {
          if (file.size > MAX_FILE_SIZE) {
            oversized.push(`${file.name} (${formatFileSize(file.size)})`);
          } else {
            validFiles.push(file);
          }
        }

        if (oversized.length > 0) {
          // The parent will show toast for oversized files
          // We still pass the valid files
          console.warn("Oversized files rejected:", oversized);
        }

        if (validFiles.length > 0) {
          onFilesDropped(validFiles);
        }
      }
    },
    [disabled, onFilesDropped]
  );

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 text-primary">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileUp className="h-10 w-10" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Drop files here</p>
              <p className="text-sm text-muted-foreground">
                Files up to 25 MB each
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Upload Progress Panel (fixed bottom-right)
// =====================================================

interface UploadProgressPanelProps {
  queue: UploadQueueItem[];
  onClearCompleted: () => void;
  onRetryItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onClearAll: () => void;
  isUploading: boolean;
  completedCount: number;
  errorCount: number;
  totalCount: number;
}

export function UploadProgressPanel({
  queue,
  onClearCompleted,
  onRetryItem,
  onRemoveItem,
  onClearAll,
  isUploading,
  completedCount,
  errorCount,
  totalCount,
}: UploadProgressPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (queue.length === 0) return null;

  const allDone = !isUploading && completedCount + errorCount === totalCount;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : errorCount > 0 ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span>
            {isUploading
              ? `Uploading ${completedCount + 1}/${totalCount}`
              : allDone && errorCount === 0
                ? "All uploads complete"
                : `${completedCount} done, ${errorCount} failed`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {allDone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* File list */}
      {!collapsed && (
        <div className="max-h-60 overflow-y-auto">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0"
            >
              {/* Status icon */}
              {item.status === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              ) : item.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : item.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{item.file.name}</p>
                {item.status === "error" && item.error && (
                  <p className="text-[10px] text-destructive truncate">
                    {item.error}
                  </p>
                )}
                {item.status === "uploading" && (
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              {item.status === "error" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onRetryItem(item.id)}
                  title="Retry"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {(item.status === "done" || item.status === "error") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onRemoveItem(item.id)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer with error retry */}
      {!collapsed && errorCount > 0 && allDone && (
        <div className="px-3 py-2 bg-destructive/5 border-t flex items-center justify-between">
          <span className="text-xs text-destructive">
            {errorCount} error{errorCount !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={onClearCompleted}
          >
            Clear completed
          </Button>
        </div>
      )}
    </div>
  );
}
