/*
  # Fix Property Owners RLS and Organizations Schema
  
  1. Changes
    - Fix property_owners RLS policies to prevent recursion
    - Remove trial_ends_at reference (doesn't exist, we have subscription_ends_at)
    - Update get_all_organizations_admin to use correct column name
  
  2. Security
    - Simplified property_owners policies to avoid complex joins
*/

-- Drop recursive policies on property_owners
DROP POLICY IF EXISTS "Property managers can view property owners" ON property_owners;
DROP POLICY IF EXISTS "Property managers can update property owners" ON property_owners;
DROP POLICY IF EXISTS "Property managers can create property owners" ON property_owners;

-- Create helper function to check if user can access property owner
CREATE OR REPLACE FUNCTION user_can_access_property_owner(owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User is the property owner themselves
  IF EXISTS (
    SELECT 1 FROM property_owners 
    WHERE id = owner_id AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- User is super admin
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- User is in an organization that has this property owner
  IF EXISTS (
    SELECT 1 
    FROM property_ownerships po
    JOIN organization_members om ON om.organization_id = po.organization_id
    WHERE po.owner_id = owner_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
      AND om.role IN ('owner', 'admin', 'property_manager')
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate policies without recursion
CREATE POLICY "Property owners can view own profile"
  ON property_owners
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_can_access_property_owner(id)
  );

CREATE POLICY "Property managers can create property owners"
  ON property_owners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

CREATE POLICY "Property managers can update property owners"
  ON property_owners
  FOR UPDATE
  TO authenticated
  USING (user_can_access_property_owner(id))
  WITH CHECK (user_can_access_property_owner(id));

CREATE POLICY "Property managers can delete property owners"
  ON property_owners
  FOR DELETE
  TO authenticated
  USING (user_can_access_property_owner(id));

-- Update get_all_organizations_admin to use correct column
DROP FUNCTION IF EXISTS get_all_organizations_admin();

CREATE OR REPLACE FUNCTION get_all_organizations_admin()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  company_name text,
  account_tier text,
  subscription_status text,
  subscription_ends_at timestamptz,
  created_at timestamptz,
  total_properties bigint,
  total_tenants bigint,
  total_payments bigint,
  active_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.company_name,
    o.account_tier,
    o.subscription_status,
    o.subscription_ends_at,
    o.created_at,
    COALESCE(COUNT(DISTINCT p.id), 0)::bigint as total_properties,
    COALESCE(COUNT(DISTINCT t.id), 0)::bigint as total_tenants,
    COALESCE(COUNT(DISTINCT tp.id), 0)::bigint as total_payments,
    COALESCE(COUNT(DISTINCT om.id) FILTER (WHERE om.is_active = true), 0)::bigint as active_users
  FROM organizations o
  LEFT JOIN properties p ON p.organization_id = o.id
  LEFT JOIN tenants t ON t.organization_id = o.id
  LEFT JOIN tenant_payments tp ON tp.organization_id = o.id
  LEFT JOIN organization_members om ON om.organization_id = o.id
  GROUP BY o.id, o.name, o.slug, o.company_name, o.account_tier, 
           o.subscription_status, o.subscription_ends_at, o.created_at
  ORDER BY o.created_at DESC;
END;
$$;
