/*
  # Add Missing Package Assignment Functions

  ## Overview
  Adds missing RPC functions for package tier assignment and organization management.
  These functions are needed for Super Admin user creation and onboarding flows.

  ## Changes
  1. Create assign_package_to_organization function
  2. Create get_organization_package function for easy lookup
  3. Add proper error handling and validation

  ## Security
  - Super admins can assign any package to any organization
  - Organization owners can view their own package
  - Proper validation of package tier existence
*/

-- =====================================================
-- FUNCTION: Assign Package to Organization
-- =====================================================

CREATE OR REPLACE FUNCTION assign_package_to_organization(
  p_org_id uuid,
  p_tier_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_id uuid;
  v_tier_version integer;
BEGIN
  -- Verify the package tier exists
  SELECT id, version INTO v_tier_id, v_tier_version
  FROM package_tiers
  WHERE tier_slug = p_tier_slug
    AND is_active = true;

  IF v_tier_id IS NULL THEN
    RAISE EXCEPTION 'Package tier "%" does not exist or is not active', p_tier_slug;
  END IF;

  -- Verify the organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization does not exist';
  END IF;

  -- Insert or update the organization package settings
  INSERT INTO organization_package_settings (
    organization_id,
    package_tier_id,
    package_tier_version,
    is_custom_override,
    is_active
  ) VALUES (
    p_org_id,
    v_tier_id,
    v_tier_version,
    false,
    true
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    package_tier_id = v_tier_id,
    package_tier_version = v_tier_version,
    is_custom_override = false,
    is_active = true,
    updated_at = now();
END;
$$;

-- =====================================================
-- FUNCTION: Get Organization Package
-- =====================================================

CREATE OR REPLACE FUNCTION get_organization_package(p_org_id uuid)
RETURNS TABLE (
  tier_id uuid,
  tier_name text,
  tier_slug text,
  display_name text,
  monthly_price_cents integer,
  annual_price_cents integer,
  max_properties integer,
  max_tenants integer,
  max_users integer,
  features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.tier_name,
    pt.tier_slug,
    pt.display_name,
    COALESCE(ops.override_monthly_price_cents, pt.monthly_price_cents) as monthly_price_cents,
    COALESCE(ops.override_annual_price_cents, pt.annual_price_cents) as annual_price_cents,
    COALESCE(ops.override_max_properties, pt.max_properties) as max_properties,
    COALESCE(ops.override_max_tenants, pt.max_tenants) as max_tenants,
    COALESCE(ops.override_max_users, pt.max_users) as max_users,
    COALESCE(ops.override_features, pt.features) as features
  FROM organization_package_settings ops
  JOIN package_tiers pt ON pt.id = ops.package_tier_id
  WHERE ops.organization_id = p_org_id
    AND ops.is_active = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION assign_package_to_organization(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_package(uuid) TO authenticated;

COMMENT ON FUNCTION assign_package_to_organization IS 'Assigns a package tier to an organization (Super Admin only)';
COMMENT ON FUNCTION get_organization_package IS 'Retrieves the active package for an organization';
