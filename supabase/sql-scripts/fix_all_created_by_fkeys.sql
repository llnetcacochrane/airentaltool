-- Fix ALL foreign keys to auth.users that have NO ACTION/RESTRICT
-- Change them all to SET NULL so user deletion works

-- List of all tables with created_by/updated_by/user_id fields
-- that need to allow user deletion

BEGIN;

-- ai_api_keys.created_by
ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS ai_api_keys_created_by_fkey;
ALTER TABLE ai_api_keys ADD CONSTRAINT ai_api_keys_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- audit_logs.user_id (keep NO ACTION - we want to preserve audit trail)
-- Skip this one

-- email_diagnostic_logs.created_by
ALTER TABLE email_diagnostic_logs DROP CONSTRAINT IF EXISTS email_diagnostic_logs_created_by_fkey;
ALTER TABLE email_diagnostic_logs ADD CONSTRAINT email_diagnostic_logs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- expenses.created_by
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- leases.created_by
ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_created_by_fkey;
ALTER TABLE leases ADD CONSTRAINT leases_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- maintenance_requests.assigned_to
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_assigned_to_fkey;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- maintenance_requests.created_by
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_created_by_fkey;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- organization_members.invited_by
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- organization_package_settings.updated_by
ALTER TABLE organization_package_settings DROP CONSTRAINT IF EXISTS organization_package_settings_updated_by_fkey;
ALTER TABLE organization_package_settings ADD CONSTRAINT organization_package_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- organization_settings.updated_by
ALTER TABLE organization_settings DROP CONSTRAINT IF EXISTS organization_settings_updated_by_fkey;
ALTER TABLE organization_settings ADD CONSTRAINT organization_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- package_tier_versions.created_by
ALTER TABLE package_tier_versions DROP CONSTRAINT IF EXISTS package_tier_versions_created_by_fkey;
ALTER TABLE package_tier_versions ADD CONSTRAINT package_tier_versions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- package_tiers.created_by
ALTER TABLE package_tiers DROP CONSTRAINT IF EXISTS package_tiers_created_by_fkey;
ALTER TABLE package_tiers ADD CONSTRAINT package_tiers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- package_tiers.updated_by
ALTER TABLE package_tiers DROP CONSTRAINT IF EXISTS package_tiers_updated_by_fkey;
ALTER TABLE package_tiers ADD CONSTRAINT package_tiers_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- package_upgrade_notifications.responded_by
ALTER TABLE package_upgrade_notifications DROP CONSTRAINT IF EXISTS package_upgrade_notifications_responded_by_fkey;
ALTER TABLE package_upgrade_notifications ADD CONSTRAINT package_upgrade_notifications_responded_by_fkey
  FOREIGN KEY (responded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- platform_settings.updated_by
ALTER TABLE platform_settings DROP CONSTRAINT IF EXISTS platform_settings_updated_by_fkey;
ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- properties.created_by (already fixed but do it again to be sure)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_created_by_fkey;
ALTER TABLE properties ADD CONSTRAINT properties_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- property_owners.created_by
ALTER TABLE property_owners DROP CONSTRAINT IF EXISTS property_owners_created_by_fkey;
ALTER TABLE property_owners ADD CONSTRAINT property_owners_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- property_ownerships.created_by
ALTER TABLE property_ownerships DROP CONSTRAINT IF EXISTS property_ownerships_created_by_fkey;
ALTER TABLE property_ownerships ADD CONSTRAINT property_ownerships_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- rent_payments.created_by
ALTER TABLE rent_payments DROP CONSTRAINT IF EXISTS payments_created_by_fkey;
ALTER TABLE rent_payments ADD CONSTRAINT payments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- rental_applications.reviewed_by
ALTER TABLE rental_applications DROP CONSTRAINT IF EXISTS rental_applications_reviewed_by_fkey;
ALTER TABLE rental_applications ADD CONSTRAINT rental_applications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- super_admins.granted_by
ALTER TABLE super_admins DROP CONSTRAINT IF EXISTS super_admins_granted_by_fkey;
ALTER TABLE super_admins ADD CONSTRAINT super_admins_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- system_configuration.updated_by
ALTER TABLE system_configuration DROP CONSTRAINT IF EXISTS system_configuration_updated_by_fkey;
ALTER TABLE system_configuration ADD CONSTRAINT system_configuration_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- system_notifications.created_by
ALTER TABLE system_notifications DROP CONSTRAINT IF EXISTS system_notifications_created_by_fkey;
ALTER TABLE system_notifications ADD CONSTRAINT system_notifications_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- system_settings.updated_by
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE system_settings ADD CONSTRAINT system_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- tenants.created_by
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_created_by_fkey;
ALTER TABLE tenants ADD CONSTRAINT tenants_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- unit_tenant_access.granted_by
ALTER TABLE unit_tenant_access DROP CONSTRAINT IF EXISTS unit_tenant_access_granted_by_fkey;
ALTER TABLE unit_tenant_access ADD CONSTRAINT unit_tenant_access_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- units.created_by
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_created_by_fkey;
ALTER TABLE units ADD CONSTRAINT units_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- user_feature_overrides.granted_by
ALTER TABLE user_feature_overrides DROP CONSTRAINT IF EXISTS user_feature_overrides_granted_by_fkey;
ALTER TABLE user_feature_overrides ADD CONSTRAINT user_feature_overrides_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- user_limit_overrides.granted_by
ALTER TABLE user_limit_overrides DROP CONSTRAINT IF EXISTS user_limit_overrides_granted_by_fkey;
ALTER TABLE user_limit_overrides ADD CONSTRAINT user_limit_overrides_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;

-- Verify - should return 0 rows
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND ccu.table_schema = 'auth'
  AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
