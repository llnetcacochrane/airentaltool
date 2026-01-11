import { supabase } from '../lib/supabase';
import { Unit, Tenant, Lease } from '../types';
import { businessService } from './businessService';

export const unitService = {
  /**
   * Get all units for the current user's default business
   * Alias method for compatibility with TenantForm.tsx
   */
  async getAllUnits(): Promise<Unit[]> {
    return this.getAllUserUnits();
  },

  /**
   * Get all units for a business
   * Alias method for compatibility with Applications.tsx
   */
  async getUnitsByBusiness(businessId: string): Promise<Unit[]> {
    return this.getBusinessUnits(businessId);
  },

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
   * businessId is used for limit checking
   */
  async createUnit(businessId: string, propertyId: string, unit: Partial<Unit>): Promise<Unit> {
    // Check unit limit using business-based function
    const { data: canAdd, error: limitError } = await supabase.rpc('check_unit_limit_for_business', {
      p_business_id: businessId,
    });

    if (limitError) {
      console.error('Failed to check unit limit:', limitError);
    } else if (!canAdd) {
      throw new Error('LIMIT_REACHED:unit');
    }

    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('units')
      .insert({
        organization_id: null, // No longer used
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
    // Build update object with only defined values
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Core unit fields
    if (updates.unit_number !== undefined) updateData.unit_number = updates.unit_number;
    if (updates.unit_name !== undefined) updateData.unit_name = updates.unit_name;
    if (updates.bedrooms !== undefined) updateData.bedrooms = updates.bedrooms;
    if (updates.bathrooms !== undefined) updateData.bathrooms = updates.bathrooms;
    if (updates.square_feet !== undefined) updateData.square_feet = updates.square_feet;
    if (updates.floor_number !== undefined) updateData.floor_number = updates.floor_number;
    if (updates.monthly_rent_cents !== undefined) updateData.monthly_rent_cents = updates.monthly_rent_cents;
    if (updates.security_deposit_cents !== undefined) updateData.security_deposit_cents = updates.security_deposit_cents;
    if (updates.utilities_included !== undefined) updateData.utilities_included = updates.utilities_included;
    if (updates.amenities !== undefined) updateData.amenities = updates.amenities;
    if (updates.occupancy_status !== undefined) updateData.occupancy_status = updates.occupancy_status;
    if (updates.available_date !== undefined) updateData.available_date = updates.available_date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Public page and template settings
    if (updates.public_page_enabled !== undefined) updateData.public_page_enabled = updates.public_page_enabled;
    if (updates.default_agreement_template_id !== undefined) updateData.default_agreement_template_id = updates.default_agreement_template_id;
    if (updates.default_application_template_id !== undefined) updateData.default_application_template_id = updates.default_application_template_id;

    // 3-tier public page visibility and online applications settings (v5.7.0+)
    if (updates.public_page_visibility_override !== undefined) updateData.public_page_visibility_override = updates.public_page_visibility_override;
    if (updates.accept_online_applications !== undefined) updateData.accept_online_applications = updates.accept_online_applications;

    const { data, error } = await supabase
      .from('units')
      .update(updateData)
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
   * Check if user can create more units for a business
   */
  async canCreateUnit(businessId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_unit_limit_for_business', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error checking unit limit:', error);
      return true; // Allow by default if check fails
    }

    return data === true;
  },
};
