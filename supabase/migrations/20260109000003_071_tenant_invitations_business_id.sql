-- Migration: Add business_id to tenant_invitations table
-- This fixes the legacy organization_id usage

-- Add business_id column to tenant_invitations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_invitations' AND column_name = 'business_id'
    ) THEN
        ALTER TABLE tenant_invitations ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_tenant_invitations_business ON tenant_invitations(business_id);
    END IF;
END $$;

-- Backfill business_id from properties for existing invitations
UPDATE tenant_invitations ti
SET business_id = p.business_id
FROM properties p
WHERE ti.property_id = p.id
  AND ti.business_id IS NULL
  AND p.business_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tenant_invitations.business_id IS 'Business that owns this invitation (replaces organization_id)';
