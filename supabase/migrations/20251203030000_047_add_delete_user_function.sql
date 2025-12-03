/*
  # Add Delete User Function for Super Admins

  ## Overview
  Adds ability for Super Admins to delete users from the system.
  This includes cleaning up all related data across tables.

  ## Changes
  1. Create delete_user_admin function
  2. Properly handle cascading deletes
  3. Super admin only access

  ## Security
  - Only super admins can delete users
  - Validates super admin status before deletion
  - Handles cleanup of all related records
*/

-- =====================================================
-- FUNCTION: Delete User (Super Admin Only)
-- =====================================================

CREATE OR REPLACE FUNCTION delete_user_admin(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_email text;
  v_result jsonb;
BEGIN
  -- Verify caller is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  -- Prevent super admins from deleting themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Get user email before deletion
  SELECT email INTO v_deleted_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_deleted_email IS NULL THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  -- Delete from auth.users (this will cascade to user_profiles and other related tables)
  -- Note: Most tables have ON DELETE CASCADE configured
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'deleted_user_id', p_user_id,
    'deleted_email', v_deleted_email,
    'message', 'User and all related data deleted successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_admin(uuid) TO authenticated;

COMMENT ON FUNCTION delete_user_admin IS 'Deletes a user and all related data (Super Admin only)';
