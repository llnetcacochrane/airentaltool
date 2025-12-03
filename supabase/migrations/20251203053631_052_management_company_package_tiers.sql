/*
  # Management Company Package Tiers

  ## Overview
  Creates a two-tier package system:
  1. Single Company Packages - for direct landlords managing their own properties
  2. Management Company Packages - for property management firms managing multiple client businesses

  ## Changes
  
  ### 1. Add package_type column
  - Adds package_type enum: 'single_company' or 'management_company'
  - Updates existing packages to 'single_company' type
  - Renames 'enterprise' to clarify it's for management companies

  ### 2. Update existing packages for single company use
  - Sets max_businesses to 0 for Free/Basic/Professional (auto-created)
  - Adjusts limits to be more appropriate for single businesses

  ### 3. Create new Management Company tiers
  - Manager Starter: 5 clients, 50 units
  - Manager Growth: 25 clients, 250 units  
  - Manager Professional: 100 clients, 1000 units
  - Manager Enterprise: Unlimited
  
  ## Important Notes
  - Single company users get ONE business (auto-created, not counted in UI)
  - Management company users can create multiple client businesses
  - Businesses feature is hidden/disabled for single company packages
*/

-- Add package_type column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'package_tiers' AND column_name = 'package_type'
  ) THEN
    ALTER TABLE package_tiers 
    ADD COLUMN package_type TEXT DEFAULT 'single_company' CHECK (package_type IN ('single_company', 'management_company'));
  END IF;
END $$;

-- Update existing packages to single_company type and adjust limits
UPDATE package_tiers 
SET 
  package_type = 'single_company',
  max_businesses = 0,  -- 0 means auto-create one, not user-manageable
  description = 'Perfect for individual landlords managing their own properties'
WHERE tier_slug = 'free';

UPDATE package_tiers 
SET 
  package_type = 'single_company',
  max_businesses = 0,
  max_properties = 5,
  max_units = 50,
  max_tenants = 50,
  description = 'For growing landlords with multiple properties'
WHERE tier_slug = 'basic';

UPDATE package_tiers 
SET 
  package_type = 'single_company',
  max_businesses = 0,
  max_properties = 50,
  max_units = 500,
  max_tenants = 500,
  description = 'For established landlords with extensive portfolios'
WHERE tier_slug = 'professional';

-- Rename enterprise to management_starter and update
UPDATE package_tiers 
SET 
  tier_slug = 'management_starter',
  tier_name = 'Manager Starter',
  display_name = 'Manager Starter',
  package_type = 'management_company',
  monthly_price_cents = 29900,  -- $299/mo
  max_businesses = 5,
  max_properties = 50,
  max_units = 150,
  max_tenants = 150,
  display_order = 10,
  description = 'For new property management companies managing a few clients'
WHERE tier_slug = 'enterprise';

-- Insert new management company tiers if they don't exist
INSERT INTO package_tiers (
  tier_slug, tier_name, display_name, package_type, description,
  monthly_price_cents, annual_price_cents, currency,
  max_businesses, max_properties, max_units, max_tenants, max_users, max_payment_methods,
  is_active, is_featured, display_order, features
) VALUES
(
  'management_growth',
  'Manager Growth',
  'Manager Growth',
  'management_company',
  'For growing property management companies with multiple clients',
  59900,  -- $599/mo
  599900, -- $5,999/yr (save $1,189)
  'CAD',
  25,     -- 25 client businesses
  250,    -- 250 properties total
  750,    -- 750 units total
  750,    -- 750 tenants total
  10,     -- 10 staff users
  999,
  true,
  false,
  11,
  '{"advanced_reporting": true, "api_access": true, "white_label": true, "priority_support": true}'::jsonb
),
(
  'management_professional',
  'Manager Professional', 
  'Manager Professional',
  'management_company',
  'For established property management firms with extensive client portfolios',
  119900, -- $1,199/mo
  1199900, -- $11,999/yr (save $2,389)
  'CAD',
  100,    -- 100 client businesses
  1000,   -- 1000 properties total
  5000,   -- 5000 units total
  5000,   -- 5000 tenants total
  50,     -- 50 staff users
  999,
  true,
  true,
  12,
  '{"advanced_reporting": true, "api_access": true, "white_label": true, "priority_support": true, "custom_integrations": true, "dedicated_account_manager": true}'::jsonb
),
(
  'management_enterprise',
  'Manager Enterprise',
  'Manager Enterprise',
  'management_company',
  'For large property management companies requiring unlimited capacity',
  0,      -- Custom pricing
  0,
  'CAD',
  999999, -- Unlimited businesses
  999999, -- Unlimited properties
  999999, -- Unlimited units
  999999, -- Unlimited tenants
  999,    -- Unlimited users
  999,
  true,
  false,
  13,
  '{"advanced_reporting": true, "api_access": true, "white_label": true, "priority_support": true, "custom_integrations": true, "dedicated_account_manager": true, "custom_development": true, "sla_guarantee": true}'::jsonb
)
ON CONFLICT (tier_slug) DO UPDATE SET
  tier_name = EXCLUDED.tier_name,
  display_name = EXCLUDED.display_name,
  package_type = EXCLUDED.package_type,
  description = EXCLUDED.description,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  max_businesses = EXCLUDED.max_businesses,
  max_properties = EXCLUDED.max_properties,
  max_units = EXCLUDED.max_units,
  max_tenants = EXCLUDED.max_tenants,
  display_order = EXCLUDED.display_order;

-- Add index on package_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_package_tiers_package_type ON package_tiers(package_type) WHERE is_active = true;
