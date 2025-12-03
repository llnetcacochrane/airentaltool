/*
  # Fix User Profiles RLS Recursion
  
  1. Problem
    - "Organization members can view member profiles" policy queries organization_members
    - This triggers organization_members RLS policies, which can cause issues
  
  2. Solution
    - Create SECURITY DEFINER function to get user's organization members
    - Update policy to use this helper function
  
  3. Changes
    - Drop recursive policy
    - Create helper function to get org member user IDs
    - Recreate policy using helper function
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "Organization members can view member profiles" ON user_profiles;

-- Create helper function to get user IDs in same orgs as current user
CREATE OR REPLACE FUNCTION get_organization_member_user_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT om.user_id
  FROM organization_members om
  WHERE om.organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND is_active = true
  )
  AND om.is_active = true;
END;
$$;

-- Recreate policy using helper function (no recursion)
CREATE POLICY "Organization members can view member profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT get_organization_member_user_ids())
    OR is_super_admin()
  );
