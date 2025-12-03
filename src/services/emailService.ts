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

  async testConfiguration(testEmail: string): Promise<any> {
    const { data, error } = await supabase.rpc('test_email_configuration', {
      p_test_email: testEmail,
    });

    if (error) throw error;
    return data;
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
};
