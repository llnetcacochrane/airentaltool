import { supabase } from '../lib/supabase';
import { portfolioService } from './portfolioService';

export interface Lease {
  id: string;
  organization_id: string;
  property_id: string;
  property_unit_id?: string | null;
  tenant_id: string;
  lease_type: string;
  start_date: string;
  end_date: string;
  renewal_type: string;
  monthly_rent: number;
  payment_frequency: string;
  payment_due_day: number;
  late_fee_type?: string;
  late_fee_amount?: number;
  late_fee_percentage?: number;
  grace_period_days: number;
  utilities_included?: any;
  pet_policy?: any;
  custom_terms?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  property?: any;
  tenant?: any;
}

export const leaseService = {
  async getPortfolioLeases(portfolioId: string): Promise<Lease[]> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address, city),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllUserLeases(): Promise<Lease[]> {
    const defaultPortfolio = await portfolioService.getUserDefaultPortfolio();
    if (!defaultPortfolio) return [];

    return this.getPortfolioLeases(defaultPortfolio.id);
  },

  async getLeaseById(id: string): Promise<Lease> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address, city),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createLease(lease: Partial<Lease>): Promise<Lease> {
    const { data, error } = await supabase
      .from('leases')
      .insert([lease])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLease(id: string, updates: Partial<Lease>): Promise<Lease> {
    const { data, error } = await supabase
      .from('leases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteLease(id: string): Promise<void> {
    const { error } = await supabase
      .from('leases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getActiveLeaseByTenant(tenantId: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getLeasesByProperty(propertyId: string): Promise<Lease[]> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('property_id', propertyId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
