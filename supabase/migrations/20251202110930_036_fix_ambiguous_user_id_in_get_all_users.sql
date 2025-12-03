/*
  # Fix Ambiguous Column Reference in get_all_users_with_orgs
  
  1. Changes
    - Fix "column reference user_id is ambiguous" error
    - Properly qualify all user_id references with table aliases
*/

CREATE OR REPLACE FUNCTION get_all_users_with_orgs()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz,
  is_super_admin boolean,
  organizations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id uuid;
  is_caller_super_admin boolean;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in.';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM super_admins 
    WHERE super_admins.user_id = calling_user_id AND is_active = true
  ) INTO is_caller_super_admin;
  
  IF NOT is_caller_super_admin THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required. User: %', calling_user_id;
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    up.first_name,
    up.last_name,
    up.phone,
    u.created_at,
    EXISTS(SELECT 1 FROM super_admins sa WHERE sa.user_id = u.id AND sa.is_active = true) as is_super_admin,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'org_id', om.organization_id,
            'org_name', o.name,
            'role', om.role,
            'is_active', om.is_active
          )
        )
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = u.id
      ),
      '[]'::jsonb
    ) as organizations
  FROM auth.users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;