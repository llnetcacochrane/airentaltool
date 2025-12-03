/*
  # Fix Organization Members Infinite Recursion
  
  1. Problem
    - Current RLS policies on organization_members query organization_members within the policy
    - This creates infinite recursion: checking policy → query table → check policy → infinite loop
  
  2. Solution
    - Create SECURITY DEFINER function that bypasses RLS to check user's role
    - Replace all recursive policies with calls to this helper function
    - Keep super admin and self-view policies as they don't recurse
  
  3. Changes
    - Drop all policies that cause recursion
    - Create helper function: user_is_org_owner_or_admin(org_id)
    - Create new non-recursive policies using the helper function
*/

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Organization owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can remove members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can view all members" ON organization_members;

-- Create helper function that bypasses RLS to check user role
CREATE OR REPLACE FUNCTION user_is_org_owner_or_admin(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
END;
$$;

-- Create helper function to check if user is owner only
CREATE OR REPLACE FUNCTION user_is_org_owner(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
  );
END;
$$;

-- Recreate policies using helper functions (no recursion)
CREATE POLICY "Organization owners can view all members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_is_org_owner_or_admin(organization_id)
    OR is_super_admin()
  );

CREATE POLICY "Organization owners can add members"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_org_owner_or_admin(organization_id)
    OR is_super_admin()
  );

CREATE POLICY "Organization owners can update members"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (user_is_org_owner_or_admin(organization_id) OR is_super_admin())
  WITH CHECK (user_is_org_owner_or_admin(organization_id) OR is_super_admin());

CREATE POLICY "Organization owners can remove members"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (user_is_org_owner(organization_id) OR is_super_admin());
