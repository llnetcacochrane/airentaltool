/*
  # Property Owner System

  ## Overview
  This migration adds support for property owners who can be assigned to properties.
  Property owners have read-only access to analytics and data for their properties only.
  This enables property managers to manage properties on behalf of clients.

  ## New Features
  1. **Property Owners Table**
     - Links auth users to properties they own
     - Stores owner contact and profile information
     - Supports multiple owners per property
     - Supports multiple properties per owner

  2. **Property Ownership Junction Table**
     - Many-to-many relationship between properties and owners
     - Ownership percentage tracking
     - Active/inactive status per ownership

  3. **Access Control**
     - Property owners get read-only access to their properties
     - Can view: properties, units, tenants, rent_payments, expenses, maintenance
     - Cannot modify anything
     - Isolated to only their properties

  4. **New User Role**
     - Property owners are organization members with 'property_owner' role
     - Property owners have limited read-only access

  ## Tables Created
  - `property_owners`: Owner profile information
  - `property_ownerships`: Junction table linking owners to properties

  ## Security
  - Row Level Security enabled on all new tables
  - Property owners can only see their assigned properties
  - Property managers can manage owner assignments
  - Read-only access for property owners enforced via RLS
*/

-- =====================================================
-- STEP 1: Create Property Owners Table
-- =====================================================

CREATE TABLE IF NOT EXISTS property_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to auth user (property owner gets login credentials)
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Owner profile information
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  -- Business information (if owner is a company)
  company_name text,
  tax_id text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'CA',
  
  -- Communication preferences
  preferred_contact_method text DEFAULT 'email',
  notification_preferences jsonb DEFAULT '{"monthly_reports": true, "maintenance_alerts": true, "payment_updates": true}',
  
  -- Metadata
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_owners_user_id ON property_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_email ON property_owners(email);
CREATE INDEX IF NOT EXISTS idx_property_owners_active ON property_owners(is_active) WHERE is_active = true;

COMMENT ON TABLE property_owners IS 'Property owners who have read-only access to their properties';
COMMENT ON COLUMN property_owners.user_id IS 'Auth user account for property owner login';
COMMENT ON COLUMN property_owners.notification_preferences IS 'Owner preferences for receiving reports and alerts';

-- =====================================================
-- STEP 2: Create Property Ownerships Junction Table
-- =====================================================

CREATE TABLE IF NOT EXISTS property_ownerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES property_owners(id) ON DELETE CASCADE,
  
  -- Get organization from property for access control
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Ownership details
  ownership_percentage numeric(5,2) DEFAULT 100.00 CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(property_id, owner_id),
  CONSTRAINT valid_ownership_dates CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_property_ownerships_property ON property_ownerships(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownerships_owner ON property_ownerships(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_ownerships_org ON property_ownerships(organization_id);
CREATE INDEX IF NOT EXISTS idx_property_ownerships_active ON property_ownerships(is_active, property_id) WHERE is_active = true;

COMMENT ON TABLE property_ownerships IS 'Many-to-many relationship between properties and their owners';
COMMENT ON COLUMN property_ownerships.ownership_percentage IS 'Percentage of property owned (for reporting purposes)';

-- =====================================================
-- STEP 3: Helper Functions
-- =====================================================

-- Check if user is a property owner for a specific property
CREATE OR REPLACE FUNCTION is_property_owner(property_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM property_ownerships po
    JOIN property_owners own ON own.id = po.owner_id
    WHERE po.property_id = property_uuid
      AND own.user_id = auth.uid()
      AND po.is_active = true
      AND own.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_property_owner IS 'Check if current user is an owner of the given property';

-- Get all properties owned by current user
CREATE OR REPLACE FUNCTION get_owned_properties()
RETURNS TABLE (property_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT po.property_id
  FROM property_ownerships po
  JOIN property_owners own ON own.id = po.owner_id
  WHERE own.user_id = auth.uid()
    AND po.is_active = true
    AND own.is_active = true;
END;
$$;

COMMENT ON FUNCTION get_owned_properties IS 'Get all property IDs owned by current user';

-- Check if user is property owner for organization
CREATE OR REPLACE FUNCTION is_property_owner_for_org(org_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM property_ownerships po
    JOIN property_owners own ON own.id = po.owner_id
    WHERE po.organization_id = org_uuid
      AND own.user_id = auth.uid()
      AND po.is_active = true
      AND own.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_property_owner_for_org IS 'Check if current user owns any properties in the given organization';

-- =====================================================
-- STEP 4: Row Level Security Policies
-- =====================================================

ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ownerships ENABLE ROW LEVEL SECURITY;

-- Property Owners: Property managers can manage, owners can view themselves
CREATE POLICY "Property managers can view property owners"
  ON property_owners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR user_id = auth.uid()
    OR is_super_admin()
  );

CREATE POLICY "Property managers can create property owners"
  ON property_owners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  );

CREATE POLICY "Property managers can update property owners"
  ON property_owners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  );

-- Property Ownerships: Org members can manage
CREATE POLICY "Org members can view property ownerships"
  ON property_ownerships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM property_owners own
      WHERE own.id = property_ownerships.owner_id
        AND own.user_id = auth.uid()
    )
    OR is_super_admin()
  );

CREATE POLICY "Property managers can create ownerships"
  ON property_ownerships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  );

CREATE POLICY "Property managers can update ownerships"
  ON property_ownerships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  );

CREATE POLICY "Property managers can delete ownerships"
  ON property_ownerships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR is_super_admin()
  );

-- =====================================================
-- STEP 5: Extend Existing RLS Policies for Property Owners
-- =====================================================

-- Properties: Add read access for property owners
CREATE POLICY "Property owners can view their properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    is_property_owner(id)
  );

-- Units: Property owners can view units in their properties
CREATE POLICY "Property owners can view units in their properties"
  ON units FOR SELECT
  TO authenticated
  USING (
    property_id IN (SELECT property_id FROM get_owned_properties())
  );

-- Tenants: Property owners can view tenants in their properties
CREATE POLICY "Property owners can view tenants in their properties"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      WHERE u.id = tenants.unit_id
        AND u.property_id IN (SELECT property_id FROM get_owned_properties())
    )
  );

-- Leases: Property owners can view leases for their properties
CREATE POLICY "Property owners can view leases in their properties"
  ON leases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      WHERE u.id = leases.unit_id
        AND u.property_id IN (SELECT property_id FROM get_owned_properties())
    )
  );

-- Rent Payments: Property owners can view rent payments for their properties
CREATE POLICY "Property owners can view rent payments for their properties"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN units u ON u.id = l.unit_id
      WHERE l.id = rent_payments.lease_id
        AND u.property_id IN (SELECT property_id FROM get_owned_properties())
    )
  );

-- Expenses: Property owners can view expenses for their properties
CREATE POLICY "Property owners can view expenses for their properties"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    property_id IN (SELECT property_id FROM get_owned_properties())
  );

-- Maintenance Requests: Property owners can view maintenance for their properties
CREATE POLICY "Property owners can view maintenance for their properties"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    property_id IN (SELECT property_id FROM get_owned_properties())
  );

-- =====================================================
-- STEP 6: Updated Timestamp Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_property_owner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_owners_timestamp
  BEFORE UPDATE ON property_owners
  FOR EACH ROW
  EXECUTE FUNCTION update_property_owner_updated_at();

CREATE TRIGGER update_property_ownerships_timestamp
  BEFORE UPDATE ON property_ownerships
  FOR EACH ROW
  EXECUTE FUNCTION update_property_owner_updated_at();

-- =====================================================
-- STEP 7: Grant Permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON property_owners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_ownerships TO authenticated;
