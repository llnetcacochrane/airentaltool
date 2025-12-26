-- Migration: Fix rental_listings for business-centric model
-- The app has moved from organization-based to business-based architecture
-- This migration adds business_id and updates RLS policies

-- Step 1: Add business_id column
ALTER TABLE rental_listings ADD COLUMN IF NOT EXISTS business_id uuid;

-- Step 2: Make organization_id nullable (we'll derive it from business if needed)
ALTER TABLE rental_listings ALTER COLUMN organization_id DROP NOT NULL;

-- Step 3: Create foreign key for business_id
ALTER TABLE rental_listings
  ADD CONSTRAINT rental_listings_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Step 4: Create index for business_id
CREATE INDEX IF NOT EXISTS idx_rental_listings_business_id ON rental_listings(business_id);

-- Step 5: Backfill business_id from property's business
UPDATE rental_listings rl
SET business_id = p.business_id
FROM properties p
WHERE rl.property_id = p.id
  AND rl.business_id IS NULL;

-- Step 6: Drop old RLS policies
DROP POLICY IF EXISTS "Landlords can create listings" ON rental_listings;
DROP POLICY IF EXISTS "Landlords can update listings" ON rental_listings;
DROP POLICY IF EXISTS "Landlords can view organization listings" ON rental_listings;
DROP POLICY IF EXISTS "Anyone can view active listings" ON rental_listings;

-- Step 7: Create new business-centric RLS policies

-- Anyone can view active listings (public)
CREATE POLICY "Anyone can view active listings" ON rental_listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND accept_applications = true);

-- Business owners can view all their listings
CREATE POLICY "Business owners can view listings" ON rental_listings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = rental_listings.business_id
        AND b.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

-- Business owners can create listings
CREATE POLICY "Business owners can create listings" ON rental_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = rental_listings.business_id
        AND b.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

-- Business owners can update listings
CREATE POLICY "Business owners can update listings" ON rental_listings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = rental_listings.business_id
        AND b.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = rental_listings.business_id
        AND b.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

-- Business owners can delete listings
CREATE POLICY "Business owners can delete listings" ON rental_listings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = rental_listings.business_id
        AND b.owner_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
    )
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
