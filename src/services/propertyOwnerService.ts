import { supabase } from '../lib/supabase';

export interface PropertyOwner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  preferred_contact_method?: string;
  notification_preferences?: {
    monthly_reports: boolean;
    maintenance_alerts: boolean;
    payment_updates: boolean;
  };
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PropertyOwnership {
  id: string;
  property_id: string;
  owner_id: string;
  organization_id: string;
  ownership_percentage: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PropertyOwnerWithProperties extends PropertyOwner {
  properties?: Array<{
    id: string;
    name: string;
    address: string;
    ownership_percentage: number;
  }>;
}

export const propertyOwnerService = {
  async createPropertyOwner(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    company_name?: string;
    tax_id?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    preferred_contact_method?: string;
    notification_preferences?: {
      monthly_reports: boolean;
      maintenance_alerts: boolean;
      payment_updates: boolean;
    };
    notes?: string;
    password: string;
  }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          role: 'property_owner',
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    const { data: owner, error: ownerError } = await supabase
      .from('property_owners')
      .insert({
        user_id: authData.user.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        company_name: data.company_name,
        tax_id: data.tax_id,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country || 'CA',
        preferred_contact_method: data.preferred_contact_method || 'email',
        notification_preferences: data.notification_preferences || {
          monthly_reports: true,
          maintenance_alerts: true,
          payment_updates: true,
        },
        notes: data.notes,
      })
      .select()
      .single();

    if (ownerError) throw ownerError;
    return owner;
  },

  async getPropertyOwners() {
    const { data, error } = await supabase
      .from('property_owners')
      .select('*')
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data as PropertyOwner[];
  },

  async getPropertyOwnerById(id: string) {
    const { data, error } = await supabase
      .from('property_owners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as PropertyOwner;
  },

  async getPropertyOwnerWithProperties(ownerId: string) {
    const { data: owner, error: ownerError } = await supabase
      .from('property_owners')
      .select('*')
      .eq('id', ownerId)
      .single();

    if (ownerError) throw ownerError;

    const { data: ownerships, error: ownershipError } = await supabase
      .from('property_ownerships')
      .select(`
        ownership_percentage,
        properties:property_id (
          id,
          name,
          address
        )
      `)
      .eq('owner_id', ownerId)
      .eq('is_active', true);

    if (ownershipError) throw ownershipError;

    const properties = ownerships.map((o: any) => ({
      id: o.properties.id,
      name: o.properties.name,
      address: o.properties.address,
      ownership_percentage: o.ownership_percentage,
    }));

    return {
      ...owner,
      properties,
    } as PropertyOwnerWithProperties;
  },

  async updatePropertyOwner(id: string, updates: Partial<PropertyOwner>) {
    const { data, error } = await supabase
      .from('property_owners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PropertyOwner;
  },

  async deactivatePropertyOwner(id: string) {
    const { data, error } = await supabase
      .from('property_owners')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PropertyOwner;
  },

  async assignPropertyToOwner(data: {
    property_id: string;
    owner_id: string;
    organization_id: string;
    ownership_percentage?: number;
    start_date?: string;
    notes?: string;
  }) {
    const { data: ownership, error } = await supabase
      .from('property_ownerships')
      .insert({
        property_id: data.property_id,
        owner_id: data.owner_id,
        organization_id: data.organization_id,
        ownership_percentage: data.ownership_percentage || 100,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return ownership as PropertyOwnership;
  },

  async removePropertyFromOwner(propertyId: string, ownerId: string) {
    const { error } = await supabase
      .from('property_ownerships')
      .delete()
      .eq('property_id', propertyId)
      .eq('owner_id', ownerId);

    if (error) throw error;
  },

  async updatePropertyOwnership(
    id: string,
    updates: Partial<PropertyOwnership>
  ) {
    const { data, error } = await supabase
      .from('property_ownerships')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PropertyOwnership;
  },

  async getPropertiesForOwner(ownerId: string) {
    const { data, error } = await supabase
      .from('property_ownerships')
      .select(`
        id,
        ownership_percentage,
        start_date,
        end_date,
        properties:property_id (
          id,
          name,
          address,
          city,
          state_province,
          status
        )
      `)
      .eq('owner_id', ownerId)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  },

  async getOwnersForProperty(propertyId: string) {
    const { data, error } = await supabase
      .from('property_ownerships')
      .select(`
        id,
        ownership_percentage,
        start_date,
        end_date,
        is_active,
        property_owners:owner_id (
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          company_name
        )
      `)
      .eq('property_id', propertyId)
      .order('ownership_percentage', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getCurrentOwnerProperties() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: owner, error: ownerError } = await supabase
      .from('property_owners')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (ownerError) throw ownerError;
    if (!owner) throw new Error('Not a property owner');

    return this.getPropertiesForOwner(owner.id);
  },

  async isPropertyOwner() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check legacy property_owners table
    const { data: legacyOwner } = await supabase
      .from('property_owners')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (legacyOwner) return true;

    // Check new business_users with property_owner role
    const { data: businessOwner } = await supabase
      .from('business_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('role', 'property_owner')
      .eq('is_active', true)
      .maybeSingle();

    return !!businessOwner;
  },

  /**
   * Get the business(es) this property owner has access to
   */
  async getPropertyOwnerBusinesses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('business_users')
      .select(`
        id,
        business_id,
        role,
        businesses:business_id (
          id,
          business_name,
          slug
        )
      `)
      .eq('auth_user_id', user.id)
      .eq('role', 'property_owner')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching property owner businesses:', error);
      return [];
    }

    return data?.map(d => d.businesses).filter(Boolean) || [];
  },

  /**
   * Check if user is a property owner for a specific business
   */
  async isPropertyOwnerForBusiness(businessId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('business_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('business_id', businessId)
      .eq('role', 'property_owner')
      .eq('is_active', true)
      .maybeSingle();

    return !!data;
  },
};
