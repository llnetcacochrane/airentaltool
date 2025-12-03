import { supabase } from '../lib/supabase';
import { Property, Unit } from '../types';
import { portfolioService } from './portfolioService';

export const propertyService = {
  async getPortfolioProperties(portfolioId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getAllUserProperties(): Promise<Property[]> {
    const defaultPortfolio = await portfolioService.getUserDefaultPortfolio();
    if (!defaultPortfolio) return [];

    return this.getPortfolioProperties(defaultPortfolio.id);
  },

  async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createProperty(portfolioId: string, property: Partial<Property>): Promise<Property> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        portfolio_id: portfolioId,
        name: property.name,
        property_type: property.property_type,
        address_line1: property.address_line1,
        address_line2: property.address_line2,
        city: property.city,
        state: property.state,
        postal_code: property.postal_code,
        country: property.country || 'CA',
        year_built: property.year_built,
        square_feet: property.square_feet,
        lot_size: property.lot_size,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        purchase_price_cents: property.purchase_price_cents,
        purchase_date: property.purchase_date,
        current_value_cents: property.current_value_cents,
        notes: property.notes,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update({
        name: updates.name,
        property_type: updates.property_type,
        address_line1: updates.address_line1,
        address_line2: updates.address_line2,
        city: updates.city,
        state: updates.state,
        postal_code: updates.postal_code,
        country: updates.country,
        year_built: updates.year_built,
        square_feet: updates.square_feet,
        lot_size: updates.lot_size,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        purchase_price_cents: updates.purchase_price_cents,
        purchase_date: updates.purchase_date,
        current_value_cents: updates.current_value_cents,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async getPropertyUnits(propertyId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  async getPropertyStats(propertyId: string): Promise<{
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    total_tenants: number;
    monthly_revenue_cents: number;
    maintenance_requests_open: number;
  }> {
    const unitsResult = await supabase
      .from('units')
      .select('id, occupancy_status, monthly_rent_cents')
      .eq('property_id', propertyId)
      .eq('is_active', true);

    const unitData = unitsResult.data || [];
    const unitIds = unitData.map(u => u.id);

    const [tenants, maintenance] = await Promise.all([
      unitIds.length > 0
        ? supabase
            .from('tenants')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .in('unit_id', unitIds)
        : { count: 0 },
      supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .in('status', ['open', 'in_progress']),
    ]);

    const occupied = unitData.filter(u => u.occupancy_status === 'occupied');
    const vacant = unitData.filter(u => u.occupancy_status === 'vacant');
    const monthlyRevenue = occupied.reduce((sum, u) => sum + (u.monthly_rent_cents || 0), 0);

    return {
      total_units: unitData.length,
      occupied_units: occupied.length,
      vacant_units: vacant.length,
      total_tenants: tenants.count || 0,
      monthly_revenue_cents: monthlyRevenue,
      maintenance_requests_open: maintenance.count || 0,
    };
  },
};
