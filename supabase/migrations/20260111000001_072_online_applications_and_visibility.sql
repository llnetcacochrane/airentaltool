-- Migration: Add accept_online_applications and public_page_visibility_override columns
-- These columns enable 3-tier cascade for online application acceptance and unit visibility on public pages

-- Add accept_online_applications to businesses table (default true)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'accept_online_applications'
    ) THEN
        ALTER TABLE businesses ADD COLUMN accept_online_applications BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add accept_online_applications to properties table (null means inherit from business)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'accept_online_applications'
    ) THEN
        ALTER TABLE properties ADD COLUMN accept_online_applications BOOLEAN DEFAULT NULL;
    END IF;
END $$;

-- Add accept_online_applications to units table (null means inherit from property)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'units' AND column_name = 'accept_online_applications'
    ) THEN
        ALTER TABLE units ADD COLUMN accept_online_applications BOOLEAN DEFAULT NULL;
    END IF;
END $$;

-- Add public_page_visibility_override to units table
-- Values: 'inherit' (default), 'always_show', 'never_show'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'units' AND column_name = 'public_page_visibility_override'
    ) THEN
        ALTER TABLE units ADD COLUMN public_page_visibility_override VARCHAR(20) DEFAULT 'inherit';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN businesses.accept_online_applications IS 'Whether this business accepts online rental applications (default true)';
COMMENT ON COLUMN properties.accept_online_applications IS 'Whether this property accepts online applications (NULL = inherit from business)';
COMMENT ON COLUMN units.accept_online_applications IS 'Whether this unit accepts online applications (NULL = inherit from property)';
COMMENT ON COLUMN units.public_page_visibility_override IS 'Override unit visibility on public page: inherit (default), always_show, never_show';

-- Create index for public page visibility queries
CREATE INDEX IF NOT EXISTS idx_units_public_page_visibility_override ON units(public_page_visibility_override);
