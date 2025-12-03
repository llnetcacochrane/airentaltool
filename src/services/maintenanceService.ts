import { supabase } from '../lib/supabase';
import { portfolioService } from './portfolioService';

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  property_id: string;
  tenant_id?: string | null;
  title: string;
  description: string;
  category: string;
  priority: 'emergency' | 'high' | 'medium' | 'low';
  status: 'submitted' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  images?: string[];
  submitted_at: string;
  acknowledged_at?: string | null;
  completed_at?: string | null;
  assigned_to?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  property?: any;
  tenant?: any;
}

export interface MaintenanceVendor {
  id: string;
  organization_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialty: string;
  rating: number;
  total_jobs: number;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const maintenanceService = {
  async getPortfolioRequests(portfolioId: string): Promise<MaintenanceRequest[]> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(id, name, address),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('portfolio_id', portfolioId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllUserRequests(): Promise<MaintenanceRequest[]> {
    const defaultPortfolio = await portfolioService.getUserDefaultPortfolio();
    if (!defaultPortfolio) return [];

    return this.getPortfolioRequests(defaultPortfolio.id);
  },

  async getRequestById(id: string): Promise<MaintenanceRequest> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(id, name, address),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createRequest(request: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([request])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRequest(id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getVendors(organizationId: string): Promise<MaintenanceVendor[]> {
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createVendor(vendor: Partial<MaintenanceVendor>): Promise<MaintenanceVendor> {
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .insert([vendor])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVendor(id: string, updates: Partial<MaintenanceVendor>): Promise<MaintenanceVendor> {
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRequestStats(organizationId: string) {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('status, priority')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stats = {
      total: data.length,
      submitted: data.filter(r => r.status === 'submitted').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
      emergency: data.filter(r => r.priority === 'emergency').length,
    };

    return stats;
  },
};
