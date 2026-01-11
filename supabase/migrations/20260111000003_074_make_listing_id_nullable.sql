-- Migration: Make listing_id nullable on rental_applications
-- The system now has two listing tables:
-- 1. rental_listings - original table used by /apply/:code flow
-- 2. listings - newer table used by public unit pages
--
-- Applications from public pages use the 'listings' table which has different IDs
-- from 'rental_listings', so the FK constraint would fail.
--
-- Solution: Make listing_id nullable. Applications will always have unit_id
-- which is sufficient for tracking.

-- Drop the existing FK constraint
ALTER TABLE rental_applications
  DROP CONSTRAINT IF EXISTS rental_applications_listing_id_fkey;

-- Make listing_id nullable
ALTER TABLE rental_applications
  ALTER COLUMN listing_id DROP NOT NULL;

-- Recreate FK constraint as optional (still validates when present)
ALTER TABLE rental_applications
  ADD CONSTRAINT rental_applications_listing_id_fkey
  FOREIGN KEY (listing_id) REFERENCES rental_listings(id) ON DELETE SET NULL;

-- Add a column for the new listings table (optional reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rental_applications' AND column_name = 'public_listing_id'
    ) THEN
        ALTER TABLE rental_applications ADD COLUMN public_listing_id uuid DEFAULT NULL;
    END IF;
END $$;

-- Update RLS policy to allow inserts without listing_id when unit_id is provided
DROP POLICY IF EXISTS "Anyone can submit applications" ON rental_applications;

CREATE POLICY "Anyone can submit applications"
  ON rental_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Either listing_id is valid in rental_listings
    (listing_id IS NOT NULL AND listing_id IN (
      SELECT id FROM rental_listings
      WHERE status = 'active' AND accept_applications = true
    ))
    -- Or unit_id is provided (for public page submissions)
    OR (listing_id IS NULL AND unit_id IS NOT NULL)
  );

COMMENT ON COLUMN rental_applications.listing_id IS 'Reference to rental_listings table (legacy flow via /apply/:code). Can be NULL for public page submissions.';
COMMENT ON COLUMN rental_applications.public_listing_id IS 'Reference to listings table (public unit page flow). Optional tracking field.';
