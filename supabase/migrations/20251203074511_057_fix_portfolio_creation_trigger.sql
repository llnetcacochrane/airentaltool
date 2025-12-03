/*
  # Fix Portfolio Creation Trigger
  
  ## Problem
  - The create_default_portfolio_for_user() function was referencing non-existent columns
  - It was trying to use NEW.organization_name and NEW.full_name
  - Actual columns are first_name and last_name
  - This was causing the "Database error saving new user" during signup
  
  ## Solution
  - Update function to use correct column names
  - Build portfolio name from first_name and last_name
  - Add error handling to prevent blocking user creation
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS
  - Creates portfolio with user_id from the new user_profile
*/

DROP FUNCTION IF EXISTS create_default_portfolio_for_user() CASCADE;

CREATE OR REPLACE FUNCTION create_default_portfolio_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_portfolio_name text;
BEGIN
  -- Build portfolio name from user's name or use default
  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
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
      -- Log warning but don't fail
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

COMMENT ON FUNCTION create_default_portfolio_for_user() IS 'Automatically creates a default portfolio when a new user profile is created. Uses exception handling to prevent blocking user creation.';
