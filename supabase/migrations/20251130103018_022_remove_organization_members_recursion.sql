/*
  # Remove Organization Members RLS Recursion

  1. Problem
    - Some policies on organization_members query organization_members itself
    - This causes infinite recursion errors
    - Specifically the admin policies added after migration 020

  2. Solution
    - Drop all policies that query organization_members within organization_members
    - Keep only simple policies that don't recurse:
      * Users can view their own (user_id check)
      * Super admins can view all (is_super_admin check)
      * Owners can view members (queries organizations table, not organization_members)

  3. Trade-off
    - Admins (non-owners) won't be able to manage members via these policies
    - This is acceptable since owners can manage members
    - Prevents recursion which is breaking the entire app
*/

-- Drop ALL existing policies on organization_members
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Super admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can view all members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can view memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can view all members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be managed by admins" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be updated by admins" ON organization_members;
DROP POLICY IF EXISTS "Admins can view members in their org" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- Create ONLY non-recursive policies

-- SELECT Policies (no recursion)
CREATE POLICY "Users can view their own memberships"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all memberships"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Organization owners can view all members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- INSERT Policy (no recursion)
CREATE POLICY "Organization owners can add members"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- UPDATE Policy (no recursion)
CREATE POLICY "Organization owners can update members"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- DELETE Policy (no recursion)
CREATE POLICY "Organization owners can remove members"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
