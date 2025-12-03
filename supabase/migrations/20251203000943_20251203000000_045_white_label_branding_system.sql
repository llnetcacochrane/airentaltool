/*
  # White Label Branding System

  1. New Tables
    - `system_branding`
      - `id` (uuid, primary key)
      - `application_name` (text) - Default application name
      - `logo_url` (text) - Default logo URL
      - `favicon_url` (text) - Default favicon URL
      - `primary_color` (text) - Default primary color
      - `updated_at` (timestamp)

    - `organization_branding`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `application_name` (text, nullable) - Custom name override
      - `logo_url` (text, nullable) - Custom logo override
      - `favicon_url` (text, nullable) - Custom favicon override
      - `primary_color` (text, nullable) - Custom color override
      - `white_label_enabled` (boolean) - Feature flag
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Super admins can manage system_branding
    - Org admins can manage their organization_branding
    - All authenticated users can read branding settings

  3. Functions
    - get_effective_branding(org_id) - Returns merged branding (org overrides system defaults)
*/

-- System Branding Table (Super Admin Level)
CREATE TABLE IF NOT EXISTS system_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name text NOT NULL DEFAULT 'AI Rental Tools',
  logo_url text DEFAULT '/AiRentalTools-logo1t.svg',
  favicon_url text,
  primary_color text DEFAULT '#2563eb',
  support_email text,
  support_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default system branding
INSERT INTO system_branding (application_name, logo_url, primary_color)
VALUES ('AI Rental Tools', '/AiRentalTools-logo1t.svg', '#2563eb')
ON CONFLICT DO NOTHING;

-- Organization Branding Table (Per Organization)
CREATE TABLE IF NOT EXISTS organization_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  application_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  white_label_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;

-- System Branding Policies
CREATE POLICY "Anyone can read system branding"
  ON system_branding
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can update system branding"
  ON system_branding
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can insert system branding"
  ON system_branding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

-- Organization Branding Policies
CREATE POLICY "Users can read their org branding"
  ON organization_branding
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage their org branding"
  ON organization_branding
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Super admins can manage all org branding"
  ON organization_branding
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

-- Function to get effective branding (org overrides system defaults)
CREATE OR REPLACE FUNCTION get_effective_branding(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  system_brand system_branding%ROWTYPE;
  org_brand organization_branding%ROWTYPE;
  result jsonb;
BEGIN
  -- Get system defaults
  SELECT * INTO system_brand FROM system_branding LIMIT 1;

  -- Get org overrides
  SELECT * INTO org_brand FROM organization_branding WHERE organization_id = org_id;

  -- If org branding doesn't exist or white label not enabled, return system defaults
  IF org_brand IS NULL OR org_brand.white_label_enabled = false THEN
    result := jsonb_build_object(
      'application_name', system_brand.application_name,
      'logo_url', system_brand.logo_url,
      'favicon_url', system_brand.favicon_url,
      'primary_color', system_brand.primary_color,
      'support_email', system_brand.support_email,
      'support_phone', system_brand.support_phone,
      'white_label_enabled', false
    );
  ELSE
    -- Return org overrides merged with system defaults
    result := jsonb_build_object(
      'application_name', COALESCE(org_brand.application_name, system_brand.application_name),
      'logo_url', COALESCE(org_brand.logo_url, system_brand.logo_url),
      'favicon_url', COALESCE(org_brand.favicon_url, system_brand.favicon_url),
      'primary_color', COALESCE(org_brand.primary_color, system_brand.primary_color),
      'support_email', system_brand.support_email,
      'support_phone', system_brand.support_phone,
      'white_label_enabled', true
    );
  END IF;

  RETURN result;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_branding_org_id ON organization_branding(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_branding_white_label ON organization_branding(white_label_enabled) WHERE white_label_enabled = true;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_branding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_branding_timestamp
  BEFORE UPDATE ON system_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_branding_timestamp();

CREATE TRIGGER update_organization_branding_timestamp
  BEFORE UPDATE ON organization_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_branding_timestamp();
