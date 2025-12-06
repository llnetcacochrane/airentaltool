import { supabase } from '../lib/supabase';
import { Unit, Tenant, Lease } from '../types';
import { businessService } from './businessService';
import { addonService } from './addonService';

export const unitService = {
  /**
   * Get all units for a business
   */
  async getBusinessUnits(businessId: string): Promise<Unit[]> {
    // Get all properties for this business first
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (!properties || properties.length === 0) return [];

    const propertyIds = properties.map(p => p.id);

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .in('property_id', propertyIds)
      .eq('is_active', true)
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all units for the user's default business
   */
  async getAllUserUnits(): Promise<Unit[]> {
    const defaultBusiness = await businessService.getUserDefaultBusiness();
    if (!defaultBusiness) return [];

    return this.getBusinessUnits(defaultBusiness.id);
  },

  /**
   * Get units by property
   */
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

  /**
   * Get a single unit
   */
  async getUnit(id: string): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a unit in a property
   * Now takes organizationId instead of portfolioId for limit checking
   */
  async createUnit(organizationId: string, propertyId: string, unit: Partial<Unit>): Promise<Unit> {
    // Check unit limit
    const canAdd = await addonService.checkLimit(organizationId, 'unit');
    if (!canAdd) {
      throw new Error('LIMIT_REACHED:unit');
    }

    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('units')
      .insert({
        organization_id: organizationId,
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

  /**
   * Update a unit
   */
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

  /**
   * Soft delete a unit
   */
  async deleteUnit(id: string): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get tenants for a unit
   */
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

  /**
   * Get active lease for a unit
   */
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

  /**
   * Get vacant units for a business
   */
  async getVacantUnits(businessId: string): Promise<Unit[]> {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (!properties || properties.length === 0) return [];

    const propertyIds = properties.map(p => p.id);

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .in('property_id', propertyIds)
      .eq('is_active', true)
      .eq('occupancy_status', 'vacant')
      .order('available_date');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get occupied units for a business
   */
  async getOccupiedUnits(businessId: string): Promise<Unit[]> {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (!properties || properties.length === 0) return [];

    const propertyIds = properties.map(p => p.id);

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .in('property_id', propertyIds)
      .eq('is_active', true)
      .eq('occupancy_status', 'occupied')
      .order('unit_number');

    if (error) throw error;
    return data || [];
  },

  /**
   * Update unit occupancy status
   */
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

  /**
   * Get unit statistics
   */
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

  /**
   * Check if user can create more units
   */
  async canCreateUnit(organizationId: string): Promise<boolean> {
    return addonService.checkLimit(organizationId, 'unit');
  },
};
