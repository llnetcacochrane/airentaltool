import { supabase } from '../lib/supabase';
import { Property, Unit } from '../types';
import { businessService } from './businessService';
import { unitService } from './unitService';

export const propertyService = {
  /**
   * Get all properties for a business
   * Alias method for compatibility with Maintenance.tsx
   */
  async getAllProperties(businessId: string): Promise<Property[]> {
    return this.getBusinessProperties(businessId);
  },

  /**
   * Get properties by business ID
   * Alias method for compatibility
   */
  async getPropertiesByBusiness(businessId: string): Promise<Property[]> {
    return this.getBusinessProperties(businessId);
  },

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
   * Checks user tier limits before creation
   */
  async createProperty(businessId: string, property: Partial<Property>): Promise<Property> {
    const user = (await supabase.auth.getUser()).data.user;

    // Check property limit using business-based function
    const { data: canAdd, error: limitError } = await supabase.rpc('check_property_limit_for_business', {
      p_business_id: businessId,
    });

    if (limitError) {
      console.error('Failed to check property limit:', limitError);
    } else if (!canAdd) {
      throw new Error('LIMIT_REACHED:property');
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        business_id: businessId,
        organization_id: null, // No longer used
        name: property.name,
        property_type: property.property_type || 'residential',
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
    // Build update object with only defined values
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Core property fields
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.property_type !== undefined) updateData.property_type = updates.property_type;
    if (updates.address_line1 !== undefined) updateData.address_line1 = updates.address_line1;
    if (updates.address_line2 !== undefined) updateData.address_line2 = updates.address_line2;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.postal_code !== undefined) updateData.postal_code = updates.postal_code;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.year_built !== undefined) updateData.year_built = updates.year_built;
    if (updates.square_feet !== undefined) updateData.square_feet = updates.square_feet;
    if (updates.lot_size !== undefined) updateData.lot_size = updates.lot_size;
    if (updates.bedrooms !== undefined) updateData.bedrooms = updates.bedrooms;
    if (updates.bathrooms !== undefined) updateData.bathrooms = updates.bathrooms;
    if (updates.purchase_price_cents !== undefined) updateData.purchase_price_cents = updates.purchase_price_cents;
    if (updates.purchase_date !== undefined) updateData.purchase_date = updates.purchase_date;
    if (updates.current_value_cents !== undefined) updateData.current_value_cents = updates.current_value_cents;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Public page settings
    if (updates.public_page_enabled !== undefined) updateData.public_page_enabled = updates.public_page_enabled;
    if (updates.public_page_slug !== undefined) updateData.public_page_slug = updates.public_page_slug;
    if (updates.public_unit_display_mode !== undefined) updateData.public_unit_display_mode = updates.public_unit_display_mode;
    if (updates.default_agreement_template_id !== undefined) updateData.default_agreement_template_id = updates.default_agreement_template_id;
    if (updates.default_application_template_id !== undefined) updateData.default_application_template_id = updates.default_application_template_id;

    // 3-tier online applications settings (v5.7.0+)
    if (updates.accept_online_applications !== undefined) updateData.accept_online_applications = updates.accept_online_applications;

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
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
   * Check if user can create more properties for a business
   */
  async canCreateProperty(businessId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_property_limit_for_business', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error checking property limit:', error);
      return true; // Allow by default if check fails
    }

    return data === true;
  },

  /**
   * Create a unit for a property
   * Wrapper method for compatibility with BusinessSetupWizard.tsx and PropertySetupWizard.tsx
   */
  async createUnit(propertyId: string, unit: Partial<Unit>): Promise<Unit> {
    // Get the business ID from the property
    const property = await this.getProperty(propertyId);
    if (!property || !property.business_id) {
      throw new Error('Property not found or missing business_id');
    }
    return unitService.createUnit(property.business_id, propertyId, unit);
  },
};
