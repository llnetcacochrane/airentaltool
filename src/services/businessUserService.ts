import { supabase } from '../lib/supabase';
import { BusinessUser, BusinessUserMessage, BusinessUserRole, BusinessUserStatus } from '../types';

export interface BusinessUserWithStats extends BusinessUser {
  unread_messages?: number;
  applications_count?: number;
}

export const businessUserService = {
  /**
   * Get all users for a business
   */
  async getBusinessUsers(businessId: string): Promise<BusinessUserWithStats[]> {
    const { data, error } = await supabase.rpc('get_business_users_with_stats', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error fetching business users:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Get a single business user by ID
   */
  async getBusinessUser(id: string): Promise<BusinessUser | null> {
    const { data, error } = await supabase
      .from('business_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get business user by email for a specific business
   */
  async getBusinessUserByEmail(businessId: string, email: string): Promise<BusinessUser | null> {
    const { data, error } = await supabase
      .from('business_users')
      .select('*')
      .eq('business_id', businessId)
      .ilike('email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Find user across all businesses by email
   */
  async findUserByEmail(email: string): Promise<{
    user_id: string;
    auth_user_id: string | null;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    businesses: Array<{
      business_id: string;
      business_name: string;
      role: string;
      status: string;
    }>;
  } | null> {
    const { data, error } = await supabase.rpc('find_user_by_email', {
      p_email: email,
    });

    if (error) {
      console.error('Error finding user by email:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  },

  /**
   * Create a new business user (signup)
   */
  async createBusinessUser(
    businessId: string,
    userData: {
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
      auth_user_id?: string;
    }
  ): Promise<BusinessUser> {
    // First check if user already exists in any business
    const existingUser = await this.findUserByEmail(userData.email);

    if (existingUser) {
      // Check if already in this business
      const inThisBusiness = existingUser.businesses.find(
        (b) => b.business_id === businessId
      );

      if (inThisBusiness) {
        // Return existing user for this business
        const existing = await this.getBusinessUserByEmail(businessId, userData.email);
        if (existing) return existing;
      }

      // Link existing user to this business
      if (existingUser.auth_user_id) {
        const { data: newId, error } = await supabase.rpc('link_user_to_business', {
          p_auth_user_id: existingUser.auth_user_id,
          p_business_id: businessId,
          p_role: 'user',
        });

        if (error) throw error;

        const linked = await this.getBusinessUser(newId);
        if (linked) return linked;
      }
    }

    // Create new business user
    const { data, error } = await supabase
      .from('business_users')
      .insert({
        business_id: businessId,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        auth_user_id: userData.auth_user_id,
        role: 'user',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a business user
   */
  async updateBusinessUser(
    id: string,
    updates: Partial<BusinessUser>
  ): Promise<BusinessUser> {
    const { data, error } = await supabase
      .from('business_users')
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone: updates.phone,
        role: updates.role,
        status: updates.status,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user status
   */
  async updateUserStatus(id: string, status: BusinessUserStatus): Promise<void> {
    const { error } = await supabase
      .from('business_users')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Promote user to tenant
   */
  async promoteToTenant(
    businessUserId: string,
    unitId: string,
    leaseStartDate?: string,
    monthlyRentCents?: number
  ): Promise<string> {
    const { data, error } = await supabase.rpc('promote_user_to_tenant', {
      p_business_user_id: businessUserId,
      p_unit_id: unitId,
      p_lease_start_date: leaseStartDate || new Date().toISOString().split('T')[0],
      p_monthly_rent_cents: monthlyRentCents,
    });

    if (error) throw error;
    return data; // Returns tenant_id
  },

  /**
   * Soft delete a business user
   */
  async deleteBusinessUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('business_users')
      .update({
        is_active: false,
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Link auth user to business user (after signup/login)
   */
  async linkAuthUser(businessUserId: string, authUserId: string): Promise<void> {
    const { error } = await supabase
      .from('business_users')
      .update({
        auth_user_id: authUserId,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessUserId);

    if (error) throw error;
  },

  /**
   * Get messages for a business user
   */
  async getUserMessages(businessUserId: string): Promise<BusinessUserMessage[]> {
    const { data, error } = await supabase
      .from('business_user_messages')
      .select('*')
      .eq('business_user_id', businessUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get messages for a business (manager view)
   */
  async getBusinessMessages(businessId: string): Promise<(BusinessUserMessage & { user: BusinessUser })[]> {
    const { data, error } = await supabase
      .from('business_user_messages')
      .select(`
        *,
        user:business_users!business_user_id(*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Send a message
   */
  async sendMessage(
    businessId: string,
    businessUserId: string,
    senderType: 'user' | 'manager',
    senderId: string,
    message: string,
    subject?: string,
    parentMessageId?: string
  ): Promise<BusinessUserMessage> {
    const { data, error } = await supabase
      .from('business_user_messages')
      .insert({
        business_id: businessId,
        business_user_id: businessUserId,
        sender_type: senderType,
        sender_id: senderId,
        subject,
        message,
        parent_message_id: parentMessageId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark message as read
   */
  async markMessageRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('business_user_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  },

  /**
   * Get business user count for stats
   */
  async getBusinessUserStats(businessId: string): Promise<{
    total_users: number;
    pending_users: number;
    active_users: number;
    tenants: number;
    unread_messages: number;
  }> {
    const [usersData, messagesData] = await Promise.all([
      supabase
        .from('business_users')
        .select('status, role')
        .eq('business_id', businessId)
        .eq('is_active', true),
      supabase
        .from('business_user_messages')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_read', false)
        .eq('sender_type', 'user'),
    ]);

    const users = usersData.data || [];

    return {
      total_users: users.length,
      pending_users: users.filter((u) => u.status === 'pending').length,
      active_users: users.filter((u) => u.status === 'active').length,
      tenants: users.filter((u) => u.role === 'tenant').length,
      unread_messages: messagesData.count || 0,
    };
  },

  /**
   * Get all businesses a user belongs to
   */
  async getUserBusinesses(authUserId: string): Promise<BusinessUser[]> {
    const { data, error } = await supabase
      .from('business_users')
      .select(`
        *,
        business:businesses(*)
      `)
      .eq('auth_user_id', authUserId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if user can signup for a business (public page enabled)
   */
  async canSignupForBusiness(businessId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('businesses')
      .select('public_page_enabled, is_active')
      .eq('id', businessId)
      .maybeSingle();

    if (error || !data) return false;
    return data.public_page_enabled === true && data.is_active === true;
  },
};
