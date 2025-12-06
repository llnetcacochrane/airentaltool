/*
  # Business-Centric Architecture Migration
  Version: 4.3.0-beta

  ## Overview
  This migration restructures the application from a Portfolio-centric to a Business-centric model:

  1. Business is the PRIMARY CONTAINER for properties
  2. Every property belongs to a Business
  3. Every user must have at least one Business
  4. Portfolios are DEPRECATED and removed

  ## Business Model
  - Landlords (FREE tier): 1 Business only
  - Landlords (BASIC+ tiers): Multiple Businesses (for separate LLCs, partnerships)
  - Property Managers: Own management company Business + manage client Businesses

  ## Hierarchy
  User Account -> Organization -> Business(es) -> Property(ies) -> Unit(s) -> Tenant(s)

  ## Changes
  1. Update properties to use business_id (ensure column exists)
  2. Create auto-business trigger on user registration
  3. Update RPC functions to work with businesses
  4. Deprecate portfolio-related functions
  5. Create business limit checking functions
*/

-- =====================================================
-- ENSURE BUSINESS_ID EXISTS ON PROPERTIES
-- =====================================================

-- Properties table should already have business_id from earlier migrations
-- but let's ensure it exists and has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE properties ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS properties_business_id_idx ON properties(business_id);
  END IF;
END $$;

-- =====================================================
-- ADD USER_ID TO BUSINESSES FOR DIRECT OWNERSHIP
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'owner_user_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS businesses_owner_user_id_idx ON businesses(owner_user_id);
    COMMENT ON COLUMN businesses.owner_user_id IS 'Direct owner of this business (for landlords and PM company)';
  END IF;
END $$;

-- Add is_default column to businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_default boolean DEFAULT false;
    COMMENT ON COLUMN businesses.is_default IS 'True for the users primary/first business';
  END IF;
END $$;

-- =====================================================
-- AUTO-CREATE BUSINESS ON USER REGISTRATION
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_business_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_name text;
  v_org_id uuid;
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

  -- Find or create organization for the user
  SELECT o.id INTO v_org_id
  FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = NEW.user_id
  LIMIT 1;

  -- Only create business if user has an organization
  -- (Organization will be created separately during registration flow)
  IF v_org_id IS NOT NULL THEN
    BEGIN
      INSERT INTO businesses (
        organization_id,
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
        v_org_id,
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
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old portfolio trigger if exists
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON user_profiles;
DROP TRIGGER IF EXISTS update_portfolio_name_trigger ON user_profiles;

-- Create new business trigger
DROP TRIGGER IF EXISTS create_default_business_trigger ON user_profiles;
CREATE TRIGGER create_default_business_trigger
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_business_for_user();

-- =====================================================
-- GET USER DEFAULT BUSINESS
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

  -- If still null, try via organization membership
  IF v_business_id IS NULL THEN
    SELECT b.id INTO v_business_id
    FROM businesses b
    JOIN organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = p_user_id
      AND b.is_active = true
    ORDER BY b.is_default DESC, b.created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_business_id;
END;
$$;

-- =====================================================
-- GET ALL USER BUSINESSES
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
    (b.owner_user_id = p_user_id) as is_owned,
    (SELECT COUNT(*) FROM properties p WHERE p.business_id = b.id AND p.is_active = true) as property_count,
    b.created_at
  FROM businesses b
  LEFT JOIN organization_members om ON om.organization_id = b.organization_id
  WHERE b.is_active = true
    AND (
      b.owner_user_id = p_user_id
      OR om.user_id = p_user_id
    )
  ORDER BY (b.owner_user_id = p_user_id) DESC, b.is_default DESC, b.created_at ASC;
END;
$$;

-- =====================================================
-- CHECK BUSINESS LIMITS
-- =====================================================

CREATE OR REPLACE FUNCTION check_business_limit(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_max_allowed integer;
BEGIN
  -- Get current business count
  SELECT COUNT(*) INTO v_current_count
  FROM businesses
  WHERE organization_id = p_org_id AND is_active = true;

  -- Get max allowed from package settings
  SELECT COALESCE(ops.max_businesses, pt.max_businesses, 1) INTO v_max_allowed
  FROM organizations o
  LEFT JOIN organization_package_settings ops ON ops.organization_id = o.id
  LEFT JOIN package_tiers pt ON pt.slug = o.account_tier
  WHERE o.id = p_org_id;

  -- Return true if under limit (can add more)
  RETURN v_current_count < COALESCE(v_max_allowed, 1);
END;
$$;

-- =====================================================
-- CHECK PROPERTY LIMITS
-- =====================================================

CREATE OR REPLACE FUNCTION check_property_limit(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_max_allowed integer;
BEGIN
  -- Get current property count across all businesses
  SELECT COUNT(*) INTO v_current_count
  FROM properties p
  JOIN businesses b ON b.id = p.business_id
  WHERE b.organization_id = p_org_id AND p.is_active = true;

  -- Get max allowed from package settings
  SELECT COALESCE(ops.max_properties, pt.max_properties, 5) INTO v_max_allowed
  FROM organizations o
  LEFT JOIN organization_package_settings ops ON ops.organization_id = o.id
  LEFT JOIN package_tiers pt ON pt.slug = o.account_tier
  WHERE o.id = p_org_id;

  RETURN v_current_count < COALESCE(v_max_allowed, 5);
END;
$$;

-- =====================================================
-- ENSURE BUSINESS ON PROPERTY CREATE
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_property_has_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    RAISE EXCEPTION 'Property must belong to a business (business_id cannot be null)';
  END IF;

  -- Set organization_id from business if not provided
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM businesses
    WHERE id = NEW.business_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_property_business_trigger ON properties;
CREATE TRIGGER ensure_property_business_trigger
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION ensure_property_has_business();

-- =====================================================
-- RLS POLICIES FOR BUSINESSES
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view organization businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view own businesses" ON businesses;
DROP POLICY IF EXISTS "Users can create businesses in org" ON businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON businesses;

-- Users can view businesses they own or are members of the organization
CREATE POLICY "Users can view accessible businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = businesses.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

-- Users can create businesses in their organizations
CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = businesses.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- Users can update their own businesses or org businesses if admin
CREATE POLICY "Users can update businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = businesses.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = businesses.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- =====================================================
-- UPDATE PROPERTIES RLS TO USE BUSINESS
-- =====================================================

-- Drop old property policies
DROP POLICY IF EXISTS "Users can view organization properties" ON properties;
DROP POLICY IF EXISTS "Users can create properties in org" ON properties;
DROP POLICY IF EXISTS "Users can update organization properties" ON properties;
DROP POLICY IF EXISTS "Users can delete organization properties" ON properties;

-- Users can view properties through business access
CREATE POLICY "Users can view accessible properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND (
        b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
        )
      )
    )
  );

-- Users can create properties in businesses they can access
CREATE POLICY "Users can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND (
        b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'property_manager')
          AND om.is_active = true
        )
      )
    )
  );

-- Users can update properties
CREATE POLICY "Users can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND (
        b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'property_manager')
          AND om.is_active = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND (
        b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'property_manager')
          AND om.is_active = true
        )
      )
    )
  );

-- =====================================================
-- MIGRATE EXISTING DATA FROM PORTFOLIO TO BUSINESS
-- =====================================================

-- Create businesses from portfolios if they dont exist
DO $$
DECLARE
  v_portfolio record;
  v_org_id uuid;
  v_new_business_id uuid;
BEGIN
  FOR v_portfolio IN
    SELECT p.*, up.first_name, up.last_name, up.phone, up.address_line1, up.city, up.state_province, up.postal_code, up.country
    FROM portfolios p
    LEFT JOIN user_profiles up ON up.user_id = p.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM businesses b WHERE b.owner_user_id = p.user_id AND b.business_name = p.name
    )
  LOOP
    -- Get or create organization
    SELECT o.id INTO v_org_id
    FROM organizations o
    JOIN organization_members om ON om.organization_id = o.id
    WHERE om.user_id = v_portfolio.user_id
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      -- Create business from portfolio
      INSERT INTO businesses (
        organization_id,
        owner_user_id,
        business_name,
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
        v_org_id,
        v_portfolio.user_id,
        v_portfolio.name,
        v_portfolio.phone,
        v_portfolio.address_line1,
        v_portfolio.city,
        v_portfolio.state_province,
        v_portfolio.postal_code,
        COALESCE(v_portfolio.country, 'CA'),
        'CAD',
        'America/Toronto',
        true,
        v_portfolio.is_default,
        v_portfolio.user_id
      ) RETURNING id INTO v_new_business_id;

      -- Update properties to point to new business
      UPDATE properties
      SET business_id = v_new_business_id
      WHERE portfolio_id = v_portfolio.id AND business_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_user_default_business(uuid) IS 'Gets the users default/primary business ID';
COMMENT ON FUNCTION get_user_businesses(uuid) IS 'Gets all businesses accessible to the user';
COMMENT ON FUNCTION check_business_limit(uuid) IS 'Checks if organization can create more businesses';
COMMENT ON FUNCTION check_property_limit(uuid) IS 'Checks if organization can create more properties';
COMMENT ON FUNCTION create_default_business_for_user() IS 'Auto-creates a default business when user profile is created/updated';
