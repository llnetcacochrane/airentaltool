-- Run this in Supabase SQL Editor
-- Migration: Auto-Create Business on User Signup

-- Function: Create default business for user
CREATE OR REPLACE FUNCTION create_default_business_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_user_email text;
  v_first_name text;
  v_last_name text;
  v_business_name text;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  SELECT first_name, last_name INTO v_first_name, v_last_name FROM user_profiles WHERE user_id = p_user_id;

  IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL THEN
    v_business_name := v_first_name || ' ' || v_last_name || ' Properties';
  ELSIF v_first_name IS NOT NULL THEN
    v_business_name := v_first_name || '''s Properties';
  ELSE
    v_business_name := split_part(v_user_email, '@', 1) || ' Properties';
  END IF;

  INSERT INTO businesses (organization_id, business_name, legal_name, business_type, email, is_active, created_by)
  VALUES (NULL, v_business_name, v_business_name, 'Individual Landlord', v_user_email, true, p_user_id)
  RETURNING id INTO v_business_id;

  RETURN v_business_id;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION trigger_create_default_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_default_business_for_user(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_user_profile_created_create_business ON user_profiles;
CREATE TRIGGER on_user_profile_created_create_business
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_business();

-- Function: Check onboarding status
CREATE OR REPLACE FUNCTION user_has_completed_onboarding(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_business_count integer;
  v_property_count integer;
  v_unit_count integer;
  v_tenant_count integer;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT COUNT(*) INTO v_business_count FROM businesses WHERE created_by = v_user_id AND is_active = true;
  SELECT COUNT(*) INTO v_property_count FROM properties WHERE created_by = v_user_id AND is_active = true;
  SELECT COUNT(*) INTO v_unit_count FROM units WHERE created_by = v_user_id AND is_active = true;

  SELECT COUNT(*) INTO v_tenant_count FROM tenants t
  WHERE EXISTS (SELECT 1 FROM units u WHERE u.id = t.unit_id AND u.created_by = v_user_id);

  RETURN jsonb_build_object(
    'has_business', v_business_count > 0,
    'has_property', v_property_count > 0,
    'has_unit', v_unit_count > 0,
    'has_tenant', v_tenant_count > 0,
    'business_count', v_business_count,
    'property_count', v_property_count,
    'unit_count', v_unit_count,
    'tenant_count', v_tenant_count,
    'is_complete', v_business_count > 0 AND v_property_count > 0 AND v_unit_count > 0,
    'next_step', CASE
      WHEN v_business_count = 0 THEN 'create_business'
      WHEN v_property_count = 0 THEN 'create_property'
      WHEN v_unit_count = 0 THEN 'create_unit'
      WHEN v_tenant_count = 0 THEN 'create_tenant'
      ELSE 'complete'
    END
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION user_has_completed_onboarding(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_business_for_user(uuid) TO authenticated;

-- For your Super Admin user, run this to create a business:
-- SELECT create_default_business_for_user(auth.uid());
