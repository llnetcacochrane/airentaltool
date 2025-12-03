/*
  # Fix Function Search Paths

  1. Purpose
    - Set explicit search_path for SECURITY DEFINER functions
    - Prevents security vulnerabilities from search_path manipulation
    - Ensures functions always reference correct schemas

  2. Changes
    - Drop and recreate functions with explicit search_path
    - Set search_path to public, pg_temp for all SECURITY DEFINER functions
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS is_super_admin(uuid);
DROP FUNCTION IF EXISTS get_all_organizations_admin();

-- Recreate is_super_admin with explicit search_path
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$;

-- Recreate get_all_organizations_admin with explicit search_path
CREATE OR REPLACE FUNCTION get_all_organizations_admin()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  owner_email text,
  account_tier text,
  subscription_status text,
  created_at timestamptz,
  total_properties bigint,
  total_tenants bigint,
  total_payments bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    au.email,
    o.account_tier,
    o.subscription_status,
    o.created_at,
    COALESCE((SELECT COUNT(*) FROM properties WHERE organization_id = o.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM tenants WHERE organization_id = o.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM payments WHERE organization_id = o.id), 0)::bigint
  FROM organizations o
  LEFT JOIN auth.users au ON o.owner_id = au.id
  ORDER BY o.created_at DESC;
END;
$$;