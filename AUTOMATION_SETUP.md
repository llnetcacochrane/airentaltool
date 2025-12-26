# Automation & Notifications Setup Guide

This document explains how to set up and configure the automated notification and late fee systems in AI Rental Tools.

## Overview

The system includes:
1. **Notification System** - Email notifications for rent reminders, maintenance updates, payment confirmations, etc.
2. **Late Fee System** - Automatic late fee assessment and tracking
3. **Automation Worker** - Scheduled tasks that run periodically

## Database Setup

### 1. Run the Notifications Migration

Execute the migration to create required tables:

```bash
# From Supabase SQL editor or via migration tool
psql -h your-supabase-host -U postgres -d postgres -f migrations/add_notifications_and_late_fees.sql
```

This creates:
- `notification_templates` - Email templates with variable substitution
- `scheduled_notifications` - Queue of notifications to be sent
- `late_fees` - Late fee records
- `late_fee_configurations` - Late fee rules per business
- `notification_preferences` - Notification settings per business

### 2. Initialize Default Templates

Call the service method to create default email templates:

```typescript
import { notificationService } from './services/notificationService';

await notificationService.ensureDefaultTemplates();
```

This creates templates for:
- Rent reminders (7, 3, 1 days before due)
- Rent overdue notices
- Payment confirmations
- Maintenance request notifications
- Lease expiration reminders
- Welcome messages
- Tenant invitations
- Agreement signing requests

## Email Provider Configuration

### Option 1: SendGrid

1. Sign up at https://sendgrid.com
2. Get your API key
3. Add to `.env`:

```bash
VITE_EMAIL_PROVIDER=sendgrid
VITE_SENDGRID_API_KEY=your-api-key-here
VITE_EMAIL_FROM=noreply@yourdomain.com
```

### Option 2: Mailgun

1. Sign up at https://mailgun.com
2. Get your API key and domain
3. Add to `.env`:

```bash
VITE_EMAIL_PROVIDER=mailgun
VITE_MAILGUN_API_KEY=your-api-key-here
VITE_MAILGUN_DOMAIN=mg.yourdomain.com
VITE_EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: Resend

1. Sign up at https://resend.com
2. Get your API key
3. Add to `.env`:

```bash
VITE_EMAIL_PROVIDER=resend
VITE_RESEND_API_KEY=your-api-key-here
VITE_EMAIL_FROM=noreply@yourdomain.com
```

### Option 4: SMTP (Requires Backend)

For SMTP, you'll need a backend service to handle email sending.

```bash
VITE_EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
VITE_EMAIL_FROM=your-email@gmail.com
```

## Automation Worker Setup

The automation worker should run periodically via cron jobs or a task scheduler.

### Option 1: Supabase Edge Functions (Recommended)

Create a Supabase Edge Function:

```typescript
// supabase/functions/automation-worker/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Import and run automation tasks
  // Note: You'll need to adapt the TypeScript code for Deno

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Schedule with Supabase Cron:
```sql
select cron.schedule(
  'process-notifications',
  '*/5 * * * *', -- Every 5 minutes
  $$
  select net.http_post(
    url:='https://your-project.supabase.co/functions/v1/automation-worker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"task": "processNotifications"}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'daily-automation',
  '0 6 * * *', -- Daily at 6 AM
  $$
  select net.http_post(
    url:='https://your-project.supabase.co/functions/v1/automation-worker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"task": "runDailyTasks"}'::jsonb
  ) as request_id;
  $$
);
```

### Option 2: External Cron Service (e.g., cron-job.org)

1. Create an API endpoint that calls the automation worker
2. Set up external cron jobs to hit that endpoint

```bash
# Every 5 minutes
*/5 * * * * curl -X POST https://yourapi.com/api/automation/notifications

# Daily at 6 AM
0 6 * * * curl -X POST https://yourapi.com/api/automation/daily
```

### Option 3: Server-side Cron (if self-hosting)

Create a cron job on your server:

```bash
# Edit crontab
crontab -e

# Add these lines
*/5 * * * * /usr/bin/node /path/to/automation-worker.js --task=notifications
0 6 * * * /usr/bin/node /path/to/automation-worker.js --task=daily
```

## Late Fee Configuration

### Configure Late Fees Per Business

```typescript
import { lateFeeService } from './services/lateFeeService';

// Example: Fixed $50 late fee after 5-day grace period
await lateFeeService.saveConfiguration('business-id', {
  fee_type: 'fixed',
  fixed_fee_cents: 5000, // $50
  grace_period_days: 5,
  is_active: true,
});

// Example: 5% late fee with $100 cap
await lateFeeService.saveConfiguration('business-id', {
  fee_type: 'percentage',
  percentage_rate: 5.0,
  max_fee_cents: 10000, // $100 cap
  grace_period_days: 3,
  is_active: true,
});

// Example: Combined $25 fixed + 2% percentage
await lateFeeService.saveConfiguration('business-id', {
  fee_type: 'both',
  fixed_fee_cents: 2500,
  percentage_rate: 2.0,
  grace_period_days: 5,
  max_fee_cents: 15000,
  is_active: true,
});
```

## Manual Triggers (For Testing)

You can manually trigger automation tasks from the browser console or a test page:

```typescript
import { automationWorkerService } from './services/automationWorkerService';

// Process pending notifications
const result = await automationWorkerService.processScheduledNotifications();
console.log(result);

// Schedule rent reminders
const rentResult = await automationWorkerService.scheduleRentReminders();
console.log(rentResult);

// Assess late fees
const lateFeesResult = await automationWorkerService.assessLateFees();
console.log(lateFeesResult);

// Run all daily tasks
const dailyResult = await automationWorkerService.runDailyTasks();
console.log(dailyResult);

// Check worker status
const status = await automationWorkerService.getWorkerStatus();
console.log(status);
```

## Sending Notifications from Application Code

### Rent Payment Confirmation

```typescript
import { notificationService } from './services/notificationService';

// After recording a payment
await notificationService.sendPaymentConfirmation(
  businessId,
  'tenant@example.com',
  'John Doe',
  {
    amount_cents: 150000,
    payment_date: '2024-12-22',
    payment_method: 'Credit Card',
  },
  'Sunset Apartments',
  '101'
);
```

### Maintenance Request Update

```typescript
// After updating a maintenance request
await notificationService.sendMaintenanceNotification(
  businessId,
  'tenant@example.com',
  'John Doe',
  {
    id: 'request-id',
    title: 'Leaky Faucet',
    category: 'Plumbing',
    priority: 'Medium',
    status: 'In Progress',
    notes: 'Plumber scheduled for tomorrow',
  },
  'Sunset Apartments',
  'maintenance_updated'
);
```

### Tenant Invitation

```typescript
await notificationService.sendTenantInvitation(
  businessId,
  'newtenant@example.com',
  'Jane Smith',
  'Sunset Apartments',
  '102',
  'ABC123',
  'https://yourapp.com/tenant-signup?code=ABC123',
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
);
```

## Monitoring & Debugging

### Check Scheduled Notifications

```sql
-- View pending notifications
SELECT * FROM scheduled_notifications
WHERE status = 'pending'
ORDER BY scheduled_for;

-- View failed notifications
SELECT * FROM scheduled_notifications
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- View notification statistics
SELECT
  notification_type,
  status,
  COUNT(*) as count
FROM scheduled_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type, status;
```

### Check Late Fees

```sql
-- View unpaid late fees
SELECT
  lf.*,
  t.first_name,
  t.last_name,
  u.unit_number,
  p.name as property_name
FROM late_fees lf
JOIN tenants t ON lf.tenant_id = t.id
JOIN units u ON lf.unit_id = u.id
JOIN properties p ON u.property_id = p.id
WHERE lf.status = 'unpaid'
ORDER BY lf.assessed_date DESC;

-- Late fee statistics by business
SELECT
  b.business_name,
  COUNT(*) as total_fees,
  SUM(CASE WHEN lf.status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count,
  SUM(lf.late_fee_cents) / 100.0 as total_amount
FROM late_fees lf
JOIN businesses b ON lf.business_id = b.id
GROUP BY b.id, b.business_name;
```

## Troubleshooting

### Notifications Not Sending

1. Check email provider configuration in `.env`
2. Verify email service credentials are valid
3. Check `scheduled_notifications` table for failed entries
4. Review error messages in failed notification records
5. Ensure automation worker is running

### Late Fees Not Being Assessed

1. Verify late fee configuration exists for the business
2. Check that `is_active = true` in `late_fee_configurations`
3. Ensure payment schedules have `is_paid = false` and overdue dates
4. Run manual assessment: `lateFeeService.assessLateFees(businessId)`

### Emails Going to Spam

1. Configure SPF, DKIM, and DMARC records for your domain
2. Use a reputable email service provider
3. Include unsubscribe links in templates
4. Avoid spam trigger words in subject lines
5. Send from a verified domain

## Security Considerations

1. **Never expose email API keys in frontend code**
   - Store in environment variables
   - Use backend/Edge Functions for actual sending

2. **Encrypt sensitive credentials**
   - Use Supabase Vault for API keys
   - Rotate keys regularly

3. **Validate recipient addresses**
   - Verify email format before sending
   - Check against bounced email list

4. **Rate limiting**
   - Implement rate limits on notification sending
   - Prevent abuse of the notification system

5. **RLS Policies**
   - Ensure proper Row Level Security on all notification tables
   - Users should only see their own business notifications

## Production Checklist

- [ ] Database migration executed
- [ ] Default templates initialized
- [ ] Email provider configured and tested
- [ ] Automation worker scheduled (cron/Edge Functions)
- [ ] Late fee configurations set per business
- [ ] Notification preferences configured
- [ ] Domain DNS records configured (SPF, DKIM, DMARC)
- [ ] Monitoring dashboard set up
- [ ] Error logging configured
- [ ] Backup email provider configured (optional)

## Support

For issues or questions:
- Check the error logs in `scheduled_notifications` table
- Review Supabase logs for Edge Function errors
- Test email sending manually before automation
- Ensure all database tables and RLS policies are created
