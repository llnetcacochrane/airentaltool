# Admin Audit Log - Documentation

## Overview

The `admin_audit_log` table provides a complete audit trail of all super admin actions, with a primary focus on tracking god mode (user impersonation) sessions.

## Table Structure

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier for the audit log entry |
| `admin_user_id` | UUID | The super admin who performed the action |
| `action` | TEXT | Type of action performed (e.g., 'impersonate_user', 'exit_impersonation') |
| `target_user_id` | UUID | The user affected by the action (e.g., the impersonated user) |
| `metadata` | JSONB | Additional context data stored as JSON |
| `created_at` | TIMESTAMPTZ | When the action occurred |

## Indexes

The following indexes ensure fast queries:

1. **idx_admin_audit_admin** - Find all actions by a specific admin
2. **idx_admin_audit_target** - Find all actions affecting a specific user
3. **idx_admin_audit_created** - Find recent actions (DESC order)
4. **idx_admin_audit_action** - Find all instances of a specific action type

## Security (RLS Policies)

Row Level Security is enabled with two policies:

1. **Super admins can view all audit logs**
   - Only active super admins can SELECT from this table

2. **Super admins can insert audit logs**
   - Only active super admins can INSERT into this table

## Action Types

### God Mode Actions

#### `impersonate_user`
Logged when a super admin starts impersonating another user.

**Example:**
```javascript
{
  admin_user_id: "123e4567-e89b-12d3-a456-426614174000",
  action: "impersonate_user",
  target_user_id: "987fcdeb-51a2-43f1-b789-123456789abc",
  metadata: {
    target_email: "user@example.com",
    timestamp: "2025-12-14T10:30:00Z"
  }
}
```

#### `exit_impersonation`
Logged when a super admin exits god mode.

**Example:**
```javascript
{
  admin_user_id: "123e4567-e89b-12d3-a456-426614174000",
  action: "exit_impersonation",
  target_user_id: "987fcdeb-51a2-43f1-b789-123456789abc",
  metadata: {
    timestamp: "2025-12-14T10:45:00Z"
  }
}
```

## Usage Examples

### Query Recent Impersonations

```sql
SELECT
  u.email as admin_email,
  aal.action,
  t.email as target_email,
  aal.created_at
FROM admin_audit_log aal
JOIN auth.users u ON u.id = aal.admin_user_id
LEFT JOIN auth.users t ON t.id = aal.target_user_id
WHERE aal.action IN ('impersonate_user', 'exit_impersonation')
ORDER BY aal.created_at DESC
LIMIT 20;
```

### Find All Actions by Specific Admin

```sql
SELECT
  action,
  target_user_id,
  metadata,
  created_at
FROM admin_audit_log
WHERE admin_user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;
```

### Count Impersonations per Admin

```sql
SELECT
  u.email as admin_email,
  COUNT(*) as impersonation_count
FROM admin_audit_log aal
JOIN auth.users u ON u.id = aal.admin_user_id
WHERE aal.action = 'impersonate_user'
GROUP BY u.email
ORDER BY impersonation_count DESC;
```

### Find Users Who Have Been Impersonated

```sql
SELECT
  t.email as impersonated_user,
  COUNT(*) as times_impersonated,
  MAX(aal.created_at) as last_impersonated
FROM admin_audit_log aal
JOIN auth.users t ON t.id = aal.target_user_id
WHERE aal.action = 'impersonate_user'
GROUP BY t.email
ORDER BY times_impersonated DESC;
```

### Detect Active God Mode Sessions

```sql
-- Find impersonations without corresponding exits
WITH impersonations AS (
  SELECT
    admin_user_id,
    target_user_id,
    created_at as started_at
  FROM admin_audit_log
  WHERE action = 'impersonate_user'
),
exits AS (
  SELECT
    admin_user_id,
    target_user_id,
    created_at as ended_at
  FROM admin_audit_log
  WHERE action = 'exit_impersonation'
)
SELECT
  u.email as admin_email,
  t.email as target_email,
  i.started_at,
  'POSSIBLY ACTIVE' as status
FROM impersonations i
LEFT JOIN exits e ON
  e.admin_user_id = i.admin_user_id
  AND e.target_user_id = i.target_user_id
  AND e.ended_at > i.started_at
JOIN auth.users u ON u.id = i.admin_user_id
JOIN auth.users t ON t.id = i.target_user_id
WHERE e.ended_at IS NULL
ORDER BY i.started_at DESC;
```

## Maintenance

### Cleanup Old Logs

To prevent the table from growing too large, consider archiving or deleting old logs:

```sql
-- Archive logs older than 1 year
CREATE TABLE admin_audit_log_archive AS
SELECT * FROM admin_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete archived logs
DELETE FROM admin_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Monitor Table Size

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('admin_audit_log')) as total_size,
  pg_size_pretty(pg_relation_size('admin_audit_log')) as table_size,
  pg_size_pretty(pg_indexes_size('admin_audit_log')) as indexes_size,
  (SELECT COUNT(*) FROM admin_audit_log) as row_count;
```

## Best Practices

1. **Never delete recent logs** - Keep at least 90 days of history
2. **Regular monitoring** - Review god mode usage weekly
3. **Alert on suspicious activity** - Set up alerts for unusual impersonation patterns
4. **Archive old data** - Move logs older than 1 year to archive table
5. **Document exceptions** - Use metadata field to explain unusual actions

## Integration with Application

The audit log is automatically populated by:

- **ImpersonateUser.tsx** - Logs when impersonation starts
- **GodModeBanner.tsx** - Logs when impersonation ends

Code example:
```typescript
// Log impersonation start
await supabase
  .from('admin_audit_log')
  .insert({
    admin_user_id: user.id,
    action: 'impersonate_user',
    target_user_id: targetUserId,
    metadata: {
      target_email: targetUser.email,
      timestamp: new Date().toISOString(),
    },
  });
```

## Compliance

This audit log helps with:

- **GDPR compliance** - Track who accessed user data
- **SOC 2 compliance** - Demonstrate access controls
- **Internal audits** - Review admin actions
- **Security incidents** - Investigate suspicious activity
- **User support** - Verify when support accessed accounts

## Migration Files

- **Create:** `/migrations/create_admin_audit_log.sql`
- **Verify:** `/migrations/verify_admin_audit_log.sql`

---

**Version:** 5.0.0
**Created:** December 14, 2025
**Last Updated:** December 14, 2025
