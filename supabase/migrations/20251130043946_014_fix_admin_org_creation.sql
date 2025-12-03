/*
  # Fix Admin Organization Creation

  1. Problem
     - get_or_create_admin_org() fails because 'slug' column is required
     - Organizations table requires: name, slug, owner_id

  2. Fix
     - Update get_or_create_admin_org() to include slug
     - Add proper slug generation for admin org

  3. Changes
     - Drop and recreate get_or_create_admin_org() with slug field
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_or_create_admin_org();

-- Recreate with proper slug handling
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
  -- Check super admin access
  IF NOT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  current_user_id := auth.uid();

  -- Check if admin org already exists
  SELECT id INTO admin_org_id
  FROM organizations
  WHERE is_admin_org = true
  LIMIT 1;

  -- Create admin org if it doesn't exist
  IF admin_org_id IS NULL THEN
    INSERT INTO organizations (
      name,
      slug,
      owner_id,
      account_tier,
      subscription_status,
      is_admin_org
    ) VALUES (
      'Admin Organization',
      'admin-organization',
      current_user_id,
      'enterprise',
      'active',
      true
    )
    RETURNING id INTO admin_org_id;

    -- Add owner as organization member
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

  -- Ensure current user is a member (idempotent)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_or_create_admin_org() TO authenticated;

-- =====================================================
-- Summary
-- =====================================================

-- ✅ Fixed get_or_create_admin_org() to include required 'slug' field
-- ✅ Admin org will now be created successfully
-- ✅ Proper error handling and permissions
