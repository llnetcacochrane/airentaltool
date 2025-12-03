/*
  # Fix Super Admin Setup and Missing Data

  ## Overview
  Fixes missing package settings for admin organizations and adds super admin RLS bypass.

  ## Changes
  1. Assign Enterprise package to all admin organizations
  2. Grant super admins full bypass on all RLS policies
  3. Initialize usage tracking

  ## Impact
  - Super admins can create/manage anything
  - Admin orgs have proper package limits
*/

-- =====================================================
-- STEP 1: Assign Enterprise Package to Admin Orgs
-- =====================================================

DO $$
DECLARE
  enterprise_tier_id uuid;
BEGIN
  SELECT id INTO enterprise_tier_id 
  FROM package_tiers 
  WHERE tier_slug = 'enterprise';

  INSERT INTO organization_package_settings (
    organization_id,
    package_tier_id,
    package_version,
    billing_cycle,
    current_period_start,
    current_period_end
  )
  SELECT 
    o.id,
    enterprise_tier_id,
    1,
    'annual',
    now(),
    now() + interval '100 years'
  FROM organizations o
  WHERE o.is_admin_org = true
    AND NOT EXISTS (
      SELECT 1 FROM organization_package_settings ops
      WHERE ops.organization_id = o.id
    )
  ON CONFLICT (organization_id) DO UPDATE
  SET package_tier_id = enterprise_tier_id,
      current_period_start = COALESCE(organization_package_settings.current_period_start, now()),
      current_period_end = now() + interval '100 years';

END $$;

-- =====================================================
-- STEP 2: Grant Super Admin Bypass on Core Tables
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
CREATE POLICY "Super admins can manage all organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all memberships" ON organization_members;
CREATE POLICY "Super admins can manage all memberships"
  ON organization_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all businesses" ON businesses;
CREATE POLICY "Super admins can manage all businesses"
  ON businesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all properties" ON properties;
CREATE POLICY "Super admins can manage all properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all units" ON units;
CREATE POLICY "Super admins can manage all units"
  ON units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
CREATE POLICY "Super admins can manage all tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all leases" ON leases;
CREATE POLICY "Super admins can manage all leases"
  ON leases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all expenses" ON expenses;
CREATE POLICY "Super admins can manage all expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all maintenance" ON maintenance_requests;
CREATE POLICY "Super admins can manage all maintenance"
  ON maintenance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all payments" ON rent_payments;
CREATE POLICY "Super admins can manage all payments"
  ON rent_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

-- =====================================================
-- STEP 3: Initialize Usage Tracking
-- =====================================================

INSERT INTO organization_usage_tracking (
  organization_id,
  current_businesses,
  current_properties,
  current_units,
  current_tenants,
  current_users,
  updated_at
)
SELECT 
  o.id,
  (SELECT COUNT(*) FROM businesses WHERE organization_id = o.id AND is_active = true),
  (SELECT COUNT(*) FROM properties WHERE organization_id = o.id),
  (SELECT COUNT(*) FROM units WHERE organization_id = o.id AND is_active = true),
  (SELECT COUNT(*) FROM tenants WHERE organization_id = o.id AND is_active = true),
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND is_active = true),
  now()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_usage_tracking
  WHERE organization_id = o.id
)
ON CONFLICT (organization_id) DO UPDATE
SET current_businesses = EXCLUDED.current_businesses,
    current_properties = EXCLUDED.current_properties,
    current_units = EXCLUDED.current_units,
    current_tenants = EXCLUDED.current_tenants,
    current_users = EXCLUDED.current_users,
    updated_at = now();
