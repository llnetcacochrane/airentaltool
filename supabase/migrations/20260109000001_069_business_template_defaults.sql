-- Migration: Add default template columns to businesses table
-- These columns allow setting business-level default templates that cascade to properties/units

-- Add default_agreement_template_id to businesses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'default_agreement_template_id'
    ) THEN
        ALTER TABLE businesses ADD COLUMN default_agreement_template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add default_application_template_id to businesses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'default_application_template_id'
    ) THEN
        ALTER TABLE businesses ADD COLUMN default_application_template_id UUID REFERENCES application_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add default_application_template_id to properties table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'default_application_template_id'
    ) THEN
        ALTER TABLE properties ADD COLUMN default_application_template_id UUID REFERENCES application_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add default_application_template_id to units table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'units' AND column_name = 'default_application_template_id'
    ) THEN
        ALTER TABLE units ADD COLUMN default_application_template_id UUID REFERENCES application_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN businesses.default_agreement_template_id IS 'Default agreement template for the business (used if property/unit has no override)';
COMMENT ON COLUMN businesses.default_application_template_id IS 'Default application template for the business (used if property/unit has no override)';
COMMENT ON COLUMN properties.default_application_template_id IS 'Default application template for this property';
COMMENT ON COLUMN units.default_application_template_id IS 'Override application template for this unit';
