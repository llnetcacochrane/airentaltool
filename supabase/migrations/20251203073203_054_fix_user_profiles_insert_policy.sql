/*
  # Fix User Profiles Insert Policy
  
  ## Changes
  - Add policy for users to insert their own profile (needed when trigger doesn't fire)
  - This allows the authService to update profile fields after signup
  
  ## Security
  - Users can only insert their own profile (user_id must match auth.uid())
*/

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
