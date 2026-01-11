-- Migration: Create Listings and Tenant Prospects System
-- This creates a public-facing rental marketplace with listings at business/property/unit levels

-- =====================================================
-- 1. TENANT PROSPECTS TABLE
-- =====================================================
-- People who register interest in renting (not yet tenants)
CREATE TABLE IF NOT EXISTS tenant_prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,

  -- Current Living Situation
  current_address TEXT,
  current_city VARCHAR(100),
  current_state_province VARCHAR(100),
  current_postal_code VARCHAR(20),
  current_country VARCHAR(2) DEFAULT 'CA',
  move_in_date DATE,

  -- Employment & Financial
  employer_name VARCHAR(255),
  job_title VARCHAR(255),
  employment_status VARCHAR(50), -- employed, self_employed, student, retired, etc.
  monthly_income_cents BIGINT,
  additional_income_cents BIGINT,

  -- References
  tenant_references JSONB DEFAULT '[]'::jsonb, -- Array of reference objects
  emergency_contact JSONB,

  -- Screening
  credit_score INTEGER,
  background_check_status VARCHAR(50), -- pending, approved, rejected
  background_check_date TIMESTAMP WITH TIME ZONE,

  -- Preferences
  preferred_move_in_date DATE,
  preferred_lease_term INTEGER, -- months
  has_pets BOOLEAN DEFAULT false,
  pet_details TEXT,
  number_of_occupants INTEGER,
  smoking BOOLEAN DEFAULT false,

  -- Profile Status
  profile_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tenant_prospects
CREATE INDEX idx_tenant_prospects_user_id ON tenant_prospects(user_id);
CREATE INDEX idx_tenant_prospects_email ON tenant_prospects(email);
CREATE INDEX idx_tenant_prospects_is_active ON tenant_prospects(is_active);

-- =====================================================
-- 2. LISTINGS TABLE
-- =====================================================
-- Public advertisements for available units
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE, -- nullable for property-level listings

  -- Listing Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, rented
  listing_type VARCHAR(50) DEFAULT 'unit', -- unit, property, business

  -- Availability
  available_date DATE,
  lease_term_months INTEGER,
  lease_type VARCHAR(50), -- fixed, month_to_month, both

  -- Pricing
  monthly_rent_cents BIGINT NOT NULL,
  deposit_cents BIGINT,
  pet_deposit_cents BIGINT,
  application_fee_cents BIGINT DEFAULT 0,

  -- Utilities & Fees
  utilities_included JSONB DEFAULT '[]'::jsonb, -- ['water', 'heat', 'electricity', etc.]
  additional_fees JSONB DEFAULT '[]'::jsonb,

  -- Property Features (can override unit/property defaults)
  bedrooms DECIMAL(3,1),
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  furnished BOOLEAN DEFAULT false,
  parking_spaces INTEGER DEFAULT 0,

  -- Amenities & Features
  amenities JSONB DEFAULT '[]'::jsonb, -- ['pool', 'gym', 'laundry', etc.]
  appliances JSONB DEFAULT '[]'::jsonb,

  -- Pet Policy
  pets_allowed BOOLEAN DEFAULT false,
  pet_policy TEXT,

  -- Media
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
  virtual_tour_url TEXT,
  video_url TEXT,

  -- SEO & Marketing
  slug VARCHAR(255) UNIQUE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  featured BOOLEAN DEFAULT false,

  -- Statistics
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,

  -- Publishing
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_listing_type CHECK (listing_type IN ('unit', 'property', 'business'))
);

-- Indexes for listings
CREATE INDEX idx_listings_business_id ON listings(business_id);
CREATE INDEX idx_listings_property_id ON listings(property_id);
CREATE INDEX idx_listings_unit_id ON listings(unit_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_slug ON listings(slug);
CREATE INDEX idx_listings_available_date ON listings(available_date);
CREATE INDEX idx_listings_featured ON listings(featured) WHERE featured = true;

-- =====================================================
-- 3. UPDATE RENTAL APPLICATIONS TABLE
-- =====================================================
-- Add support for generic vs unit-specific applications
ALTER TABLE rental_applications
ADD COLUMN IF NOT EXISTS application_type VARCHAR(50) DEFAULT 'unit_specific',
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES tenant_prospects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_generic BOOLEAN DEFAULT false,
ADD CONSTRAINT valid_application_type CHECK (application_type IN ('generic', 'unit_specific'));

-- Index for applications
CREATE INDEX IF NOT EXISTS idx_rental_applications_listing_id ON rental_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_prospect_id ON rental_applications(prospect_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_type ON rental_applications(application_type);

-- =====================================================
-- 4. ADD PUBLIC PAGE SETTINGS TO BUSINESSES
-- =====================================================
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_page_slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS public_page_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_page_description TEXT,
ADD COLUMN IF NOT EXISTS public_page_logo_url TEXT,
ADD COLUMN IF NOT EXISTS public_page_header_image_url TEXT,
ADD COLUMN IF NOT EXISTS public_page_custom_css TEXT,
ADD COLUMN IF NOT EXISTS public_page_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_page_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS public_page_show_properties VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS public_page_custom_content JSONB DEFAULT '{}'::jsonb;

-- Index for business public page
CREATE INDEX IF NOT EXISTS idx_businesses_public_slug ON businesses(public_page_slug) WHERE public_page_enabled = true;

-- =====================================================
-- 5. ADD PUBLIC PAGE SETTINGS TO PROPERTIES
-- =====================================================
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_page_slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_page_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_page_description TEXT,
ADD COLUMN IF NOT EXISTS public_page_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS public_page_show_units VARCHAR(50) DEFAULT 'vacant_only',
ADD COLUMN IF NOT EXISTS public_page_custom_content JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS public_page_amenities JSONB DEFAULT '[]'::jsonb;

-- Unique constraint for property slug within business
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_public_slug_business
ON properties(business_id, public_page_slug)
WHERE public_page_enabled = true;

-- =====================================================
-- 6. ADD PUBLIC PAGE SETTINGS TO UNITS
-- =====================================================
ALTER TABLE units
ADD COLUMN IF NOT EXISTS public_listing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_listing_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_listing_description TEXT,
ADD COLUMN IF NOT EXISTS public_listing_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS public_listing_available_date DATE,
ADD COLUMN IF NOT EXISTS public_listing_custom_rent_cents BIGINT;

-- =====================================================
-- 7. CREATE LISTING VIEWS TABLE (Analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS listing_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES tenant_prospects(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_listing_views_listing_id ON listing_views(listing_id);
CREATE INDEX idx_listing_views_prospect_id ON listing_views(prospect_id);
CREATE INDEX idx_listing_views_viewed_at ON listing_views(viewed_at);

-- =====================================================
-- 8. CREATE SAVED LISTINGS TABLE
-- =====================================================
-- Allow prospects to save/favorite listings
CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES tenant_prospects(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(prospect_id, listing_id)
);

CREATE INDEX idx_saved_listings_prospect_id ON saved_listings(prospect_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Tenant Prospects: Users can only see/edit their own prospect profile
ALTER TABLE tenant_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_prospects_select_own ON tenant_prospects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tenant_prospects_insert_own ON tenant_prospects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tenant_prospects_update_own ON tenant_prospects
  FOR UPDATE USING (auth.uid() = user_id);

-- Listings: Public read for active listings, owners can manage
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY listings_public_select ON listings
  FOR SELECT USING (status = 'active' OR EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = listings.business_id AND b.owner_user_id = auth.uid()
  ));

CREATE POLICY listings_owner_all ON listings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = listings.business_id AND b.owner_user_id = auth.uid()
  ));

-- Listing Views: Anyone can insert, owners can view analytics
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY listing_views_insert_public ON listing_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY listing_views_select_owner ON listing_views
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM listings l
    JOIN businesses b ON b.id = l.business_id
    WHERE l.id = listing_views.listing_id AND b.owner_user_id = auth.uid()
  ));

-- Saved Listings: Users can only see/manage their own saved listings
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_listings_own ON saved_listings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM tenant_prospects tp WHERE tp.id = saved_listings.prospect_id AND tp.user_id = auth.uid()
  ));

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to auto-create listing from unit
CREATE OR REPLACE FUNCTION create_listing_from_unit(
  p_unit_id UUID,
  p_title VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing_id UUID;
  v_unit RECORD;
  v_property RECORD;
  v_slug VARCHAR;
BEGIN
  -- Get unit and property details
  SELECT u.*, p.business_id, p.name as property_name, p.address, p.city
  INTO v_unit
  FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Generate slug
  v_slug := LOWER(REGEXP_REPLACE(
    COALESCE(p_title, v_unit.property_name || ' ' || v_unit.unit_number),
    '[^a-zA-Z0-9]+', '-', 'g'
  )) || '-' || SUBSTRING(p_unit_id::text, 1, 8);

  -- Create listing
  INSERT INTO listings (
    business_id,
    property_id,
    unit_id,
    title,
    description,
    status,
    listing_type,
    monthly_rent_cents,
    bedrooms,
    bathrooms,
    square_feet,
    slug
  ) VALUES (
    v_unit.business_id,
    v_unit.property_id,
    p_unit_id,
    COALESCE(p_title, v_unit.property_name || ' - Unit ' || v_unit.unit_number),
    p_description,
    'draft',
    'unit',
    v_unit.monthly_rent_cents,
    v_unit.bedrooms,
    v_unit.bathrooms,
    v_unit.square_feet,
    v_slug
  )
  RETURNING id INTO v_listing_id;

  RETURN v_listing_id;
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
