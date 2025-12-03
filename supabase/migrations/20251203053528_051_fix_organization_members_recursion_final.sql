/*
  # Fix Organization Members Infinite Recursion - Final Fix

  ## Problem
  Multiple INSERT policies exist on organization_members, and one uses the 
  user_is_org_owner_or_admin() function which queries organization_members,
  causing infinite recursion.

  ## Solution
  Drop ALL existing INSERT policies and create ONE simple policy that:
  1. Checks if user owns the organization (from organizations table)
  2. Checks if user is a super admin
  3. Does NOT recursively check organization_members
  
  ## Changes
  - Drop all 5 existing INSERT policies
  - Create single, non-recursive INSERT policy
*/

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Organization admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can add themselves as members" ON organization_members;
DROP POLICY IF EXISTS "Super admins can add members to any organization" ON organization_members;
DROP POLICY IF EXISTS "Users can add members if owner/admin" ON organization_members;

-- Create single, simple INSERT policy
CREATE POLICY "Allow org owners and super admins to add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User owns the organization
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
        AND o.owner_id = auth.uid()
    )
    OR
    -- User is a super admin
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
        AND sa.is_active = true
    )
  );
