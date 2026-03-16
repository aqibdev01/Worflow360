"use client";

import { ChevronRight, Folder, Home } from "lucide-react";
import type { FolderNode } from "@/lib/files/folders";

interface FileBreadcrumbProps {
  folderPath: FolderNode[];
  rootLabel?: string;
  onNavigate: (folderId: string | null) => void;
}

export function FileBreadcrumb({
  folderPath,
  rootLabel = "Files",
  onNavigate,
}: FileBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      {/* Root */}
      <button
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
          folderPath.length === 0
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        onClick={() => onNavigate(null)}
        disabled={folderPath.length === 0}
      >
        <Home className="h-3.5 w-3.5" />
        <span>{rootLabel}</span>
      </button>

      {/* Path segments */}
      {folderPath.map((folder, index) => {
        const isLast = index === folderPath.length - 1;
        return (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <button
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors whitespace-nowrap ${
                isLast
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              onClick={() => onNavigate(folder.id)}
              disabled={isLast}
            >
              <Folder
                className="h-3.5 w-3.5 flex-shrink-0"
                style={{ color: folder.color || undefined }}
              />
              <span>{folder.name}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
