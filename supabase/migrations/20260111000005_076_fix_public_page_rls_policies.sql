-- Migration: Fix RLS policies for public page access
-- This allows anonymous (unauthenticated) users to access public listings, properties, and businesses
-- Required for /browse/* and /apply/* routes to work without authentication

-- =====================================================
-- 1. FIX LISTINGS TABLE RLS POLICIES
-- =====================================================
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS listings_public_select ON listings;
DROP POLICY IF EXISTS listings_owner_all ON listings;
DROP POLICY IF EXISTS "Public can view active listings" ON listings;
DROP POLICY IF EXISTS "Owners can manage listings" ON listings;

-- Create new policy for anonymous read access to active listings
-- This is essential for public pages to work
CREATE POLICY "Public can view active listings"
  ON listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Business owners can view all their listings (any status)
CREATE POLICY "Owners can view all own listings"
  ON listings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = listings.business_id
    AND b.owner_user_id = auth.uid()
  ));

-- Business owners can manage their listings
CREATE POLICY "Owners can manage listings"
  ON listings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = listings.business_id
    AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = listings.business_id
    AND b.owner_user_id = auth.uid()
  ));

-- =====================================================
-- 2. FIX LISTING_VIEWS TABLE RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS listing_views_insert_public ON listing_views;
DROP POLICY IF EXISTS listing_views_select_owner ON listing_views;
DROP POLICY IF EXISTS "Public can record listing views" ON listing_views;

-- Anyone can insert a view record (for tracking)
CREATE POLICY "Public can record listing views"
  ON listing_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Business owners can view analytics
CREATE POLICY "Owners can view listing analytics"
  ON listing_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM listings l
    JOIN businesses b ON b.id = l.business_id
    WHERE l.id = listing_views.listing_id
    AND b.owner_user_id = auth.uid()
  ));

-- =====================================================
-- 3. FIX BUSINESSES TABLE RLS FOR PUBLIC ACCESS
-- =====================================================
DROP POLICY IF EXISTS "Public can view public businesses" ON businesses;

-- Allow anonymous users to read businesses with public pages enabled
CREATE POLICY "Public can view public businesses"
  ON businesses FOR SELECT
  TO anon, authenticated
  USING (public_page_enabled = true AND is_active = true);

-- =====================================================
-- 4. FIX PROPERTIES TABLE RLS FOR PUBLIC ACCESS
-- =====================================================
DROP POLICY IF EXISTS "Public can view public properties" ON properties;

-- Allow anonymous users to read properties with public pages enabled
CREATE POLICY "Public can view public properties"
  ON properties FOR SELECT
  TO anon, authenticated
  USING (
    public_page_enabled = true
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = properties.business_id
      AND b.public_page_enabled = true
      AND b.is_active = true
    )
  );

-- =====================================================
-- 5. FIX UNITS TABLE RLS FOR PUBLIC ACCESS
-- =====================================================
DROP POLICY IF EXISTS "Public can view units on public pages" ON units;

-- Allow anonymous users to read units for public listings
CREATE POLICY "Public can view units on public pages"
  ON units FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM properties p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.id = units.property_id
      AND p.public_page_enabled = true
      AND p.is_active = true
      AND b.public_page_enabled = true
      AND b.is_active = true
    )
  );

-- =====================================================
-- 6. FIX RENTAL_LISTINGS TABLE RLS FOR PUBLIC ACCESS
-- =====================================================
-- Ensure the /apply/:code route works for anonymous users
DROP POLICY IF EXISTS "Anyone can view active listings" ON rental_listings;

CREATE POLICY "Anyone can view active listings"
  ON rental_listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND accept_applications = true);

-- =====================================================
-- 7. FIX RENTAL_APPLICATIONS TABLE RLS FOR PUBLIC SUBMISSIONS
-- =====================================================
DROP POLICY IF EXISTS "Anyone can submit applications" ON rental_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON rental_applications;

-- Allow anonymous and authenticated users to submit applications
CREATE POLICY "Public can submit applications"
  ON rental_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Either linked to an active rental_listing
    (listing_id IS NULL OR EXISTS (
      SELECT 1 FROM rental_listings
      WHERE id = listing_id
      AND status = 'active'
      AND accept_applications = true
    ))
    -- Or has a unit_id for direct unit applications
    OR unit_id IS NOT NULL
  );

-- =====================================================
-- 8. FIX TENANT_PROSPECTS TABLE RLS FOR PUBLIC ACCESS
-- =====================================================
DROP POLICY IF EXISTS tenant_prospects_insert_public ON tenant_prospects;
DROP POLICY IF EXISTS "Public can create prospect profiles" ON tenant_prospects;

-- Allow anyone to create a prospect record (for application tracking)
CREATE POLICY "Public can create prospect profiles"
  ON tenant_prospects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- 9. GRANT ANON ROLE ACCESS TO REQUIRED FUNCTIONS
-- =====================================================
-- Ensure anonymous users can use key functions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON listings TO anon;
GRANT SELECT ON businesses TO anon;
GRANT SELECT ON properties TO anon;
GRANT SELECT ON units TO anon;
GRANT SELECT ON rental_listings TO anon;
GRANT INSERT ON rental_applications TO anon;
GRANT INSERT ON listing_views TO anon;
GRANT INSERT ON tenant_prospects TO anon;

-- =====================================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA
-- =====================================================
NOTIFY pgrst, 'reload schema';
