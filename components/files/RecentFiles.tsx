"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, FileText, Image, Film, Music, Archive, FileCode, File, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, getFileIcon } from "@/lib/files/files";

// =====================================================
// Types
// =====================================================

interface RecentFileEntry {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  orgId: string;
  projectId: string | null;
  accessedAt: number; // timestamp
}

const STORAGE_KEY = (userId: string) => `workflow360_recent_files_${userId}`;
const MAX_RECENT = 20;

// =====================================================
// localStorage helpers (exported for use across modules)
// =====================================================

export function trackRecentFile(
  userId: string,
  file: {
    id: string;
    name: string;
    mime_type: string;
    size_bytes: number;
    organization_id: string;
    project_id: string | null;
  }
) {
  try {
    const key = STORAGE_KEY(userId);
    const existing: RecentFileEntry[] = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    // Remove if already exists (to re-add at top)
    const filtered = existing.filter((e) => e.id !== file.id);

    const entry: RecentFileEntry = {
      id: file.id,
      name: file.name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      orgId: file.organization_id,
      projectId: file.project_id,
      accessedAt: Date.now(),
    };

    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable
  }
}

export function getRecentFiles(userId: string): RecentFileEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(userId)) || "[]");
  } catch {
    return [];
  }
}

export function clearRecentFiles(userId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY(userId));
  } catch {
    // ignore
  }
}

// =====================================================
// File Icon Component
// =====================================================

function RecentFileIcon({ mimeType }: { mimeType: string }) {
  const iconName = getFileIcon(mimeType);
  const cls = "h-4 w-4";

  const colorMap: Record<string, string> = {
    image: "text-blue-500",
    video: "text-purple-500",
    music: "text-pink-500",
    "file-text": "text-red-500",
    table: "text-green-500",
    archive: "text-yellow-500",
    "file-code": "text-cyan-500",
    file: "text-gray-500",
  };
  const color = colorMap[iconName] || "text-gray-500";

  switch (iconName) {
    case "image": return <Image className={`${cls} ${color}`} />;
    case "video": return <Film className={`${cls} ${color}`} />;
    case "music": return <Music className={`${cls} ${color}`} />;
    case "file-text": return <FileText className={`${cls} ${color}`} />;
    case "archive": return <Archive className={`${cls} ${color}`} />;
    case "file-code": return <FileCode className={`${cls} ${color}`} />;
    default: return <File className={`${cls} ${color}`} />;
  }
}

// =====================================================
// RecentFiles Component
// =====================================================

interface RecentFilesProps {
  userId: string;
  orgId: string;
  onOpenFile: (fileId: string) => void;
}

export function RecentFiles({ userId, orgId, onOpenFile }: RecentFilesProps) {
  const [files, setFiles] = useState<RecentFileEntry[]>([]);

  const loadFiles = useCallback(() => {
    const all = getRecentFiles(userId);
    // Filter to current org
    setFiles(all.filter((f) => f.orgId === orgId));
  }, [userId, orgId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleClear = () => {
    clearRecentFiles(userId);
    setFiles([]);
  };

  if (files.length === 0) return null;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Files
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {files.slice(0, 10).map((file) => (
            <button
              key={file.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
              onClick={() => onOpenFile(file.id)}
            >
              <RecentFileIcon mimeType={file.mimeType} />
              <span className="text-sm truncate flex-1">{file.name}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTime(file.accessedAt)}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
