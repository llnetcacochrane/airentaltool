import { supabase } from '../lib/supabase';
import { Unit, Tenant, Lease } from '../types';
import { portfolioService } from './portfolioService';

export const unitService = {
  async getPortfolioUnits(portfolioId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  async getAllUserUnits(): Promise<Unit[]> {
    const defaultPortfolio = await portfolioService.getUserDefaultPortfolio();
    if (!defaultPortfolio) return [];

    return this.getPortfolioUnits(defaultPortfolio.id);
  },

  async getUnitsByProperty(propertyId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  async getUnit(id: string): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUnit(portfolioId: string, propertyId: string, unit: Partial<Unit>): Promise<Unit> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('units')
      .insert({
        portfolio_id: portfolioId,
        property_id: propertyId,
        unit_number: unit.unit_number,
        unit_name: unit.unit_name,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        square_feet: unit.square_feet,
        floor_number: unit.floor_number,
        monthly_rent_cents: unit.monthly_rent_cents || 0,
        security_deposit_cents: unit.security_deposit_cents || 0,
        utilities_included: unit.utilities_included,
        amenities: unit.amenities,
        occupancy_status: unit.occupancy_status || 'vacant',
        available_date: unit.available_date,
        notes: unit.notes,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .update({
        unit_number: updates.unit_number,
        unit_name: updates.unit_name,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        square_feet: updates.square_feet,
        floor_number: updates.floor_number,
        monthly_rent_cents: updates.monthly_rent_cents,
        security_deposit_cents: updates.security_deposit_cents,
        utilities_included: updates.utilities_included,
        amenities: updates.amenities,
        occupancy_status: updates.occupancy_status,
        available_date: updates.available_date,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async getUnitTenants(unitId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('tenant_type');

    if (error) throw error;
    return data || [];
  },

  async getUnitLease(unitId: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getVacantUnits(portfolioId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .eq('occupancy_status', 'vacant')
      .order('available_date');

    if (error) throw error;
    return data || [];
  },

  async getOccupiedUnits(portfolioId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .eq('occupancy_status', 'occupied')
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  async updateOccupancyStatus(unitId: string, status: 'vacant' | 'occupied' | 'maintenance' | 'reserved'): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({
        occupancy_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', unitId);

    if (error) throw error;
  },

  async getUnitStats(unitId: string): Promise<{
    tenant_count: number;
    lease_active: boolean;
    monthly_rent_cents: number;
    last_payment_date?: string;
    maintenance_requests_open: number;
  }> {
    const [tenants, lease, maintenanceCount] = await Promise.all([
      supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .eq('is_active', true),
      supabase
        .from('leases')
        .select('monthly_rent_cents')
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .in('status', ['open', 'in_progress']),
    ]);

    return {
      tenant_count: tenants.count || 0,
      lease_active: !!lease.data,
      monthly_rent_cents: lease.data?.monthly_rent_cents || 0,
      maintenance_requests_open: maintenanceCount.count || 0,
    };
  },
};
