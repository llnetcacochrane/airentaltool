/*
  # Fix Infinite Recursion in Organization Members RLS Policy

  ## Problem
  The "Organization members readable by org members" policy creates infinite recursion
  because it queries organization_members table while evaluating a policy on that same table.

  ## Solution
  Replace the recursive policy with a simpler direct check:
  - Users can view organization_members records where they are a member (direct user_id match)
  - Organization owners can view all members in their organizations

  ## Changes
  1. Drop the problematic recursive policy
  2. Create new non-recursive policies for SELECT
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Organization members readable by org members" ON organization_members;

-- Create simpler, non-recursive policies
-- Policy 1: Users can view memberships where they are a member
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Organization owners can view all members in their organizations
CREATE POLICY "Organization owners can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Policy 3: Admins in an organization can view all members in that organization
-- We need to use a function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND organization_members.user_id = user_is_org_admin.user_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

CREATE POLICY "Organization admins can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_is_org_admin(organization_id, auth.uid()));
