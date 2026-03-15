"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getFolderTree,
  getFlatFolders,
  type FolderNode,
} from "@/lib/files/folders";
import {
  getFiles,
  getStarredFileIds,
  type FileRecord,
  type GetFilesOptions,
} from "@/lib/files/files";

export type ViewMode = "grid" | "list";
export type SortBy = "name" | "date" | "size" | "type";
export type SortOrder = "asc" | "desc";

interface UseFileManagerOptions {
  orgId: string;
  projectId?: string | null;
}

export function useFileManager({ orgId, projectId }: UseFileManagerOptions) {
  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderNode[]>([]); // breadcrumb trail

  // Data
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [flatFolders, setFlatFolders] = useState<FolderNode[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [totalFiles, setTotalFiles] = useState(0);

  // UI state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageSize = 50;

  // Debounce search query (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Load folder tree
  const loadFolders = useCallback(async () => {
    try {
      const [tree, flat] = await Promise.all([
        getFolderTree(orgId, projectId),
        getFlatFolders(orgId, projectId),
      ]);
      setFolderTree(tree);
      setFlatFolders(flat);
    } catch (err: any) {
      console.error("Error loading folders:", err);
      setError(err.message);
    }
  }, [orgId, projectId]);

  // Load files for current folder
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const options: GetFilesOptions = {
        projectId: projectId || undefined,
        folderId: currentFolderId,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      };

      const [result, starred] = await Promise.all([
        getFiles(orgId, options),
        getStarredFileIds(),
      ]);

      setFiles(result.files);
      setTotalFiles(result.total);
      setStarredIds(starred);
    } catch (err: any) {
      console.error("Error loading files:", err);
      setError(err.message);
      setFiles([]);
      setTotalFiles(0);
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, currentFolderId, debouncedSearch, sortBy, sortOrder, page]);

  // Initial load and reload on dependency changes
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Build breadcrumb path when folder changes
  useEffect(() => {
    if (!currentFolderId) {
      setFolderPath([]);
      return;
    }

    const path: FolderNode[] = [];
    let current = flatFolders.find((f) => f.id === currentFolderId);
    while (current) {
      path.unshift(current);
      current = current.parent_folder_id
        ? flatFolders.find((f) => f.id === current!.parent_folder_id)
        : undefined;
    }
    setFolderPath(path);
  }, [currentFolderId, flatFolders]);

  // Get subfolders of the current folder
  const currentSubfolders = currentFolderId
    ? flatFolders.filter((f) => f.parent_folder_id === currentFolderId)
    : flatFolders.filter((f) => f.parent_folder_id === null);

  // Current folder object
  const currentFolder = currentFolderId
    ? flatFolders.find((f) => f.id === currentFolderId) || null
    : null;

  // Actions
  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSelectedFiles(new Set());
      setPage(1);
    },
    []
  );

  const selectFile = useCallback((fileId: string, multi = false) => {
    setSelectedFiles((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setSelectedFiles(new Set(files.map((f) => f.id)));
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadFolders(), loadFiles()]);
  }, [loadFolders, loadFiles]);

  const totalPages = Math.ceil(totalFiles / pageSize);

  return {
    // Data
    folderTree,
    flatFolders,
    currentSubfolders,
    files,
    starredIds,
    totalFiles,
    totalPages,

    // Navigation
    currentFolderId,
    currentFolder,
    folderPath,

    // UI state
    selectedFiles,
    viewMode,
    sortBy,
    sortOrder,
    searchQuery,
    page,
    loading,
    error,

    // Actions
    actions: {
      navigateToFolder,
      selectFile,
      selectAllFiles,
      clearSelection,
      setViewMode,
      setSortBy,
      setSortOrder,
      setSearchQuery,
      setPage,
      refresh,
    },
  };
}
