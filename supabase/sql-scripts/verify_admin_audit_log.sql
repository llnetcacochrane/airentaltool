-- Verification script for admin_audit_log table
-- Run this to verify the table is working correctly

-- 1. Check table exists and has correct structure
SELECT
  'Table Structure' as check_type,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'admin_audit_log';

-- 2. Check indexes exist
SELECT
  'Indexes' as check_type,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'admin_audit_log';

-- 3. Check RLS is enabled
SELECT
  'RLS Enabled' as check_type,
  relrowsecurity::text as enabled
FROM pg_class
WHERE relname = 'admin_audit_log';

-- 4. Check policies exist
SELECT
  'RLS Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'admin_audit_log';

-- 5. Show current row count
SELECT
  'Current Records' as check_type,
  COUNT(*)::text as record_count
FROM admin_audit_log;

-- 6. Show recent audit log entries (if any)
SELECT
  'Recent Audit Logs' as info,
  id,
  action,
  created_at,
  (metadata->>'timestamp')::text as event_timestamp
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 5;
