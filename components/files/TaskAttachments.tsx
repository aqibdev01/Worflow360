"use client";

import { useState, useEffect, useRef } from "react";
import {
  Paperclip,
  Upload,
  X,
  Download,
  Loader2,
  File,
  Image,
  FileText,
  Film,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getTaskFiles,
  uploadTaskFile,
  downloadFile,
  deleteFile,
  formatFileSize,
  getFileIcon,
  type FileRecord,
} from "@/lib/files/files";

// =====================================================
// Props
// =====================================================

interface TaskAttachmentsProps {
  taskId: string;
  orgId: string;
  projectId: string;
  canEdit: boolean;
}

// =====================================================
// Icon helper
// =====================================================

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  const cls = "h-3.5 w-3.5";
  const iconName = getFileIcon(mimeType);

  switch (iconName) {
    case "image": return <Image className={`${cls} text-blue-500`} />;
    case "video": return <Film className={`${cls} text-purple-500`} />;
    case "file-text": return <FileText className={`${cls} text-red-500`} />;
    default: return <File className={`${cls} text-gray-500`} />;
  }
}

// =====================================================
// Component
// =====================================================

export function TaskAttachments({
  taskId,
  orgId,
  projectId,
  canEdit,
}: TaskAttachmentsProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTaskFiles(taskId);
        setFiles(data);
      } catch {
        // Silently fail — table might not exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(selected)) {
        const result = await uploadTaskFile(orgId, projectId, taskId, file);
        setFiles((prev) => [result, ...prev]);
      }
      toast.success(
        selected.length === 1
          ? "File attached"
          : `${selected.length} files attached`
      );
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      await downloadFile(file.id);
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("Attachment removed");
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments
          {files.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {files.length}
            </Badge>
          )}
        </label>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Attach
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 group"
            >
              <AttachmentIcon mimeType={file.mime_type} />
              <span className="text-xs truncate flex-1">{file.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatFileSize(file.size_bytes)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDownload(file)}
              >
                <Download className="h-3 w-3" />
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={() => handleDelete(file.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">
          No attachments yet.
        </p>
      )}
    </div>
  );
}
