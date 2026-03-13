-- =====================================================
-- Organization Invite Codes
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  default_role TEXT NOT NULL DEFAULT 'member' CHECK (default_role IN ('manager', 'member')),
  max_uses INT,                          -- NULL = unlimited
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,                -- NULL = never expires
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON organization_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_org ON organization_invite_codes(organization_id);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE organization_invite_codes ENABLE ROW LEVEL SECURITY;

-- Admins and managers can view their org's invite codes
CREATE POLICY "Org admins/managers can view invite codes"
  ON organization_invite_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organization_invite_codes.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Admins and managers can create invite codes
CREATE POLICY "Org admins/managers can create invite codes"
  ON organization_invite_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organization_invite_codes.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Admins and managers can update (revoke) invite codes
CREATE POLICY "Org admins/managers can update invite codes"
  ON organization_invite_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organization_invite_codes.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- Security definer function for joining via invite code
-- (Allows any authenticated user to look up and use a code)
-- =====================================================

CREATE OR REPLACE FUNCTION join_org_via_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite organization_invite_codes%ROWTYPE;
  v_org_name TEXT;
  v_user_id UUID;
  v_existing UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up the code (case-insensitive)
  SELECT * INTO v_invite
  FROM organization_invite_codes
  WHERE UPPER(code) = UPPER(p_code);

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if active
  IF NOT v_invite.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has been revoked');
  END IF;

  -- Check expiry
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has expired');
  END IF;

  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has reached its usage limit');
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing
  FROM organization_members
  WHERE org_id = v_invite.organization_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this organization');
  END IF;

  -- Get org name
  SELECT name INTO v_org_name FROM organizations WHERE id = v_invite.organization_id;

  -- Add member
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.default_role);

  -- Increment use count
  UPDATE organization_invite_codes SET use_count = use_count + 1 WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_invite.organization_id,
    'org_name', v_org_name,
    'role', v_invite.default_role
  );
END;
$$;
