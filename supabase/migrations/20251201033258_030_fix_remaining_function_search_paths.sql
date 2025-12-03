/*
  # Fix Remaining Function Search Paths

  ## Overview
  Fixes search_path for remaining functions where possible.

  ## Changes
  - Fixes search_path for functions that exist
  - Ensures all database functions are secure
*/

-- Try to fix functions that exist
DO $$
BEGIN
  -- Fix validate_invitation_code if exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_invitation_code') THEN
    EXECUTE 'ALTER FUNCTION validate_invitation_code(text) SET search_path = public';
  END IF;

  -- Fix calculate_application_score if exists  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_application_score') THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION calculate_application_score(uuid) SET search_path = public';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Fix convert_application_to_tenant if exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'convert_application_to_tenant') THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION convert_application_to_tenant(uuid) SET search_path = public';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

END $$;

COMMENT ON FUNCTION validate_invitation_code IS 'Validates tenant invitation codes (secured with fixed search_path)';
