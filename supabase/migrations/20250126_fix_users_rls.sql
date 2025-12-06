-- Fix RLS policies on users table for faster auth
-- Run this in your Supabase SQL Editor

-- Drop all existing policies on users table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users CASCADE';
    END LOOP;
END $$;

-- Create simple, fast policies for users table

-- Allow users to view their own profile
CREATE POLICY "users_view_own"
    ON public.users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Allow service role to do anything (for triggers/functions)
CREATE POLICY "service_role_all"
    ON public.users FOR ALL
    TO service_role
    USING (true);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
