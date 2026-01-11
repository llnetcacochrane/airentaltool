-- Restructure to Organization Model
-- User Profile = Organization (auto-created)
-- Businesses are created manually in Setup Wizard under the organization

-- Drop the trigger that auto-creates businesses
DROP TRIGGER IF EXISTS create_default_business_trigger ON user_profiles;

-- Create organizations for users who don't have one yet
-- Each user gets their own organization automatically
INSERT INTO organizations (owner_id, name, slug, company_name, email, phone, address, city, state_province, postal_code, country, currency, timezone)
SELECT
  up.user_id,
  COALESCE(up.organization_name, up.first_name || ' ' || up.last_name, 'My Organization'),
  LOWER(REGEXP_REPLACE(COALESCE(up.organization_name, up.first_name || ' ' || up.last_name, 'org-' || up.user_id::text), '[^a-zA-Z0-9]+', '-', 'g')),
  up.organization_name,
  au.email,
  up.phone,
  up.address_line1,
  up.city,
  up.state_province,
  up.postal_code,
  COALESCE(up.country, 'CA'),
  'CAD',
  'America/Toronto'
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_id = up.user_id
)
ON CONFLICT (slug) DO NOTHING;

-- Update businesses to belong to their owner's organization
UPDATE businesses b
SET organization_id = (
  SELECT id FROM organizations WHERE owner_id = b.owner_user_id LIMIT 1
)
WHERE organization_id IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
