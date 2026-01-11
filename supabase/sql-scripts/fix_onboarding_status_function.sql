-- Fix user_has_completed_onboarding to return detailed status
-- This function should return a JSON object with onboarding progress details

DROP FUNCTION IF EXISTS user_has_completed_onboarding();

CREATE OR REPLACE FUNCTION user_has_completed_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_business_count int;
  v_property_count int;
  v_unit_count int;
  v_tenant_count int;
  v_next_step text;
  v_is_complete boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_business', false,
      'has_property', false,
      'has_unit', false,
      'has_tenant', false,
      'business_count', 0,
      'property_count', 0,
      'unit_count', 0,
      'tenant_count', 0,
      'is_complete', false,
      'next_step', 'create_business'
    );
  END IF;

  -- Count businesses owned by user
  SELECT COUNT(*) INTO v_business_count
  FROM businesses
  WHERE owner_user_id = v_user_id AND is_active = true;

  -- Count properties owned by user's businesses
  SELECT COUNT(*) INTO v_property_count
  FROM properties p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.owner_user_id = v_user_id AND p.is_active = true;

  -- Count units in user's properties
  SELECT COUNT(*) INTO v_unit_count
  FROM units u
  JOIN properties p ON p.id = u.property_id
  JOIN businesses b ON b.id = p.business_id
  WHERE b.owner_user_id = v_user_id AND u.is_active = true;

  -- Count tenants in user's units
  SELECT COUNT(DISTINCT uta.tenant_id) INTO v_tenant_count
  FROM unit_tenant_access uta
  JOIN units u ON u.id = uta.unit_id
  JOIN properties p ON p.id = u.property_id
  JOIN businesses b ON b.id = p.business_id
  WHERE b.owner_user_id = v_user_id AND uta.is_active = true;

  -- Determine next step (skip tenant - not part of wizard anymore)
  IF v_business_count = 0 THEN
    v_next_step := 'create_business';
    v_is_complete := false;
  ELSIF v_property_count = 0 THEN
    v_next_step := 'create_property';
    v_is_complete := false;
  ELSIF v_unit_count = 0 THEN
    v_next_step := 'create_unit';
    v_is_complete := false;
  ELSE
    v_next_step := 'complete';
    v_is_complete := true;
  END IF;

  RETURN jsonb_build_object(
    'has_business', v_business_count > 0,
    'has_property', v_property_count > 0,
    'has_unit', v_unit_count > 0,
    'has_tenant', v_tenant_count > 0,
    'business_count', v_business_count,
    'property_count', v_property_count,
    'unit_count', v_unit_count,
    'tenant_count', v_tenant_count,
    'is_complete', v_is_complete,
    'next_step', v_next_step
  );
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
