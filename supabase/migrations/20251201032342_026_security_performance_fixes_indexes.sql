/*
  # Security and Performance Fixes - Part 1: Missing Indexes

  ## Overview
  This migration adds missing indexes for foreign keys to improve query performance.
  Unindexed foreign keys can lead to slow queries, especially on JOINs and lookups.

  ## Changes
  - Add indexes for all unindexed foreign keys
  - Improves JOIN performance
  - Speeds up referential integrity checks
  - Reduces query execution time

  ## Performance Impact
  - Significantly faster queries on related tables
  - Better performance for cascading operations
  - Improved database scalability
*/

-- =====================================================
-- STEP 1: Add Indexes for Created By Foreign Keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON businesses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_leases_created_by ON leases(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by ON maintenance_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);
CREATE INDEX IF NOT EXISTS idx_property_owners_created_by ON property_owners(created_by);
CREATE INDEX IF NOT EXISTS idx_property_ownerships_created_by ON property_ownerships(created_by);
CREATE INDEX IF NOT EXISTS idx_rent_payments_created_by ON rent_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_rental_application_forms_created_by ON rental_application_forms(created_by);
CREATE INDEX IF NOT EXISTS idx_rental_listings_created_by ON rental_listings(created_by);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_created_by ON tenant_invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_units_created_by ON units(created_by);

-- =====================================================
-- STEP 2: Add Indexes for Other Foreign Keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leases_renewed_to_lease_id ON leases(renewed_to_lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_organization_addon_purchases_addon_product_id ON organization_addon_purchases(addon_product_id);
CREATE INDEX IF NOT EXISTS idx_organization_package_settings_updated_by ON organization_package_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_package_tier_versions_created_by ON package_tier_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_package_tiers_created_by ON package_tiers(created_by);
CREATE INDEX IF NOT EXISTS idx_package_tiers_updated_by ON package_tiers(updated_by);
CREATE INDEX IF NOT EXISTS idx_package_upgrade_notifications_old_package_tier_id ON package_upgrade_notifications(old_package_tier_id);
CREATE INDEX IF NOT EXISTS idx_package_upgrade_notifications_responded_by ON package_upgrade_notifications(responded_by);
CREATE INDEX IF NOT EXISTS idx_rental_application_forms_organization_id ON rental_application_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_converted_to_tenant_id ON rental_applications(converted_to_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_property_id ON rental_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_reviewed_by ON rental_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_rental_applications_unit_id ON rental_applications(unit_id);
CREATE INDEX IF NOT EXISTS idx_rental_listings_application_form_id ON rental_listings(application_form_id);
CREATE INDEX IF NOT EXISTS idx_rental_listings_property_id ON rental_listings(property_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_package_tier_id ON subscription_payments(package_tier_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_property_id ON tenant_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_tenant_access_granted_by ON unit_tenant_access(granted_by);

COMMENT ON INDEX idx_businesses_created_by IS 'Improves queries filtering by creator';
COMMENT ON INDEX idx_leases_renewed_to_lease_id IS 'Improves lease renewal chain queries';
COMMENT ON INDEX idx_maintenance_requests_assigned_to IS 'Improves assigned maintenance lookups';
