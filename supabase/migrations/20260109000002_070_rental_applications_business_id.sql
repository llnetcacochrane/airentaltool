-- Migration: Add business_id to rental_applications table
-- This fixes the legacy organization_id usage in the application flow

-- Add business_id column to rental_applications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rental_applications' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE rental_applications ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_rental_applications_business ON rental_applications(business_id);
    END IF;
END $$;

-- Backfill business_id from rental_listings for existing applications
UPDATE rental_applications ra
SET business_id = rl.business_id
FROM rental_listings rl
WHERE ra.listing_id = rl.id
  AND ra.business_id IS NULL
  AND rl.business_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN rental_applications.business_id IS 'Business that owns this application (replaces organization_id)';
