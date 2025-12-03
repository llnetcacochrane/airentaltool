/*
  # Fix Infinite Recursion in Super Admins and Organizations RLS Policies

  ## Problem
  Multiple policies have infinite recursion:
  1. super_admins policies query super_admins table within their own policies
  2. organizations policies query organization_members which may cause recursion

  ## Solution
  Use security definer functions to break the recursion cycle.
  Functions execute with elevated privileges and bypass RLS when needed.

  ## Changes
  1. Create helper function to check super admin status without RLS
  2. Drop and recreate super_admins policies using the helper function
  3. Update organizations policies to use simpler checks
*/

-- Drop problematic policies on super_admins
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;
DROP POLICY IF EXISTS "Super admins can manage super admins" ON super_admins;

-- Update the is_super_admin function to bypass RLS using security definer
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = COALESCE(user_uuid, auth.uid())
      AND is_active = true
  );
$$;

-- Create new non-recursive policies for super_admins
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert super admins"
  ON super_admins FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update super admins"
  ON super_admins FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete super admins"
  ON super_admins FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Drop and recreate the organizations policy that may have recursion
DROP POLICY IF EXISTS "Organizations readable by members" ON organizations;

-- Create simpler organizations policy
-- Super admins can see all organizations
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Regular users can only see organizations they own
CREATE POLICY "Users can view organizations they own"
  ON organizations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Users can see organizations where they are active members (without recursion)
CREATE POLICY "Users can view organizations where they are members"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
