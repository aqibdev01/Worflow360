import { supabase } from "../supabase";

// =====================================================
// Organization Invite Code Operations
// =====================================================

/**
 * Generate a random 8-char code in XXXX-XXXX format
 */
function createCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code.slice(0, 4) + "-" + code.slice(4);
}

/**
 * Generate and insert a new invite code for an organization
 */
export async function generateInviteCode(
  orgId: string,
  options: {
    defaultRole?: "manager" | "member";
    maxUses?: number | null;
    expiresAt?: string | null;
  } = {}
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Generate unique code (retry up to 5 times on collision)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = createCodeString();
    const { data: existing } = await (supabase as any)
      .from("organization_invite_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (!existing) break;
    if (attempt === 4) throw new Error("Failed to generate unique code");
  }

  const { data, error } = await (supabase as any)
    .from("organization_invite_codes")
    .insert({
      organization_id: orgId,
      code,
      created_by: user.id,
      default_role: options.defaultRole || "member",
      max_uses: options.maxUses ?? null,
      expires_at: options.expiresAt ?? null,
    })
    .select(
      "*, creator:created_by(id, email, full_name)"
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all invite codes for an organization (admin/manager only via RLS)
 */
export async function getOrgInviteCodes(orgId: string) {
  const { data, error } = await (supabase as any)
    .from("organization_invite_codes")
    .select(
      "*, creator:created_by(id, email, full_name)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as any[]) || [];
}

/**
 * Revoke an invite code (sets is_active = false)
 */
export async function revokeInviteCode(codeId: string) {
  const { error } = await (supabase as any)
    .from("organization_invite_codes")
    .update({ is_active: false })
    .eq("id", codeId);

  if (error) throw error;
}

/**
 * Join an organization via invite code
 * Uses SECURITY DEFINER function to bypass RLS
 */
export async function joinOrgViaCode(code: string) {
  const { data, error } = await supabase.rpc("join_org_via_invite_code", {
    p_code: code,
  } as any);

  if (error) throw error;
  return data as {
    success: boolean;
    error?: string;
    org_id?: string;
    org_name?: string;
    role?: string;
  };
}
