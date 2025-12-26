-- Create system_configuration table for platform-wide settings
CREATE TABLE IF NOT EXISTS system_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  is_public boolean DEFAULT false, -- If true, can be read by anonymous users
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_configuration_key ON system_configuration(key);

-- Insert default configuration values
INSERT INTO system_configuration (key, value, description, is_public) VALUES
  ('ga_tracking_id', '', 'Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX)', true),
  ('analytics_enabled', 'true', 'Enable/disable analytics tracking globally', true),
  ('site_name', 'AI Rental Tools', 'Application name displayed throughout the platform', true),
  ('support_email', 'support@airentaltool.com', 'Support contact email', true),
  ('logo_url', '', 'URL to custom logo for white-label deployments', true)
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all configuration
CREATE POLICY "Super admins can manage system configuration"
  ON system_configuration
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

-- Anyone can read public configuration
CREATE POLICY "Public configuration is readable by all"
  ON system_configuration
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- Create function to get configuration value
CREATE OR REPLACE FUNCTION get_system_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM system_configuration
  WHERE key = config_key AND is_public = true;

  RETURN config_value;
END;
$$;

-- Create function to update configuration (super admin only)
CREATE OR REPLACE FUNCTION update_system_config(
  config_key text,
  config_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only super admins can update system configuration';
  END IF;

  -- Update the configuration
  UPDATE system_configuration
  SET
    value = config_value,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE key = config_key;

  -- Insert if not exists
  IF NOT FOUND THEN
    INSERT INTO system_configuration (key, value, updated_by)
    VALUES (config_key, config_value, auth.uid());
  END IF;
END;
$$;

COMMENT ON TABLE system_configuration IS 'Platform-wide system configuration settings';
COMMENT ON COLUMN system_configuration.is_public IS 'Public configs can be read by anonymous users (e.g., GA tracking ID)';
COMMENT ON FUNCTION get_system_config IS 'Get public system configuration value by key';
COMMENT ON FUNCTION update_system_config IS 'Update system configuration (super admin only)';
