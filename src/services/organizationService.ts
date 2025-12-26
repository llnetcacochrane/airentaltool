import { supabase } from '../lib/supabase';

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  account_tier?: string;
  subscription_status?: string;
  created_at: string;
  updated_at: string;
}

export const organizationService = {
  /**
   * Get the user's organization
   * Each user has exactly one organization (user profile = organization)
   */
  async getUserOrganization(): Promise<Organization | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user organization:', error);
      return null;
    }

    return data;
  },

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data;
  },

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
