/*
  # Package Tier Features and Add-ons System
  
  ## Overview
  Each package tier has:
  - Included features (built into the tier)
  - Available add-ons (can be purchased separately)
  
  Not all tiers have access to all add-ons.
  Example: Free tier cannot access white label branding at all.
  
  ## Tables
  1. features - Master list of all features/capabilities
  2. tier_included_features - Features included in each tier
  3. tier_available_addons - Add-ons that can be purchased per tier
  
  ## Security
  - RLS enabled on all tables
  - Super admins can manage features
  - Users can view their tier's features
*/

-- Master features table
CREATE TABLE IF NOT EXISTS features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  feature_type text NOT NULL DEFAULT 'feature' CHECK (feature_type IN ('feature', 'addon')),
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active features"
  ON features FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage features"
  ON features FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Tier included features (built into the tier price)
CREATE TABLE IF NOT EXISTS tier_included_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES package_tiers(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tier_id, feature_id)
);

ALTER TABLE tier_included_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tier's included features"
  ON tier_included_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage tier included features"
  ON tier_included_features FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Tier available add-ons (can be purchased separately)
CREATE TABLE IF NOT EXISTS tier_available_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES package_tiers(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  addon_price_cents integer NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'one_time', 'usage')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tier_id, feature_id)
);

ALTER TABLE tier_available_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view available addons for their tier"
  ON tier_available_addons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage tier addons"
  ON tier_available_addons FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Insert core features
INSERT INTO features (slug, name, description, feature_type, category) VALUES
  -- Core features
  ('properties', 'Property Management', 'Manage properties and units', 'feature', 'core'),
  ('tenants', 'Tenant Management', 'Manage tenant information and leases', 'feature', 'core'),
  ('payments', 'Payment Tracking', 'Track rent payments and payment history', 'feature', 'core'),
  ('maintenance', 'Maintenance Requests', 'Handle maintenance requests and work orders', 'feature', 'core'),
  ('reports', 'Basic Reports', 'Generate basic property reports', 'feature', 'core'),
  
  -- Advanced features
  ('advanced_reports', 'Advanced Reports', 'Advanced analytics and reporting', 'feature', 'advanced'),
  ('bulk_import', 'Bulk Import', 'Import properties and tenants via CSV', 'feature', 'advanced'),
  ('api_access', 'API Access', 'Programmatic access via REST API', 'feature', 'advanced'),
  ('multi_portfolio', 'Multiple Portfolios', 'Manage multiple property portfolios', 'feature', 'advanced'),
  
  -- Team features
  ('team_members', 'Team Members', 'Add team members with role-based access', 'feature', 'team'),
  ('client_portal', 'Client Portal', 'White-labeled portal for property owners', 'feature', 'team'),
  
  -- Add-ons
  ('white_label_branding', 'White Label Branding', 'Customize logo, colors, and domain', 'addon', 'branding'),
  ('ai_rent_optimization', 'AI Rent Optimization', 'AI-powered rent pricing recommendations', 'addon', 'ai'),
  ('ai_maintenance_prediction', 'AI Maintenance Prediction', 'Predictive maintenance scheduling', 'addon', 'ai'),
  ('ai_tenant_screening', 'AI Tenant Screening', 'AI-assisted tenant application review', 'addon', 'ai'),
  ('custom_integrations', 'Custom Integrations', 'Custom third-party integrations', 'addon', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- Configure included features for FREE tier
INSERT INTO tier_included_features (tier_id, feature_id)
SELECT 
  pt.id,
  f.id
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'free'
  AND f.slug IN ('properties', 'tenants', 'payments', 'maintenance', 'reports')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Configure included features for STARTER tier
INSERT INTO tier_included_features (tier_id, feature_id)
SELECT 
  pt.id,
  f.id
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'starter'
  AND f.slug IN ('properties', 'tenants', 'payments', 'maintenance', 'reports', 'advanced_reports', 'bulk_import')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Configure included features for PROFESSIONAL tier
INSERT INTO tier_included_features (tier_id, feature_id)
SELECT 
  pt.id,
  f.id
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'professional'
  AND f.slug IN ('properties', 'tenants', 'payments', 'maintenance', 'reports', 'advanced_reports', 'bulk_import', 'api_access', 'multi_portfolio', 'team_members')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Configure included features for ENTERPRISE tier (everything)
INSERT INTO tier_included_features (tier_id, feature_id)
SELECT 
  pt.id,
  f.id
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'enterprise'
  AND f.feature_type = 'feature'
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Configure available add-ons for STARTER tier
INSERT INTO tier_available_addons (tier_id, feature_id, addon_price_cents, billing_period)
SELECT 
  pt.id,
  f.id,
  CASE 
    WHEN f.slug = 'ai_rent_optimization' THEN 2000
    WHEN f.slug = 'ai_maintenance_prediction' THEN 1500
    WHEN f.slug = 'ai_tenant_screening' THEN 1000
  END,
  'monthly'
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'starter'
  AND f.slug IN ('ai_rent_optimization', 'ai_maintenance_prediction', 'ai_tenant_screening')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Configure available add-ons for PROFESSIONAL tier
INSERT INTO tier_available_addons (tier_id, feature_id, addon_price_cents, billing_period)
SELECT 
  pt.id,
  f.id,
  CASE 
    WHEN f.slug = 'white_label_branding' THEN 5000
    WHEN f.slug = 'ai_rent_optimization' THEN 2000
    WHEN f.slug = 'ai_maintenance_prediction' THEN 1500
    WHEN f.slug = 'ai_tenant_screening' THEN 1000
    WHEN f.slug = 'client_portal' THEN 3000
  END,
  'monthly'
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'professional'
  AND f.slug IN ('white_label_branding', 'ai_rent_optimization', 'ai_maintenance_prediction', 'ai_tenant_screening', 'client_portal')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- ENTERPRISE has white label branding included, other addons available
INSERT INTO tier_available_addons (tier_id, feature_id, addon_price_cents, billing_period)
SELECT 
  pt.id,
  f.id,
  CASE 
    WHEN f.slug = 'custom_integrations' THEN 10000
    WHEN f.slug = 'ai_rent_optimization' THEN 0
    WHEN f.slug = 'ai_maintenance_prediction' THEN 0
    WHEN f.slug = 'ai_tenant_screening' THEN 0
  END,
  CASE
    WHEN f.slug = 'custom_integrations' THEN 'one_time'
    ELSE 'monthly'
  END
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'enterprise'
  AND f.slug IN ('custom_integrations', 'ai_rent_optimization', 'ai_maintenance_prediction', 'ai_tenant_screening')
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Add white label branding as included feature for enterprise
INSERT INTO tier_included_features (tier_id, feature_id)
SELECT 
  pt.id,
  f.id
FROM package_tiers pt
CROSS JOIN features f
WHERE pt.tier_slug = 'enterprise'
  AND f.slug = 'white_label_branding'
ON CONFLICT (tier_id, feature_id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tier_included_features_tier_id ON tier_included_features(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_included_features_feature_id ON tier_included_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_tier_available_addons_tier_id ON tier_available_addons(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_available_addons_feature_id ON tier_available_addons(feature_id);
CREATE INDEX IF NOT EXISTS idx_features_slug ON features(slug);
CREATE INDEX IF NOT EXISTS idx_features_feature_type ON features(feature_type);

COMMENT ON TABLE features IS 'Master list of all features and add-ons available in the system';
COMMENT ON TABLE tier_included_features IS 'Features included in each package tier price';
COMMENT ON TABLE tier_available_addons IS 'Add-ons that can be purchased for each tier (not all tiers have all addons available)';
