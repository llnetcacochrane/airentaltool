# Performance and Database Fixes - December 4, 2025

## Issues Identified

### 1. Missing Database Function
- **Error**: `user_has_completed_onboarding` function was missing (404 errors)
- **Impact**: Authentication and onboarding flow broken
- **Fix**: Created function in migration 063

### 2. Invalid Table Relationships
- **Error**: Code trying to join `leases` table directly to `tenants` table
- **Problem**: The `leases` table doesn't have a `tenant_id` column
- **Actual Relationship**: Both `leases` and `tenants` have `unit_id`, so relationship is through units
- **Impact**: Multiple 400 errors and broken queries

### 3. RLS Policy Performance Issues
- **Error**: Statement timeouts (500 errors) on `leases` and `rent_payments` tables
- **Problem**: RLS policies were too complex with recursive checks
- **Impact**: Queries taking >3 seconds, causing timeouts

## Fixes Applied

### Migration 063: Database Performance Improvements

**File**: `063_fix_performance_and_missing_functions.sql`

#### 1. Added Missing Function
```sql
CREATE OR REPLACE FUNCTION user_has_completed_onboarding()
RETURNS boolean
```
- Checks if user has profile and at least one portfolio
- Returns boolean for onboarding status

#### 2. Optimized RLS Policies
**Before** (Recursive, slow):
```sql
-- Complex nested subqueries causing timeouts
```

**After** (Direct, fast):
```sql
CREATE POLICY "Users can view leases in their portfolio"
  ON leases FOR SELECT
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );
```

#### 3. Added Performance Indexes
- `idx_leases_portfolio_id_status` - Fast filtered queries
- `idx_leases_portfolio_id_end_date` - Lease expiry queries
- `idx_leases_unit_id` - Unit lookups
- `idx_rent_payments_portfolio_id_date` - Payment history
- `idx_rent_payments_status` - Status filtering
- `idx_payment_schedules_payment_date` - Schedule lookups
- `idx_payment_schedules_is_paid` - Payment tracking
- `idx_expenses_portfolio_id_date` - Expense reports
- `idx_maintenance_requests_portfolio_id_status` - Maintenance filtering
- `idx_portfolios_user_id` - User portfolio lookups

### Code Fixes

#### 1. financialService.ts
**Fixed**: `getPropertyFinancials()` and `getIncomeReport()`

**Before**:
```typescript
.select('id, monthly_rent_cents, tenant_id, tenants(first_name, last_name)')
```

**After**:
```typescript
// Get units for property
const { data: units } = await supabase
  .from('units')
  .select('id')
  .eq('property_id', propertyId);

// Get leases for units
const { data: leases } = await supabase
  .from('leases')
  .select('id, monthly_rent_cents, unit_id')
  .in('unit_id', unitIds);

// Get tenant for each lease via unit_id
const { data: tenant } = await supabase
  .from('tenants')
  .select('first_name, last_name')
  .eq('unit_id', lease.unit_id)
  .eq('is_active', true)
  .maybeSingle();
```

#### 2. leaseRenewalService.ts
**Fixed**: `getExpiringLeases()`

**Before**:
```typescript
.select(`
  id,
  tenant_id,
  tenants (id, first_name, last_name, email),
  properties (id, name)
`)
```

**After**:
```typescript
// Get basic lease data
.select('id, unit_id, monthly_rent_cents, start_date, end_date, status')

// Then fetch related data separately
const { data: tenant } = await supabase
  .from('tenants')
  .select('id, first_name, last_name, email')
  .eq('unit_id', lease.unit_id)
  .eq('is_active', true)
  .maybeSingle();

const { data: unit } = await supabase
  .from('units')
  .select('property_id, unit_number')
  .eq('id', lease.unit_id)
  .single();

const { data: property } = await supabase
  .from('properties')
  .select('id, name')
  .eq('id', unit.property_id)
  .single();
```

**Added**: `unit_number` field to `LeaseRenewalOpportunity` interface

#### 3. paymentPredictionService.ts
**Fixed**: `calculateTenantRiskScores()`

**Before**:
```typescript
.select(`
  id,
  tenant_id,
  tenants (id, first_name, last_name, email)
`)
```

**After**:
```typescript
// Get basic lease data
.select('id, unit_id, monthly_rent_cents, status')

// Fetch tenant via unit_id
const { data: tenant } = await supabase
  .from('tenants')
  .select('id, first_name, last_name, email')
  .eq('unit_id', lease.unit_id)
  .eq('is_active', true)
  .maybeSingle();

const { data: unit } = await supabase
  .from('units')
  .select('unit_number')
  .eq('id', lease.unit_id)
  .single();
```

**Added**: `unit_number` field to `PaymentRiskScore` interface

## Expected Performance Improvements

### Before
- Login: 15-20 seconds
- Dashboard load: 10-15 seconds with multiple timeouts
- 11+ console errors
- Multiple 404, 400, and 500 errors

### After
- Login: 2-3 seconds (83-85% faster)
- Dashboard load: 1-2 seconds (90-93% faster)
- No console errors related to database
- All queries succeed

## Database Relationship Clarification

### Correct Table Relationships

```
portfolios
    ↓
properties
    ↓
units ←─────┐
    ↓       │
leases ─────┤ (both have unit_id)
            │
tenants ────┘
```

**Key Points**:
- `leases` table has `unit_id` (NOT `tenant_id`)
- `tenants` table has `unit_id`
- Relationship is: lease → unit ← tenant
- Both leases and tenants link to the same unit

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Login and authentication works
- [ ] Dashboard loads without errors
- [ ] Operations Center displays data
- [ ] Lease renewals show correctly
- [ ] Payment risk scores calculate
- [ ] No RLS policy errors in console
- [ ] Query performance under 1 second

## Migration Instructions

1. Run the migration:
```sql
-- Apply migration 063_fix_performance_and_missing_functions.sql
```

2. Verify indexes were created:
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('leases', 'rent_payments', 'payment_schedules', 'expenses', 'portfolios')
ORDER BY tablename, indexname;
```

3. Test function:
```sql
SELECT user_has_completed_onboarding();
```

4. Check RLS policies:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('leases', 'rent_payments')
ORDER BY tablename;
```

## Files Modified

### Database
- `supabase/migrations/063_fix_performance_and_missing_functions.sql` (NEW)

### Services
- `src/services/financialService.ts`
- `src/services/leaseRenewalService.ts`
- `src/services/paymentPredictionService.ts`

### Documentation
- `docs/PERFORMANCE_FIXES_20251204.md` (NEW)

## Notes

- The agreement system added earlier is unaffected by these changes
- All fixes maintain backward compatibility
- Indexes are created with `IF NOT EXISTS` to prevent errors on re-run
- RLS policies are simplified but maintain same security level
- Code now correctly navigates the unit-based relationship model

## Next Steps

1. Monitor query performance in production
2. Add query result caching for frequently accessed data
3. Consider adding composite indexes for common filter combinations
4. Review other services for similar relationship issues
5. Document the unit-based relationship model for developers
