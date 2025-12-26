# AI Rental Tools - Administrator Guide

**Version:** 5.0.0
**Last Updated:** December 2024

This guide is for system administrators and super admins who manage the AI Rental Tools platform.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Super Admin Access](#super-admin-access)
3. [User Management](#user-management)
4. [Package & Tier Management](#package--tier-management)
5. [Organization Management](#organization-management)
6. [Database Management](#database-management)
7. [Server Deployment](#server-deployment)
8. [Security & Best Practices](#security--best-practices)
9. [Monitoring & Diagnostics](#monitoring--diagnostics)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Hosting:** Ubuntu Server (AWS/DigitalOcean)
- **Web Server:** Nginx (reverse proxy)
- **Build Tool:** Vite (production builds)

### Data Model

The system uses a **business-centric architecture**:

```
User (auth.users)
  └─ User Profile (user_profiles)
      └─ Business(es) (businesses)
          └─ Properties (properties)
              └─ Units (units)
                  └─ Tenants/Leases (tenants, leases)
```

**Key Points:**
- **No organization layer** for most users (legacy field exists but is typically null)
- `businesses` table is the top-level entity
- Package tiers control limits (max businesses, properties, units)
- Row Level Security (RLS) policies enforce access control

### Server Architecture

- **Production:** `/opt/airentaltools/` (built static files)
- **Development:** `/home/ubuntu/airentaltools-dev/` (source code)
- **Nginx Config:** `/etc/nginx/sites-available/airentaltools`
- **Database:** Remote Supabase instance (connection via env vars)

---

## Super Admin Access

### Creating a Super Admin

Super admins are managed via the `super_admins` table. To create a super admin:

```sql
-- Connect to database
PGPASSWORD='your_password' psql -h <db_host> -p 5432 -U supabase_admin -d airentaltools

-- Find the user
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Add to super_admins table
INSERT INTO super_admins (user_id, is_active, created_at)
VALUES ('user-uuid-here', true, NOW());
```

### Super Admin Features

Super admins have access to:

- **User Management** (`/super-admin/users`)
  - View all users
  - Impersonate users (god mode)
  - Edit user profiles
  - Manage package assignments

- **System Configuration** (`/super-admin/config`)
  - Platform settings
  - Feature flags
  - Email templates

- **Package Management** (`/super-admin/packages`)
  - Create/edit package tiers
  - Set limits (businesses, properties, units)
  - Configure pricing

- **Organization Settings** (`/super-admin/organizations/:id/package`)
  - Override package limits per organization
  - Custom tier assignments

- **AI API Keys** (`/super-admin/ai-keys`)
  - Manage OpenAI/Anthropic API keys
  - Monitor AI usage

- **Email Diagnostics** (`/super-admin/email-diagnostics`)
  - Test email delivery
  - View email logs
  - Troubleshoot SMTP issues

### God Mode (Impersonation)

Super admins can impersonate users to diagnose issues:

1. Navigate to `/super-admin/users`
2. Click "Impersonate" next to a user
3. Yellow banner indicates god mode is active
4. All data shown is for the impersonated user
5. Click "Exit God Mode" to return to admin view

**Security Note:** God mode sessions are stored in `sessionStorage` and validated server-side. Only active super admins can impersonate.

---

## User Management

### User Lifecycle

1. **Registration**
   - User signs up via `/register`
   - Email verification sent automatically
   - User profile created in `user_profiles`
   - Default business created in `businesses`

2. **Email Verification**
   - Users must verify email to access full features
   - Resend verification via `EmailVerificationReminder` component
   - Verification status: `auth.users.email_confirmed_at`

3. **Onboarding**
   - First-time users see onboarding wizard
   - Prompts to add first property/business
   - Can be dismissed (stored in localStorage)

### Managing Users

**View All Users:**
```sql
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  up.first_name,
  up.last_name,
  up.selected_tier,
  sa.is_active as is_super_admin
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN super_admins sa ON u.id = sa.user_id
ORDER BY u.created_at DESC;
```

**Reset User Password:**
```sql
-- User must request password reset via app
-- Or manually trigger via Supabase Auth dashboard
```

**Deactivate User:**
```sql
-- Mark businesses as inactive
UPDATE businesses
SET is_active = false
WHERE owner_user_id = 'user-uuid';

-- Optionally delete user (cascades to related data)
DELETE FROM auth.users WHERE id = 'user-uuid';
```

---

## Package & Tier Management

### Package Tiers Structure

Tiers are defined in `package_tiers` table:

```sql
SELECT
  tier_slug,
  tier_name,
  package_type,  -- 'single_company' or 'management_company'
  max_businesses,
  max_properties,
  max_units,
  max_users,
  price_monthly_cad,
  is_active
FROM package_tiers
ORDER BY display_order;
```

### Standard Tiers

1. **Free** - 1 business, 1 property, 5 units
2. **Basic** - 1 business, 5 properties, 25 units
3. **Professional** - 1 business, 25 properties, 100 units
4. **Management Company** - Multiple businesses, unlimited properties

### Creating a New Tier

```sql
INSERT INTO package_tiers (
  tier_slug,
  tier_name,
  package_type,
  max_businesses,
  max_properties,
  max_units,
  max_users,
  price_monthly_cad,
  is_active,
  display_order
) VALUES (
  'enterprise',
  'Enterprise',
  'management_company',
  999,
  999,
  9999,
  50,
  499.00,
  true,
  5
);
```

### Custom Tier Overrides

Override limits for specific organizations:

```sql
INSERT INTO organization_package_settings (
  organization_id,
  package_tier_id,
  max_businesses,
  max_properties,
  max_units,
  effective_date
) VALUES (
  'org-uuid',
  (SELECT id FROM package_tiers WHERE tier_slug = 'professional'),
  5,
  100,
  500,
  NOW()
);
```

---

## Organization Management

**Note:** In v5.0, organizations are mostly legacy. Most users operate with businesses directly.

### When Organizations Are Used

- Multi-company property managers
- Enterprise clients with complex hierarchies
- White-label partners

### Managing Organizations

```sql
-- View organizations
SELECT
  o.id,
  o.name,
  o.created_at,
  COUNT(DISTINCT b.id) as business_count,
  COUNT(DISTINCT om.user_id) as member_count
FROM organizations o
LEFT JOIN businesses b ON o.id = b.organization_id
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.created_at;

-- Add user to organization
INSERT INTO organization_members (
  organization_id,
  user_id,
  role,
  is_active
) VALUES (
  'org-uuid',
  'user-uuid',
  'member',
  true
);
```

---

## Database Management

### Connection Info

```bash
# Environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Direct psql connection
PGPASSWORD='admin-password' psql \
  -h your-db-host \
  -p 5432 \
  -U supabase_admin \
  -d airentaltools
```

### Running Migrations

Migrations are SQL files in `/migrations/` directory:

```bash
# Execute migration
PGPASSWORD='password' psql \
  -h <host> \
  -p 5432 \
  -U supabase_admin \
  -d airentaltools \
  -f /path/to/migration.sql

# Verify migration
PGPASSWORD='password' psql \
  -h <host> \
  -p 5432 \
  -U supabase_admin \
  -d airentaltools \
  -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Database Backups

**Automated Backups:**
- Supabase performs daily backups automatically
- Retention: 7 days (Free), 30 days (Pro)

**Manual Backup:**
```bash
# Full database dump
pg_dump \
  -h <host> \
  -U supabase_admin \
  -d airentaltools \
  -F c \
  -f backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore \
  -h <host> \
  -U supabase_admin \
  -d airentaltools \
  -F c \
  backup_20241214.dump
```

### Key Tables

- `auth.users` - User authentication (managed by Supabase)
- `user_profiles` - Extended user information
- `super_admins` - Super admin privileges
- `businesses` - Top-level business entities
- `properties` - Rental properties
- `units` - Individual rental units
- `tenants` - Tenant information
- `leases` - Lease agreements
- `payments` - Payment records
- `package_tiers` - Subscription tiers
- `admin_audit_log` - Admin action logging

---

## Server Deployment

### Build Process

```bash
# From development directory
cd /home/ubuntu/airentaltools-dev

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to production
sudo rm -rf /opt/airentaltools/*
sudo cp -r dist/* /opt/airentaltools/
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /opt/airentaltools;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL/TLS Setup

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

### Environment Variables

Production environment variables in `/home/ubuntu/airentaltools-dev/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
```

---

## Security & Best Practices

### Row Level Security (RLS)

All tables use RLS policies to restrict access:

```sql
-- Example: Users can only see their own businesses
CREATE POLICY "Users can view own businesses"
ON businesses
FOR SELECT
USING (owner_user_id = auth.uid());

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Security Checklist

- ✅ RLS enabled on all public tables
- ✅ Email verification required
- ✅ Session timeout (30 minutes inactivity)
- ✅ HTTPS/SSL enforced
- ✅ API keys stored securely (Supabase Vault)
- ✅ Password reset requires email verification
- ✅ Super admin actions logged in `admin_audit_log`

### Admin Audit Logging

All super admin actions are logged:

```sql
SELECT
  action,
  admin_user_id,
  target_user_id,
  details,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 100;
```

### Rate Limiting

Rate limiting utilities in `src/utils/rateLimiter.ts`:
- Prevents brute force attacks
- Limits API calls per user
- Configurable thresholds

---

## Monitoring & Diagnostics

### Email Diagnostics

Access: `/super-admin/email-diagnostics`

Features:
- Test email delivery
- View recent email logs
- Verify SMTP configuration
- Check email templates

### Database Performance

```sql
-- View slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 20;
```

### Application Logs

- **Client-side errors:** `errorLoggingService` (see `src/services/errorLoggingService.ts`)
- **Server logs:** Nginx access/error logs (`/var/log/nginx/`)
- **Database logs:** Supabase dashboard

---

## Troubleshooting

### Common Issues

**1. User can't log in**

Check:
- Email verified? `SELECT email_confirmed_at FROM auth.users WHERE email = '...'`
- Account exists? `SELECT * FROM auth.users WHERE email = '...'`
- Password reset needed?

**2. User hit package limits**

```sql
-- Check current usage
SELECT
  u.email,
  up.selected_tier,
  COUNT(DISTINCT b.id) as businesses,
  COUNT(DISTINCT p.id) as properties,
  COUNT(DISTINCT un.id) as units
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN businesses b ON u.id = b.owner_user_id
LEFT JOIN properties p ON b.id = p.business_id
LEFT JOIN units un ON p.id = un.property_id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, up.selected_tier;

-- Compare with tier limits
SELECT * FROM package_tiers WHERE tier_slug = 'basic';
```

**3. Build failures**

```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**4. Database connection issues**

```bash
# Test connection
PGPASSWORD='password' psql -h <host> -p 5432 -U supabase_admin -d airentaltools -c "SELECT 1;"

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

**5. Email not sending**

- Check Supabase Auth settings
- Verify email templates configured
- Test via Email Diagnostics panel
- Check SMTP logs in Supabase dashboard

---

## Emergency Procedures

### System Down

1. Check Nginx status: `sudo systemctl status nginx`
2. Check server resources: `htop` or `free -h`
3. Check Supabase status: https://status.supabase.com
4. Review Nginx logs: `sudo tail -100 /var/log/nginx/error.log`

### Database Corruption

1. Stop accepting new connections
2. Create immediate backup
3. Restore from last known good backup
4. Verify data integrity
5. Re-enable connections

### Security Breach

1. Immediately revoke compromised credentials
2. Force password reset for all users
3. Review audit logs for unauthorized access
4. Rotate API keys
5. Enable additional security measures
6. Notify affected users

---

## Support Contacts

- **Platform Issues:** Check GitHub issues
- **Supabase Support:** https://supabase.com/support
- **Emergency Contact:** [Your emergency contact info]

---

## Appendix

### Useful SQL Queries

**User Statistics:**
```sql
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as verified_users,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d
FROM auth.users;
```

**Revenue by Tier:**
```sql
SELECT
  pt.tier_name,
  COUNT(DISTINCT up.user_id) as users,
  pt.price_monthly_cad,
  COUNT(DISTINCT up.user_id) * pt.price_monthly_cad as mrr
FROM user_profiles up
JOIN package_tiers pt ON up.selected_tier = pt.tier_slug
WHERE pt.is_active = true
GROUP BY pt.tier_name, pt.price_monthly_cad
ORDER BY mrr DESC;
```

**Active Leases:**
```sql
SELECT
  COUNT(*) as active_leases,
  SUM(monthly_rent) as total_monthly_rent
FROM leases
WHERE status = 'active'
AND end_date > NOW();
```

---

**End of Administrator Guide**
