/*
  # Admin Hierarchy and Support Functions

  1. Admin Roles Structure
    - **System Admin (Super Admin):** Technical platform management, database, security
    - **SaaS Admin:** Business operations, customers, billing, packages, support
    - **Org Admin:** Individual organization management (existing)

  2. New Features
    - SaaS Admin role and permissions
    - Admin organization (special org for admins to operate from)
    - RPC functions for admin dashboards
    - Admin mode switching capability

  3. Tables Updated
    - Add is_admin_org flag to organizations
    - Add admin_type to super_admins (system, saas, both)

  4. Functions Created
    - get_all_organizations_admin() - For admin dashboards
    - get_platform_statistics() - Overall stats
    - get_or_create_admin_org() - Admin org management
    - create_saas_admin() - SaaS admin creation
*/

-- =====================================================
-- PART 1: Update Organizations Table for Admin Org
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'is_admin_org'
  ) THEN
    ALTER TABLE organizations ADD COLUMN is_admin_org boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_is_admin_org ON organizations(is_admin_org) WHERE is_admin_org = true;

-- =====================================================
-- PART 2: Update Super Admins Table for Admin Types
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'super_admins' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE super_admins ADD COLUMN admin_type text DEFAULT 'system';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'super_admins_admin_type_check'
  ) THEN
    ALTER TABLE super_admins 
    ADD CONSTRAINT super_admins_admin_type_check 
    CHECK (admin_type IN ('system', 'saas', 'both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_super_admins_admin_type ON super_admins(admin_type) WHERE is_active = true;

-- =====================================================
-- PART 3: RPC Function - Get All Organizations (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_organizations_admin()
RETURNS TABLE (
  id uuid,
  name text,
  owner_email text,
  account_tier text,
  subscription_status text,
  total_properties bigint,
  total_tenants bigint,
  total_payments bigint,
  is_admin_org boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COALESCE(u.email, 'No owner') as owner_email,
    o.account_tier,
    o.subscription_status,
    COALESCE(COUNT(DISTINCT p.id), 0)::bigint as total_properties,
    COALESCE(COUNT(DISTINCT t.id), 0)::bigint as total_tenants,
    COALESCE(COUNT(DISTINCT pay.id), 0)::bigint as total_payments,
    o.is_admin_org,
    o.created_at
  FROM organizations o
  LEFT JOIN auth.users u ON o.owner_id = u.id
  LEFT JOIN properties p ON p.organization_id = o.id
  LEFT JOIN tenants t ON t.organization_id = o.id
  LEFT JOIN payments pay ON pay.organization_id = o.id
  GROUP BY o.id, o.name, u.email, o.account_tier, o.subscription_status, o.is_admin_org, o.created_at
  ORDER BY o.created_at DESC;
END;
$$;

-- =====================================================
-- PART 4: RPC Function - Get Platform Statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations WHERE is_admin_org = false),
    'active_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active' AND is_admin_org = false),
    'trial_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'trial' AND is_admin_org = false),
    'suspended_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'suspended' AND is_admin_org = false),
    'total_properties', (SELECT COUNT(*) FROM properties),
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'total_leases', (SELECT COUNT(*) FROM leases),
    'active_leases', (SELECT COUNT(*) FROM leases WHERE status = 'active'),
    'total_payments', (SELECT COUNT(*) FROM payments),
    'total_payment_amount', (SELECT COALESCE(SUM(amount), 0) FROM payments),
    'total_maintenance_requests', (SELECT COUNT(*) FROM maintenance_requests),
    'open_maintenance_requests', (SELECT COUNT(*) FROM maintenance_requests WHERE status IN ('submitted', 'acknowledged', 'in_progress')),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM expenses),
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'last_30_days_signups', (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '30 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================
-- PART 5: RPC Function - Get or Create Admin Org
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_admin_org()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_org_id uuid;
  current_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  current_user_id := auth.uid();

  SELECT id INTO admin_org_id
  FROM organizations
  WHERE is_admin_org = true
  LIMIT 1;

  IF admin_org_id IS NULL THEN
    INSERT INTO organizations (
      name,
      owner_id,
      account_tier,
      subscription_status,
      is_admin_org
    ) VALUES (
      'Admin Organization',
      current_user_id,
      'enterprise',
      'active',
      true
    )
    RETURNING id INTO admin_org_id;

    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      is_active
    ) VALUES (
      admin_org_id,
      current_user_id,
      'owner',
      true
    );
  END IF;

  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) VALUES (
    admin_org_id,
    current_user_id,
    'admin',
    true
  )
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET is_active = true;

  RETURN admin_org_id;
END;
$$;

-- =====================================================
-- PART 6: RPC Function - Check Admin Type
-- =====================================================

CREATE OR REPLACE FUNCTION get_admin_type()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_type_result text;
BEGIN
  SELECT admin_type INTO admin_type_result
  FROM super_admins
  WHERE user_id = auth.uid()
  AND is_active = true;

  RETURN COALESCE(admin_type_result, 'none');
END;
$$;

-- =====================================================
-- PART 7: Helper Function - Create SaaS Admin
-- =====================================================

CREATE OR REPLACE FUNCTION create_saas_admin(
  admin_email text,
  admin_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_user_id uuid;
  new_admin_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND admin_type IN ('system', 'both')
  ) THEN
    RAISE EXCEPTION 'Access denied: System admin privileges required';
  END IF;

  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;

  INSERT INTO super_admins (
    user_id,
    admin_type,
    granted_by,
    notes,
    is_active
  ) VALUES (
    admin_user_id,
    'saas',
    auth.uid(),
    admin_notes,
    true
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    admin_type = CASE 
      WHEN super_admins.admin_type = 'system' THEN 'both'
      ELSE 'saas'
    END,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO new_admin_id;

  RETURN new_admin_id;
END;
$$;

-- =====================================================
-- PART 8: Grant Execute Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_all_organizations_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_admin_org() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_type() TO authenticated;
GRANT EXECUTE ON FUNCTION create_saas_admin(text, text) TO authenticated;
