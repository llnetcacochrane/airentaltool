/*
  # Enhanced Registration and Portfolio Creation

  ## Overview
  This migration enhances the user registration flow by:
  1. Adding organization_name column to user_profiles for business name storage
  2. Updating the portfolio creation trigger to use organization_name when available
  3. Ensuring portfolios are named appropriately based on registration data

  ## Changes
  1. Add organization_name column to user_profiles
  2. Update create_default_portfolio_for_user() to use organization_name first

  ## Security
  - RLS policies remain unchanged for user_profiles
  - Portfolio creation continues to use SECURITY DEFINER
*/

-- =====================================================
-- ADD ORGANIZATION_NAME COLUMN TO USER_PROFILES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_name text;
    COMMENT ON COLUMN user_profiles.organization_name IS 'Business or portfolio name provided during registration';
  END IF;
END $$;

-- =====================================================
-- UPDATE PORTFOLIO CREATION TRIGGER
-- =====================================================

DROP FUNCTION IF EXISTS create_default_portfolio_for_user() CASCADE;

CREATE OR REPLACE FUNCTION create_default_portfolio_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_name text;
BEGIN
  -- Use organization_name if provided (from registration), otherwise build from name
  IF NEW.organization_name IS NOT NULL AND NEW.organization_name != '' THEN
    -- Use business name directly (already includes proper formatting)
    v_portfolio_name := NEW.organization_name || '''s Portfolio';
  ELSIF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    v_portfolio_name := NEW.first_name || ' ' || NEW.last_name || '''s Portfolio';
  ELSIF NEW.first_name IS NOT NULL THEN
    v_portfolio_name := NEW.first_name || '''s Portfolio';
  ELSE
    v_portfolio_name := 'My Portfolio';
  END IF;

  -- Try to create default portfolio
  BEGIN
    INSERT INTO public.portfolios (
      user_id,
      name,
      description,
      is_default
    ) VALUES (
      NEW.user_id,
      v_portfolio_name,
      'Default portfolio',
      true
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log warning but don't fail the user creation
      RAISE WARNING 'Failed to create default portfolio for user %: % %', NEW.user_id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON user_profiles;

CREATE TRIGGER create_default_portfolio_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_portfolio_for_user();

-- Also trigger on UPDATE to handle profile updates after initial creation
-- (since the trigger fires on INSERT but profile data is updated separately)
DROP TRIGGER IF EXISTS update_portfolio_name_trigger ON user_profiles;

CREATE OR REPLACE FUNCTION update_portfolio_name_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_name text;
BEGIN
  -- Only update if this is the first time organization_name is being set
  -- (to avoid overwriting user-customized portfolio names)
  IF OLD.organization_name IS NULL AND NEW.organization_name IS NOT NULL AND NEW.organization_name != '' THEN
    v_portfolio_name := NEW.organization_name || '''s Portfolio';

    UPDATE public.portfolios
    SET name = v_portfolio_name, updated_at = now()
    WHERE user_id = NEW.user_id
      AND is_default = true
      AND name LIKE '%''s Portfolio'; -- Only update if still using default naming pattern
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_portfolio_name_trigger
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.organization_name IS DISTINCT FROM NEW.organization_name)
  EXECUTE FUNCTION update_portfolio_name_on_profile_update();

COMMENT ON FUNCTION create_default_portfolio_for_user() IS 'Creates default portfolio when user profile is created. Uses organization_name if available, otherwise builds from first_name/last_name.';
COMMENT ON FUNCTION update_portfolio_name_on_profile_update() IS 'Updates portfolio name when organization_name is first set on user profile.';
