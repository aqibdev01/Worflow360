import { supabase } from "../supabase";

// =====================================================
// File Operations
// =====================================================

export interface FileRecord {
  id: string;
  organization_id: string;
  project_id: string | null;
  folder_id: string | null;
  task_id: string | null;
  name: string;
  storage_path: string;
  public_url: string | null;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  description: string | null;
  version: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  users?: { id: string; full_name: string; email: string; avatar_url: string | null };
  is_starred?: boolean;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  users?: { id: string; full_name: string; email: string; avatar_url: string | null };
}

export interface GetFilesOptions {
  projectId?: string | null;
  folderId?: string | null;
  search?: string;
  sortBy?: "name" | "date" | "size" | "type";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Get files with filters, search, sorting, and pagination.
 */
export async function getFiles(
  orgId: string,
  options: GetFilesOptions = {}
): Promise<{ files: FileRecord[]; total: number }> {
  const {
    projectId,
    folderId,
    search,
    sortBy = "date",
    sortOrder = "desc",
    page = 1,
    pageSize = 50,
    includeArchived = false,
  } = options;

  let query = (supabase as any)
    .from("files")
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)", { count: "exact" })
    .eq("organization_id", orgId);

  // Scope: project or org-level
  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  // Folder filter
  if (folderId) {
    query = query.eq("folder_id", folderId);
  } else if (folderId === null) {
    // Explicitly root level (no folder)
    query = query.is("folder_id", null);
  }
  // If folderId is undefined, don't filter by folder (get all files)

  // Archive filter
  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  // Search by name
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // Sorting
  const sortColumn =
    sortBy === "name"
      ? "name"
      : sortBy === "size"
        ? "size_bytes"
        : sortBy === "type"
          ? "mime_type"
          : "created_at";
  query = query.order(sortColumn, { ascending: sortOrder === "asc" });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { files: data as FileRecord[], total: count || 0 };
}

/**
 * Get a single file by ID
 */
export async function getFile(fileId: string): Promise<FileRecord> {
  const { data, error } = await (supabase as any)
    .from("files")
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .eq("id", fileId)
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/**
 * Upload a file to Supabase Storage and insert a record.
 */
export async function uploadFile(
  orgId: string,
  file: File,
  options: {
    projectId?: string;
    folderId?: string;
    description?: string;
  } = {}
): Promise<FileRecord> {
  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" exceeds the 25 MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Generate a unique file ID for the storage path
  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const projectSegment = options.projectId || "org";
  const folderSegment = options.folderId || "root";
  const storagePath = `${orgId}/${projectSegment}/${folderSegment}/${fileId}-${safeName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("org-files")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Get a signed URL (1 hour expiry)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("org-files")
    .createSignedUrl(storagePath, 3600);

  if (urlError) throw urlError;

  // Insert file record
  const { data: fileRecord, error: dbError } = await (supabase as any)
    .from("files")
    .insert({
      id: fileId,
      organization_id: orgId,
      project_id: options.projectId || null,
      folder_id: options.folderId || null,
      name: file.name,
      storage_path: storagePath,
      public_url: urlData?.signedUrl || null,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      uploaded_by: user.id,
      description: options.description || null,
      version: 1,
    })
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .single();

  if (dbError) {
    // Cleanup storage on DB insert failure
    await supabase.storage.from("org-files").remove([storagePath]);
    throw dbError;
  }

  return fileRecord as FileRecord;
}

/**
 * Generate a fresh signed URL for downloading a file (1hr expiry).
 */
export async function getDownloadUrl(fileId: string): Promise<string> {
  const { data: file, error } = await (supabase as any)
    .from("files")
    .select("storage_path, name")
    .eq("id", fileId)
    .single();

  if (error) throw error;

  const { data, error: urlError } = await supabase.storage
    .from("org-files")
    .createSignedUrl(file.storage_path, 3600, {
      download: file.name,
    });

  if (urlError) throw urlError;
  if (!data?.signedUrl) throw new Error("Failed to generate download URL");

  return data.signedUrl;
}

/**
 * Download a file — opens signed URL in a new tab or triggers download.
 */
export async function downloadFile(fileId: string) {
  const url = await getDownloadUrl(fileId);
  window.open(url, "_blank");
}

/**
 * Soft-delete a file: mark as archived and remove from storage.
 */
export async function deleteFile(fileId: string) {
  const { data: file, error: fetchErr } = await (supabase as any)
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (fetchErr) throw fetchErr;

  // Remove from storage
  const { error: storageErr } = await supabase.storage
    .from("org-files")
    .remove([file.storage_path]);

  if (storageErr) {
    console.warn("Storage cleanup failed:", storageErr.message);
  }

  // Also remove any version files from storage
  const { data: versions } = await (supabase as any)
    .from("file_versions")
    .select("storage_path")
    .eq("file_id", fileId);

  if (versions && versions.length > 0) {
    const paths = versions.map((v: any) => v.storage_path);
    await supabase.storage.from("org-files").remove(paths);
  }

  // Mark as archived
  const { error } = await (supabase as any)
    .from("files")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", fileId);

  if (error) throw error;
}

/**
 * Permanently delete a file record and all versions.
 */
export async function permanentlyDeleteFile(fileId: string) {
  const { error } = await (supabase as any)
    .from("files")
    .delete()
    .eq("id", fileId);

  if (error) throw error;
}

/**
 * Rename a file
 */
export async function renameFile(fileId: string, name: string) {
  const { data, error } = await (supabase as any)
    .from("files")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/**
 * Move a file to a different folder
 */
export async function moveFile(fileId: string, newFolderId: string | null) {
  const { data, error } = await (supabase as any)
    .from("files")
    .update({
      folder_id: newFolderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/**
 * Update file description
 */
export async function updateFileDescription(
  fileId: string,
  description: string | null
) {
  const { data, error } = await (supabase as any)
    .from("files")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/**
 * Upload a new version of an existing file.
 * Stores previous version in file_versions and updates the main file record.
 */
export async function uploadNewVersion(
  fileId: string,
  file: File
): Promise<FileRecord> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" exceeds the 25 MB limit (${formatFileSize(file.size)}).`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get current file record
  const { data: currentFile, error: fetchErr } = await (supabase as any)
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (fetchErr) throw fetchErr;

  // Save current version to file_versions
  const { error: versionErr } = await (supabase as any)
    .from("file_versions")
    .insert({
      file_id: fileId,
      version_number: currentFile.version,
      storage_path: currentFile.storage_path,
      size_bytes: currentFile.size_bytes,
      uploaded_by: currentFile.uploaded_by,
    });

  if (versionErr) throw versionErr;

  // Upload new file to storage
  const newVersion = currentFile.version + 1;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const projectSegment = currentFile.project_id || "org";
  const folderSegment = currentFile.folder_id || "root";
  const newStoragePath = `${currentFile.organization_id}/${projectSegment}/${folderSegment}/${fileId}-v${newVersion}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("org-files")
    .upload(newStoragePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Update file record
  const { data: updated, error: updateErr } = await (supabase as any)
    .from("files")
    .update({
      name: file.name,
      storage_path: newStoragePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId)
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .single();

  if (updateErr) throw updateErr;
  return updated as FileRecord;
}

/**
 * Get version history for a file
 */
export async function getFileVersions(fileId: string): Promise<FileVersion[]> {
  const { data, error } = await (supabase as any)
    .from("file_versions")
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .eq("file_id", fileId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return data as FileVersion[];
}

/**
 * Star a file for the current user
 */
export async function starFile(fileId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("file_stars")
    .insert({ file_id: fileId, user_id: user.id });

  // Ignore duplicate errors (already starred)
  if (error && !error.message.includes("duplicate")) throw error;
}

/**
 * Unstar a file for the current user
 */
export async function unstarFile(fileId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("file_stars")
    .delete()
    .eq("file_id", fileId)
    .eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Get all starred files for the current user in an org
 */
export async function getStarredFiles(orgId: string): Promise<FileRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get starred file IDs
  const { data: stars, error: starErr } = await (supabase as any)
    .from("file_stars")
    .select("file_id")
    .eq("user_id", user.id);

  if (starErr) throw starErr;
  if (!stars || stars.length === 0) return [];

  const starredIds = stars.map((s: any) => s.file_id);

  // Get file records
  const { data: files, error } = await (supabase as any)
    .from("files")
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .in("id", starredIds)
    .order("name", { ascending: true });

  if (error) throw error;
  return (files as FileRecord[]).map((f) => ({ ...f, is_starred: true }));
}

/**
 * Get starred file IDs for current user (for marking stars in file lists)
 */
export async function getStarredFileIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await (supabase as any)
    .from("file_stars")
    .select("file_id")
    .eq("user_id", user.id);

  if (error) return new Set();
  return new Set((data as any[]).map((s) => s.file_id));
}

// =====================================================
// Task File Attachments
// =====================================================

/**
 * Get files attached to a task
 */
export async function getTaskFiles(taskId: string): Promise<FileRecord[]> {
  const { data, error } = await (supabase as any)
    .from("files")
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .eq("task_id", taskId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as FileRecord[];
}

/**
 * Get file attachment counts for multiple tasks (for kanban badges)
 */
export async function getTaskFileCounts(
  taskIds: string[]
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};

  const { data, error } = await (supabase as any)
    .from("files")
    .select("task_id")
    .in("task_id", taskIds)
    .eq("is_archived", false);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.task_id] = (counts[row.task_id] || 0) + 1;
  }
  return counts;
}

/**
 * Upload a file attached to a task
 */
export async function uploadTaskFile(
  orgId: string,
  projectId: string,
  taskId: string,
  file: File
): Promise<FileRecord> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" exceeds the 25 MB limit (${formatFileSize(file.size)}).`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const fileId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${orgId}/${projectId}/tasks/${taskId}/${fileId}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("org-files")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: fileRecord, error: dbError } = await (supabase as any)
    .from("files")
    .insert({
      id: fileId,
      organization_id: orgId,
      project_id: projectId,
      task_id: taskId,
      folder_id: null,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      uploaded_by: user.id,
      version: 1,
    })
    .select("*, users!uploaded_by(id, full_name, email, avatar_url)")
    .single();

  if (dbError) {
    await supabase.storage.from("org-files").remove([storagePath]);
    throw dbError;
  }

  return fileRecord as FileRecord;
}

// =====================================================
// Helpers
// =====================================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType === "application/pdf") return "file-text";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return "table";
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  )
    return "presentation";
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "text/plain"
  )
    return "file-text";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip")
  )
    return "archive";
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("html") ||
    mimeType.includes("css") ||
    mimeType.includes("xml")
  )
    return "file-code";
  return "file";
}

export function getMimeCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Images";
  if (mimeType.startsWith("video/")) return "Videos";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "Documents";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return "Spreadsheets";
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType === "text/plain")
    return "Documents";
  return "Other";
}
