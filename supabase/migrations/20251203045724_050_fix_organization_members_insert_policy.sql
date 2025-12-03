/*
  # Fix Organization Members INSERT Policy - Infinite Recursion

  ## Problem
  The current INSERT policy for organization_members checks if the user is already 
  an owner/admin member, which causes infinite recursion when adding the first member
  (the organization owner).

  ## Solution
  Update the INSERT policy to allow:
  1. Organization owners to add themselves as the first member (check organizations table)
  2. Existing owner/admin members to add other members
  
  This breaks the infinite recursion by checking the organizations table for ownership
  instead of checking organization_members for existing membership.

  ## Changes
  - Drop existing INSERT policy
  - Create new INSERT policy that checks:
    - User is the organization owner (from organizations table), OR
    - User is an existing owner/admin member
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can add members if owner/admin" ON organization_members;

-- Create fixed INSERT policy
CREATE POLICY "Users can add members if owner/admin"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is the organization owner (from organizations table)
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR
    -- Allow if user is an existing owner/admin member
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
    )
  );
