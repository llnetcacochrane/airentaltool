-- Fix delete_user_admin to properly clean up ALL auth-related tables
-- This prevents "user already exists" errors when recreating deleted users

CREATE OR REPLACE FUNCTION public.delete_user_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_email text;
  v_result jsonb;
  v_deleted_count int;
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

  -- Clean up auth schema tables in the correct order
  -- These don't cascade automatically, so we need to clean them manually

  -- 1. Delete MFA challenges (references mfa_factors)
  DELETE FROM auth.mfa_challenges
  WHERE factor_id IN (
    SELECT id FROM auth.mfa_factors WHERE user_id = p_user_id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % MFA challenges', v_deleted_count;

  -- 2. Delete MFA factors
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % MFA factors', v_deleted_count;

  -- 3. Delete MFA AMR claims
  DELETE FROM auth.mfa_amr_claims WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id = p_user_id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % MFA AMR claims', v_deleted_count;

  -- 4. Delete refresh tokens
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % refresh tokens', v_deleted_count;

  -- 5. Delete sessions
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % sessions', v_deleted_count;

  -- 6. Delete SSO domains (if they reference this user's SSO providers)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sso_domains') THEN
    DELETE FROM auth.sso_domains
    WHERE sso_provider_id IN (
      SELECT sso_provider_id FROM auth.identities WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % SSO domains', v_deleted_count;
  END IF;

  -- 7. Delete SSO providers associated with this user
  DELETE FROM auth.sso_providers
  WHERE id IN (
    SELECT sso_provider_id FROM auth.identities WHERE user_id = p_user_id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % SSO providers', v_deleted_count;

  -- 8. Delete identities
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % identities', v_deleted_count;

  -- 9. Delete one-time tokens (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'one_time_tokens') THEN
    DELETE FROM auth.one_time_tokens WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % one-time tokens', v_deleted_count;
  END IF;

  -- 10. Delete SAML providers (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'saml_providers') THEN
    DELETE FROM auth.saml_providers
    WHERE sso_provider_id IN (
      SELECT sso_provider_id FROM auth.identities WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % SAML providers', v_deleted_count;
  END IF;

  -- 11. Delete SAML relay states (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'saml_relay_states') THEN
    DELETE FROM auth.saml_relay_states
    WHERE sso_provider_id IN (
      SELECT sso_provider_id FROM auth.identities WHERE user_id = p_user_id
    );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % SAML relay states', v_deleted_count;
  END IF;

  -- 12. Now delete from auth.users (public schema tables will cascade via ON DELETE CASCADE/SET NULL)
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted user from auth.users';

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'deleted_user_id', p_user_id,
    'deleted_email', v_deleted_email,
    'message', 'User and all related data deleted successfully (including all auth records)'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$function$;

-- Verify the function was updated
SELECT proname, prosrc FROM pg_proc WHERE proname = 'delete_user_admin';
