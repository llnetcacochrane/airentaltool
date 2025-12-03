/*
  # Add-On System for Pay-As-You-Go Features

  ## Summary
  Implements a flexible add-on system allowing organizations to purchase additional capacity
  (properties, units, tenants, team members) without upgrading their entire plan.

  ## New Tables

  ### `addon_products`
  Defines available add-on products that organizations can purchase:
  - `id` (uuid, primary key)
  - `addon_type` (text) - Type: 'property', 'unit', 'tenant', 'team_member'
  - `display_name` (text) - Display name like "Extra Property"
  - `description` (text) - Description of the add-on
  - `monthly_price_cents` (integer) - Monthly recurring price in cents
  - `is_active` (boolean) - Whether this add-on is currently available for purchase
  - `created_at`, `updated_at` (timestamptz)

  ### `organization_addon_purchases`
  Tracks add-on purchases by organizations:
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key) - Which organization purchased it
  - `addon_product_id` (uuid, foreign key) - Which add-on product
  - `quantity` (integer) - How many units purchased (default 1)
  - `status` (text) - 'active', 'cancelled', 'expired'
  - `purchase_date` (timestamptz) - When purchased
  - `next_billing_date` (timestamptz) - When next charge occurs
  - `cancelled_at` (timestamptz) - When cancelled (if applicable)
  - `created_at`, `updated_at` (timestamptz)

  ### `organization_usage_tracking`
  Real-time tracking of organization usage vs limits:
  - `organization_id` (uuid, primary key)
  - `current_businesses` (integer) - Current count
  - `current_properties` (integer) - Current count
  - `current_units` (integer) - Current count
  - `current_tenants` (integer) - Current count
  - `current_users` (integer) - Current count (team members)
  - `updated_at` (timestamptz)

  ## Functions

  ### `get_organization_limits(org_id)`
  Calculates total allowed limits for an organization by combining:
  - Base package tier limits
  - Purchased add-on quantities
  Returns: JSON with max allowed for each resource type

  ### `check_organization_limit(org_id, resource_type)`
  Checks if organization can add more of a resource type
  Returns: boolean (true if under limit, false if at/over limit)

  ### `update_organization_usage()`
  Trigger function to update usage tracking when resources are added/removed

  ## Security
  - RLS enabled on all tables
  - Organizations can only view/manage their own add-on purchases
  - Only super admins can manage addon_products
  - Usage tracking is read-only for organizations, updated by triggers

  ## Notes
  - Add-ons are recurring monthly charges
  - Cancelling an add-on marks it as cancelled but remains active until next billing date
  - Usage tracking is automatically updated via triggers on resource tables
*/

-- Create addon_products table
CREATE TABLE IF NOT EXISTS addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_type text NOT NULL CHECK (addon_type IN ('property', 'unit', 'tenant', 'team_member', 'business')),
  display_name text NOT NULL,
  description text,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_addon_purchases table
CREATE TABLE IF NOT EXISTS organization_addon_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_product_id uuid NOT NULL REFERENCES addon_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  purchase_date timestamptz NOT NULL DEFAULT now(),
  next_billing_date timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_usage_tracking table
CREATE TABLE IF NOT EXISTS organization_usage_tracking (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  current_businesses integer NOT NULL DEFAULT 0,
  current_properties integer NOT NULL DEFAULT 0,
  current_units integer NOT NULL DEFAULT 0,
  current_tenants integer NOT NULL DEFAULT 0,
  current_users integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_addon_purchases_org_id ON organization_addon_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_status ON organization_addon_purchases(status);
CREATE INDEX IF NOT EXISTS idx_addon_products_type ON addon_products(addon_type);
CREATE INDEX IF NOT EXISTS idx_addon_products_active ON addon_products(is_active);

-- Enable RLS
ALTER TABLE addon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_addon_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_products
CREATE POLICY "Anyone can view active addon products"
  ON addon_products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage addon products"
  ON addon_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for organization_addon_purchases
CREATE POLICY "Organization members can view their addon purchases"
  ON organization_addon_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can purchase addons"
  ON organization_addon_purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can update their addon purchases"
  ON organization_addon_purchases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for organization_usage_tracking
CREATE POLICY "Organization members can view their usage"
  ON organization_usage_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_usage_tracking.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Function to calculate organization limits (base package + add-ons)
CREATE OR REPLACE FUNCTION get_organization_limits(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_limits jsonb;
  addon_limits jsonb;
  result jsonb;
BEGIN
  -- Get base package limits
  SELECT jsonb_build_object(
    'max_businesses', COALESCE(pt.max_businesses, 0),
    'max_properties', COALESCE(pt.max_properties, 0),
    'max_units', COALESCE(pt.max_units, 0),
    'max_tenants', COALESCE(pt.max_tenants, 0),
    'max_users', COALESCE(pt.max_users, 0)
  ) INTO base_limits
  FROM organizations o
  LEFT JOIN package_tiers pt ON o.package_tier_id = pt.id
  WHERE o.id = org_id;

  -- Calculate add-on bonuses
  SELECT jsonb_build_object(
    'addon_businesses', COALESCE(SUM(CASE WHEN ap.addon_type = 'business' THEN oap.quantity ELSE 0 END), 0),
    'addon_properties', COALESCE(SUM(CASE WHEN ap.addon_type = 'property' THEN oap.quantity ELSE 0 END), 0),
    'addon_units', COALESCE(SUM(CASE WHEN ap.addon_type = 'unit' THEN oap.quantity ELSE 0 END), 0),
    'addon_tenants', COALESCE(SUM(CASE WHEN ap.addon_type = 'tenant' THEN oap.quantity ELSE 0 END), 0),
    'addon_users', COALESCE(SUM(CASE WHEN ap.addon_type = 'team_member' THEN oap.quantity ELSE 0 END), 0)
  ) INTO addon_limits
  FROM organization_addon_purchases oap
  JOIN addon_products ap ON oap.addon_product_id = ap.id
  WHERE oap.organization_id = org_id
  AND oap.status = 'active';

  -- Combine base + add-ons
  result := jsonb_build_object(
    'max_businesses', (base_limits->>'max_businesses')::int + (addon_limits->>'addon_businesses')::int,
    'max_properties', (base_limits->>'max_properties')::int + (addon_limits->>'addon_properties')::int,
    'max_units', (base_limits->>'max_units')::int + (addon_limits->>'addon_units')::int,
    'max_tenants', (base_limits->>'max_tenants')::int + (addon_limits->>'addon_tenants')::int,
    'max_users', (base_limits->>'max_users')::int + (addon_limits->>'addon_users')::int,
    'base_limits', base_limits,
    'addon_limits', addon_limits
  );

  RETURN result;
END;
$$;

-- Function to check if organization can add more of a resource
CREATE OR REPLACE FUNCTION check_organization_limit(org_id uuid, resource_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limits jsonb;
  usage_record record;
  max_allowed int;
  current_usage int;
BEGIN
  -- Get limits
  limits := get_organization_limits(org_id);

  -- Get current usage
  SELECT * INTO usage_record
  FROM organization_usage_tracking
  WHERE organization_id = org_id;

  -- If no usage record exists, create one
  IF NOT FOUND THEN
    INSERT INTO organization_usage_tracking (organization_id)
    VALUES (org_id)
    RETURNING * INTO usage_record;
  END IF;

  -- Check specific resource type
  CASE resource_type
    WHEN 'business' THEN
      max_allowed := (limits->>'max_businesses')::int;
      current_usage := usage_record.current_businesses;
    WHEN 'property' THEN
      max_allowed := (limits->>'max_properties')::int;
      current_usage := usage_record.current_properties;
    WHEN 'unit' THEN
      max_allowed := (limits->>'max_units')::int;
      current_usage := usage_record.current_units;
    WHEN 'tenant' THEN
      max_allowed := (limits->>'max_tenants')::int;
      current_usage := usage_record.current_tenants;
    WHEN 'user' THEN
      max_allowed := (limits->>'max_users')::int;
      current_usage := usage_record.current_users;
    ELSE
      RETURN false;
  END CASE;

  -- Return true if under limit (999999 means unlimited)
  RETURN max_allowed = 999999 OR current_usage < max_allowed;
END;
$$;

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION update_usage_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update usage tracking for the organization
  INSERT INTO organization_usage_tracking (
    organization_id,
    current_businesses,
    current_properties,
    current_units,
    current_tenants,
    current_users,
    updated_at
  )
  SELECT
    o.id,
    (SELECT COUNT(*) FROM businesses WHERE organization_id = o.id),
    (SELECT COUNT(*) FROM properties WHERE organization_id = o.id),
    (SELECT COUNT(*) FROM units WHERE organization_id = o.id),
    (SELECT COUNT(*) FROM tenants WHERE organization_id = o.id),
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id),
    now()
  FROM organizations o
  WHERE o.id = COALESCE(NEW.organization_id, OLD.organization_id)
  ON CONFLICT (organization_id)
  DO UPDATE SET
    current_businesses = EXCLUDED.current_businesses,
    current_properties = EXCLUDED.current_properties,
    current_units = EXCLUDED.current_units,
    current_tenants = EXCLUDED.current_tenants,
    current_users = EXCLUDED.current_users,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to update usage tracking
DO $$
BEGIN
  -- Businesses
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_on_business_change') THEN
    CREATE TRIGGER update_usage_on_business_change
    AFTER INSERT OR DELETE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();
  END IF;

  -- Properties
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_on_property_change') THEN
    CREATE TRIGGER update_usage_on_property_change
    AFTER INSERT OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();
  END IF;

  -- Units
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_on_unit_change') THEN
    CREATE TRIGGER update_usage_on_unit_change
    AFTER INSERT OR DELETE ON units
    FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();
  END IF;

  -- Tenants
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_on_tenant_change') THEN
    CREATE TRIGGER update_usage_on_tenant_change
    AFTER INSERT OR DELETE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();
  END IF;

  -- Organization members (team members)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usage_on_member_change') THEN
    CREATE TRIGGER update_usage_on_member_change
    AFTER INSERT OR DELETE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_usage_tracking();
  END IF;
END $$;

-- Insert default addon products
INSERT INTO addon_products (addon_type, display_name, description, monthly_price_cents, is_active)
VALUES
  ('property', 'Extra Property', 'Add one additional property to your account', 1000, true),
  ('unit', 'Extra Unit', 'Add one additional rental unit', 300, true),
  ('tenant', 'Extra Tenant', 'Add one tenant portal account', 200, true),
  ('team_member', 'Extra Team Member', 'Add one staff member to your team', 800, true),
  ('business', 'Extra Business', 'Add one additional business entity', 1500, true)
ON CONFLICT DO NOTHING;

-- Initialize usage tracking for existing organizations
INSERT INTO organization_usage_tracking (
  organization_id,
  current_businesses,
  current_properties,
  current_units,
  current_tenants,
  current_users
)
SELECT
  o.id,
  (SELECT COUNT(*) FROM businesses WHERE organization_id = o.id),
  (SELECT COUNT(*) FROM properties WHERE organization_id = o.id),
  (SELECT COUNT(*) FROM units WHERE organization_id = o.id),
  (SELECT COUNT(*) FROM tenants WHERE organization_id = o.id),
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id)
FROM organizations o
ON CONFLICT (organization_id) DO NOTHING;
