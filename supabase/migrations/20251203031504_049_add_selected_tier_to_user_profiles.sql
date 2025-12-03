/*
  # Add Selected Tier Column to User Profiles

  ## Changes
  - Add `selected_tier` column to user_profiles table to store the package tier the user selected during registration
  - Default to 'free' for new users
  - This allows us to track which tier users signed up for before they create an organization

  ## Security
  - No RLS changes needed (existing policies apply)
*/

-- Add selected_tier column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'selected_tier'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN selected_tier text DEFAULT 'free';

    COMMENT ON COLUMN user_profiles.selected_tier IS 
      'The package tier the user selected during registration (free, basic, professional, enterprise)';
  END IF;
END $$;
