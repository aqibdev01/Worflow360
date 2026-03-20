"use client";

import { useState, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Share2,
  Files,
  Plus,
  MoreHorizontal,
  Pencil,
  FolderPlus,
  Palette,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { FolderNode } from "@/lib/files/folders";

// =====================================================
// Types
// =====================================================

export type VirtualFolder = "all" | "starred" | "recent" | "shared";

interface FolderSidebarProps {
  orgId: string;
  projectId?: string | null;
  folderTree: FolderNode[];
  currentFolderId: string | null;
  activeVirtualFolder: VirtualFolder | null;
  onNavigateToFolder: (folderId: string | null) => void;
  onVirtualFolderSelect: (folder: VirtualFolder) => void;
  onCreateFolder: (parentFolderId?: string) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onChangeColor: (folderId: string) => void;
  onShareFolder?: (folderId: string) => void;
  projectFolders?: { projectId: string; projectName: string; folders: FolderNode[] }[];
}

// =====================================================
// Folder Tree Item
// =====================================================

function FolderTreeItem({
  folder,
  depth,
  currentFolderId,
  expandedFolders,
  toggleExpand,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onChangeColor,
  onShareFolder,
}: {
  folder: FolderNode;
  depth: number;
  currentFolderId: string | null;
  expandedFolders: Set<string>;
  toggleExpand: (id: string) => void;
  onNavigate: (id: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onShareFolder?: (id: string) => void;
  onChangeColor: (id: string) => void;
}) {
  const isActive = currentFolderId === folder.id;
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onNavigate(folder.id)}
      >
        {/* Expand/collapse toggle */}
        <button
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted-foreground/10"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(folder.id);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen
            className="h-4 w-4 flex-shrink-0"
            style={{ color: folder.color || undefined }}
          />
        ) : (
          <Folder
            className="h-4 w-4 flex-shrink-0"
            style={{ color: folder.color || undefined }}
          />
        )}

        {/* Folder name */}
        <span className="truncate flex-1">{folder.name}</span>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted-foreground/10 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onRenameFolder(folder.id, folder.name)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeColor(folder.id)}>
              <Palette className="h-4 w-4 mr-2" />
              Change Color
            </DropdownMenuItem>
            {onShareFolder && (
              <DropdownMenuItem onClick={() => onShareFolder(folder.id)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              expandedFolders={expandedFolders}
              toggleExpand={toggleExpand}
              onNavigate={onNavigate}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onChangeColor={onChangeColor}
              onShareFolder={onShareFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// Virtual Folder Items
// =====================================================

const virtualFolders: { key: VirtualFolder; label: string; icon: typeof Files }[] = [
  { key: "all", label: "All Files", icon: Files },
  { key: "starred", label: "Starred", icon: Star },
  { key: "recent", label: "Recent", icon: Clock },
  { key: "shared", label: "Shared with Me", icon: Share2 },
];

// =====================================================
// Main Component
// =====================================================

export function FolderSidebar({
  orgId,
  projectId,
  folderTree,
  currentFolderId,
  activeVirtualFolder,
  onNavigateToFolder,
  onVirtualFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onChangeColor,
  onShareFolder,
  projectFolders,
}: FolderSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  return (
    <div className="w-[240px] flex-shrink-0 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm text-foreground">
          {projectId ? "Project Files" : "File Manager"}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Virtual folders */}
        <div className="px-2 py-2 space-y-0.5">
          {virtualFolders.map((vf) => {
            const Icon = vf.icon;
            const isActive = activeVirtualFolder === vf.key && !currentFolderId;
            return (
              <button
                key={vf.key}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => onVirtualFolderSelect(vf.key)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{vf.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-3 my-1 border-t" />

        {/* Org / Current scope folders */}
        <div className="px-2 py-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {projectId ? "Folders" : "Org Folders"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCreateFolder()}
              title="New Folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Root-level click */}
          <button
            className={`w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              currentFolderId === null && !activeVirtualFolder
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => onNavigateToFolder(null)}
          >
            <Folder className="h-4 w-4 flex-shrink-0" />
            <span>Root</span>
          </button>

          {/* Folder tree */}
          {folderTree.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              depth={1}
              currentFolderId={currentFolderId}
              expandedFolders={expandedFolders}
              toggleExpand={toggleExpand}
              onNavigate={onNavigateToFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onChangeColor={onChangeColor}
              onShareFolder={onShareFolder}
            />
          ))}

          {folderTree.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No folders yet</p>
          )}
        </div>

        {/* Project folders (only in org-level view) */}
        {!projectId && projectFolders && projectFolders.length > 0 && (
          <>
            <div className="mx-3 my-1 border-t" />
            <div className="px-2 py-1">
              <span className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Projects
              </span>
              {projectFolders.map((pf) => {
                const isExpanded = expandedProjects.has(pf.projectId);
                return (
                  <div key={pf.projectId} className="mt-1">
                    <button
                      className="w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={() => toggleProject(pf.projectId)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      <Folder className="h-4 w-4" />
                      <span className="truncate">{pf.projectName}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-2">
                        {pf.folders.map((folder) => (
                          <FolderTreeItem
                            key={folder.id}
                            folder={folder}
                            depth={2}
                            currentFolderId={currentFolderId}
                            expandedFolders={expandedFolders}
                            toggleExpand={toggleExpand}
                            onNavigate={onNavigateToFolder}
                            onCreateFolder={onCreateFolder}
                            onRenameFolder={onRenameFolder}
                            onDeleteFolder={onDeleteFolder}
                            onChangeColor={onChangeColor}
                            onShareFolder={onShareFolder}
                          />
                        ))}
                        {pf.folders.length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-1">
                            No folders
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
