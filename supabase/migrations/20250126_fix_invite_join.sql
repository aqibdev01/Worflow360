-- Fix RLS policies to allow users to join organizations via invite code
-- This migration creates a secure function for joining and updates policies

-- ============================================
-- STEP 1: Create a secure function to join organization by invite code
-- This bypasses RLS to allow the operation
-- ============================================

CREATE OR REPLACE FUNCTION public.join_organization_by_invite_code(
    p_invite_code TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_org_name TEXT;
    v_existing_member BOOLEAN;
BEGIN
    -- Find organization by invite code (case insensitive)
    SELECT id, name INTO v_org_id, v_org_name
    FROM public.organizations
    WHERE UPPER(invite_code) = UPPER(p_invite_code);

    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid invite code'
        );
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = v_org_id AND user_id = p_user_id
    ) INTO v_existing_member;

    IF v_existing_member THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already a member of this organization'
        );
    END IF;

    -- Add user as member
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (v_org_id, p_user_id, 'member');

    RETURN json_build_object(
        'success', true,
        'org_id', v_org_id,
        'org_name', v_org_name
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_organization_by_invite_code(TEXT, UUID) TO authenticated;

-- ============================================
-- STEP 2: Create function to get org by invite code (bypasses RLS)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_organization_by_invite_code(p_invite_code TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    owner_id UUID,
    invite_code TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.description,
        o.owner_id,
        o.invite_code,
        o.created_at,
        o.updated_at
    FROM public.organizations o
    WHERE UPPER(o.invite_code) = UPPER(p_invite_code);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_organization_by_invite_code(TEXT) TO authenticated;

-- ============================================
-- STEP 3: Update organization_members insert policy
-- Allow users to add themselves as members (for join via invite code)
-- ============================================

-- First drop existing policies that might conflict
DROP POLICY IF EXISTS "Org owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can add themselves" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins can add members" ON public.organization_members;

-- Create new insert policy that allows:
-- 1. Organization owners to add anyone
-- 2. Users to add themselves
CREATE POLICY "Users can join or owners can add members"
    ON public.organization_members FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()  -- Users can add themselves
        OR EXISTS (            -- Or org owner can add anyone
            SELECT 1 FROM public.organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
    );

-- ============================================
-- DONE
-- ============================================
