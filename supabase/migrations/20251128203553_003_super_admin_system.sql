/*
  # Super Admin System for SaaS Management

  1. New Tables
    - `super_admins` - Users with platform-wide access
    - `organization_subscriptions` - Detailed subscription tracking
    - `platform_settings` - Global platform configuration
    - `system_notifications` - Platform-wide announcements

  2. Updates
    - Add `is_super_admin` flag to users table (via metadata)
    - Add `subscription_ends_at` to organizations
    - Add `subscription_plan` details to organizations

  3. Security
    - Enable RLS on all new tables
    - Super admin policies for platform management
    - Read-only access for super admins across all organizations
*/

-- Super admins table (platform administrators)
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  permissions jsonb DEFAULT '{"all": true}'::jsonb,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Organization subscriptions (detailed tracking)
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_name text NOT NULL, -- solo, professional, enterprise
  plan_price numeric NOT NULL DEFAULT 0,
  billing_cycle text DEFAULT 'monthly', -- monthly, annual
  max_properties integer,
  max_users integer,
  max_tenants integer,
  features jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  auto_renew boolean DEFAULT true,
  status text DEFAULT 'active', -- active, trial, past_due, cancelled
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform settings (global configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- System notifications (platform-wide announcements)
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  notification_type text DEFAULT 'info', -- info, warning, maintenance, feature
  target_audience text DEFAULT 'all', -- all, organization_owners, specific_tier
  is_active boolean DEFAULT true,
  display_from timestamptz DEFAULT now(),
  display_until timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Organization usage tracking (for billing and limits)
CREATE TABLE IF NOT EXISTS organization_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM format
  properties_count integer DEFAULT 0,
  tenants_count integer DEFAULT 0,
  payments_count integer DEFAULT 0,
  storage_mb integer DEFAULT 0,
  api_calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, month)
);

-- Add subscription tracking to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_organization_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_usage_organization_id ON organization_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, display_from, display_until);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for super_admins table
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage super admins"
  ON super_admins FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- RLS Policies for organization_subscriptions
CREATE POLICY "Organization owners can view own subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage all subscriptions"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- RLS Policies for platform_settings
CREATE POLICY "Public settings readable by all"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true));

CREATE POLICY "Super admins can manage platform settings"
  ON platform_settings FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- RLS Policies for system_notifications
CREATE POLICY "Active notifications readable by all"
  ON system_notifications FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND display_from <= now() 
    AND (display_until IS NULL OR display_until >= now())
    OR auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage system notifications"
  ON system_notifications FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- RLS Policies for organization_usage
CREATE POLICY "Organization owners can view own usage"
  ON organization_usage FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage all usage data"
  ON organization_usage FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Super admin helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all organizations for super admin view
CREATE OR REPLACE FUNCTION get_all_organizations_admin()
RETURNS TABLE (
  org_id uuid,
  org_name text,
  owner_email text,
  account_tier text,
  subscription_status text,
  created_at timestamptz,
  total_properties bigint,
  total_tenants bigint,
  total_payments bigint
) AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    au.email,
    o.account_tier,
    o.subscription_status,
    o.created_at,
    COALESCE((SELECT COUNT(*) FROM properties WHERE organization_id = o.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM tenants WHERE organization_id = o.id), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM payments WHERE organization_id = o.id), 0)::bigint
  FROM organizations o
  LEFT JOIN auth.users au ON o.owner_id = au.id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, description, is_public)
VALUES 
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode', true),
  ('registration_enabled', 'true', 'Allow new user registrations', true),
  ('max_organizations_per_user', '5', 'Maximum organizations per user', false),
  ('platform_version', '"1.0.0-beta"', 'Current platform version', true)
ON CONFLICT (setting_key) DO NOTHING;