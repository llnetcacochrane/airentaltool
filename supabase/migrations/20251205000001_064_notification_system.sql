-- Notification System for Email Alerts and Reminders
-- Migration: 064_notification_system.sql

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    send_days_before INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenant_messages table for tenant-to-manager communication
CREATE TABLE IF NOT EXISTS tenant_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    replied_at TIMESTAMPTZ,
    reply_message TEXT,
    replied_by UUID,
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create announcements table for property/organization-wide announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    property_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_active BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_org ON scheduled_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_tenant ON tenant_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_org ON tenant_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_status ON tenant_messages(status);
CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_announcements_property ON announcements(property_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates (readable by all, modifiable by super admin)
CREATE POLICY "notification_templates_select_all" ON notification_templates
    FOR SELECT USING (true);

CREATE POLICY "notification_templates_admin_all" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM super_admins
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for scheduled_notifications
CREATE POLICY "scheduled_notifications_org_access" ON scheduled_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = scheduled_notifications.organization_id
            AND om.is_active = true
        )
    );

CREATE POLICY "scheduled_notifications_admin_access" ON scheduled_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM super_admins
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for tenant_messages
CREATE POLICY "tenant_messages_tenant_access" ON tenant_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenants t
            WHERE t.id = tenant_messages.tenant_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_messages_org_access" ON tenant_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = tenant_messages.organization_id
            AND om.is_active = true
        )
    );

-- RLS Policies for announcements
CREATE POLICY "announcements_org_access" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = announcements.organization_id
            AND om.is_active = true
        )
    );

CREATE POLICY "announcements_tenant_read" ON announcements
    FOR SELECT USING (
        is_active = true
        AND (expires_at IS NULL OR expires_at > now())
        AND EXISTS (
            SELECT 1 FROM tenants t
            JOIN units u ON t.unit_id = u.id
            JOIN properties p ON u.property_id = p.id
            WHERE t.user_id = auth.uid()
            AND (
                announcements.organization_id = p.organization_id
                AND (announcements.property_id IS NULL OR announcements.property_id = p.id)
            )
        )
    );

-- Insert default notification templates
INSERT INTO notification_templates (type, name, subject_template, body_template, is_active, send_days_before) VALUES
('rent_reminder', 'Rent Reminder', 'Rent Reminder: Payment Due in {{days_until_due}} Days',
'Dear {{tenant_name}},

This is a friendly reminder that your rent payment of {{amount}} is due on {{due_date}}.

Property: {{property_name}}
Unit: {{unit_number}}
Amount Due: {{amount}}
Due Date: {{due_date}}

You can make a payment through your tenant portal at any time.

Thank you,
{{organization_name}}', true, 7),

('rent_overdue', 'Rent Overdue Notice', 'URGENT: Rent Payment Overdue',
'Dear {{tenant_name}},

Your rent payment of {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.

Property: {{property_name}}
Unit: {{unit_number}}
Amount Overdue: {{amount}}
Original Due Date: {{due_date}}
Late Fee (if applicable): {{late_fee}}

Please make your payment as soon as possible to avoid additional late fees.

Thank you,
{{organization_name}}', true, NULL),

('payment_received', 'Payment Confirmation', 'Payment Received - Thank You!',
'Dear {{tenant_name}},

We have received your payment. Thank you!

Payment Details:
Amount: {{amount}}
Date: {{payment_date}}
Payment Method: {{payment_method}}
Property: {{property_name}}
Unit: {{unit_number}}

This payment has been applied to your account.

Thank you for your prompt payment,
{{organization_name}}', true, NULL),

('maintenance_submitted', 'Maintenance Request Submitted', 'Maintenance Request Received - #{{request_id}}',
'Dear {{tenant_name}},

Your maintenance request has been received and logged.

Request Details:
Request ID: #{{request_id}}
Title: {{request_title}}
Category: {{category}}
Priority: {{priority}}
Submitted: {{submitted_date}}

We will review your request and update you on the status.

Thank you,
{{organization_name}}', true, NULL),

('maintenance_updated', 'Maintenance Request Updated', 'Maintenance Update - #{{request_id}}',
'Dear {{tenant_name}},

Your maintenance request has been updated.

Request ID: #{{request_id}}
Title: {{request_title}}
New Status: {{status}}
Notes: {{notes}}

Thank you,
{{organization_name}}', true, NULL),

('maintenance_completed', 'Maintenance Request Completed', 'Maintenance Complete - #{{request_id}}',
'Dear {{tenant_name}},

Good news! Your maintenance request has been completed.

Request ID: #{{request_id}}
Title: {{request_title}}
Completed: {{completed_date}}
Resolution Notes: {{resolution_notes}}

If you have any questions about the work performed, please contact us.

Thank you,
{{organization_name}}', true, NULL),

('lease_expiring', 'Lease Expiration Reminder', 'Your Lease Expires in {{days_until_expiry}} Days',
'Dear {{tenant_name}},

This is a reminder that your lease agreement will expire on {{lease_end_date}}.

Property: {{property_name}}
Unit: {{unit_number}}
Lease End Date: {{lease_end_date}}
Days Remaining: {{days_until_expiry}}

Please contact us if you would like to discuss renewal options.

Thank you,
{{organization_name}}', true, 60),

('welcome_tenant', 'Welcome New Tenant', 'Welcome to {{property_name}}!',
'Dear {{tenant_name}},

Welcome to your new home at {{property_name}}!

Property: {{property_name}}
Unit: {{unit_number}}
Move-in Date: {{move_in_date}}
Monthly Rent: {{monthly_rent}}

You can access your tenant portal to:
- View and pay rent
- Submit maintenance requests
- Access important documents
- Contact management

Welcome home!
{{organization_name}}', true, NULL),

('tenant_invitation', 'Tenant Portal Invitation', 'Invitation to Join Tenant Portal',
'Dear {{tenant_name}},

You have been invited to join the tenant portal for {{property_name}}.

Property: {{property_name}}
Unit: {{unit_number}}

Your invitation code is: {{invitation_code}}

Click here to set up your account: {{invitation_url}}

This invitation expires on {{expiry_date}}.

Thank you,
{{organization_name}}', true, NULL),

('agreement_ready', 'Agreement Ready for Signature', 'Agreement Ready for Your Signature',
'Dear {{tenant_name}},

A new agreement is ready for your signature.

Agreement: {{agreement_title}}
Property: {{property_name}}
Unit: {{unit_number}}

Please review and sign the agreement at your earliest convenience:
{{signing_url}}

This link will expire on {{expiry_date}}.

Thank you,
{{organization_name}}', true, NULL)

ON CONFLICT (type) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    updated_at = now();

-- Function to process and send pending notifications
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS TABLE (
    notification_id UUID,
    recipient_email TEXT,
    subject TEXT,
    body TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sn.id as notification_id,
        sn.recipient_email,
        sn.subject,
        sn.body,
        sn.status::TEXT
    FROM scheduled_notifications sn
    WHERE sn.status = 'pending'
    AND sn.scheduled_for <= now()
    ORDER BY sn.scheduled_for
    LIMIT 100;
END;
$$;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE scheduled_notifications
    SET status = 'sent',
        sent_at = now()
    WHERE id = p_notification_id;
END;
$$;

-- Function to mark notification as failed
CREATE OR REPLACE FUNCTION mark_notification_failed(p_notification_id UUID, p_error_message TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE scheduled_notifications
    SET status = 'failed',
        error_message = p_error_message
    WHERE id = p_notification_id;
END;
$$;

-- Comment on tables
COMMENT ON TABLE notification_templates IS 'Email notification templates with variable placeholders';
COMMENT ON TABLE scheduled_notifications IS 'Queue of scheduled email notifications';
COMMENT ON TABLE tenant_messages IS 'Messages from tenants to property managers';
COMMENT ON TABLE announcements IS 'Property and organization-wide announcements';
