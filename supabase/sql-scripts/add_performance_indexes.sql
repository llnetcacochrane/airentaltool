-- Performance Indexes for AI Rental Tools
-- Version: 5.0.0
-- Date: 2025-12-14
-- Purpose: Improve query performance for common operations

-- ============================================
-- BUSINESSES TABLE INDEXES
-- ============================================

-- Index for finding businesses by owner
CREATE INDEX IF NOT EXISTS idx_businesses_owner_user_id
ON businesses(owner_user_id) WHERE deleted_at IS NULL;

-- Index for finding businesses by organization (legacy support)
CREATE INDEX IF NOT EXISTS idx_businesses_organization_id
ON businesses(organization_id) WHERE organization_id IS NOT NULL AND deleted_at IS NULL;

-- Index for business name searches
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
ON businesses USING gin (name gin_trgm_ops);

-- ============================================
-- PROPERTIES TABLE INDEXES
-- ============================================

-- Composite index for business properties
CREATE INDEX IF NOT EXISTS idx_properties_business_id_status
ON properties(business_id, status) WHERE deleted_at IS NULL;

-- Index for property type filtering
CREATE INDEX IF NOT EXISTS idx_properties_property_type
ON properties(property_type) WHERE deleted_at IS NULL;

-- Index for address searches
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm
ON properties USING gin (address gin_trgm_ops);

-- Index for property city searches
CREATE INDEX IF NOT EXISTS idx_properties_city
ON properties(city) WHERE deleted_at IS NULL;

-- ============================================
-- UNITS TABLE INDEXES
-- ============================================

-- Composite index for property units
CREATE INDEX IF NOT EXISTS idx_units_property_id_status
ON units(property_id, status) WHERE deleted_at IS NULL;

-- Index for available units
CREATE INDEX IF NOT EXISTS idx_units_available
ON units(property_id) WHERE status = 'vacant' AND deleted_at IS NULL;

-- Index for unit number searches within a property
CREATE INDEX IF NOT EXISTS idx_units_property_unit_number
ON units(property_id, unit_number);

-- ============================================
-- TENANTS TABLE INDEXES
-- ============================================

-- Index for finding tenants by unit
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id
ON tenants(unit_id) WHERE deleted_at IS NULL;

-- Index for tenant email lookups
CREATE INDEX IF NOT EXISTS idx_tenants_email
ON tenants(email) WHERE deleted_at IS NULL;

-- Index for tenant name searches
CREATE INDEX IF NOT EXISTS idx_tenants_full_name_trgm
ON tenants USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Index for tenant status filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status
ON tenants(status) WHERE deleted_at IS NULL;

-- ============================================
-- LEASES TABLE INDEXES
-- ============================================

-- Composite index for active leases
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id_active
ON leases(tenant_id, start_date, end_date)
WHERE status = 'active' AND deleted_at IS NULL;

-- Index for expiring leases (renewal opportunities)
CREATE INDEX IF NOT EXISTS idx_leases_expiring
ON leases(end_date) WHERE status = 'active' AND deleted_at IS NULL;

-- Index for lease start dates
CREATE INDEX IF NOT EXISTS idx_leases_start_date
ON leases(start_date) WHERE deleted_at IS NULL;

-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================

-- Composite index for tenant payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id_date
ON payments(tenant_id, payment_date DESC) WHERE deleted_at IS NULL;

-- Index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_payments_status_date
ON payments(status, payment_date DESC) WHERE deleted_at IS NULL;

-- Index for pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending
ON payments(tenant_id, due_date)
WHERE status IN ('pending', 'overdue') AND deleted_at IS NULL;

-- Index for payment amounts (for financial reports)
CREATE INDEX IF NOT EXISTS idx_payments_amount_date
ON payments(payment_date, amount) WHERE deleted_at IS NULL;

-- ============================================
-- MAINTENANCE REQUESTS TABLE INDEXES
-- ============================================

-- Composite index for property maintenance
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id_status
ON maintenance_requests(property_id, status) WHERE deleted_at IS NULL;

-- Index for unit maintenance
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id
ON maintenance_requests(unit_id) WHERE deleted_at IS NULL;

-- Index for urgent maintenance requests
CREATE INDEX IF NOT EXISTS idx_maintenance_priority
ON maintenance_requests(priority, created_at DESC)
WHERE status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL;

-- Index for maintenance request dates
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at
ON maintenance_requests(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- EXPENSES TABLE INDEXES
-- ============================================

-- Index for property expenses
CREATE INDEX IF NOT EXISTS idx_expenses_property_id_date
ON expenses(property_id, expense_date DESC) WHERE deleted_at IS NULL;

-- Index for expense categories
CREATE INDEX IF NOT EXISTS idx_expenses_category_date
ON expenses(category, expense_date DESC) WHERE deleted_at IS NULL;

-- Index for expense amounts (for financial reports)
CREATE INDEX IF NOT EXISTS idx_expenses_date_amount
ON expenses(expense_date, amount) WHERE deleted_at IS NULL;

-- ============================================
-- RENTAL APPLICATIONS TABLE INDEXES
-- ============================================

-- Index for property applications
CREATE INDEX IF NOT EXISTS idx_applications_property_id_status
ON rental_applications(property_id, status) WHERE deleted_at IS NULL;

-- Index for application email lookups
CREATE INDEX IF NOT EXISTS idx_applications_email
ON rental_applications(email) WHERE deleted_at IS NULL;

-- Index for application dates
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at
ON rental_applications(submitted_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- SUPER ADMINS TABLE INDEXES
-- ============================================

-- Index for active super admins
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id_active
ON super_admins(user_id) WHERE is_active = true;

-- ============================================
-- ORGANIZATION MEMBERS TABLE INDEXES
-- ============================================

-- Composite index for organization membership lookups
CREATE INDEX IF NOT EXISTS idx_org_members_org_user
ON organization_members(organization_id, user_id) WHERE deleted_at IS NULL;

-- Index for user's organizations
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
ON organization_members(user_id) WHERE deleted_at IS NULL;

-- Index for organization roles
CREATE INDEX IF NOT EXISTS idx_org_members_role
ON organization_members(organization_id, role) WHERE deleted_at IS NULL;

-- ============================================
-- ENABLE PG_TRGM EXTENSION
-- (Required for full-text search indexes)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ANALYZE TABLES
-- (Update table statistics for query planner)
-- ============================================

ANALYZE businesses;
ANALYZE properties;
ANALYZE units;
ANALYZE tenants;
ANALYZE leases;
ANALYZE payments;
ANALYZE maintenance_requests;
ANALYZE expenses;
ANALYZE rental_applications;
ANALYZE super_admins;
ANALYZE organization_members;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Get index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
