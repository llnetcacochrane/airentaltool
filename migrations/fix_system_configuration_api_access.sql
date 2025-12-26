-- Grant API access to system_configuration table and functions

-- Grant access to the table for API layer
GRANT SELECT ON system_configuration TO anon, authenticated;
GRANT ALL ON system_configuration TO authenticated;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_system_config(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_system_config(text, text) TO authenticated;

-- Ensure the table is accessible through PostgREST
-- The table should already be in the public schema and RLS is enabled

-- Verify RLS policies are correct
-- Public configs should be readable by everyone
DROP POLICY IF EXISTS "Public configuration is readable by all" ON system_configuration;
CREATE POLICY "Public configuration is readable by all"
  ON system_configuration
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Super admins can manage all configuration
DROP POLICY IF EXISTS "Super admins can manage system configuration" ON system_configuration;
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

-- Ensure functions have proper security context
-- Recreate functions with proper grants
CREATE OR REPLACE FUNCTION get_system_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION update_system_config(
  config_key text,
  config_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    INSERT INTO system_configuration (key, value, updated_by, is_public)
    VALUES (config_key, config_value, auth.uid(), true);
  END IF;
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION get_system_config(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_system_config(text, text) TO authenticated;

COMMENT ON FUNCTION get_system_config IS 'Get public system configuration value by key (API accessible)';
COMMENT ON FUNCTION update_system_config IS 'Update system configuration (super admin only, API accessible)';
