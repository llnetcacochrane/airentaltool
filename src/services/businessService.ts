import { supabase } from '../lib/supabase';
import { Business } from '../types';
import { addonService } from './addonService';

export interface BusinessWithStats extends Business {
  property_count?: number;
  is_owned?: boolean;
}

export const businessService = {
  /**
   * Get all businesses accessible to the current user
   */
  async getUserBusinesses(): Promise<BusinessWithStats[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_businesses', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching user businesses:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Get the user's default business
   */
  async getUserDefaultBusiness(): Promise<Business | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data: businessId, error } = await supabase.rpc('get_user_default_business', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching default business:', error);
      return null;
    }

    if (!businessId) return null;

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError) {
      console.error('Error fetching business details:', businessError);
      return null;
    }

    return business;
  },

  /**
   * Get all businesses for an organization
   */
  async getAllBusinesses(organizationId: string): Promise<Business[]> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('business_name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single business by ID
   */
  async getBusiness(id: string): Promise<Business | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new business
   * Checks organization limits before creation
   */
  async createBusiness(organizationId: string, business: Partial<Business>): Promise<Business> {
    // Check limits
    const canAdd = await addonService.checkLimit(organizationId, 'business');
    if (!canAdd) {
      throw new Error('LIMIT_REACHED:business');
    }

    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        organization_id: organizationId,
        owner_user_id: user?.id,
        business_name: business.business_name,
        legal_name: business.legal_name,
        business_type: business.business_type,
        tax_id: business.tax_id,
        registration_number: business.registration_number,
        phone: business.phone,
        email: business.email,
        website: business.website,
        address_line1: business.address_line1,
        address_line2: business.address_line2,
        city: business.city,
        state: business.state,
        postal_code: business.postal_code,
        country: business.country || 'CA',
        currency: business.currency || 'CAD',
        timezone: business.timezone || 'America/Toronto',
        notes: business.notes,
        is_default: false,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create the default business for a new user
   */
  async createDefaultBusiness(
    organizationId: string,
    businessName: string,
    userData?: {
      email?: string;
      phone?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }
  ): Promise<Business> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        organization_id: organizationId,
        owner_user_id: user?.id,
        business_name: businessName,
        email: userData?.email || user?.email,
        phone: userData?.phone,
        address_line1: userData?.addressLine1,
        city: userData?.city,
        state: userData?.state,
        postal_code: userData?.postalCode,
        country: userData?.country || 'CA',
        currency: 'CAD',
        timezone: 'America/Toronto',
        is_default: true,
        is_active: true,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a business
   */
  async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .update({
        business_name: updates.business_name,
        legal_name: updates.legal_name,
        business_type: updates.business_type,
        tax_id: updates.tax_id,
        registration_number: updates.registration_number,
        phone: updates.phone,
        email: updates.email,
        website: updates.website,
        address_line1: updates.address_line1,
        address_line2: updates.address_line2,
        city: updates.city,
        state: updates.state,
        postal_code: updates.postal_code,
        country: updates.country,
        currency: updates.currency,
        timezone: updates.timezone,
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
   * Soft delete a business
   */
  async deleteBusiness(id: string): Promise<void> {
    // Check if this is the default business
    const { data: business } = await supabase
      .from('businesses')
      .select('is_default')
      .eq('id', id)
      .single();

    if (business?.is_default) {
      throw new Error('Cannot delete your default business');
    }

    const { error } = await supabase
      .from('businesses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get statistics for a business
   */
  async getBusinessStats(businessId: string): Promise<{
    total_properties: number;
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    total_tenants: number;
    monthly_revenue_cents: number;
  }> {
    const propertiesResult = await supabase
      .from('properties')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    const propertyIds = (propertiesResult.data || []).map(p => p.id);

    if (propertyIds.length === 0) {
      return {
        total_properties: 0,
        total_units: 0,
        occupied_units: 0,
        vacant_units: 0,
        total_tenants: 0,
        monthly_revenue_cents: 0,
      };
    }

    const [unitsData, tenantsCount] = await Promise.all([
      supabase
        .from('units')
        .select('occupancy_status, monthly_rent_cents')
        .eq('is_active', true)
        .in('property_id', propertyIds),
      supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('property_id', propertyIds),
    ]);

    const units = unitsData.data || [];
    const occupied = units.filter(u => u.occupancy_status === 'occupied');
    const vacant = units.filter(u => u.occupancy_status === 'vacant');
    const monthlyRevenue = occupied.reduce((sum, u) => sum + (u.monthly_rent_cents || 0), 0);

    return {
      total_properties: propertyIds.length,
      total_units: units.length,
      occupied_units: occupied.length,
      vacant_units: vacant.length,
      total_tenants: tenantsCount.count || 0,
      monthly_revenue_cents: monthlyRevenue,
    };
  },

  /**
   * Check if user can create more businesses
   */
  async canCreateBusiness(organizationId: string): Promise<boolean> {
    return addonService.checkLimit(organizationId, 'business');
  },

  /**
   * Set a business as the default for the user
   */
  async setDefaultBusiness(businessId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // First, unset any existing defaults for this user
    await supabase
      .from('businesses')
      .update({ is_default: false })
      .eq('owner_user_id', user.id);

    // Then set the new default
    const { error } = await supabase
      .from('businesses')
      .update({ is_default: true })
      .eq('id', businessId)
      .eq('owner_user_id', user.id);

    if (error) throw error;
  },
};
