"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Share2,
  File,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  FileCode,
  Clock,
  User,
  HardDrive,
  Hash,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getFile,
  getDownloadUrl,
  downloadFile,
  renameFile,
  updateFileDescription,
  formatFileSize,
  getFileIcon,
  type FileRecord,
} from "@/lib/files/files";
import { VersionHistoryPanel } from "./VersionHistoryPanel";

// =====================================================
// Icon for preview
// =====================================================

function LargeFileIcon({ mimeType }: { mimeType: string }) {
  const iconName = getFileIcon(mimeType);
  const cls = "h-24 w-24";

  const colorMap: Record<string, string> = {
    "image": "text-blue-400",
    "video": "text-purple-400",
    "music": "text-pink-400",
    "file-text": "text-red-400",
    "table": "text-green-400",
    "archive": "text-yellow-500",
    "file-code": "text-cyan-400",
    "file": "text-gray-400",
  };
  const color = colorMap[iconName] || "text-gray-400";

  switch (iconName) {
    case "image": return <Image className={`${cls} ${color}`} />;
    case "video": return <Film className={`${cls} ${color}`} />;
    case "music": return <Music className={`${cls} ${color}`} />;
    case "file-text": return <FileText className={`${cls} ${color}`} />;
    case "table": return <FileText className={`${cls} ${color}`} />;
    case "archive": return <Archive className={`${cls} ${color}`} />;
    case "file-code": return <FileCode className={`${cls} ${color}`} />;
    default: return <File className={`${cls} ${color}`} />;
  }
}

// =====================================================
// Props
// =====================================================

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
  onShare: (file: FileRecord) => void;
  onFileUpdated: () => void;
}

// =====================================================
// Main Component
// =====================================================

export function FilePreviewModal({
  open,
  onOpenChange,
  fileId,
  onShare,
  onFileUpdated,
}: FilePreviewModalProps) {
  const [file, setFile] = useState<FileRecord | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Load file data when opened
  useEffect(() => {
    if (!open || !fileId) {
      setFile(null);
      setSignedUrl(null);
      setEditingName(false);
      setEditingDesc(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const [fileData, url] = await Promise.all([
          getFile(fileId),
          getDownloadUrl(fileId),
        ]);
        setFile(fileData);
        setSignedUrl(url);
        setNameValue(fileData.name);
        setDescValue(fileData.description || "");
      } catch (err: any) {
        toast.error("Failed to load file", { description: err.message });
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fileId]);

  const handleSaveName = async () => {
    if (!file || !nameValue.trim() || nameValue.trim() === file.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await renameFile(file.id, nameValue.trim());
      setFile((prev) => prev ? { ...prev, name: nameValue.trim() } : null);
      toast.success("File renamed");
      onFileUpdated();
    } catch (err: any) {
      toast.error("Rename failed", { description: err.message });
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!file) {
      setEditingDesc(false);
      return;
    }
    setSaving(true);
    try {
      await updateFileDescription(file.id, descValue.trim() || null);
      setFile((prev) => prev ? { ...prev, description: descValue.trim() || null } : null);
      toast.success("Description updated");
      onFileUpdated();
    } catch (err: any) {
      toast.error("Update failed", { description: err.message });
    } finally {
      setSaving(false);
      setEditingDesc(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;
    try {
      await downloadFile(file.id);
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  };

  if (!open) return null;

  const isImage = file?.mime_type.startsWith("image/");
  const isPdf = file?.mime_type === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : file ? (
          <>
            {/* Left: Preview */}
            <div className="flex-1 bg-muted/30 flex items-center justify-center p-6 overflow-auto min-w-0">
              {isImage && signedUrl ? (
                <img
                  src={signedUrl}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              ) : isPdf && signedUrl ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full rounded-lg border"
                  title={file.name}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <LargeFileIcon mimeType={file.mime_type} />
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(file.size_bytes)} &middot;{" "}
                      {file.mime_type.split("/").pop()?.toUpperCase()}
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" /> Download to Preview
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Details Panel */}
            <div className="w-80 border-l flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                  File Details
                </p>

                {/* Editable name */}
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      disabled={saving}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <h3 className="text-sm font-semibold truncate flex-1" title={file.name}>
                      {file.name}
                    </h3>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                      onClick={() => {
                        setNameValue(file.name);
                        setEditingName(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="px-4 py-3 space-y-3 text-sm">
                {/* Description */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                  {editingDesc ? (
                    <div className="space-y-1">
                      <Textarea
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        className="text-sm min-h-[60px]"
                        autoFocus
                        disabled={saving}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setEditingDesc(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          onClick={handleSaveDescription}
                          disabled={saving}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="group flex items-start gap-1 cursor-pointer"
                      onClick={() => {
                        setDescValue(file.description || "");
                        setEditingDesc(true);
                      }}
                    >
                      <p className="text-sm text-muted-foreground flex-1">
                        {file.description || "Add a description..."}
                      </p>
                      <Pencil className="h-3 w-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-auto font-medium">{formatFileSize(file.size_bytes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <File className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-auto font-medium">
                      {file.mime_type.split("/").pop()?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Version:</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      v{file.version}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Uploaded:</span>
                    <span className="ml-auto font-medium text-xs">
                      {new Date(file.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {file.users && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">By:</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Avatar
                          src={file.users.avatar_url || undefined}
                          alt={file.users.full_name}
                          fallback={file.users.full_name?.[0]?.toUpperCase() || "U"}
                          className="h-5 w-5 text-[9px]"
                        />
                        <span className="font-medium text-xs">{file.users.full_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t space-y-2">
                <Button
                  className="w-full gap-2"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  size="sm"
                  onClick={() => onShare(file)}
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>

              {/* Version History */}
              <VersionHistoryPanel file={file} onFileUpdated={onFileUpdated} />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
