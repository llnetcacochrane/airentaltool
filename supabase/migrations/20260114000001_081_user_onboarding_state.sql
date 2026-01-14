-- User Onboarding State Table
-- Tracks onboarding progress per user for the setup checklist

-- Create the onboarding state table
CREATE TABLE IF NOT EXISTS user_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Step completion tracking
  has_added_property boolean DEFAULT false,
  has_added_unit boolean DEFAULT false,

  -- Dismissal tracking
  onboarding_dismissed boolean DEFAULT false,
  post_onboarding_dismissed boolean DEFAULT false,

  -- References to first items (for potential undo/reference)
  first_property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  first_unit_id uuid REFERENCES units(id) ON DELETE SET NULL,

  -- Completion timestamps
  onboarding_completed_at timestamptz,
  post_onboarding_completed_at timestamptz,

  -- Standard timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one record per user
  CONSTRAINT unique_user_onboarding UNIQUE (user_id)
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding_state(user_id);

-- Enable Row Level Security
ALTER TABLE user_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own onboarding state
CREATE POLICY "Users can view own onboarding state"
  ON user_onboarding_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding state"
  ON user_onboarding_state FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding state"
  ON user_onboarding_state FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to auto-create onboarding state for new users
CREATE OR REPLACE FUNCTION create_user_onboarding_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_onboarding_state (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create onboarding state when user profile is created
DROP TRIGGER IF EXISTS create_onboarding_state_trigger ON user_profiles;
CREATE TRIGGER create_onboarding_state_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_onboarding_state();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_onboarding_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_onboarding_state_updated_at ON user_onboarding_state;
CREATE TRIGGER update_onboarding_state_updated_at
  BEFORE UPDATE ON user_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_user_onboarding_state_updated_at();

-- Function to get or create onboarding state for current user
CREATE OR REPLACE FUNCTION get_or_create_onboarding_state()
RETURNS user_onboarding_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result user_onboarding_state;
BEGIN
  -- Try to get existing record
  SELECT * INTO result FROM user_onboarding_state WHERE user_id = auth.uid();

  -- If no record exists, create one
  IF result IS NULL THEN
    INSERT INTO user_onboarding_state (user_id)
    VALUES (auth.uid())
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_onboarding_state() TO authenticated;

-- Create onboarding state for existing users who don't have one
INSERT INTO user_onboarding_state (user_id, has_added_property, has_added_unit, onboarding_completed_at)
SELECT
  up.user_id,
  EXISTS (SELECT 1 FROM properties p WHERE p.created_by = up.user_id AND p.is_active = true),
  EXISTS (SELECT 1 FROM units u WHERE u.created_by = up.user_id AND u.is_active = true),
  CASE
    WHEN EXISTS (SELECT 1 FROM properties p WHERE p.created_by = up.user_id AND p.is_active = true)
         AND EXISTS (SELECT 1 FROM units u WHERE u.created_by = up.user_id AND u.is_active = true)
    THEN now()
    ELSE NULL
  END
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_onboarding_state uos WHERE uos.user_id = up.user_id
)
ON CONFLICT (user_id) DO NOTHING;
