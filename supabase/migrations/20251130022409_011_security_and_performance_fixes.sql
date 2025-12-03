/*
  # Security and Performance Fixes

  1. Add Missing Indexes
    - Add indexes for foreign keys on updated_by columns
    - Improves query performance for audit trails

  2. Optimize RLS Policies
    - Replace auth.uid() with (SELECT auth.uid())
    - Prevents re-evaluation for each row
    - Significant performance improvement at scale

  3. Fix Function Search Path
    - Make user_is_org_admin search path immutable
    - Security best practice

  Note: Unused indexes are kept as they will be used as data grows.
  Multiple permissive policies are intentional for different access patterns.
*/

-- =====================================================
-- PART 1: Add Missing Foreign Key Indexes
-- =====================================================

-- Index for system_settings.updated_by
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
  ON system_settings(updated_by);

-- Index for organization_settings.updated_by
CREATE INDEX IF NOT EXISTS idx_organization_settings_updated_by 
  ON organization_settings(updated_by);

-- =====================================================
-- PART 2: Optimize RLS Policies - Organizations
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view organizations they own" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations where they are members" ON organizations;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view organizations they own"
  ON organizations FOR SELECT
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Users can view organizations where they are members"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND is_active = true
    )
  );

-- =====================================================
-- PART 3: Optimize RLS Policies - Organization Members
-- =====================================================

DROP POLICY IF EXISTS "Organization owners can view all members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can view all members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;

CREATE POLICY "Organization owners can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Organization admins can view all members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- PART 4: Optimize RLS Policies - System Settings
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Super admins can insert system settings" ON system_settings;
DROP POLICY IF EXISTS "Super admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Super admins can delete system settings" ON system_settings;

CREATE POLICY "Super admins can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (SELECT auth.uid())
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (SELECT auth.uid())
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (SELECT auth.uid())
      AND super_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (SELECT auth.uid())
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can delete system settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = (SELECT auth.uid())
      AND super_admins.is_active = true
    )
  );

-- =====================================================
-- PART 5: Optimize RLS Policies - Maintenance Requests
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Organization members can create maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Organization members can update maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Organization members can delete maintenance requests" ON maintenance_requests;

CREATE POLICY "Organization members can view maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can delete maintenance requests"
  ON maintenance_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

-- =====================================================
-- PART 6: Optimize RLS Policies - Maintenance Vendors
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view vendors" ON maintenance_vendors;
DROP POLICY IF EXISTS "Organization members can create vendors" ON maintenance_vendors;
DROP POLICY IF EXISTS "Organization members can update vendors" ON maintenance_vendors;
DROP POLICY IF EXISTS "Organization members can delete vendors" ON maintenance_vendors;

CREATE POLICY "Organization members can view vendors"
  ON maintenance_vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can create vendors"
  ON maintenance_vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can update vendors"
  ON maintenance_vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can delete vendors"
  ON maintenance_vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

-- =====================================================
-- PART 7: Optimize RLS Policies - Organization Settings
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view their org settings" ON organization_settings;
DROP POLICY IF EXISTS "Organization admins can insert settings" ON organization_settings;
DROP POLICY IF EXISTS "Organization admins can update settings" ON organization_settings;
DROP POLICY IF EXISTS "Organization admins can delete settings" ON organization_settings;

CREATE POLICY "Organization members can view their org settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can insert settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can update settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can delete settings"
  ON organization_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = (SELECT auth.uid())
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

-- =====================================================
-- PART 8: Fix Function Search Path
-- =====================================================

-- Drop and recreate function with immutable search path
DROP FUNCTION IF EXISTS user_is_org_admin(uuid);

CREATE OR REPLACE FUNCTION user_is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND is_active = true
  );
END;
$$;

-- =====================================================
-- Summary of Changes
-- =====================================================

-- ✅ Added 2 missing foreign key indexes
-- ✅ Optimized 21 RLS policies with (SELECT auth.uid())
-- ✅ Fixed function search path security issue
-- ✅ Maintained all existing functionality
-- ✅ Significant performance improvement at scale

-- Note: Unused indexes warnings are acceptable - they'll be used as data grows
-- Note: Multiple permissive policies are intentional for granular access control
-- Note: Enable leaked password protection in Supabase dashboard (Auth > Policies)
