/*
  # Remove Organization Dependency
  Version: 4.3.2-beta

  ## Overview
  This migration REMOVES the Organization concept entirely. Business becomes the top-level entity.

  ## New Hierarchy
  User -> Business(es) -> Property(ies) -> Unit(s) -> Tenant(s)

  ## Changes
  1. Make organization_id NULLABLE on businesses table
  2. Update RPC functions to work WITHOUT organizations
  3. Update RLS policies to use owner_user_id directly
  4. Remove organization membership checks for business access
*/

-- =====================================================
-- MAKE ORGANIZATION_ID NULLABLE ON BUSINESSES
-- =====================================================

-- First, make organization_id nullable
ALTER TABLE businesses ALTER COLUMN organization_id DROP NOT NULL;

-- =====================================================
-- UPDATE GET_USER_DEFAULT_BUSINESS
-- Remove organization fallback - only query by owner_user_id
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_default_business(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- First try to find default business owned by user
  SELECT id INTO v_business_id
  FROM businesses
  WHERE owner_user_id = p_user_id
    AND is_default = true
    AND is_active = true
  LIMIT 1;

  -- If no default, get first owned business
  IF v_business_id IS NULL THEN
    SELECT id INTO v_business_id
    FROM businesses
    WHERE owner_user_id = p_user_id
      AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Note: We no longer fall back to organization membership
  -- Businesses are directly owned by users now

  RETURN v_business_id;
END;
$$;

-- =====================================================
-- UPDATE GET_USER_BUSINESSES
-- Remove organization membership checks
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_businesses(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  business_name text,
  legal_name text,
  email text,
  phone text,
  city text,
  state text,
  is_default boolean,
  is_owned boolean,
  property_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    b.id,
    b.organization_id,
    b.business_name,
    b.legal_name,
    b.email,
    b.phone,
    b.city,
    b.state,
    b.is_default,
    true as is_owned,  -- All returned businesses are owned by this user
    (SELECT COUNT(*) FROM properties p WHERE p.business_id = b.id AND p.is_active = true) as property_count,
    b.created_at
  FROM businesses b
  WHERE b.is_active = true
    AND b.owner_user_id = p_user_id
  ORDER BY b.is_default DESC, b.created_at ASC;
END;
$$;

-- =====================================================
-- UPDATE CREATE_DEFAULT_BUSINESS_FOR_USER
-- Remove organization requirement
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_business_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_name text;
  v_existing_business_count integer;
BEGIN
  -- Check if user already has a business
  SELECT COUNT(*) INTO v_existing_business_count
  FROM businesses b
  WHERE b.owner_user_id = NEW.user_id;

  IF v_existing_business_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Determine business name
  IF NEW.organization_name IS NOT NULL AND NEW.organization_name != '' THEN
    v_business_name := NEW.organization_name;
  ELSIF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    v_business_name := NEW.first_name || ' ' || NEW.last_name;
  ELSIF NEW.first_name IS NOT NULL THEN
    v_business_name := NEW.first_name;
  ELSE
    v_business_name := 'My Business';
  END IF;

  -- Create business directly - NO organization required
  BEGIN
    INSERT INTO businesses (
      organization_id,  -- Will be NULL
      owner_user_id,
      business_name,
      email,
      phone,
      address_line1,
      city,
      state,
      postal_code,
      country,
      currency,
      timezone,
      is_active,
      is_default,
      created_by
    ) VALUES (
      NULL,  -- No organization
      NEW.user_id,
      v_business_name,
      (SELECT email FROM auth.users WHERE id = NEW.user_id),
      NEW.phone,
      NEW.address_line1,
      NEW.city,
      NEW.state_province,
      NEW.postal_code,
      COALESCE(NEW.country, 'CA'),
      'CAD',
      'America/Toronto',
      true,
      true,
      NEW.user_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default business for user %: % %', NEW.user_id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- =====================================================
-- UPDATE RLS POLICIES FOR BUSINESSES
-- Remove organization membership checks - use owner_user_id only
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view accessible businesses" ON businesses;
DROP POLICY IF EXISTS "Users can create businesses" ON businesses;
DROP POLICY IF EXISTS "Users can update businesses" ON businesses;

-- Users can view their own businesses
CREATE POLICY "Users can view own businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Users can create businesses (owned by them)
CREATE POLICY "Users can create own businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Users can update their own businesses
CREATE POLICY "Users can update own businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Users can delete (soft delete) their own businesses
CREATE POLICY "Users can delete own businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- =====================================================
-- UPDATE PROPERTIES RLS POLICIES
-- Access through business ownership only
-- =====================================================

-- Drop old property policies
DROP POLICY IF EXISTS "Users can view accessible properties" ON properties;
DROP POLICY IF EXISTS "Users can create properties" ON properties;
DROP POLICY IF EXISTS "Users can update properties" ON properties;

-- Users can view properties in their businesses
CREATE POLICY "Users can view properties via business"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can create properties in their businesses
CREATE POLICY "Users can create properties via business"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can update properties in their businesses
CREATE POLICY "Users can update properties via business"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can delete properties in their businesses
CREATE POLICY "Users can delete properties via business"
  ON properties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE UNITS RLS POLICIES
-- Access through property -> business chain
-- =====================================================

-- Drop existing unit policies
DROP POLICY IF EXISTS "Users can view organization units" ON units;
DROP POLICY IF EXISTS "Users can view units" ON units;
DROP POLICY IF EXISTS "Users can create units" ON units;
DROP POLICY IF EXISTS "Users can update units" ON units;
DROP POLICY IF EXISTS "Users can delete units" ON units;

-- Users can view units through business ownership
CREATE POLICY "Users can view units via business"
  ON units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can create units in their properties
CREATE POLICY "Users can create units via business"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can update units
CREATE POLICY "Users can update units via business"
  ON units FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can delete units
CREATE POLICY "Users can delete units via business"
  ON units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE TENANTS RLS POLICIES
-- Access through unit -> property -> business chain
-- =====================================================

-- Drop existing tenant policies
DROP POLICY IF EXISTS "Users can view organization tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update tenants" ON tenants;
DROP POLICY IF EXISTS "Users can delete tenants" ON tenants;

-- Users can view tenants through business ownership
CREATE POLICY "Users can view tenants via business"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN businesses b ON b.id = p.business_id
      WHERE u.id = tenants.unit_id
      AND b.owner_user_id = auth.uid()
    )
    OR tenants.user_id = auth.uid()  -- Tenants can see their own record
  );

-- Users can create tenants
CREATE POLICY "Users can create tenants via business"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN businesses b ON b.id = p.business_id
      WHERE u.id = tenants.unit_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can update tenants
CREATE POLICY "Users can update tenants via business"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN businesses b ON b.id = p.business_id
      WHERE u.id = tenants.unit_id
      AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN businesses b ON b.id = p.business_id
      WHERE u.id = tenants.unit_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Users can delete tenants
CREATE POLICY "Users can delete tenants via business"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN businesses b ON b.id = p.business_id
      WHERE u.id = tenants.unit_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE CHECK_BUSINESS_LIMIT TO NOT REQUIRE ORG
-- =====================================================

CREATE OR REPLACE FUNCTION check_business_limit_for_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_max_allowed integer;
  v_tier_slug text;
BEGIN
  -- Get current business count for user
  SELECT COUNT(*) INTO v_current_count
  FROM businesses
  WHERE owner_user_id = p_user_id AND is_active = true;

  -- Get user's tier from their profile
  SELECT selected_tier INTO v_tier_slug
  FROM user_profiles
  WHERE user_id = p_user_id;

  -- Get max businesses from package tier
  SELECT COALESCE(pt.max_businesses, 1) INTO v_max_allowed
  FROM package_tiers pt
  WHERE pt.slug = COALESCE(v_tier_slug, 'free');

  -- Default to 1 if no tier found
  IF v_max_allowed IS NULL THEN
    v_max_allowed := 1;
  END IF;

  -- Return true if under limit (can add more)
  RETURN v_current_count < v_max_allowed;
END;
$$;

-- =====================================================
-- UPDATE CHECK_PROPERTY_LIMIT TO USE USER
-- =====================================================

CREATE OR REPLACE FUNCTION check_property_limit_for_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_max_allowed integer;
  v_tier_slug text;
BEGIN
  -- Get current property count for user's businesses
  SELECT COUNT(*) INTO v_current_count
  FROM properties p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.owner_user_id = p_user_id AND p.is_active = true;

  -- Get user's tier from their profile
  SELECT selected_tier INTO v_tier_slug
  FROM user_profiles
  WHERE user_id = p_user_id;

  -- Get max properties from package tier
  SELECT COALESCE(pt.max_properties, 5) INTO v_max_allowed
  FROM package_tiers pt
  WHERE pt.slug = COALESCE(v_tier_slug, 'free');

  -- Default to 5 if no tier found
  IF v_max_allowed IS NULL THEN
    v_max_allowed := 5;
  END IF;

  RETURN v_current_count < v_max_allowed;
END;
$$;

-- =====================================================
-- SUPER ADMIN ACCESS (keep existing)
-- =====================================================

-- Super admins should be able to see everything - add policies for them
DO $$
BEGIN
  -- Add super admin select policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can view all businesses' AND tablename = 'businesses') THEN
    CREATE POLICY "Super admins can view all businesses"
      ON businesses FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can view all properties' AND tablename = 'properties') THEN
    CREATE POLICY "Super admins can view all properties"
      ON properties FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true)
      );
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_user_default_business(uuid) IS 'Gets the users default business - queries by owner_user_id only (no organization)';
COMMENT ON FUNCTION get_user_businesses(uuid) IS 'Gets all businesses owned by the user (no organization dependency)';
COMMENT ON FUNCTION check_business_limit_for_user(uuid) IS 'Checks if user can create more businesses based on their tier';
COMMENT ON FUNCTION check_property_limit_for_user(uuid) IS 'Checks if user can create more properties based on their tier';
