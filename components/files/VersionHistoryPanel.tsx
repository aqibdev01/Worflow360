"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getFileVersions,
  uploadNewVersion,
  formatFileSize,
  type FileRecord,
  type FileVersion,
} from "@/lib/files/files";

// =====================================================
// Props
// =====================================================

interface VersionHistoryPanelProps {
  file: FileRecord;
  onFileUpdated: () => void;
}

// =====================================================
// Component
// =====================================================

export function VersionHistoryPanel({
  file,
  onFileUpdated,
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const loadVersions = useCallback(async () => {
    if (loaded.current) return;
    setLoading(true);
    try {
      const v = await getFileVersions(file.id);
      setVersions(v);
      loaded.current = true;
    } catch (err: any) {
      toast.error("Failed to load versions", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadVersions();
  };

  const handleRestore = async (version: FileVersion) => {
    setRestoring(version.id);
    try {
      // Download the old version's file from storage, then re-upload as new version
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.storage
        .from("org-files")
        .download(version.storage_path);

      if (error) throw error;
      if (!data) throw new Error("Failed to download version file");

      // Create a File object from the blob
      const restoredFile = new File([data], file.name, {
        type: file.mime_type,
      });

      await uploadNewVersion(file.id, restoredFile);
      toast.success(`Restored to v${version.version_number}`);

      // Reload versions
      loaded.current = false;
      await loadVersions();
      onFileUpdated();
    } catch (err: any) {
      toast.error("Restore failed", { description: err.message });
    } finally {
      setRestoring(null);
    }
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    if (!newFile) return;

    try {
      await uploadNewVersion(file.id, newFile);
      toast.success("New version uploaded");
      loaded.current = false;
      await loadVersions();
      onFileUpdated();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    }

    // Reset input
    if (uploadRef.current) uploadRef.current.value = "";
  };

  const handleDownloadVersion = async (version: FileVersion) => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.storage
        .from("org-files")
        .createSignedUrl(version.storage_path, 3600, {
          download: `v${version.version_number}-${file.name}`,
        });

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  };

  return (
    <div className="border-t">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Version History
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {/* Upload new version button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={() => uploadRef.current?.click()}
          >
            Upload New Version
          </Button>
          <input
            ref={uploadRef}
            type="file"
            className="hidden"
            onChange={handleUploadNewVersion}
          />

          {/* Current version */}
          <div className="flex items-center gap-2 py-2 text-sm border-b">
            <Badge variant="default" className="text-[10px]">
              v{file.version}
            </Badge>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">Current</span>
              <span className="text-xs text-muted-foreground ml-1">
                &middot; {formatFileSize(file.size_bytes)} &middot;{" "}
                {new Date(file.updated_at || file.created_at).toLocaleDateString()}
              </span>
            </div>
            {file.users && (
              <Avatar
                src={file.users.avatar_url || undefined}
                alt={file.users.full_name}
                fallback={file.users.full_name?.[0]?.toUpperCase() || "U"}
                className="h-5 w-5 text-[9px]"
              />
            )}
          </div>

          {/* Previous versions */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : versions.length > 0 ? (
            <div className="space-y-1">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 py-1.5 text-sm group"
                >
                  <Badge variant="outline" className="text-[10px]">
                    v{v.version_number}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(v.size_bytes)} &middot;{" "}
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.users && (
                    <Avatar
                      src={v.users.avatar_url || undefined}
                      alt={v.users.full_name}
                      fallback={v.users.full_name?.[0]?.toUpperCase() || "U"}
                      className="h-5 w-5 text-[9px]"
                    />
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDownloadVersion(v)}
                      title="Download this version"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRestore(v)}
                      disabled={restoring === v.id}
                      title="Restore this version"
                    >
                      {restoring === v.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {file.version === 1
                ? "This is the original version."
                : "No previous versions found."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
