"use client";

import { useState } from "react";
import {
  File,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  FileCode,
  Star,
  StarOff,
  Download,
  Trash2,
  MoreHorizontal,
  Pencil,
  FolderInput,
  Share2,
  Eye,
  History,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Upload,
  Files,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatFileSize,
  getFileIcon,
  getDownloadUrl,
  type FileRecord,
} from "@/lib/files/files";
import type { FolderNode } from "@/lib/files/folders";
import type { ViewMode, SortBy, SortOrder } from "@/hooks/useFileManager";

// =====================================================
// File Type Colors & Icons
// =====================================================

const FILE_TYPE_COLORS: Record<string, string> = {
  "image": "text-blue-500",
  "video": "text-purple-500",
  "music": "text-pink-500",
  "file-text": "text-red-500",
  "table": "text-green-500",
  "presentation": "text-orange-500",
  "archive": "text-yellow-600",
  "file-code": "text-cyan-500",
  "file": "text-gray-400",
};

function FileIconComponent({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) {
  const iconName = getFileIcon(mimeType);
  const colorClass = FILE_TYPE_COLORS[iconName] || "text-gray-400";
  const cls = `${className || "h-5 w-5"} ${colorClass}`;

  switch (iconName) {
    case "image": return <Image className={cls} />;
    case "video": return <Film className={cls} />;
    case "music": return <Music className={cls} />;
    case "file-text": return <FileText className={cls} />;
    case "table": return <FileText className={cls} />;
    case "presentation": return <FileText className={cls} />;
    case "archive": return <Archive className={cls} />;
    case "file-code": return <FileCode className={cls} />;
    default: return <File className={cls} />;
  }
}

// =====================================================
// Sort Controls
// =====================================================

interface SortControlsProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "date", label: "Date Modified" },
  { value: "size", label: "Size" },
  { value: "type", label: "File Type" },
];

export function SortControls({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortControlsProps) {
  return (
    <div className="flex items-center gap-1">
      {SORT_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={sortBy === opt.value ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => {
            if (sortBy === opt.value) {
              onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
            } else {
              onSortByChange(opt.value);
            }
          }}
        >
          {opt.label}
          {sortBy === opt.value && (
            sortOrder === "asc" ? (
              <ArrowUp className="h-3 w-3 ml-0.5" />
            ) : (
              <ArrowDown className="h-3 w-3 ml-0.5" />
            )
          )}
        </Button>
      ))}
    </div>
  );
}

// =====================================================
// Thumbnail component for images
// =====================================================

function FileThumbnail({
  file,
  size,
}: {
  file: FileRecord;
  size: "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const isImage = file.mime_type.startsWith("image/");
  const hasUrl = file.public_url && !imgError;

  if (isImage && hasUrl) {
    return (
      <div
        className={`overflow-hidden rounded-md bg-muted flex items-center justify-center ${
          size === "lg" ? "h-28 w-full" : "h-10 w-10"
        }`}
      >
        <img
          src={file.public_url!}
          alt={file.name}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${
        size === "lg" ? "h-28 w-full" : "h-10 w-10"
      }`}
    >
      <FileIconComponent
        mimeType={file.mime_type}
        className={size === "lg" ? "h-14 w-14" : "h-5 w-5"}
      />
    </div>
  );
}

// =====================================================
// FileGrid props
// =====================================================

export interface FileGridProps {
  files: FileRecord[];
  subfolders: FolderNode[];
  viewMode: ViewMode;
  starredIds: Set<string>;
  selectedFiles: Set<string>;
  sortBy: SortBy;
  sortOrder: SortOrder;
  // File actions
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onOpenFile: (file: FileRecord) => void;
  onDownload: (fileId: string) => void;
  onRename: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  onVersionHistory: (file: FileRecord) => void;
  onToggleStar: (fileId: string, isStarred: boolean) => void;
  onDelete: (file: FileRecord) => void;
  // Folder actions
  onNavigateToFolder: (folderId: string) => void;
  // Sort actions
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
  // Empty state
  onCreateFolder: () => void;
  onUploadFiles: () => void;
  // Label
  isVirtualFolder?: boolean;
  emptyLabel?: string;
}

// =====================================================
// Main Component
// =====================================================

export function FileGrid({
  files,
  subfolders,
  viewMode,
  starredIds,
  selectedFiles,
  sortBy,
  sortOrder,
  onSelectFile,
  onOpenFile,
  onDownload,
  onRename,
  onMove,
  onShare,
  onVersionHistory,
  onToggleStar,
  onDelete,
  onNavigateToFolder,
  onSortByChange,
  onSortOrderChange,
  onCreateFolder,
  onUploadFiles,
  isVirtualFolder,
  emptyLabel,
}: FileGridProps) {
  const hasContent = files.length > 0 || subfolders.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center">
        <Files className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-1">
          {emptyLabel || "No files here"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isVirtualFolder
            ? "Files will appear here when available."
            : "Upload files or create folders to get started."}
        </p>
        {!isVirtualFolder && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCreateFolder}>
              <FolderOpen className="h-4 w-4 mr-1.5" /> New Folder
            </Button>
            <Button size="sm" onClick={onUploadFiles}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload Files
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Sort controls */}
        {files.length > 1 && (
          <div className="flex items-center justify-between">
            <SortControls
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={onSortByChange}
              onSortOrderChange={onSortOrderChange}
            />
            <span className="text-xs text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Subfolders */}
        {!isVirtualFolder && subfolders.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Folders
            </h3>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                  : "space-y-1"
              }
            >
              {subfolders.map((folder) => (
                <Card
                  key={folder.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    viewMode === "grid"
                      ? "p-3 flex flex-col items-center gap-2 text-center"
                      : "p-2 flex items-center gap-3"
                  }`}
                  onClick={() => onNavigateToFolder(folder.id)}
                >
                  <FolderOpen
                    className={viewMode === "grid" ? "h-10 w-10" : "h-5 w-5"}
                    style={{ color: folder.color || "#F59E0B" }}
                  />
                  <span className="text-sm font-medium truncate w-full">
                    {folder.name}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div>
            {!isVirtualFolder && subfolders.length > 0 && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Files
              </h3>
            )}

            {viewMode === "grid" ? (
              <GridView
                files={files}
                starredIds={starredIds}
                selectedFiles={selectedFiles}
                onSelectFile={onSelectFile}
                onOpenFile={onOpenFile}
                onDownload={onDownload}
                onRename={onRename}
                onMove={onMove}
                onShare={onShare}
                onVersionHistory={onVersionHistory}
                onToggleStar={onToggleStar}
                onDelete={onDelete}
              />
            ) : (
              <ListView
                files={files}
                starredIds={starredIds}
                selectedFiles={selectedFiles}
                onSelectFile={onSelectFile}
                onOpenFile={onOpenFile}
                onDownload={onDownload}
                onRename={onRename}
                onMove={onMove}
                onShare={onShare}
                onVersionHistory={onVersionHistory}
                onToggleStar={onToggleStar}
                onDelete={onDelete}
              />
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =====================================================
// Grid View
// =====================================================

interface FileItemProps {
  file: FileRecord;
  isStarred: boolean;
  isSelected: boolean;
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onOpenFile: (file: FileRecord) => void;
  onDownload: (fileId: string) => void;
  onRename: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  onVersionHistory: (file: FileRecord) => void;
  onToggleStar: (fileId: string, isStarred: boolean) => void;
  onDelete: (file: FileRecord) => void;
}

function FileContextDropdown({
  file,
  isStarred,
  onDownload,
  onRename,
  onMove,
  onShare,
  onVersionHistory,
  onToggleStar,
  onDelete,
  trigger,
}: FileItemProps & { trigger: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onDownload(file.id)}>
          <Download className="h-4 w-4 mr-2" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(file)}>
          <Pencil className="h-4 w-4 mr-2" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(file)}>
          <FolderInput className="h-4 w-4 mr-2" /> Move to Folder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onShare(file)}>
          <Share2 className="h-4 w-4 mr-2" /> Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onVersionHistory(file)}>
          <History className="h-4 w-4 mr-2" /> Version History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleStar(file.id, isStarred)}>
          {isStarred ? (
            <><StarOff className="h-4 w-4 mr-2" /> Unstar</>
          ) : (
            <><Star className="h-4 w-4 mr-2" /> Star</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(file)}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridView(props: {
  files: FileRecord[];
  starredIds: Set<string>;
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onOpenFile: (file: FileRecord) => void;
  onDownload: (fileId: string) => void;
  onRename: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  onVersionHistory: (file: FileRecord) => void;
  onToggleStar: (fileId: string, isStarred: boolean) => void;
  onDelete: (file: FileRecord) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {props.files.map((file) => {
        const isStarred = props.starredIds.has(file.id);
        const isSelected = props.selectedFiles.has(file.id);

        return (
          <Card
            key={file.id}
            className={`group relative flex flex-col overflow-hidden cursor-pointer hover:bg-muted/50 transition-all ${
              isSelected ? "ring-2 ring-primary shadow-md" : ""
            }`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                props.onSelectFile(file.id, true);
              } else {
                props.onSelectFile(file.id);
              }
            }}
            onDoubleClick={() => props.onOpenFile(file)}
          >
            {/* Star badge */}
            {isStarred && (
              <Star className="absolute top-2 left-2 h-3.5 w-3.5 text-yellow-500 fill-yellow-500 z-10" />
            )}

            {/* Hover overlay with quick actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-[1] pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDownload(file.id);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Download</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onShare(file);
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Share</TooltipContent>
              </Tooltip>
              <FileContextDropdown
                file={file}
                isStarred={isStarred}
                isSelected={isSelected}
                onSelectFile={props.onSelectFile}
                onOpenFile={props.onOpenFile}
                onDownload={props.onDownload}
                onRename={props.onRename}
                onMove={props.onMove}
                onShare={props.onShare}
                onVersionHistory={props.onVersionHistory}
                onToggleStar={props.onToggleStar}
                onDelete={props.onDelete}
                trigger={
                  <button
                    className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                }
              />
            </div>

            {/* Thumbnail / icon area */}
            <div className="p-3 pb-0">
              <FileThumbnail file={file} size="lg" />
            </div>

            {/* File info */}
            <div className="p-3 pt-2 flex-1 flex flex-col gap-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-medium truncate block">
                    {file.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {file.name}
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatFileSize(file.size_bytes)}</span>
                <span>
                  {new Date(file.updated_at || file.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {/* Uploader avatar */}
              {file.users && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Avatar
                    src={file.users.avatar_url || undefined}
                    alt={file.users.full_name}
                    fallback={file.users.full_name?.[0]?.toUpperCase() || "U"}
                    className="h-4 w-4 text-[8px]"
                  />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {file.users.full_name}
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// =====================================================
// List View
// =====================================================

function ListView(props: {
  files: FileRecord[];
  starredIds: Set<string>;
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onOpenFile: (file: FileRecord) => void;
  onDownload: (fileId: string) => void;
  onRename: (file: FileRecord) => void;
  onMove: (file: FileRecord) => void;
  onShare: (file: FileRecord) => void;
  onVersionHistory: (file: FileRecord) => void;
  onToggleStar: (fileId: string, isStarred: boolean) => void;
  onDelete: (file: FileRecord) => void;
}) {
  return (
    <div className="border rounded-lg divide-y">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-2 px-3 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground">
        <span>Name</span>
        <span>Size</span>
        <span>Type</span>
        <span>Uploaded by</span>
        <span>Modified</span>
        <span />
      </div>

      {props.files.map((file) => {
        const isStarred = props.starredIds.has(file.id);
        const isSelected = props.selectedFiles.has(file.id);
        const ext = file.name.split(".").pop()?.toUpperCase() || "";
        const date = new Date(file.updated_at || file.created_at);
        const dateStr = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={file.id}
            className={`group grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-2 px-3 py-2 items-center hover:bg-muted/30 cursor-pointer transition-colors ${
              isSelected ? "bg-primary/5" : ""
            }`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                props.onSelectFile(file.id, true);
              } else {
                props.onSelectFile(file.id);
              }
            }}
            onDoubleClick={() => props.onOpenFile(file)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isStarred && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
              <FileThumbnail file={file} size="sm" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm truncate">{file.name}</span>
                </TooltipTrigger>
                <TooltipContent>{file.name}</TooltipContent>
              </Tooltip>
              {file.version > 1 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0">
                  v{file.version}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size_bytes)}
            </span>
            <span className="text-xs text-muted-foreground">{ext}</span>
            <div className="flex items-center gap-1.5">
              {file.users && (
                <>
                  <Avatar
                    src={file.users.avatar_url || undefined}
                    alt={file.users.full_name}
                    fallback={file.users.full_name?.[0]?.toUpperCase() || "U"}
                    className="h-5 w-5 text-[9px]"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {file.users.full_name?.split(" ")[0]}
                  </span>
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{dateStr}</span>

            <FileContextDropdown
              file={file}
              isStarred={isStarred}
              isSelected={isSelected}
              onSelectFile={props.onSelectFile}
              onOpenFile={props.onOpenFile}
              onDownload={props.onDownload}
              onRename={props.onRename}
              onMove={props.onMove}
              onShare={props.onShare}
              onVersionHistory={props.onVersionHistory}
              onToggleStar={props.onToggleStar}
              onDelete={props.onDelete}
              trigger={
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
