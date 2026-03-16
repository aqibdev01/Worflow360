"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFile, type FileRecord } from "@/lib/files/files";

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: FileRecord;
}

interface UseFileUploadOptions {
  orgId: string;
  projectId?: string;
  folderId?: string;
  onFileUploaded?: (file: FileRecord) => void;
  onAllComplete?: () => void;
}

export function useFileUpload({
  orgId,
  projectId,
  folderId,
  onFileUploaded,
  onAllComplete,
}: UseFileUploadOptions) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const isProcessingRef = useRef(false);

  const isUploading = queue.some((item) => item.status === "uploading");
  const hasPending = queue.some((item) => item.status === "pending");

  /**
   * Add files to the upload queue and start processing.
   */
  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadQueueItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as UploadStatus,
        progress: 0,
      }));

      setQueue((prev) => [...prev, ...newItems]);

      // Start processing if not already running
      if (!isProcessingRef.current) {
        processQueue([...newItems]);
      }
    },
    [orgId, projectId, folderId]
  );

  /**
   * Process the upload queue sequentially (one at a time).
   */
  const processQueue = useCallback(
    async (pendingItems: UploadQueueItem[]) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      for (const item of pendingItems) {
        // Update status to uploading
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "uploading" as UploadStatus, progress: 10 } : q
          )
        );

        try {
          // Simulate progress steps (Supabase SDK doesn't provide upload progress)
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 30 } : q))
          );

          const result = await uploadFile(orgId, item.file, {
            projectId,
            folderId,
          });

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "done" as UploadStatus, progress: 100, result }
                : q
            )
          );

          onFileUploaded?.(result);
        } catch (err: any) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: "error" as UploadStatus,
                    progress: 0,
                    error: err.message || "Upload failed",
                  }
                : q
            )
          );
        }
      }

      isProcessingRef.current = false;
      onAllComplete?.();
    },
    [orgId, projectId, folderId, onFileUploaded, onAllComplete]
  );

  /**
   * Remove an item from the queue (only if not currently uploading).
   */
  const removeFromQueue = useCallback((itemId: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== itemId || q.status === "uploading"));
  }, []);

  /**
   * Clear all completed and errored items from the queue.
   */
  const clearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter((q) => q.status === "pending" || q.status === "uploading")
    );
  }, []);

  /**
   * Retry a failed upload.
   */
  const retryItem = useCallback(
    async (itemId: string) => {
      const item = queue.find((q) => q.id === itemId && q.status === "error");
      if (!item) return;

      setQueue((prev) =>
        prev.map((q) =>
          q.id === itemId
            ? { ...q, status: "pending" as UploadStatus, progress: 0, error: undefined }
            : q
        )
      );

      // Process just this item
      if (!isProcessingRef.current) {
        processQueue([item]);
      }
    },
    [queue, processQueue]
  );

  /**
   * Clear the entire queue.
   */
  const clearAll = useCallback(() => {
    if (!isUploading) {
      setQueue([]);
    }
  }, [isUploading]);

  return {
    queue,
    addFiles,
    removeFromQueue,
    clearCompleted,
    retryItem,
    clearAll,
    isUploading,
    hasPending,
    completedCount: queue.filter((q) => q.status === "done").length,
    errorCount: queue.filter((q) => q.status === "error").length,
    totalCount: queue.length,
  };
}
