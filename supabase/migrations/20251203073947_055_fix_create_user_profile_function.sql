/*
  # Fix User Profile Creation Trigger Function
  
  ## Problem
  - The create_user_profile() function was failing during signup
  - SECURITY DEFINER with search_path restriction was blocking the trigger
  
  ## Solution
  - Recreate the function without search_path restriction
  - Use SECURITY DEFINER to bypass RLS policies
  - This allows the trigger to insert into user_profiles during auth.users INSERT
  
  ## Security
  - Function only inserts user_id from NEW.id (auth.users.id)
  - ON CONFLICT DO NOTHING prevents duplicates
  - SECURITY DEFINER allows bypassing RLS for system operations
*/

DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
