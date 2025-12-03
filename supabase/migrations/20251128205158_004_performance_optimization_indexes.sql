/*
  # Performance Optimization - Foreign Key Indexes

  1. Purpose
    - Add indexes on all foreign key columns for optimal query performance
    - Indexes speed up JOIN operations and foreign key constraint checks

  2. Indexes Added
    - audit_logs: user_id
    - deposit_deductions: security_deposit_id
    - expenses: lease_id
    - lease_documents: lease_id
    - leases: property_unit_id
    - organization_members: invited_by
    - payment_methods: organization_id
    - payment_transactions: organization_id, payment_id
    - payments: payment_schedule_id
    - platform_settings: updated_by
    - properties: property_type_id
    - super_admins: granted_by
    - system_notifications: created_by
*/

-- Create indexes for foreign keys that don't have covering indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_deductions_security_deposit_id ON deposit_deductions(security_deposit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_lease_id ON expenses(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease_id ON lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_unit_id ON leases(property_unit_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by ON organization_members(invited_by);
CREATE INDEX IF NOT EXISTS idx_payment_methods_organization_id ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization_id ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_schedule_id ON payments(payment_schedule_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON platform_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_properties_property_type_id ON properties(property_type_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_granted_by ON super_admins(granted_by);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_by ON system_notifications(created_by);