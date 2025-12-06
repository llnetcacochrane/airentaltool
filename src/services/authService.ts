import { supabase } from '../lib/supabase';
import { Organization, OrganizationMember, User, AuthSession } from '../types';

export const authService = {
  async register(email: string, password: string, firstName: string, lastName: string, tierSlug: string = 'free') {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    // Update user profile with name and selected tier
    await supabase
      .from('user_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        selected_tier: tierSlug,
      })
      .eq('user_id', authData.user.id);

    return authData.user;
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async createOrganization(name: string, slug: string, companyName?: string, tierSlug: string = 'basic') {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        owner_id: user.id,
        name,
        slug,
        company_name: companyName,
        currency: 'CAD',
        timezone: 'America/Toronto',
        account_tier: tierSlug,
        subscription_status: 'trial',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Organization creation error:', error);
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    if (!data) {
      throw new Error('Organization created but no data returned');
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: data.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Member insertion error:', memberError);
      throw new Error(`Failed to add member: ${memberError.message}`);
    }

    const { error: packageError } = await supabase.rpc('assign_package_to_organization', {
      p_org_id: data.id,
      p_tier_slug: tierSlug
    });

    if (packageError) {
      console.error('Package assignment error:', packageError);
    }

    return data;
  },

  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase.rpc('get_my_organizations');

    if (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }

    return (data as any[]) || [];
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async checkSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('super_admins')
      .select('is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  async getMemberRole(organizationId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.role || null;
  },

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
