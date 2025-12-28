import { supabase } from '../lib/supabase';

export interface EmailConfiguration {
  id: string;
  provider: 'smtp' | 'sendgrid' | 'ses';
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_encrypted: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_use_tls: boolean;
  sendgrid_api_key_encrypted: string | null;
  ses_access_key_encrypted: string | null;
  ses_secret_key_encrypted: string | null;
  ses_region: string | null;
  is_active: boolean;
  last_test_at: string | null;
  last_test_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailDiagnosticLog {
  id: string;
  test_type: string;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  response_time_ms: number | null;
  provider_used: string | null;
  created_at: string;
}

export const emailService = {
  async getConfiguration(): Promise<EmailConfiguration | null> {
    const { data, error } = await supabase
      .from('email_configuration')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getAllConfigurations(): Promise<EmailConfiguration[]> {
    const { data, error } = await supabase
      .from('email_configuration')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createConfiguration(config: {
    provider: 'smtp' | 'sendgrid' | 'ses';
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_password?: string;
    smtp_from_email?: string;
    smtp_from_name?: string;
    smtp_use_tls?: boolean;
    sendgrid_api_key?: string;
    ses_access_key?: string;
    ses_secret_key?: string;
    ses_region?: string;
  }): Promise<EmailConfiguration> {
    const insertData: any = {
      provider: config.provider,
      is_active: true,
    };

    if (config.provider === 'smtp') {
      insertData.smtp_host = config.smtp_host;
      insertData.smtp_port = config.smtp_port || 587;
      insertData.smtp_user = config.smtp_user;
      insertData.smtp_password_encrypted = config.smtp_password;
      insertData.smtp_from_email = config.smtp_from_email;
      insertData.smtp_from_name = config.smtp_from_name;
      insertData.smtp_use_tls = config.smtp_use_tls !== false;
    } else if (config.provider === 'sendgrid') {
      insertData.sendgrid_api_key_encrypted = config.sendgrid_api_key;
      insertData.smtp_from_email = config.smtp_from_email;
      insertData.smtp_from_name = config.smtp_from_name;
    } else if (config.provider === 'ses') {
      insertData.ses_access_key_encrypted = config.ses_access_key;
      insertData.ses_secret_key_encrypted = config.ses_secret_key;
      insertData.ses_region = config.ses_region || 'us-east-1';
      insertData.smtp_from_email = config.smtp_from_email;
      insertData.smtp_from_name = config.smtp_from_name;
    }

    await supabase
      .from('email_configuration')
      .update({ is_active: false })
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('email_configuration')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateConfiguration(
    id: string,
    updates: Partial<EmailConfiguration>
  ): Promise<EmailConfiguration> {
    const { data, error } = await supabase
      .from('email_configuration')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteConfiguration(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_configuration')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async testConfiguration(testEmail: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
    provider?: string;
    error?: string;
  }> {
    try {
      // Get the current session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the edge function directly
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { email: testEmail },
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          message: error.message || 'Failed to send test email',
          error: error.message,
        };
      }

      return {
        success: data?.success || false,
        message: data?.message || (data?.success ? 'Email sent successfully' : 'Failed to send email'),
        responseTime: data?.responseTime,
        provider: data?.provider,
        error: data?.error,
      };
    } catch (error) {
      console.error('Test email error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async getDiagnosticLogs(limit: number = 50): Promise<EmailDiagnosticLog[]> {
    const { data, error } = await supabase
      .from('email_diagnostic_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getRecentTestResults(): Promise<{
    total_tests: number;
    successful_tests: number;
    failed_tests: number;
    average_response_time: number;
    last_test_at: string | null;
  }> {
    const { data: logs } = await supabase
      .from('email_diagnostic_logs')
      .select('status, response_time_ms, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const totalTests = logs?.length || 0;
    const successfulTests = logs?.filter((l) => l.status === 'success').length || 0;
    const failedTests = logs?.filter((l) => l.status === 'failed').length || 0;
    const avgResponseTime =
      logs && logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length
        : 0;
    const lastTestAt = logs && logs.length > 0 ? logs[0].created_at : null;

    return {
      total_tests: totalTests,
      successful_tests: successfulTests,
      failed_tests: failedTests,
      average_response_time: Math.round(avgResponseTime),
      last_test_at: lastTestAt,
    };
  },

  getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      smtp: 'SMTP',
      sendgrid: 'SendGrid',
      ses: 'Amazon SES',
    };
    return names[provider] || provider;
  },

  /**
   * Send an email using the configured email provider
   */
  async sendEmail(
    to: string,
    type: 'verification' | 'password_reset' | 'welcome' | 'invitation' | 'notification' | 'payment_reminder' | 'lease_expiring' | 'maintenance_update',
    data: Record<string, string>
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: { to, type, data },
      });

      if (error) {
        console.error('Email send error:', error);
        return {
          success: false,
          message: error.message || 'Failed to send email',
          error: error.message,
        };
      }

      return {
        success: result?.success || false,
        message: result?.message || 'Email operation completed',
        error: result?.error,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    dashboardUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'welcome', {
      name,
      dashboard_url: dashboardUrl || `${window.location.origin}/dashboard`,
      help_url: `${window.location.origin}/help`,
    });
  },

  /**
   * Send an invitation email
   */
  async sendInvitationEmail(
    to: string,
    data: {
      name?: string;
      inviterName: string;
      businessName: string;
      invitationCode: string;
      signupUrl: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'invitation', {
      name: data.name || '',
      inviter_name: data.inviterName,
      business_name: data.businessName,
      invitation_code: data.invitationCode,
      signup_url: data.signupUrl,
    });
  },

  /**
   * Send a payment reminder email
   */
  async sendPaymentReminder(
    to: string,
    data: {
      tenantName: string;
      amount: string;
      dueDate: string;
      propertyName: string;
      paymentUrl: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'payment_reminder', {
      tenant_name: data.tenantName,
      amount: data.amount,
      due_date: data.dueDate,
      property_name: data.propertyName,
      payment_url: data.paymentUrl,
    });
  },

  /**
   * Send a lease expiring notification
   */
  async sendLeaseExpiringEmail(
    to: string,
    data: {
      tenantName: string;
      propertyName: string;
      expirationDate: string;
      daysRemaining: string;
      contactUrl?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'lease_expiring', {
      tenant_name: data.tenantName,
      property_name: data.propertyName,
      expiration_date: data.expirationDate,
      days_remaining: data.daysRemaining,
      contact_url: data.contactUrl || '',
    });
  },

  /**
   * Send a maintenance update email
   */
  async sendMaintenanceUpdate(
    to: string,
    data: {
      tenantName: string;
      requestTitle: string;
      status: string;
      message: string;
      detailsUrl?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'maintenance_update', {
      tenant_name: data.tenantName,
      request_title: data.requestTitle,
      status: data.status,
      message: data.message,
      details_url: data.detailsUrl || '',
    });
  },

  // ============================================
  // Affiliate Email Notifications
  // ============================================

  /**
   * Send affiliate application approved email
   */
  async sendAffiliateApprovedEmail(
    to: string,
    data: {
      affiliateName: string;
      referralCode: string;
      dashboardUrl?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'Congratulations! Your Affiliate Application is Approved',
      name: data.affiliateName,
      message: `Great news! Your affiliate application has been approved. Your unique referral code is: ${data.referralCode}. Start sharing and earning commissions today!`,
      action_url: data.dashboardUrl || `${window.location.origin}/affiliate`,
      action_text: 'Go to Affiliate Dashboard',
    });
  },

  /**
   * Send affiliate application rejected email
   */
  async sendAffiliateRejectedEmail(
    to: string,
    data: {
      affiliateName: string;
      reason: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'Affiliate Application Update',
      name: data.affiliateName,
      message: `We've reviewed your affiliate application. Unfortunately, we're unable to approve it at this time. Reason: ${data.reason}. If you have questions, please contact our support team.`,
      action_url: `${window.location.origin}/contact`,
      action_text: 'Contact Support',
    });
  },

  /**
   * Send affiliate payout completed email
   */
  async sendAffiliatePayoutCompletedEmail(
    to: string,
    data: {
      affiliateName: string;
      amount: string;
      transactionId: string;
      payoutMethod: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'Your Affiliate Payout Has Been Processed',
      name: data.affiliateName,
      message: `Your affiliate payout of ${data.amount} has been successfully processed via ${data.payoutMethod}. Transaction ID: ${data.transactionId}. Thank you for being part of our affiliate program!`,
      action_url: `${window.location.origin}/affiliate/payouts`,
      action_text: 'View Payout History',
    });
  },

  /**
   * Send affiliate payout failed email
   */
  async sendAffiliatePayoutFailedEmail(
    to: string,
    data: {
      affiliateName: string;
      amount: string;
      reason: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'Affiliate Payout Issue',
      name: data.affiliateName,
      message: `We were unable to process your affiliate payout of ${data.amount}. Reason: ${data.reason}. Please verify your payout details in your affiliate settings and contact support if you need assistance.`,
      action_url: `${window.location.origin}/affiliate/settings`,
      action_text: 'Update Payout Settings',
    });
  },

  /**
   * Send new affiliate referral conversion email
   */
  async sendAffiliateConversionEmail(
    to: string,
    data: {
      affiliateName: string;
      signupDate: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'New Referral Converted!',
      name: data.affiliateName,
      message: `Great news! One of your referrals signed up on ${data.signupDate} and has converted to a paying customer. You'll earn a commission on their subscription payments according to your affiliate agreement.`,
      action_url: `${window.location.origin}/affiliate`,
      action_text: 'View Dashboard',
    });
  },

  /**
   * Send new affiliate signup notification (to admin)
   */
  async sendNewAffiliateApplicationEmail(
    to: string,
    data: {
      affiliateName: string;
      companyName: string;
      email: string;
      reviewUrl?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail(to, 'notification', {
      subject: 'New Affiliate Application Received',
      name: 'Admin',
      message: `A new affiliate application has been submitted. Applicant: ${data.affiliateName} (${data.companyName}). Email: ${data.email}. Please review the application at your earliest convenience.`,
      action_url: data.reviewUrl || `${window.location.origin}/super-admin/affiliates`,
      action_text: 'Review Application',
    });
  },
};
