import { supabase } from '../lib/supabase';

/**
 * Super Admin Service
 *
 * TODO: SECURITY - Implement Multi-Factor Authentication (MFA) for Super Admins
 *
 * Super admin accounts have elevated privileges and should require additional
 * security measures:
 *
 * 1. Enable MFA requirement in Supabase Auth settings for super admins
 * 2. Add MFA enrollment check before granting super admin access
 * 3. Consider implementing:
 *    - Hardware key support (WebAuthn/FIDO2)
 *    - Time-based OTP (TOTP) via authenticator apps
 *    - Recovery codes with secure storage
 *
 * 4. Session security for super admins:
 *    - Shorter session timeout (e.g., 15 minutes)
 *    - Re-authentication for sensitive operations
 *    - Activity logging and alerts
 *
 * 5. Audit logging:
 *    - Log all super admin actions
 *    - Store IP address and user agent
 *    - Alert on suspicious activity patterns
 */

export type AdminType = 'system' | 'saas' | 'both' | 'none';

export const superAdminService = {
  async isSuperAdmin(userId?: string): Promise<boolean> {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return false;

    const { data, error } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', uid)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  async getAdminType(): Promise<AdminType> {
    const { data, error } = await supabase.rpc('get_admin_type');
    if (error) return 'none';
    return (data as AdminType) || 'none';
  },

  async getAllOrganizations() {
    const { data, error } = await supabase.rpc('get_all_organizations_admin');
    if (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
    return data || [];
  },

  async getPlatformStatistics() {
    const { data, error } = await supabase.rpc('get_platform_statistics');
    if (error) {
      console.error('Error fetching platform statistics:', error);
      throw error;
    }
    return data || {};
  },

  async getOrganizationStats() {
    const stats = await this.getPlatformStatistics();
    return {
      totalOrganizations: stats.total_organizations || 0,
      activeOrganizations: stats.active_organizations || 0,
      trialOrganizations: stats.trial_organizations || 0,
      suspendedOrganizations: stats.suspended_organizations || 0,
      totalProperties: stats.total_properties || 0,
      totalTenants: stats.total_tenants || 0,
      totalPayments: stats.total_payments || 0,
    };
  },

  async updateOrganizationStatus(organizationId: string, status: string) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ subscription_status: status, updated_at: new Date().toISOString() })
      .eq('id', organizationId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateOrganizationTier(organizationId: string, tier: string) {
    const { data, error } = await supabase
      .from('organizations')
      .update({ account_tier: tier, updated_at: new Date().toISOString() })
      .eq('id', organizationId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getOrCreateAdminOrg(): Promise<string> {
    const { data, error } = await supabase.rpc('get_or_create_admin_org');
    if (error) {
      console.error('Error getting/creating admin org:', error);
      throw error;
    }
    return data;
  },

  async createSaasAdmin(email: string, notes?: string) {
    const { data, error } = await supabase.rpc('create_saas_admin', {
      admin_email: email,
      admin_notes: notes,
    });

    if (error) {
      console.error('Error creating SaaS admin:', error);
      throw error;
    }
    return data;
  },

  async getPlatformSettings() {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('setting_key');

    if (error) throw error;
    return data || [];
  },

  async updatePlatformSetting(settingKey: string, settingValue: any) {
    const { data, error } = await supabase
      .from('platform_settings')
      .update({
        setting_value: settingValue,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', settingKey)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createSystemNotification(notification: {
    title: string;
    message: string;
    notification_type: string;
    target_audience?: string;
    display_until?: string;
  }) {
    const { data, error } = await supabase
      .from('system_notifications')
      .insert({
        ...notification,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getSystemNotifications() {
    const { data, error } = await supabase
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async grantSuperAdmin(userId: string, adminType: 'system' | 'saas' | 'both' = 'system', notes?: string) {
    const currentUser = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('super_admins')
      .insert({
        user_id: userId,
        admin_type: adminType,
        granted_by: currentUser?.id,
        notes,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async revokeSuperAdmin(userId: string) {
    const { error } = await supabase
      .from('super_admins')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getSuperAdmins() {
    const { data, error } = await supabase
      .from('super_admins')
      .select(`
        *,
        users:user_id (email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
