/*
  # Super Admin User Management Functions

  ## Overview
  Creates functions for super admins to view and manage all users, 
  create new users, and assign them to organizations with packages.

  ## Functions
  1. get_all_users_with_orgs - List all users with their organization memberships
  2. create_user_and_assign - Create a new user and assign to organization
  3. assign_user_to_organization - Add existing user to organization
  4. get_all_organizations_for_admin - List all organizations with package info

  ## Security
  All functions are restricted to super admins only
*/

CREATE OR REPLACE FUNCTION get_all_users_with_orgs()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  created_at timestamptz,
  is_super_admin boolean,
  organizations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    EXISTS(SELECT 1 FROM super_admins WHERE user_id = u.id AND is_active = true) as is_super_admin,
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
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_organizations_for_admin()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  owner_email text,
  package_tier_name text,
  package_tier_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    u.email::text,
    COALESCE(pt.tier_name, 'None'),
    pt.id,
    o.created_at
  FROM organizations o
  LEFT JOIN auth.users u ON u.id = o.owner_id
  LEFT JOIN organization_package_settings ops ON ops.organization_id = o.id
  LEFT JOIN package_tiers pt ON pt.id = ops.package_tier_id
  ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION assign_user_to_organization_admin(
  p_user_id uuid,
  p_organization_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_role,
    true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = p_role,
      is_active = true;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'User assigned to organization successfully'
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION remove_user_from_organization_admin(
  p_user_id uuid,
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'User removed from organization successfully'
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION toggle_super_admin_status(
  p_user_id uuid,
  p_make_admin boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  IF p_make_admin THEN
    INSERT INTO super_admins (
      user_id,
      admin_type,
      is_active,
      granted_by
    ) VALUES (
      p_user_id,
      'system',
      true,
      auth.uid()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET is_active = true;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Super admin access granted'
    );
  ELSE
    DELETE FROM super_admins
    WHERE user_id = p_user_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Super admin access revoked'
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_all_users_with_orgs IS 'Super admin function to list all users with their organization memberships';
COMMENT ON FUNCTION get_all_organizations_for_admin IS 'Super admin function to list all organizations with package details';
COMMENT ON FUNCTION assign_user_to_organization_admin IS 'Super admin function to assign user to organization';
COMMENT ON FUNCTION remove_user_from_organization_admin IS 'Super admin function to remove user from organization';
COMMENT ON FUNCTION toggle_super_admin_status IS 'Super admin function to grant or revoke super admin access';
