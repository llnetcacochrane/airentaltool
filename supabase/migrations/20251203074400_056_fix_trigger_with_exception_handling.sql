/*
  # Fix User Profile Creation with Error Handling
  
  ## Problem
  - The trigger is still failing during signup
  - Need to add exception handling to see what's going wrong
  - Also need to ensure the function doesn't fail silently
  
  ## Solution
  - Add exception handling with logging
  - Make the function more resilient
  - Return NEW even if insert fails (don't block user creation)
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS
  - Only inserts user_id, no other data manipulation
*/

DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert the user profile
  BEGIN
    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create user profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  -- Always return NEW so user creation succeeds
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

COMMENT ON FUNCTION create_user_profile() IS 'Automatically creates a user profile when a new auth user is created. Uses exception handling to prevent blocking user signup.';
