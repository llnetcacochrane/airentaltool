/*
  # System Configuration and API Keys

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `setting_key` (text, unique) - e.g., 'stripe_enabled', 'square_enabled'
      - `setting_value` (text) - encrypted value
      - `setting_type` (text) - 'payment_gateway', 'api_key', 'feature_flag', 'config'
      - `is_encrypted` (boolean) - whether value needs decryption
      - `description` (text)
      - `updated_by` (uuid) - super admin who updated
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)

    - `organization_settings`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `setting_key` (text)
      - `setting_value` (text)
      - `setting_type` (text)
      - `updated_by` (uuid)
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Only super admins can manage system_settings
    - Organization admins can manage organization_settings
    - Encrypted values stored securely
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  setting_type text NOT NULL DEFAULT 'config',
  is_encrypted boolean DEFAULT false,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value text,
  setting_type text NOT NULL DEFAULT 'config',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, setting_key)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings (super admins only)
CREATE POLICY "Super admins can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

CREATE POLICY "Super admins can update system settings"
  ON system_settings FOR UPDATE
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

CREATE POLICY "Super admins can delete system settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

-- Policies for organization_settings
CREATE POLICY "Organization members can view their org settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can insert settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can update settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization admins can delete settings"
  ON organization_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.is_active = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_type ON system_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_organization_settings_org ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_key ON organization_settings(organization_id, setting_key);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('stripe_enabled', 'false', 'payment_gateway', 'Enable Stripe payment processing'),
  ('square_enabled', 'false', 'payment_gateway', 'Enable Square payment processing'),
  ('paypal_enabled', 'false', 'payment_gateway', 'Enable PayPal payment processing'),
  ('email_notifications_enabled', 'true', 'feature_flag', 'Enable automated email notifications'),
  ('maintenance_email_enabled', 'true', 'feature_flag', 'Send emails for maintenance requests'),
  ('payment_reminder_days', '5', 'config', 'Days before due date to send payment reminders'),
  ('lease_renewal_notice_days', '60', 'config', 'Days before lease end to send renewal notices')
ON CONFLICT (setting_key) DO NOTHING;
