/*
  # User Profiles System

  ## Overview
  Adds comprehensive user profile information including full name and address.
  This extends the auth.users system with additional profile data.

  ## Changes
  1. Create user_profiles table with full name and address
  2. Create trigger to auto-create profile when user is created
  3. Update RLS policies for profile access
  4. Update existing functions to include profile data

  ## Security
  - Users can read/update their own profile
  - Organization members can view profiles of other members
  - Super admins can view/edit all profiles
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'Canada',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Organization members can view member profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT om.user_id
      FROM organization_members om
      WHERE om.organization_id IN (
        SELECT organization_id
        FROM organization_members
        WHERE user_id = (SELECT auth.uid())
          AND is_active = true
      )
      AND om.is_active = true
    )
  );

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

CREATE POLICY "Super admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

CREATE POLICY "Super admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
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

INSERT INTO user_profiles (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

DROP FUNCTION IF EXISTS get_all_users_with_orgs();
CREATE OR REPLACE FUNCTION get_all_users_with_orgs()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz,
  is_super_admin boolean,
  organizations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Super admin only.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    up.first_name,
    up.last_name,
    up.phone,
    u.created_at,
    EXISTS(SELECT 1 FROM super_admins WHERE user_id = u.id AND is_active = true) as is_super_admin,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'org_id', om.organization_id,
            'org_name', o.name,
            'role', om.role,
            'is_active', om.is_active
          )
        )
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = u.id
      ),
      '[]'::jsonb
    ) as organizations
  FROM auth.users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON TABLE user_profiles IS 'Extended user profile information including name and address';
COMMENT ON FUNCTION create_user_profile IS 'Automatically creates user profile when user account is created';
