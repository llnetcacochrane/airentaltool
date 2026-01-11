-- Comprehensive cleanup of all auth-related tables
-- This removes ALL traces of users except the super admin

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

  -- Clean up auth.identities (except super admin)
  DELETE FROM auth.identities
  WHERE user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % identities', deleted_count;

  -- Clean up auth.sessions (except super admin)
  DELETE FROM auth.sessions
  WHERE user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % sessions', deleted_count;

  -- Clean up auth.refresh_tokens (except super admin)
  DELETE FROM auth.refresh_tokens
  WHERE user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % refresh tokens', deleted_count;

  -- Clean up auth.mfa_factors (except super admin)
  DELETE FROM auth.mfa_factors
  WHERE user_id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % MFA factors', deleted_count;

  -- Clean up auth.mfa_challenges (except super admin)
  DELETE FROM auth.mfa_challenges
  WHERE factor_id NOT IN (
    SELECT id FROM auth.mfa_factors WHERE user_id = super_admin_user_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % MFA challenges', deleted_count;

  -- Clean up auth.sso_providers (except super admin)
  DELETE FROM auth.sso_providers
  WHERE id NOT IN (
    SELECT sso_provider_id FROM auth.identities WHERE user_id = super_admin_user_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % SSO providers', deleted_count;

  -- Clean up auth.sso_domains (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sso_domains') THEN
    DELETE FROM auth.sso_domains
    WHERE sso_provider_id NOT IN (
      SELECT sso_provider_id FROM auth.identities WHERE user_id = super_admin_user_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % SSO domains', deleted_count;
  END IF;

  -- Clean up auth.one_time_tokens (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'one_time_tokens') THEN
    DELETE FROM auth.one_time_tokens
    WHERE user_id != super_admin_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % one-time tokens', deleted_count;
  END IF;

  -- Finally, delete users from auth.users (except super admin)
  DELETE FROM auth.users
  WHERE id != super_admin_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % users from auth.users', deleted_count;

  RAISE NOTICE 'Auth cleanup complete.';
END $$;

-- Verify remaining auth records
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM auth.identities) as total_identities,
  (SELECT COUNT(*) FROM auth.sessions) as total_sessions,
  (SELECT COUNT(*) FROM auth.refresh_tokens) as total_refresh_tokens;

-- Show remaining users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at;
