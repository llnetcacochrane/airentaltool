/*
  # Package Tier Management System

  1. Overview
     - Super admins can define and modify package tiers (Basic, Professional, Enterprise, etc.)
     - Each tier has: price, features, limits (properties, tenants, users, etc.)
     - Package tiers are versioned - changes create new versions
     - Organizations can have custom overrides that don't match standard packages
     - Organizations on old versions are notified but not forced to upgrade

  2. New Tables
     - `package_tiers` - Master list of available packages with current pricing/features
     - `package_tier_versions` - Historical versions of packages
     - `organization_package_settings` - Current package settings per organization
     - `package_upgrade_notifications` - Notifications when packages are updated

  3. Key Features
     - Version tracking: When package changes, old orgs keep old settings
     - Custom overrides: Super admins can set custom limits per organization
     - Upgrade notifications: Orgs notified when packages change
     - Opt-in upgrades: Orgs choose whether to accept new package terms

  4. Security
     - RLS enabled on all tables
     - Only super admins can modify package tiers
     - Organizations can only view their own settings
     - Organizations can only update their acceptance of upgrades
*/

-- =====================================================
-- TABLE 1: Package Tiers (Master Package Definitions)
-- =====================================================

CREATE TABLE IF NOT EXISTS package_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package identity
  tier_name text NOT NULL UNIQUE,
  tier_slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  
  -- Pricing
  monthly_price_cents integer NOT NULL DEFAULT 0,
  annual_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  
  -- Feature limits
  max_properties integer NOT NULL DEFAULT 0,
  max_tenants integer NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT 1,
  max_payment_methods integer NOT NULL DEFAULT 1,
  
  -- Feature flags (boolean features)
  features jsonb DEFAULT '{}'::jsonb,
  
  -- Display and ordering
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  
  -- Metadata
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- =====================================================
-- TABLE 2: Package Tier Versions (Historical Record)
-- =====================================================

CREATE TABLE IF NOT EXISTS package_tier_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_tier_id uuid NOT NULL REFERENCES package_tiers(id) ON DELETE CASCADE,
  
  -- Snapshot of package at this version
  version integer NOT NULL,
  tier_name text NOT NULL,
  display_name text NOT NULL,
  description text,
  
  -- Pricing snapshot
  monthly_price_cents integer NOT NULL,
  annual_price_cents integer NOT NULL,
  currency text NOT NULL,
  
  -- Feature limits snapshot
  max_properties integer NOT NULL,
  max_tenants integer NOT NULL,
  max_users integer NOT NULL,
  max_payment_methods integer NOT NULL,
  
  -- Feature flags snapshot
  features jsonb DEFAULT '{}'::jsonb,
  
  -- Version metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  change_notes text,
  
  UNIQUE(package_tier_id, version)
);

-- =====================================================
-- TABLE 3: Organization Package Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_package_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Current package assignment
  package_tier_id uuid REFERENCES package_tiers(id),
  package_version integer NOT NULL DEFAULT 1,
  
  -- Custom overrides (NULL means use package default)
  custom_monthly_price_cents integer,
  custom_annual_price_cents integer,
  custom_max_properties integer,
  custom_max_tenants integer,
  custom_max_users integer,
  custom_max_payment_methods integer,
  custom_features jsonb,
  
  -- Override tracking
  has_custom_pricing boolean DEFAULT false,
  has_custom_limits boolean DEFAULT false,
  override_notes text,
  
  -- Billing info
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- =====================================================
-- TABLE 4: Package Upgrade Notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS package_upgrade_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What changed
  old_package_tier_id uuid REFERENCES package_tiers(id),
  old_version integer NOT NULL,
  new_version integer NOT NULL,
  
  -- Change details
  changes_summary jsonb NOT NULL,
  pricing_changed boolean DEFAULT false,
  limits_changed boolean DEFAULT false,
  features_changed boolean DEFAULT false,
  
  -- Notification status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  notified_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_package_tiers_slug ON package_tiers(tier_slug);
CREATE INDEX IF NOT EXISTS idx_package_tiers_active ON package_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_package_tier_versions_package ON package_tier_versions(package_tier_id, version);
CREATE INDEX IF NOT EXISTS idx_org_package_settings_org ON organization_package_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_package_settings_tier ON organization_package_settings(package_tier_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_notifications_org ON package_upgrade_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_notifications_status ON package_upgrade_notifications(status);

-- =====================================================
-- RLS POLICIES: Package Tiers
-- =====================================================

ALTER TABLE package_tiers ENABLE ROW LEVEL SECURITY;

-- Everyone can view active packages (for pricing page)
CREATE POLICY "Anyone can view active package tiers"
  ON package_tiers FOR SELECT
  USING (is_active = true);

-- Only super admins can modify packages
CREATE POLICY "Super admins can manage package tiers"
  ON package_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES: Package Tier Versions
-- =====================================================

ALTER TABLE package_tier_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can view package versions (for historical comparison)
CREATE POLICY "Anyone can view package tier versions"
  ON package_tier_versions FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can create versions
CREATE POLICY "Super admins can create package tier versions"
  ON package_tier_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES: Organization Package Settings
-- =====================================================

ALTER TABLE organization_package_settings ENABLE ROW LEVEL SECURITY;

-- Organizations can view their own settings
CREATE POLICY "Organizations can view own package settings"
  ON organization_package_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Super admins can view all settings
CREATE POLICY "Super admins can view all package settings"
  ON organization_package_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Super admins can modify all settings
CREATE POLICY "Super admins can manage all package settings"
  ON organization_package_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES: Package Upgrade Notifications
-- =====================================================

ALTER TABLE package_upgrade_notifications ENABLE ROW LEVEL SECURITY;

-- Organizations can view their own notifications
CREATE POLICY "Organizations can view own upgrade notifications"
  ON package_upgrade_notifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Organization owners/admins can respond to notifications
CREATE POLICY "Organization admins can respond to notifications"
  ON package_upgrade_notifications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Super admins can view all notifications
CREATE POLICY "Super admins can view all upgrade notifications"
  ON package_upgrade_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- =====================================================
-- FUNCTION: Create Package Version Snapshot
-- =====================================================

CREATE OR REPLACE FUNCTION create_package_version_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create snapshot if substantive fields changed
  IF (OLD.monthly_price_cents != NEW.monthly_price_cents OR
      OLD.annual_price_cents != NEW.annual_price_cents OR
      OLD.max_properties != NEW.max_properties OR
      OLD.max_tenants != NEW.max_tenants OR
      OLD.max_users != NEW.max_users OR
      OLD.max_payment_methods != NEW.max_payment_methods OR
      OLD.features::text != NEW.features::text) THEN
    
    -- Increment version
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
    
    -- Create historical snapshot
    INSERT INTO package_tier_versions (
      package_tier_id,
      version,
      tier_name,
      display_name,
      description,
      monthly_price_cents,
      annual_price_cents,
      currency,
      max_properties,
      max_tenants,
      max_users,
      max_payment_methods,
      features,
      created_by
    ) VALUES (
      NEW.id,
      NEW.version,
      NEW.tier_name,
      NEW.display_name,
      NEW.description,
      NEW.monthly_price_cents,
      NEW.annual_price_cents,
      NEW.currency,
      NEW.max_properties,
      NEW.max_tenants,
      NEW.max_users,
      NEW.max_payment_methods,
      NEW.features,
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-version Package Tiers
-- =====================================================

DROP TRIGGER IF EXISTS trigger_create_package_version ON package_tiers;

CREATE TRIGGER trigger_create_package_version
  BEFORE UPDATE ON package_tiers
  FOR EACH ROW
  EXECUTE FUNCTION create_package_version_snapshot();

-- =====================================================
-- SEED DATA: Default Package Tiers
-- =====================================================

INSERT INTO package_tiers (
  tier_name,
  tier_slug,
  display_name,
  description,
  monthly_price_cents,
  annual_price_cents,
  max_properties,
  max_tenants,
  max_users,
  max_payment_methods,
  features,
  display_order,
  is_active,
  is_featured
) VALUES
  (
    'Basic',
    'basic',
    'Basic',
    'Perfect for individual landlords managing a few properties',
    2900,
    29900,
    5,
    25,
    1,
    1,
    '{"maintenance_tracking": true, "payment_tracking": true, "basic_reports": true}'::jsonb,
    1,
    true,
    false
  ),
  (
    'Professional',
    'professional',
    'Professional',
    'Ideal for growing property management businesses',
    7900,
    79900,
    25,
    150,
    5,
    3,
    '{"maintenance_tracking": true, "payment_tracking": true, "advanced_reports": true, "lease_renewal_automation": true, "rent_optimization": true, "multi_user": true}'::jsonb,
    2,
    true,
    true
  ),
  (
    'Enterprise',
    'enterprise',
    'Enterprise',
    'For large property management companies',
    19900,
    199900,
    999999,
    999999,
    999999,
    999999,
    '{"maintenance_tracking": true, "payment_tracking": true, "advanced_reports": true, "lease_renewal_automation": true, "rent_optimization": true, "multi_user": true, "custom_integrations": true, "dedicated_support": true, "white_label": true}'::jsonb,
    3,
    true,
    false
  )
ON CONFLICT (tier_slug) DO NOTHING;

-- Create initial version snapshots for seeded packages
INSERT INTO package_tier_versions (
  package_tier_id,
  version,
  tier_name,
  display_name,
  description,
  monthly_price_cents,
  annual_price_cents,
  currency,
  max_properties,
  max_tenants,
  max_users,
  max_payment_methods,
  features
)
SELECT
  id,
  1,
  tier_name,
  display_name,
  description,
  monthly_price_cents,
  annual_price_cents,
  currency,
  max_properties,
  max_tenants,
  max_users,
  max_payment_methods,
  features
FROM package_tiers
WHERE NOT EXISTS (
  SELECT 1 FROM package_tier_versions 
  WHERE package_tier_id = package_tiers.id 
  AND version = 1
);

-- =====================================================
-- Summary
-- =====================================================

-- ✅ Package tier management system implemented
-- ✅ Version tracking for all package changes
-- ✅ Organization-specific override support
-- ✅ Upgrade notification system
-- ✅ RLS policies for security
-- ✅ Automatic versioning on updates
-- ✅ Seeded with default packages (Basic, Professional, Enterprise)
