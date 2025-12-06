import { supabase } from '../lib/supabase';

export type NotificationType =
  | 'rent_reminder'
  | 'rent_overdue'
  | 'payment_received'
  | 'payment_failed'
  | 'maintenance_submitted'
  | 'maintenance_updated'
  | 'maintenance_completed'
  | 'lease_expiring'
  | 'lease_renewal'
  | 'welcome_tenant'
  | 'tenant_invitation'
  | 'agreement_ready'
  | 'agreement_signed'
  | 'announcement';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  subject_template: string;
  body_template: string;
  is_active: boolean;
  send_days_before?: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotification {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body: string;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface NotificationPreferences {
  rent_reminders: boolean;
  rent_reminder_days: number[];
  payment_confirmations: boolean;
  maintenance_updates: boolean;
  lease_reminders: boolean;
  lease_reminder_days: number;
  announcements: boolean;
}

const defaultPreferences: NotificationPreferences = {
  rent_reminders: true,
  rent_reminder_days: [7, 3, 1],
  payment_confirmations: true,
  maintenance_updates: true,
  lease_reminders: true,
  lease_reminder_days: 60,
  announcements: true,
};

export const notificationService = {
  // Get notification templates
  async getTemplates(): Promise<NotificationTemplate[]> {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('type');

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
    return data || [];
  },

  // Get or create default templates
  async ensureDefaultTemplates(): Promise<void> {
    const existingTemplates = await this.getTemplates();

    const defaultTemplates: Partial<NotificationTemplate>[] = [
      {
        type: 'rent_reminder',
        name: 'Rent Reminder',
        subject_template: 'Rent Reminder: Payment Due {{days_until_due}} Days',
        body_template: `Dear {{tenant_name}},

This is a friendly reminder that your rent payment of {{amount}} is due on {{due_date}}.

Property: {{property_name}}
Unit: {{unit_number}}
Amount Due: {{amount}}
Due Date: {{due_date}}

You can make a payment through your tenant portal at any time.

Thank you,
{{organization_name}}`,
        is_active: true,
        send_days_before: 7,
      },
      {
        type: 'rent_overdue',
        name: 'Rent Overdue Notice',
        subject_template: 'URGENT: Rent Payment Overdue',
        body_template: `Dear {{tenant_name}},

Your rent payment of {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.

Property: {{property_name}}
Unit: {{unit_number}}
Amount Overdue: {{amount}}
Original Due Date: {{due_date}}
Late Fee (if applicable): {{late_fee}}

Please make your payment as soon as possible to avoid additional late fees.

If you have already made this payment, please disregard this notice.

Thank you,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'payment_received',
        name: 'Payment Confirmation',
        subject_template: 'Payment Received - Thank You!',
        body_template: `Dear {{tenant_name}},

We have received your payment. Thank you!

Payment Details:
Amount: {{amount}}
Date: {{payment_date}}
Payment Method: {{payment_method}}
Property: {{property_name}}
Unit: {{unit_number}}

This payment has been applied to your account.

Thank you for your prompt payment,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'maintenance_submitted',
        name: 'Maintenance Request Submitted',
        subject_template: 'Maintenance Request Received - #{{request_id}}',
        body_template: `Dear {{tenant_name}},

Your maintenance request has been received and logged.

Request Details:
Request ID: #{{request_id}}
Title: {{request_title}}
Category: {{category}}
Priority: {{priority}}
Submitted: {{submitted_date}}

We will review your request and update you on the status.

Thank you,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'maintenance_updated',
        name: 'Maintenance Request Updated',
        subject_template: 'Maintenance Update - #{{request_id}}',
        body_template: `Dear {{tenant_name}},

Your maintenance request has been updated.

Request ID: #{{request_id}}
Title: {{request_title}}
New Status: {{status}}
{{#notes}}
Notes: {{notes}}
{{/notes}}

Thank you,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'maintenance_completed',
        name: 'Maintenance Request Completed',
        subject_template: 'Maintenance Complete - #{{request_id}}',
        body_template: `Dear {{tenant_name}},

Good news! Your maintenance request has been completed.

Request ID: #{{request_id}}
Title: {{request_title}}
Completed: {{completed_date}}
{{#resolution_notes}}
Resolution Notes: {{resolution_notes}}
{{/resolution_notes}}

If you have any questions or concerns about the work performed, please don't hesitate to contact us.

Thank you,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'lease_expiring',
        name: 'Lease Expiration Reminder',
        subject_template: 'Your Lease Expires in {{days_until_expiry}} Days',
        body_template: `Dear {{tenant_name}},

This is a reminder that your lease agreement will expire on {{lease_end_date}}.

Property: {{property_name}}
Unit: {{unit_number}}
Lease End Date: {{lease_end_date}}
Days Remaining: {{days_until_expiry}}

Please contact us if you would like to discuss renewal options.

Thank you,
{{organization_name}}`,
        is_active: true,
        send_days_before: 60,
      },
      {
        type: 'welcome_tenant',
        name: 'Welcome New Tenant',
        subject_template: 'Welcome to {{property_name}}!',
        body_template: `Dear {{tenant_name}},

Welcome to your new home at {{property_name}}!

We're excited to have you as a tenant. Here's some important information:

Property: {{property_name}}
Unit: {{unit_number}}
Move-in Date: {{move_in_date}}
Monthly Rent: {{monthly_rent}}

You can access your tenant portal to:
- View and pay rent
- Submit maintenance requests
- Access important documents
- Contact management

If you have any questions, please don't hesitate to reach out.

Welcome home!
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'tenant_invitation',
        name: 'Tenant Portal Invitation',
        subject_template: 'Invitation to Join Tenant Portal',
        body_template: `Dear {{tenant_name}},

You have been invited to join the tenant portal for {{property_name}}.

Property: {{property_name}}
Unit: {{unit_number}}

Your invitation code is: {{invitation_code}}

Click here to set up your account: {{invitation_url}}

This invitation expires on {{expiry_date}}.

If you have any questions, please contact us.

Thank you,
{{organization_name}}`,
        is_active: true,
      },
      {
        type: 'agreement_ready',
        name: 'Agreement Ready for Signature',
        subject_template: 'Agreement Ready for Your Signature',
        body_template: `Dear {{tenant_name}},

A new agreement is ready for your signature.

Agreement: {{agreement_title}}
Property: {{property_name}}
Unit: {{unit_number}}

Please review and sign the agreement at your earliest convenience:
{{signing_url}}

This link will expire on {{expiry_date}}.

Thank you,
{{organization_name}}`,
        is_active: true,
      },
    ];

    // Insert any missing templates
    for (const template of defaultTemplates) {
      const exists = existingTemplates.find(t => t.type === template.type);
      if (!exists) {
        await supabase.from('notification_templates').insert(template);
      }
    }
  },

  // Schedule a notification
  async scheduleNotification(
    organizationId: string,
    type: NotificationType,
    recipientEmail: string,
    recipientName: string,
    variables: Record<string, any>,
    scheduledFor: Date = new Date()
  ): Promise<ScheduledNotification | null> {
    // Get the template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (!template) {
      console.error(`No active template found for type: ${type}`);
      return null;
    }

    // Replace variables in subject and body
    const subject = this.replaceVariables(template.subject_template, variables);
    const body = this.replaceVariables(template.body_template, variables);

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        organization_id: organizationId,
        notification_type: type,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        body,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        metadata: variables,
      })
      .select()
      .single();

    if (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }

    return data;
  },

  // Replace template variables
  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    // Handle conditional sections like {{#notes}}...{{/notes}}
    result = result.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, key, content) => {
      return variables[key] ? content : '';
    });

    // Remove any remaining unmatched variables
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  },

  // Get pending notifications
  async getPendingNotifications(): Promise<ScheduledNotification[]> {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for');

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return [];
    }
    return data || [];
  },

  // Mark notification as sent
  async markAsSent(notificationId: string): Promise<void> {
    await supabase
      .from('scheduled_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  },

  // Mark notification as failed
  async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    await supabase
      .from('scheduled_notifications')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', notificationId);
  },

  // Schedule rent reminders for an organization
  async scheduleRentReminders(organizationId: string): Promise<number> {
    // Get all active leases with upcoming rent due dates
    const today = new Date();
    const reminderDays = [7, 3, 1]; // Send reminders 7, 3, and 1 day before due date
    let scheduledCount = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const rentDueDay = targetDate.getDate();

      // Get leases where rent is due on the target day
      const { data: leases } = await supabase
        .from('leases')
        .select(`
          *,
          units:unit_id (
            id,
            unit_number,
            properties:property_id (
              id,
              name
            )
          ),
          tenants:unit_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('rent_due_day', rentDueDay);

      if (leases) {
        for (const lease of leases) {
          const unit = lease.units as any;
          const property = unit?.properties as any;
          const tenants = lease.tenants as any[];

          if (tenants && tenants.length > 0) {
            for (const tenant of tenants) {
              if (tenant.email) {
                await this.scheduleNotification(
                  organizationId,
                  'rent_reminder',
                  tenant.email,
                  `${tenant.first_name} ${tenant.last_name}`,
                  {
                    tenant_name: `${tenant.first_name} ${tenant.last_name}`,
                    amount: `$${(lease.monthly_rent_cents / 100).toFixed(2)}`,
                    due_date: targetDate.toLocaleDateString(),
                    days_until_due: days,
                    property_name: property?.name || 'Your Property',
                    unit_number: unit?.unit_number || '',
                    organization_name: 'Your Property Management',
                  },
                  today
                );
                scheduledCount++;
              }
            }
          }
        }
      }
    }

    return scheduledCount;
  },

  // Schedule lease expiration reminders
  async scheduleLeaseExpirationReminders(organizationId: string): Promise<number> {
    const today = new Date();
    const reminderDays = [90, 60, 30, 14, 7];
    let scheduledCount = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const { data: leases } = await supabase
        .from('leases')
        .select(`
          *,
          units:unit_id (
            id,
            unit_number,
            properties:property_id (
              id,
              name
            )
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('end_date', targetDateStr);

      if (leases) {
        for (const lease of leases) {
          const unit = lease.units as any;
          const property = unit?.properties as any;

          // Get tenants for this unit
          const { data: tenants } = await supabase
            .from('tenants')
            .select('*')
            .eq('unit_id', unit?.id)
            .eq('is_active', true);

          if (tenants) {
            for (const tenant of tenants) {
              if (tenant.email) {
                await this.scheduleNotification(
                  organizationId,
                  'lease_expiring',
                  tenant.email,
                  `${tenant.first_name} ${tenant.last_name}`,
                  {
                    tenant_name: `${tenant.first_name} ${tenant.last_name}`,
                    lease_end_date: targetDate.toLocaleDateString(),
                    days_until_expiry: days,
                    property_name: property?.name || 'Your Property',
                    unit_number: unit?.unit_number || '',
                    organization_name: 'Your Property Management',
                  },
                  today
                );
                scheduledCount++;
              }
            }
          }
        }
      }
    }

    return scheduledCount;
  },

  // Send maintenance update notification
  async sendMaintenanceNotification(
    organizationId: string,
    tenantEmail: string,
    tenantName: string,
    request: {
      id: string;
      title: string;
      category: string;
      priority: string;
      status: string;
      notes?: string;
      resolution_notes?: string;
    },
    propertyName: string,
    type: 'maintenance_submitted' | 'maintenance_updated' | 'maintenance_completed'
  ): Promise<void> {
    const variables: Record<string, any> = {
      tenant_name: tenantName,
      request_id: request.id.substring(0, 8).toUpperCase(),
      request_title: request.title,
      category: request.category,
      priority: request.priority,
      status: request.status,
      notes: request.notes,
      resolution_notes: request.resolution_notes,
      submitted_date: new Date().toLocaleDateString(),
      completed_date: new Date().toLocaleDateString(),
      property_name: propertyName,
      organization_name: 'Your Property Management',
    };

    await this.scheduleNotification(
      organizationId,
      type,
      tenantEmail,
      tenantName,
      variables
    );
  },

  // Send payment confirmation
  async sendPaymentConfirmation(
    organizationId: string,
    tenantEmail: string,
    tenantName: string,
    payment: {
      amount_cents: number;
      payment_date: string;
      payment_method: string;
    },
    propertyName: string,
    unitNumber: string
  ): Promise<void> {
    await this.scheduleNotification(
      organizationId,
      'payment_received',
      tenantEmail,
      tenantName,
      {
        tenant_name: tenantName,
        amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
        payment_date: new Date(payment.payment_date).toLocaleDateString(),
        payment_method: payment.payment_method || 'N/A',
        property_name: propertyName,
        unit_number: unitNumber,
        organization_name: 'Your Property Management',
      }
    );
  },

  // Send tenant invitation
  async sendTenantInvitation(
    organizationId: string,
    tenantEmail: string,
    tenantName: string,
    propertyName: string,
    unitNumber: string,
    invitationCode: string,
    invitationUrl: string,
    expiryDate: Date
  ): Promise<void> {
    await this.scheduleNotification(
      organizationId,
      'tenant_invitation',
      tenantEmail,
      tenantName,
      {
        tenant_name: tenantName,
        property_name: propertyName,
        unit_number: unitNumber,
        invitation_code: invitationCode,
        invitation_url: invitationUrl,
        expiry_date: expiryDate.toLocaleDateString(),
        organization_name: 'Your Property Management',
      }
    );
  },
};
