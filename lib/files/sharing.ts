import { supabase } from "../supabase";

// =====================================================
// File Sharing Operations
// =====================================================

export interface FileShare {
  id: string;
  file_id: string;
  shared_by: string;
  share_type: "org" | "project" | "member";
  shared_with_user_id: string | null;
  permission: "view" | "download" | "edit";
  expires_at: string | null;
  created_at: string;
  // Joined
  shared_by_user?: { id: string; full_name: string; email: string; avatar_url: string | null };
  shared_with_user?: { id: string; full_name: string; email: string; avatar_url: string | null };
}

/**
 * Share a file with an org, project, or specific member.
 */
export async function shareFile(
  fileId: string,
  options: {
    type: "org" | "project" | "member";
    userId?: string;
    permission?: "view" | "download" | "edit";
    expiresAt?: string;
  }
): Promise<FileShare> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (options.type === "member" && !options.userId) {
    throw new Error("userId is required when sharing with a specific member");
  }

  // Check for existing share to prevent duplicates
  let dupeQuery = (supabase as any)
    .from("file_shares")
    .select("id")
    .eq("file_id", fileId)
    .eq("share_type", options.type);

  if (options.type === "member" && options.userId) {
    dupeQuery = dupeQuery.eq("shared_with_user_id", options.userId);
  }

  const { data: existing } = await dupeQuery;
  if (existing && existing.length > 0) {
    // Update existing share instead of creating duplicate
    const { data, error } = await (supabase as any)
      .from("file_shares")
      .update({
        permission: options.permission || "view",
        expires_at: options.expiresAt || null,
      })
      .eq("id", existing[0].id)
      .select("*");

    if (error) throw error;
    return (data?.[0] || null) as FileShare;
  }

  const { data, error } = await (supabase as any)
    .from("file_shares")
    .insert({
      file_id: fileId,
      shared_by: user.id,
      share_type: options.type,
      shared_with_user_id: options.type === "member" ? options.userId : null,
      permission: options.permission || "view",
      expires_at: options.expiresAt || null,
    })
    .select("*");

  if (error) throw error;
  return (data?.[0] || null) as FileShare;
}

/**
 * Get all shares for a file
 */
export async function getFileShares(fileId: string): Promise<FileShare[]> {
  const { data, error } = await (supabase as any)
    .from("file_shares")
    .select("*")
    .eq("file_id", fileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [] as FileShare[];

  // Fetch user details for member shares
  const userIds = [...new Set(
    (data as any[])
      .filter((s: any) => s.shared_with_user_id)
      .map((s: any) => s.shared_with_user_id)
  )];

  let usersMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: users } = await (supabase as any)
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);
    if (users) {
      for (const u of users) {
        usersMap[u.id] = u;
      }
    }
  }

  return (data as any[]).map((share: any) => ({
    ...share,
    shared_with_user: share.shared_with_user_id ? usersMap[share.shared_with_user_id] || null : null,
  })) as FileShare[];
}

/**
 * Update the permission level of an existing share
 */
export async function updateSharePermission(
  shareId: string,
  permission: "view" | "download" | "edit"
) {
  const { data, error } = await (supabase as any)
    .from("file_shares")
    .update({ permission })
    .eq("id", shareId)
    .select("*");

  if (error) throw error;
  return (data?.[0] || null) as FileShare;
}

/**
 * Revoke (delete) a file share
 */
export async function revokeShare(shareId: string) {
  const { error } = await (supabase as any)
    .from("file_shares")
    .delete()
    .eq("id", shareId);

  if (error) throw error;
}

/**
 * Get files shared directly with the current user
 */
export async function getFilesSharedWithMe(
  orgId: string
): Promise<
  Array<{
    share: FileShare;
    file: {
      id: string;
      name: string;
      mime_type: string;
      size_bytes: number;
      uploaded_by: string;
      created_at: string;
      users?: { id: string; full_name: string; email: string; avatar_url: string | null };
    };
  }>
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("file_shares")
    .select(
      "*, files!file_id(id, name, mime_type, size_bytes, uploaded_by, organization_id, created_at, is_archived, users!uploaded_by(id, full_name, email, avatar_url)), shared_by_user:users!shared_by(id, full_name, email, avatar_url)"
    )
    .eq("share_type", "member")
    .eq("shared_with_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Filter to only files in this org that aren't archived, and check expiry
  const now = new Date().toISOString();
  return (data as any[])
    .filter(
      (s) =>
        s.files &&
        s.files.organization_id === orgId &&
        !s.files.is_archived &&
        (!s.expires_at || s.expires_at > now)
    )
    .map((s) => ({
      share: {
        id: s.id,
        file_id: s.file_id,
        shared_by: s.shared_by,
        share_type: s.share_type,
        shared_with_user_id: s.shared_with_user_id,
        permission: s.permission,
        expires_at: s.expires_at,
        created_at: s.created_at,
        shared_by_user: s.shared_by_user,
      } as FileShare,
      file: s.files,
    }));
}
