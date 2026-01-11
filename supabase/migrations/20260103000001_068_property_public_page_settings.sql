-- Migration: Add public page settings to properties table
-- Version: 5.6.0
-- Date: 2026-01-03

-- Add public page columns to properties table if they don't exist
DO $$
BEGIN
    -- public_page_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'public_page_enabled'
    ) THEN
        ALTER TABLE properties ADD COLUMN public_page_enabled BOOLEAN DEFAULT false;
    END IF;

    -- public_page_slug
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'public_page_slug'
    ) THEN
        ALTER TABLE properties ADD COLUMN public_page_slug TEXT;
    END IF;

    -- public_unit_display_mode ('all', 'vacant', 'custom')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'public_unit_display_mode'
    ) THEN
        ALTER TABLE properties ADD COLUMN public_unit_display_mode TEXT DEFAULT 'all';
    END IF;

    -- default_agreement_template_id (FK to agreement_templates)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'default_agreement_template_id'
    ) THEN
        ALTER TABLE properties ADD COLUMN default_agreement_template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for public page slug lookup
CREATE INDEX IF NOT EXISTS idx_properties_public_page_slug ON properties(public_page_slug) WHERE public_page_slug IS NOT NULL;

-- Add similar columns to units table for unit-level visibility control
DO $$
BEGIN
    -- show_on_public_page (for custom display mode)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'units' AND column_name = 'show_on_public_page'
    ) THEN
        ALTER TABLE units ADD COLUMN show_on_public_page BOOLEAN DEFAULT true;
    END IF;

    -- default_agreement_template_id for units (overrides property default)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'units' AND column_name = 'default_agreement_template_id'
    ) THEN
        ALTER TABLE units ADD COLUMN default_agreement_template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN properties.public_page_enabled IS 'Whether this property is visible on the public business page';
COMMENT ON COLUMN properties.public_page_slug IS 'URL slug for the property public page';
COMMENT ON COLUMN properties.public_unit_display_mode IS 'Which units to show: all, vacant, or custom';
COMMENT ON COLUMN properties.default_agreement_template_id IS 'Default agreement template for this property';
COMMENT ON COLUMN units.show_on_public_page IS 'Whether this unit shows on public page (for custom mode)';
COMMENT ON COLUMN units.default_agreement_template_id IS 'Override agreement template for this unit';
