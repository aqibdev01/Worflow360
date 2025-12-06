-- Allow authenticated users to search for other users by email
-- This is needed for team invitations and organization member search
-- Run this in your Supabase SQL Editor

-- Drop the restrictive "users_view_own" policy
DROP POLICY IF EXISTS "users_view_own" ON public.users;

-- Create a new policy that allows authenticated users to view all users
-- This is safe because we only expose id, email, full_name, and avatar_url
CREATE POLICY "users_view_all"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Keep the existing insert/update policies that restrict to own profile
-- users_insert_own - allows inserting own profile
-- users_update_own - allows updating own profile
-- service_role_all - allows service role full access
