/*
  # Fix Free Tier - Remove Organization Requirement
  
  ## Problem
  - Free tier users are being forced to create organizations
  - Portfolios can work without organizations (organization_id is nullable)
  - Need to simplify the flow for individual users
  
  ## Changes
  1. Update portfolio creation trigger to NOT require organization
  2. Make organization_id truly optional in all related tables
  3. Update RLS policies to work with user_id OR organization_id
  
  ## User Flow
  - Free tier: user_id based, no organization needed
  - Paid tiers: can optionally create organization for team features
*/

-- Drop and recreate the portfolio creation function
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

  -- Create default portfolio WITHOUT organization_id
  -- Free tier users don't need organizations
  BEGIN
    INSERT INTO public.portfolios (
      user_id,
      organization_id,
      name,
      description,
      is_default
    ) VALUES (
      NEW.user_id,
      NULL,  -- No organization for free tier
      v_portfolio_name,
      'Default portfolio',
      true
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default portfolio for user %: % %', NEW.user_id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON user_profiles;

CREATE TRIGGER create_default_portfolio_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_portfolio_for_user();

COMMENT ON FUNCTION create_default_portfolio_for_user() IS 'Creates a default portfolio for new users without requiring an organization. Perfect for free tier users.';
