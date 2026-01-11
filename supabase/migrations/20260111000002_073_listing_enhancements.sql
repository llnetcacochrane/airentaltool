-- Migration: Add display_title and amenities_config to listings
-- These columns enable custom listing titles and structured amenity management

-- Add display_title for custom title override (null means use auto-generated title)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'display_title'
    ) THEN
        ALTER TABLE listings ADD COLUMN display_title TEXT DEFAULT NULL;
    END IF;
END $$;

-- Add amenities_config for structured amenity toggling
-- Format: [{ "id": "air_conditioning", "included": true }, ...]
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'amenities_config'
    ) THEN
        ALTER TABLE listings ADD COLUMN amenities_config JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN listings.display_title IS 'Custom display title override (null = use auto-generated title from bedrooms/bathrooms)';
COMMENT ON COLUMN listings.amenities_config IS 'Structured amenities configuration: [{ id: string, included: boolean }, ...]';
