/*
  # Optimize RLS Auth Function Calls

  ## Overview
  Fixes auth.uid() calls in RLS policies to use (SELECT auth.uid()) pattern.
  This prevents re-evaluation on each row, significantly improving query performance at scale.

  ## Changes
  - Wrap all auth.uid() calls with SELECT
  - Applies to all critical tables
  - Critical performance optimization for production scale

  ## Performance Impact
  - Prevents N+1 auth function evaluations
  - Single evaluation per query instead of per row
  - Massive performance improvement for large datasets
*/

-- =====================================================
-- Organization Members Policies
-- =====================================================

DROP POLICY IF EXISTS "Organization owners can view all members" ON organization_members;
CREATE POLICY "Organization owners can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Organization owners can add members" ON organization_members;
CREATE POLICY "Organization owners can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Organization owners can update members" ON organization_members;
CREATE POLICY "Organization owners can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Organization owners can remove members" ON organization_members;
CREATE POLICY "Organization owners can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role = 'owner'
        AND om.is_active = true
    )
  );

-- =====================================================
-- Package System Policies
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage package tiers" ON package_tiers;
CREATE POLICY "Super admins can manage package tiers"
  ON package_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can create package tier versions" ON package_tier_versions;
CREATE POLICY "Super admins can create package tier versions"
  ON package_tier_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizations can view own package settings" ON organization_package_settings;
CREATE POLICY "Organizations can view own package settings"
  ON organization_package_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_package_settings.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all package settings" ON organization_package_settings;
CREATE POLICY "Super admins can view all package settings"
  ON organization_package_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all package settings" ON organization_package_settings;
CREATE POLICY "Super admins can manage all package settings"
  ON organization_package_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizations can view own upgrade notifications" ON package_upgrade_notifications;
CREATE POLICY "Organizations can view own upgrade notifications"
  ON package_upgrade_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = package_upgrade_notifications.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all upgrade notifications" ON package_upgrade_notifications;
CREATE POLICY "Super admins can view all upgrade notifications"
  ON package_upgrade_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organization admins can respond to notifications" ON package_upgrade_notifications;
CREATE POLICY "Organization admins can respond to notifications"
  ON package_upgrade_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = package_upgrade_notifications.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Core Data Policies  
-- =====================================================

DROP POLICY IF EXISTS "Users can view businesses in their organization" ON businesses;
CREATE POLICY "Users can view businesses in their organization"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = businesses.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage businesses" ON businesses;
CREATE POLICY "Admins can manage businesses"
  ON businesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = businesses.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view properties in their organization" ON properties;
CREATE POLICY "Users can view properties in their organization"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = properties.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Property managers can manage properties" ON properties;
CREATE POLICY "Property managers can manage properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = properties.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view units in their organization" ON units;
CREATE POLICY "Users can view units in their organization"
  ON units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = units.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Property managers can manage units" ON units;
CREATE POLICY "Property managers can manage units"
  ON units FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = units.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view tenants in their organization" ON tenants;
CREATE POLICY "Users can view tenants in their organization"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = tenants.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Property managers can manage tenants" ON tenants;
CREATE POLICY "Property managers can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = tenants.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenants can view their unit access" ON unit_tenant_access;
CREATE POLICY "Tenants can view their unit access"
  ON unit_tenant_access FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = unit_tenant_access.tenant_id
        AND tenants.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view leases in their organization" ON leases;
CREATE POLICY "Users can view leases in their organization"
  ON leases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = leases.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage leases" ON leases;
CREATE POLICY "Admins can manage leases"
  ON leases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = leases.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager', 'accounting')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view expenses in their organization" ON expenses;
CREATE POLICY "Users can view expenses in their organization"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = expenses.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Accounting can manage expenses" ON expenses;
CREATE POLICY "Accounting can manage expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = expenses.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'accounting')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view maintenance in their organization" ON maintenance_requests;
CREATE POLICY "Users can view maintenance in their organization"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = maintenance_requests.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Property managers can manage maintenance" ON maintenance_requests;
CREATE POLICY "Property managers can manage maintenance"
  ON maintenance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = maintenance_requests.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON maintenance_requests;
CREATE POLICY "Tenants can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.user_id = (SELECT auth.uid())
        AND tenants.organization_id = maintenance_requests.organization_id
    )
  );

COMMENT ON POLICY "Organization owners can view all members" ON organization_members IS 'Optimized with SELECT auth.uid() for performance';
COMMENT ON POLICY "Users can view businesses in their organization" ON businesses IS 'Optimized with SELECT auth.uid() for performance';
