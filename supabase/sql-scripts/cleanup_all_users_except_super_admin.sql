-- Cleanup all user data except super admin
-- This will delete all regular users and their associated data

DO $$
DECLARE
  super_admin_user_id uuid;
  deleted_count int;
BEGIN
  -- Get the super admin user ID
  SELECT user_id INTO super_admin_user_id
  FROM super_admins
  WHERE is_active = true
  LIMIT 1;

  IF super_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No active super admin found. Cannot proceed with cleanup.';
  END IF;

  RAISE NOTICE 'Super admin user ID: %', super_admin_user_id;

  -- Delete all businesses NOT owned by super admin
  DELETE FROM businesses
  WHERE owner_user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % businesses', deleted_count;

  -- Delete all organization memberships for non-super-admin users
  DELETE FROM organization_members
  WHERE user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % organization memberships', deleted_count;

  -- Delete all users from auth.users EXCEPT super admin
  DELETE FROM auth.users
  WHERE id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % users from auth.users', deleted_count;

  -- The CASCADE constraints should have cleaned up:
  -- - properties (via business_id foreign key)
  -- - units (via property_id foreign key)
  -- - tenants (via user_id and property_id foreign keys)
  -- - leases (via property_id foreign key)
  -- - rent_payments (via created_by foreign key)
  -- - expenses (via created_by foreign key)
  -- - maintenance_requests (via property_id foreign key)
  -- - rental_applications (via user_id foreign key)
  -- - documents (via user_id foreign key)
  -- etc.

  RAISE NOTICE 'Cleanup complete. Only super admin data remains.';
END $$;

-- Verify what's left
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM businesses) as total_businesses,
  (SELECT COUNT(*) FROM properties) as total_properties,
  (SELECT COUNT(*) FROM units) as total_units,
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM leases) as total_leases,
  (SELECT COUNT(*) FROM rent_payments) as total_payments,
  (SELECT COUNT(*) FROM expenses) as total_expenses;

-- Show remaining users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at;
