/*
  # Fix Infinite Recursion and RPC Type Issues

  1. Problem 1: Infinite recursion in organizations RLS policy
     - The new super admin policy is causing recursion
     - Need to simplify the policy check

  2. Problem 2: Type mismatch in get_all_organizations_admin()
     - Column 3 (account_tier) is VARCHAR but function expects TEXT
     - Need to cast properly or fix return type

  3. Changes
     - Drop and recreate the problematic super admin policy
     - Fix get_all_organizations_admin() return types
     - Ensure no recursive policy checks
*/

-- =====================================================
-- PART 1: Fix Organizations RLS Policy
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;

-- Create a simpler, non-recursive policy for super admins
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = (SELECT auth.uid())
      AND sa.is_active = true
    )
  );

-- =====================================================
-- PART 2: Fix get_all_organizations_admin RPC Function
-- =====================================================

-- Drop and recreate with proper types
DROP FUNCTION IF EXISTS get_all_organizations_admin();

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
  -- Check if user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() 
    AND sa.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COALESCE(u.email, 'No owner')::text as owner_email,
    o.account_tier::text,
    o.subscription_status::text,
    COALESCE(COUNT(DISTINCT p.id), 0)::bigint as total_properties,
    COALESCE(COUNT(DISTINCT t.id), 0)::bigint as total_tenants,
    COALESCE(COUNT(DISTINCT pay.id), 0)::bigint as total_payments,
    COALESCE(o.is_admin_org, false) as is_admin_org,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_organizations_admin() TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

-- ✅ Fixed infinite recursion in organizations RLS policy
-- ✅ Fixed type mismatch in get_all_organizations_admin()
-- ✅ Explicitly cast all VARCHAR to TEXT
-- ✅ Non-recursive policy for super admin access
