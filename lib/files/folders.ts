import { supabase } from "../supabase";

// =====================================================
// Folder Operations
// =====================================================

export interface FolderNode {
  id: string;
  organization_id: string;
  project_id: string | null;
  parent_folder_id: string | null;
  name: string;
  created_by: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
  children?: FolderNode[];
}

/**
 * Get folder tree for an org or project.
 * Fetches all folders and builds nested tree client-side.
 */
export async function getFolderTree(
  orgId: string,
  projectId?: string | null
): Promise<FolderNode[]> {
  let query = (supabase as any)
    .from("file_folders")
    .select("*")
    .eq("organization_id", orgId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const folders = data as FolderNode[];
  return buildTree(folders);
}

/** Build nested tree from flat folder list */
function buildTree(folders: FolderNode[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Index all folders
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }

  // Build parent-child relationships
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_folder_id && map.has(f.parent_folder_id)) {
      map.get(f.parent_folder_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Get flat list of all folders (for breadcrumb, move dialogs, etc.)
 */
export async function getFlatFolders(
  orgId: string,
  projectId?: string | null
): Promise<FolderNode[]> {
  let query = (supabase as any)
    .from("file_folders")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as FolderNode[];
}

/**
 * Create a new folder
 */
export async function createFolder(
  orgId: string,
  data: {
    name: string;
    projectId?: string;
    parentFolderId?: string;
    color?: string;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get max position for ordering
  let posQuery = (supabase as any)
    .from("file_folders")
    .select("position")
    .eq("organization_id", orgId)
    .order("position", { ascending: false })
    .limit(1);

  if (data.parentFolderId) {
    posQuery = posQuery.eq("parent_folder_id", data.parentFolderId);
  } else {
    posQuery = posQuery.is("parent_folder_id", null);
  }

  if (data.projectId) {
    posQuery = posQuery.eq("project_id", data.projectId);
  } else {
    posQuery = posQuery.is("project_id", null);
  }

  const { data: posData } = await posQuery;
  const nextPosition = posData && posData.length > 0 ? posData[0].position + 1 : 0;

  const { data: folder, error } = await (supabase as any)
    .from("file_folders")
    .insert({
      organization_id: orgId,
      project_id: data.projectId || null,
      parent_folder_id: data.parentFolderId || null,
      name: data.name,
      created_by: user.id,
      position: nextPosition,
      color: data.color || null,
    })
    .select()
    .single();

  if (error) throw error;
  return folder as FolderNode;
}

/**
 * Rename a folder
 */
export async function renameFolder(folderId: string, name: string) {
  const { data, error } = await (supabase as any)
    .from("file_folders")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", folderId)
    .select()
    .single();

  if (error) throw error;
  return data as FolderNode;
}

/**
 * Move a folder to a new parent. Prevents circular nesting.
 */
export async function moveFolder(
  folderId: string,
  newParentFolderId: string | null
) {
  // Prevent moving to self
  if (folderId === newParentFolderId) {
    throw new Error("Cannot move a folder into itself");
  }

  // Prevent circular nesting: check that newParentFolderId is not a descendant of folderId
  if (newParentFolderId) {
    const descendants = await getDescendantIds(folderId);
    if (descendants.has(newParentFolderId)) {
      throw new Error("Cannot move a folder into one of its subfolders");
    }
  }

  const { data, error } = await (supabase as any)
    .from("file_folders")
    .update({
      parent_folder_id: newParentFolderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", folderId)
    .select()
    .single();

  if (error) throw error;
  return data as FolderNode;
}

/** Get all descendant folder IDs (for circular nesting check) */
async function getDescendantIds(folderId: string): Promise<Set<string>> {
  // Get the folder to know its org/project scope
  const { data: folder, error: folderErr } = await (supabase as any)
    .from("file_folders")
    .select("organization_id, project_id")
    .eq("id", folderId)
    .single();

  if (folderErr) throw folderErr;

  // Get all folders in same scope
  let query = (supabase as any)
    .from("file_folders")
    .select("id, parent_folder_id")
    .eq("organization_id", folder.organization_id);

  if (folder.project_id) {
    query = query.eq("project_id", folder.project_id);
  } else {
    query = query.is("project_id", null);
  }

  const { data: allFolders, error } = await query;
  if (error) throw error;

  // BFS to find all descendants
  const descendants = new Set<string>();
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const f of allFolders as any[]) {
      if (f.parent_folder_id === current && !descendants.has(f.id)) {
        descendants.add(f.id);
        queue.push(f.id);
      }
    }
  }

  return descendants;
}

/**
 * Delete a folder. Only succeeds if empty (no files or subfolders inside).
 */
export async function deleteFolder(folderId: string) {
  // Check for subfolders
  const { data: subfolders, error: subErr } = await (supabase as any)
    .from("file_folders")
    .select("id")
    .eq("parent_folder_id", folderId);

  if (subErr) throw subErr;
  if (subfolders && subfolders.length > 0) {
    throw new Error(
      `Cannot delete folder: it contains ${subfolders.length} subfolder(s). Move or delete them first.`
    );
  }

  // Check for files
  const { data: files, error: fileErr } = await (supabase as any)
    .from("files")
    .select("id")
    .eq("folder_id", folderId)
    .eq("is_archived", false);

  if (fileErr) throw fileErr;
  if (files && files.length > 0) {
    throw new Error(
      `Cannot delete folder: it contains ${files.length} file(s). Move or delete them first.`
    );
  }

  const { error } = await (supabase as any)
    .from("file_folders")
    .delete()
    .eq("id", folderId);

  if (error) throw error;
}

/**
 * Reorder folders by updating their position field.
 * Pass folder IDs in the desired order.
 */
export async function reorderFolders(folderIds: string[]) {
  const updates = folderIds.map((id, index) =>
    (supabase as any)
      .from("file_folders")
      .update({ position: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

/**
 * Update folder color
 */
export async function updateFolderColor(folderId: string, color: string | null) {
  const { data, error } = await (supabase as any)
    .from("file_folders")
    .update({ color, updated_at: new Date().toISOString() })
    .eq("id", folderId)
    .select()
    .single();

  if (error) throw error;
  return data as FolderNode;
}
