import { supabase } from '../lib/supabase';

export interface Listing {
  id: string;
  business_id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'inactive' | 'rented';
  listing_type: 'unit' | 'property' | 'business';
  available_date: string | null;
  lease_term_months: number | null;
  lease_type: string | null;
  monthly_rent_cents: number;
  deposit_cents: number | null;
  pet_deposit_cents: number | null;
  application_fee_cents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  furnished: boolean;
  parking_spaces: number;
  photos: string[];
  amenities: string[];
  appliances: string[];
  pets_allowed: boolean;
  pet_policy: string | null;
  utilities_included: string[];
  additional_fees: any[];
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured: boolean;
  view_count: number;
  application_count: number;
  last_viewed_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  virtual_tour_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

export const listingService = {
  async createListingFromUnit(unitId: string, customData?: Partial<Listing>): Promise<Listing> {
    const { data, error } = await supabase.rpc('create_listing_from_unit', {
      p_unit_id: unitId,
      p_title: customData?.title || null,
      p_description: customData?.description || null,
    });

    if (error) throw error;

    // Get the created listing
    const listing = await this.getListingById(data);
    if (!listing) throw new Error('Failed to retrieve created listing');

    // Update with custom data if provided
    if (customData) {
      return await this.updateListing(listing.id, customData);
    }

    return listing;
  },

  async getListingById(listingId: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching listing:', error);
      return null;
    }

    return data;
  },

  async getListingByUnitId(unitId: string): Promise<Listing | null> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching listing:', error);
      return null;
    }

    return data;
  },

  async getBusinessListings(businessId: string): Promise<Listing[]> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business listings:', error);
      return [];
    }

    return data || [];
  },

  async getPropertyListings(propertyId: string): Promise<Listing[]> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching property listings:', error);
      return [];
    }

    return data || [];
  },

  async updateListing(listingId: string, updates: Partial<Listing>): Promise<Listing> {
    const { data, error } = await supabase
      .from('listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteListing(listingId: string): Promise<void> {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
  },

  async publishListing(listingId: string): Promise<Listing> {
    return await this.updateListing(listingId, {
      status: 'active',
      published_at: new Date().toISOString(),
    });
  },

  async unpublishListing(listingId: string): Promise<Listing> {
    return await this.updateListing(listingId, {
      status: 'inactive',
    });
  },

  async markAsRented(listingId: string): Promise<Listing> {
    return await this.updateListing(listingId, {
      status: 'rented',
    });
  },

  async getListingStats(listingId: string): Promise<{
    views: number;
    applications: number;
    lastViewed: string | null;
  }> {
    const { data: listing } = await supabase
      .from('listings')
      .select('view_count, application_count, last_viewed_at')
      .eq('id', listingId)
      .single();

    return {
      views: listing?.view_count || 0,
      applications: listing?.application_count || 0,
      lastViewed: listing?.last_viewed_at || null,
    };
  },
};
