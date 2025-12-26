-- Fix professional tier to allow 1 business instead of 0
-- Professional tier is for single landlords with more properties/units
-- They should have 1 business like the Basic tier

UPDATE package_tiers
SET max_businesses = 1
WHERE tier_slug = 'professional'
  AND max_businesses = 0;

-- Verify the update
SELECT
  tier_slug,
  tier_name,
  max_businesses,
  max_properties,
  max_units,
  max_tenants
FROM package_tiers
WHERE tier_slug = 'professional';
