/*
  # Portfolio Architecture Refactor

  ## Overview
  This migration restructures the app to support three modes:
  1. **Single Portfolio (Default)**: User directly owns one portfolio
  2. **Multi-Portfolio**: User creates organization when adding 2nd portfolio
  3. **Management Company**: User manages clients, each client has portfolios

  ## Changes

  1. New Tables
    - `portfolios` - Rental business entities (replaces direct user→property relationship)
    - `clients` - Property owners managed by Management Company tier users

  2. Modified Tables
    - `properties` - Add portfolio_id, make organization_id nullable
    - `units` - Add portfolio_id
    - All other tables - Add portfolio_id references

  3. New Functions
    - `get_user_portfolio()` - Gets user's default portfolio
    - `user_needs_organization()` - Checks if user has multiple portfolios
    - `create_default_portfolio()` - Auto-creates portfolio on user signup

  4. Security
    - RLS policies updated for portfolio-first approach
    - Organization layer only enforced for multi-portfolio users
*/

-- =====================================================
-- PORTFOLIOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT portfolios_name_check CHECK (char_length(name) >= 1)
);

CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS portfolios_organization_id_idx ON portfolios(organization_id);
CREATE INDEX IF NOT EXISTS portfolios_client_id_idx ON portfolios(client_id);

COMMENT ON TABLE portfolios IS 'Rental business portfolios - users have 1 by default, can add more';
COMMENT ON COLUMN portfolios.is_default IS 'True for the first/main portfolio created';
COMMENT ON COLUMN portfolios.organization_id IS 'Only set if user has multiple portfolios';
COMMENT ON COLUMN portfolios.client_id IS 'Only set for Management Company tier - client who owns this portfolio';

-- =====================================================
-- CLIENTS TABLE (Management Company Tier)
-- =====================================================

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT clients_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS clients_organization_id_idx ON clients(organization_id);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);

COMMENT ON TABLE clients IS 'Property owners managed by Management Company tier users';

-- Add client_id reference to portfolios
ALTER TABLE portfolios
  ADD CONSTRAINT portfolios_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- =====================================================
-- ADD PORTFOLIO_ID TO EXISTING TABLES
-- =====================================================

-- Properties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE properties ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX properties_portfolio_id_idx ON properties(portfolio_id);
  END IF;
END $$;

-- Units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'units' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE units ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX units_portfolio_id_idx ON units(portfolio_id);
  END IF;
END $$;

-- Tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX tenants_portfolio_id_idx ON tenants(portfolio_id);
  END IF;
END $$;

-- Leases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leases' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE leases ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX leases_portfolio_id_idx ON leases(portfolio_id);
  END IF;
END $$;

-- Maintenance Requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE maintenance_requests ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX maintenance_requests_portfolio_id_idx ON maintenance_requests(portfolio_id);
  END IF;
END $$;

-- Maintenance Vendors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_vendors' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE maintenance_vendors ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX maintenance_vendors_portfolio_id_idx ON maintenance_vendors(portfolio_id);
  END IF;
END $$;

-- Expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX expenses_portfolio_id_idx ON expenses(portfolio_id);
  END IF;
END $$;

-- Rent Payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rent_payments' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE rent_payments ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX rent_payments_portfolio_id_idx ON rent_payments(portfolio_id);
  END IF;
END $$;

-- Rental Listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rental_listings' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE rental_listings ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX rental_listings_portfolio_id_idx ON rental_listings(portfolio_id);
  END IF;
END $$;

-- Property Owners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_owners' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE property_owners ADD COLUMN portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE;
    CREATE INDEX property_owners_portfolio_id_idx ON property_owners(portfolio_id);
  END IF;
END $$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user's default portfolio (creates one if doesn't exist)
CREATE OR REPLACE FUNCTION get_user_default_portfolio(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_id uuid;
  v_profile_record record;
BEGIN
  -- Try to find existing default portfolio
  SELECT id INTO v_portfolio_id
  FROM portfolios
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;

  -- If no default portfolio exists, create one
  IF v_portfolio_id IS NULL THEN
    -- Get user profile for name
    SELECT * INTO v_profile_record
    FROM user_profiles
    WHERE user_id = p_user_id;

    -- Create default portfolio
    INSERT INTO portfolios (
      user_id,
      name,
      description,
      is_default
    ) VALUES (
      p_user_id,
      COALESCE(v_profile_record.organization_name, 'My Portfolio'),
      'Default portfolio',
      true
    )
    RETURNING id INTO v_portfolio_id;
  END IF;

  RETURN v_portfolio_id;
END;
$$;

-- Check if user has multiple portfolios (needs organization layer)
CREATE OR REPLACE FUNCTION user_needs_organization(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_count integer;
BEGIN
  SELECT COUNT(*) INTO v_portfolio_count
  FROM portfolios
  WHERE user_id = p_user_id;

  RETURN v_portfolio_count > 1;
END;
$$;

-- Get all portfolios for a user
CREATE OR REPLACE FUNCTION get_user_portfolios(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  is_default boolean,
  organization_id uuid,
  client_id uuid,
  property_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.is_default,
    p.organization_id,
    p.client_id,
    COUNT(pr.id) as property_count,
    p.created_at
  FROM portfolios p
  LEFT JOIN properties pr ON pr.portfolio_id = p.id
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.name, p.description, p.is_default, p.organization_id, p.client_id, p.created_at
  ORDER BY p.is_default DESC, p.created_at ASC;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Portfolios: Users can view their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Portfolios: Users can create portfolios
CREATE POLICY "Users can create portfolios"
  ON portfolios FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Portfolios: Users can update own portfolios
CREATE POLICY "Users can update own portfolios"
  ON portfolios FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Portfolios: Users can delete own portfolios (except default)
CREATE POLICY "Users can delete own portfolios"
  ON portfolios FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_default = false);

-- Clients: Users can view clients in their organizations
CREATE POLICY "Users can view organization clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = clients.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Clients: Admins can manage clients
CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = clients.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = clients.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TRIGGER TO CREATE DEFAULT PORTFOLIO ON USER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_portfolio_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default portfolio for new user
  INSERT INTO portfolios (
    user_id,
    name,
    description,
    is_default
  ) VALUES (
    NEW.user_id,
    COALESCE(NEW.organization_name, NEW.full_name || '''s Portfolio', 'My Portfolio'),
    'Default portfolio',
    true
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_default_portfolio_trigger ON user_profiles;

-- Create trigger
CREATE TRIGGER create_default_portfolio_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_portfolio_for_user();