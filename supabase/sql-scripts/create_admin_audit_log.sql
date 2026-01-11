-- Create admin_audit_log table for god mode audit trail
-- Version: 5.0.0
-- Date: 2025-12-14

-- Drop table if exists (for clean re-runs)
DROP TABLE IF EXISTS admin_audit_log;

-- Create the audit log table
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Audit trail for super admin actions, especially god mode impersonation';
COMMENT ON COLUMN admin_audit_log.admin_user_id IS 'The super admin who performed the action';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action: impersonate_user, exit_impersonation, etc.';
COMMENT ON COLUMN admin_audit_log.target_user_id IS 'The user who was targeted by the action (e.g., impersonated user)';
COMMENT ON COLUMN admin_audit_log.metadata IS 'Additional context data stored as JSON';

-- Enable Row Level Security
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: Only super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON admin_audit_log TO authenticated;

-- Verify table was created
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_audit_log'
ORDER BY ordinal_position;
