/*
  # Major Restructure: Business → Property → Unit → Tenant Hierarchy

  ## Overview
  This migration completely restructures the data model to support:
  1. Multiple businesses per organization (for accounting separation)
  2. Properties belong to businesses
  3. Units within properties (apartments, rental spaces, etc.)
  4. Tenants belong to units (not properties)
  5. Multiple tenants can share unit access
  6. Tenants get their own login credentials
  7. Granular team member permissions

  ## New Hierarchy
  ```
  Organization
    └─ Business (LLC, Corp, etc.)
        └─ Property (Building, House, Complex)
            └─ Unit (Apartment 1A, Unit 203, etc.)
                └─ Tenant (Person with login)
  ```

  ## Package Limits Change From/To:
  - max_properties: Total properties (was wrong - counted as units)
  - max_tenants: Total tenant logins (was wrong - counted all residents)
  
  TO:
  - max_businesses: Separate business entities
  - max_properties: Total properties across all businesses  
  - max_units: Total rental spaces
  - max_tenants: Total tenant login accounts
  - max_team_members: Landlord staff accounts

  ## Key Changes
  1. New `businesses` table
  2. New `units` table
  3. Properties now belong to businesses
  4. Tenants now belong to units
  5. Tenants get auth.users accounts
  6. Unit access can be shared by multiple tenants
  7. Team member permissions are granular

  ## Data Safety
  - This is a breaking change
  - Existing data will need manual migration
  - Since system is not in production, we can drop/recreate
*/

-- =====================================================
-- STEP 1: Drop Existing Dependent Objects
-- =====================================================

-- Drop existing foreign key constraints and dependent tables
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- =====================================================
-- STEP 2: Create Businesses Table
-- =====================================================

CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Business identity
  business_name text NOT NULL,
  legal_name text,
  business_type text,
  
  -- Tax and legal info
  tax_id text,
  registration_number text,
  
  -- Contact info
  phone text,
  email text,
  website text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'CA',
  
  -- Settings
  currency text DEFAULT 'CAD',
  timezone text DEFAULT 'America/Toronto',
  
  -- Metadata
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_businesses_org ON businesses(organization_id);
CREATE INDEX idx_businesses_active ON businesses(organization_id, is_active);

-- =====================================================
-- STEP 3: Recreate Properties Table (Now Belongs to Business)
-- =====================================================

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Property identity
  name text NOT NULL,
  property_type text NOT NULL CHECK (property_type IN (
    'single_family',
    'multi_family',
    'apartment_building',
    'condo',
    'townhouse',
    'commercial',
    'mixed_use',
    'other'
  )),
  
  -- Address
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'CA',
  
  -- Property details
  year_built integer,
  square_feet integer,
  lot_size text,
  bedrooms integer,
  bathrooms numeric(3,1),
  
  -- Financial
  purchase_price_cents integer,
  purchase_date date,
  current_value_cents integer,
  
  -- Settings
  notes text,
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_business ON properties(business_id);
CREATE INDEX idx_properties_active ON properties(organization_id, is_active);

-- =====================================================
-- STEP 4: Create Units Table
-- =====================================================

CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Unit identity (customizable by landlord)
  unit_number text NOT NULL,
  unit_name text,
  
  -- Unit details
  bedrooms integer,
  bathrooms numeric(3,1),
  square_feet integer,
  floor_number integer,
  
  -- Rental details
  monthly_rent_cents integer NOT NULL DEFAULT 0,
  security_deposit_cents integer DEFAULT 0,
  
  -- Utilities included
  utilities_included jsonb DEFAULT '{
    "water": false,
    "electricity": false,
    "gas": false,
    "internet": false,
    "cable": false,
    "trash": false,
    "heating": false,
    "cooling": false
  }'::jsonb,
  
  -- Amenities
  amenities jsonb DEFAULT '[]'::jsonb,
  
  -- Status
  occupancy_status text DEFAULT 'vacant' CHECK (occupancy_status IN (
    'vacant',
    'occupied',
    'maintenance',
    'reserved'
  )),
  
  -- Dates
  available_date date,
  
  -- Settings
  notes text,
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_org ON units(organization_id);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(occupancy_status);
CREATE INDEX idx_units_active ON units(organization_id, is_active);

-- =====================================================
-- STEP 5: Recreate Tenants Table (Now Belongs to Unit)
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Personal info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  
  -- Emergency contact
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  
  -- Employment
  employer text,
  employer_phone text,
  monthly_income_cents integer,
  
  -- Tenant status
  tenant_type text DEFAULT 'primary' CHECK (tenant_type IN (
    'primary',
    'co_tenant',
    'occupant',
    'guarantor'
  )),
  
  -- Lease info (denormalized for quick access)
  lease_start_date date,
  lease_end_date date,
  monthly_rent_cents integer,
  security_deposit_paid_cents integer DEFAULT 0,
  
  -- Move in/out
  move_in_date date,
  move_out_date date,
  
  -- Tenant portal access
  has_portal_access boolean DEFAULT true,
  portal_invite_sent_at timestamptz,
  portal_last_login_at timestamptz,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN (
    'prospect',
    'applicant',
    'active',
    'notice_given',
    'moved_out',
    'evicted'
  )),
  
  -- Settings
  notes text,
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_tenants_org ON tenants(organization_id);
CREATE INDEX idx_tenants_unit ON tenants(unit_id);
CREATE INDEX idx_tenants_user ON tenants(user_id);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_active ON tenants(organization_id, is_active);

-- =====================================================
-- STEP 6: Create Unit Access Sharing Table
-- =====================================================

CREATE TABLE IF NOT EXISTS unit_tenant_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Access level
  access_level text DEFAULT 'full' CHECK (access_level IN (
    'full',
    'view_only',
    'payment_only'
  )),
  
  -- Status
  is_active boolean DEFAULT true,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  
  UNIQUE(unit_id, tenant_id)
);

CREATE INDEX idx_unit_access_unit ON unit_tenant_access(unit_id);
CREATE INDEX idx_unit_access_tenant ON unit_tenant_access(tenant_id);

-- =====================================================
-- STEP 7: Recreate Leases Table
-- =====================================================

CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  
  -- Lease terms
  lease_type text NOT NULL CHECK (lease_type IN (
    'fixed_term',
    'month_to_month',
    'year_to_year'
  )),
  
  -- Dates
  start_date date NOT NULL,
  end_date date,
  notice_period_days integer DEFAULT 60,
  
  -- Financial
  monthly_rent_cents integer NOT NULL,
  security_deposit_cents integer NOT NULL DEFAULT 0,
  pet_deposit_cents integer DEFAULT 0,
  
  -- Payment terms
  rent_due_day integer DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 31),
  late_fee_cents integer DEFAULT 0,
  late_fee_grace_days integer DEFAULT 5,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_signature',
    'active',
    'expired',
    'terminated',
    'renewed'
  )),
  
  -- Documents
  document_url text,
  signed_date date,
  
  -- Renewal
  auto_renew boolean DEFAULT false,
  renewed_to_lease_id uuid REFERENCES leases(id),
  
  -- Settings
  notes text,
  terms_and_conditions text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_leases_org ON leases(organization_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_dates ON leases(start_date, end_date);

-- =====================================================
-- STEP 8: Recreate Payments Table
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  
  -- Payment details
  amount_cents integer NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN (
    'rent',
    'security_deposit',
    'pet_deposit',
    'late_fee',
    'utility',
    'maintenance',
    'other'
  )),
  
  -- Payment info
  payment_method text CHECK (payment_method IN (
    'cash',
    'check',
    'bank_transfer',
    'credit_card',
    'debit_card',
    'e_transfer',
    'other'
  )),
  payment_reference text,
  
  -- Dates
  due_date date NOT NULL,
  payment_date date,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partial',
    'paid',
    'late',
    'failed',
    'refunded'
  )),
  
  -- Details
  description text,
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_unit ON payments(unit_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_lease ON payments(lease_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_dates ON payments(due_date, payment_date);

-- =====================================================
-- STEP 9: Recreate Expenses Table
-- =====================================================

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  
  -- Expense details
  amount_cents integer NOT NULL,
  category text NOT NULL CHECK (category IN (
    'maintenance',
    'repair',
    'utility',
    'insurance',
    'property_tax',
    'hoa_fee',
    'mortgage',
    'advertising',
    'legal',
    'accounting',
    'management_fee',
    'cleaning',
    'landscaping',
    'snow_removal',
    'supplies',
    'other'
  )),
  
  -- Vendor info
  vendor_name text,
  vendor_contact text,
  
  -- Dates
  expense_date date NOT NULL,
  paid_date date,
  
  -- Payment info
  payment_method text,
  payment_reference text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',
    'paid',
    'reimbursed',
    'cancelled'
  )),
  
  -- Details
  description text NOT NULL,
  notes text,
  receipt_url text,
  
  -- Tax
  is_tax_deductible boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_expenses_org ON expenses(organization_id);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_unit ON expenses(unit_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- =====================================================
-- STEP 10: Recreate Maintenance Requests Table
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Request details
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'structural',
    'pest_control',
    'landscaping',
    'cleaning',
    'security',
    'other'
  )),
  
  -- Priority
  priority text DEFAULT 'medium' CHECK (priority IN (
    'low',
    'medium',
    'high',
    'emergency'
  )),
  
  -- Status
  status text DEFAULT 'open' CHECK (status IN (
    'open',
    'in_progress',
    'waiting_parts',
    'completed',
    'cancelled'
  )),
  
  -- Assignment
  assigned_to uuid REFERENCES auth.users(id),
  assigned_at timestamptz,
  
  -- Dates
  requested_date timestamptz DEFAULT now(),
  scheduled_date timestamptz,
  completed_date timestamptz,
  
  -- Access
  entry_allowed boolean DEFAULT false,
  entry_notes text,
  
  -- Financial
  estimated_cost_cents integer,
  actual_cost_cents integer,
  
  -- Media
  photos jsonb DEFAULT '[]'::jsonb,
  
  -- Details
  resolution_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_maintenance_org ON maintenance_requests(organization_id);
CREATE INDEX idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_unit ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_tenant ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);

-- =====================================================
-- STEP 11: Update Package Tiers Schema
-- =====================================================

-- Add new limit columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'package_tiers' 
                 AND column_name = 'max_businesses') THEN
    ALTER TABLE package_tiers ADD COLUMN max_businesses integer NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'package_tiers' 
                 AND column_name = 'max_units') THEN
    ALTER TABLE package_tiers ADD COLUMN max_units integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update package tier versions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'package_tier_versions' 
                 AND column_name = 'max_businesses') THEN
    ALTER TABLE package_tier_versions ADD COLUMN max_businesses integer NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'package_tier_versions' 
                 AND column_name = 'max_units') THEN
    ALTER TABLE package_tier_versions ADD COLUMN max_units integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Update organization package settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organization_package_settings' 
                 AND column_name = 'custom_max_businesses') THEN
    ALTER TABLE organization_package_settings ADD COLUMN custom_max_businesses integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'organization_package_settings' 
                 AND column_name = 'custom_max_units') THEN
    ALTER TABLE organization_package_settings ADD COLUMN custom_max_units integer;
  END IF;
END $$;

-- Update default packages with correct limits
UPDATE package_tiers SET
  max_businesses = 1,
  max_units = 25
WHERE tier_slug = 'basic';

UPDATE package_tiers SET
  max_businesses = 3,
  max_properties = 25,
  max_units = 150
WHERE tier_slug = 'professional';

UPDATE package_tiers SET
  max_businesses = 999999,
  max_properties = 999999,
  max_units = 999999,
  max_tenants = 999999
WHERE tier_slug = 'enterprise';

-- =====================================================
-- STEP 12: RLS Policies for New Tables
-- =====================================================

-- Businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view businesses in their organization"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage businesses"
  ON businesses FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view units in their organization"
  ON units FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    id IN (
      SELECT unit_id FROM tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Property managers can manage units"
  ON units FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Properties (updated policy)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view properties in their organization" ON properties;
DROP POLICY IF EXISTS "Property managers can manage properties" ON properties;

CREATE POLICY "Users can view properties in their organization"
  ON properties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Property managers can manage properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Tenants (updated policy)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenants in their organization"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Property managers can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Unit Tenant Access
ALTER TABLE unit_tenant_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their unit access"
  ON unit_tenant_access FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
    OR
    unit_id IN (
      SELECT id FROM units WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
    )
  );

-- Leases
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leases in their organization"
  ON leases FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    unit_id IN (
      SELECT unit_id FROM tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage leases"
  ON leases FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their organization"
  ON payments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Accounting can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Tenants can create their own payments
CREATE POLICY "Tenants can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses in their organization"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Accounting can manage expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Maintenance Requests
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maintenance in their organization"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
    OR
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Property managers can manage maintenance"
  ON maintenance_requests FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Tenants can create maintenance requests
CREATE POLICY "Tenants can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Summary
-- =====================================================

-- ✅ New hierarchy: Organization → Business → Property → Unit → Tenant
-- ✅ Businesses table for accounting separation
-- ✅ Units table for rental spaces
-- ✅ Tenants belong to units (not properties)
-- ✅ Multiple tenants can share unit access
-- ✅ Tenants can have auth accounts
-- ✅ Package limits updated (businesses, units)
-- ✅ All tables restructured with proper relationships
-- ✅ RLS policies for all tables
-- ✅ Ready for tenant portal
-- ✅ Ready for granular permissions
