/*
  # Fix Organization Members Access Issue

  ## Problem
  Regular organization members cannot see their organizations.
  Only owners and super admins can see organizations, which breaks the app.

  ## Solution
  Use a SECURITY DEFINER function to check membership without recursion.
*/

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.check_organization_membership(uuid, uuid);

CREATE OR REPLACE FUNCTION public.check_organization_membership(
  org_id uuid,
  user_uuid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = COALESCE(user_uuid, auth.uid())
      AND is_active = true
  );
$$;

-- Add Member Access Policy
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (check_organization_membership(id));

-- Fix organization_members Policies
DROP POLICY IF EXISTS "Members can view their memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Super admins can view all memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can view memberships" ON organization_members;

CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Organization owners can view memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_id
        AND owner_id = auth.uid()
    )
  );

-- Fix related table policies
DROP POLICY IF EXISTS "Organization members can view properties" ON properties;
CREATE POLICY "Organization members can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (check_organization_membership(organization_id) OR is_super_admin());

DROP POLICY IF EXISTS "Organization members can view tenants" ON tenants;
CREATE POLICY "Organization members can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (check_organization_membership(organization_id) OR is_super_admin());

DROP POLICY IF EXISTS "Organization members can view units" ON units;
CREATE POLICY "Organization members can view units"
  ON units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Organization members can view leases" ON leases;
CREATE POLICY "Organization members can view leases"
  ON leases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN properties ON properties.id = units.property_id
      WHERE units.id = unit_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Organization members can view payments" ON payments;
CREATE POLICY "Organization members can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN units ON units.id = leases.unit_id
      JOIN properties ON properties.id = units.property_id
      WHERE leases.id = lease_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );
