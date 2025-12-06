import { supabase } from '../lib/supabase';
import { Property, Unit } from '../types';
import { businessService } from './businessService';
import { addonService } from './addonService';

export const propertyService = {
  /**
   * Get all properties for a business
   */
  async getBusinessProperties(businessId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all properties for the user's default business
   */
  async getAllUserProperties(): Promise<Property[]> {
    const defaultBusiness = await businessService.getUserDefaultBusiness();
    if (!defaultBusiness) return [];

    return this.getBusinessProperties(defaultBusiness.id);
  },

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new property under a business
   * Checks organization limits before creation
   */
  async createProperty(businessId: string, property: Partial<Property>): Promise<Property> {
    const user = (await supabase.auth.getUser()).data.user;

    // First, get the business to find the organization_id
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('organization_id')
      .eq('id', businessId)
      .single();

    if (businessError) {
      console.error('Failed to fetch business:', businessError);
      throw new Error('Business not found');
    }

    // Check property limit
    if (businessData.organization_id) {
      const canAdd = await addonService.checkLimit(businessData.organization_id, 'property');
      if (!canAdd) {
        throw new Error('LIMIT_REACHED:property');
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        business_id: businessId,
        organization_id: businessData.organization_id,
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

  /**
   * Update a property
   */
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

  /**
   * Soft delete a property
   */
  async deleteProperty(id: string): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get all units for a property
   */
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

  /**
   * Get property statistics
   */
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

  /**
   * Get all properties for an organization
   */
  async getOrganizationProperties(organizationId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if user can create more properties
   */
  async canCreateProperty(organizationId: string): Promise<boolean> {
    return addonService.checkLimit(organizationId, 'property');
  },
};
