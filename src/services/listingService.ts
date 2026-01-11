import { supabase } from '../lib/supabase';

// Amenity configuration for structured amenity management
export interface AmenityConfig {
  id: string;
  included: boolean;
  isKeyFeature?: boolean; // Show as prominent key feature instead of regular amenity
}

// Predefined amenities list with categories and icons
export interface PredefinedAmenity {
  id: string;
  label: string;
  category: 'Utilities' | 'In-Unit' | 'Building' | 'Parking' | 'Technology' | 'Security' | 'Outdoor';
  icon: string; // lucide-react icon name
}

export const PREDEFINED_AMENITIES: PredefinedAmenity[] = [
  // Utilities & Services (new category for land/basic properties)
  { id: 'electricity_included', label: 'Electricity Included', category: 'Utilities', icon: 'Zap' },
  { id: 'electricity_20amp', label: 'Electricity (20 Amp)', category: 'Utilities', icon: 'Zap' },
  { id: 'electricity_30amp', label: 'Electricity (30 Amp)', category: 'Utilities', icon: 'Zap' },
  { id: 'electricity_50amp', label: 'Electricity (50 Amp)', category: 'Utilities', icon: 'Zap' },
  { id: 'water_included', label: 'Water Included', category: 'Utilities', icon: 'Droplets' },
  { id: 'potable_water', label: 'Potable Water Access', category: 'Utilities', icon: 'Droplets' },
  { id: 'well_water', label: 'Well Water', category: 'Utilities', icon: 'Droplets' },
  { id: 'septic_system', label: 'Septic System', category: 'Utilities', icon: 'Container' },
  { id: 'sewer_connection', label: 'Sewer Connection', category: 'Utilities', icon: 'Container' },
  { id: 'natural_gas', label: 'Natural Gas', category: 'Utilities', icon: 'Flame' },
  { id: 'propane', label: 'Propane', category: 'Utilities', icon: 'Flame' },
  { id: 'trash_included', label: 'Trash Included', category: 'Utilities', icon: 'Trash2' },
  { id: 'internet_included', label: 'Internet Included', category: 'Utilities', icon: 'Wifi' },

  // In-Unit Features
  { id: 'air_conditioning', label: 'Air Conditioning', category: 'In-Unit', icon: 'Wind' },
  { id: 'heating', label: 'Heating', category: 'In-Unit', icon: 'Thermometer' },
  { id: 'washer_dryer_in_unit', label: 'Washer/Dryer In-Unit', category: 'In-Unit', icon: 'WashingMachine' },
  { id: 'dishwasher', label: 'Dishwasher', category: 'In-Unit', icon: 'Sparkles' },
  { id: 'refrigerator', label: 'Refrigerator', category: 'In-Unit', icon: 'Refrigerator' },
  { id: 'stove_oven', label: 'Stove/Oven', category: 'In-Unit', icon: 'CookingPot' },
  { id: 'microwave', label: 'Microwave', category: 'In-Unit', icon: 'Microwave' },
  { id: 'garbage_disposal', label: 'Garbage Disposal', category: 'In-Unit', icon: 'Trash2' },
  { id: 'ceiling_fans', label: 'Ceiling Fans', category: 'In-Unit', icon: 'Fan' },
  { id: 'walk_in_closet', label: 'Walk-In Closet', category: 'In-Unit', icon: 'DoorOpen' },
  { id: 'hardwood_floors', label: 'Hardwood Floors', category: 'In-Unit', icon: 'Grid3x3' },
  { id: 'carpet', label: 'Carpet', category: 'In-Unit', icon: 'Square' },
  { id: 'tile_floors', label: 'Tile Floors', category: 'In-Unit', icon: 'LayoutGrid' },
  { id: 'balcony_patio', label: 'Balcony/Patio', category: 'In-Unit', icon: 'Sun' },
  { id: 'fireplace', label: 'Fireplace', category: 'In-Unit', icon: 'Flame' },
  { id: 'furnished', label: 'Furnished', category: 'In-Unit', icon: 'Sofa' },
  { id: 'high_ceilings', label: 'High Ceilings', category: 'In-Unit', icon: 'ArrowUpFromLine' },
  { id: 'storage_space', label: 'Extra Storage', category: 'In-Unit', icon: 'Package' },

  // Building/Property Features
  { id: 'pool', label: 'Swimming Pool', category: 'Building', icon: 'Waves' },
  { id: 'hot_tub', label: 'Hot Tub/Spa', category: 'Building', icon: 'Bath' },
  { id: 'fitness_center', label: 'Fitness Center', category: 'Building', icon: 'Dumbbell' },
  { id: 'clubhouse', label: 'Clubhouse', category: 'Building', icon: 'Home' },
  { id: 'business_center', label: 'Business Center', category: 'Building', icon: 'Briefcase' },
  { id: 'laundry_facility', label: 'Laundry Facility', category: 'Building', icon: 'WashingMachine' },
  { id: 'elevator', label: 'Elevator', category: 'Building', icon: 'ArrowUpDown' },
  { id: 'concierge', label: 'Concierge', category: 'Building', icon: 'UserCheck' },
  { id: 'doorman', label: 'Doorman', category: 'Building', icon: 'UserCheck' },
  { id: 'package_lockers', label: 'Package Lockers', category: 'Building', icon: 'Package' },
  { id: 'rooftop_deck', label: 'Rooftop Deck', category: 'Building', icon: 'Sun' },
  { id: 'bbq_area', label: 'BBQ/Grill Area', category: 'Building', icon: 'Flame' },
  { id: 'playground', label: 'Playground', category: 'Building', icon: 'Baby' },
  { id: 'dog_park', label: 'Dog Park', category: 'Building', icon: 'Dog' },
  { id: 'ev_charging', label: 'EV Charging Station', category: 'Building', icon: 'Plug' },
  { id: 'bike_storage', label: 'Bike Storage', category: 'Building', icon: 'Bike' },

  // Parking & Access
  { id: 'garage_parking', label: 'Garage Parking', category: 'Parking', icon: 'Warehouse' },
  { id: 'covered_parking', label: 'Covered Parking', category: 'Parking', icon: 'Car' },
  { id: 'street_parking', label: 'Street Parking', category: 'Parking', icon: 'Car' },
  { id: 'assigned_parking', label: 'Assigned Parking', category: 'Parking', icon: 'ParkingSquare' },
  { id: 'guest_parking', label: 'Guest Parking', category: 'Parking', icon: 'Car' },
  { id: 'wheelchair_accessible', label: 'Wheelchair Accessible', category: 'Parking', icon: 'Accessibility' },
  { id: 'rv_parking', label: 'RV Parking', category: 'Parking', icon: 'Truck' },
  { id: 'boat_parking', label: 'Boat Parking', category: 'Parking', icon: 'Ship' },

  // Technology & Connectivity
  { id: 'wifi_included', label: 'WiFi Included', category: 'Technology', icon: 'Wifi' },
  { id: 'cable_included', label: 'Cable Included', category: 'Technology', icon: 'Tv' },
  { id: 'smart_thermostat', label: 'Smart Thermostat', category: 'Technology', icon: 'Thermometer' },
  { id: 'keyless_entry', label: 'Keyless Entry', category: 'Technology', icon: 'Key' },
  { id: 'video_intercom', label: 'Video Intercom', category: 'Technology', icon: 'Video' },

  // Security
  { id: 'security_system', label: 'Security System', category: 'Security', icon: 'Shield' },
  { id: 'gated_community', label: 'Gated Community', category: 'Security', icon: 'Lock' },
  { id: 'security_cameras', label: 'Security Cameras', category: 'Security', icon: 'Camera' },
  { id: 'smoke_detectors', label: 'Smoke Detectors', category: 'Security', icon: 'AlertTriangle' },
  { id: 'carbon_monoxide_detector', label: 'CO Detector', category: 'Security', icon: 'AlertCircle' },

  // Outdoor
  { id: 'yard', label: 'Private Yard', category: 'Outdoor', icon: 'Trees' },
  { id: 'garden', label: 'Garden', category: 'Outdoor', icon: 'Flower2' },
  { id: 'lake_access', label: 'Lake Access', category: 'Outdoor', icon: 'Waves' },
  { id: 'waterfront', label: 'Waterfront', category: 'Outdoor', icon: 'Anchor' },
  { id: 'mountain_view', label: 'Mountain View', category: 'Outdoor', icon: 'Mountain' },
  { id: 'city_view', label: 'City View', category: 'Outdoor', icon: 'Building2' },
  { id: 'forest_view', label: 'Forest View', category: 'Outdoor', icon: 'TreePine' },
  { id: 'hiking_trails', label: 'Hiking Trails', category: 'Outdoor', icon: 'Footprints' },
];

// Get unique categories from predefined amenities
export const AMENITY_CATEGORIES = [...new Set(PREDEFINED_AMENITIES.map(a => a.category))];

// Helper to get amenities by category
export const getAmenitiesByCategory = (category: string) =>
  PREDEFINED_AMENITIES.filter(a => a.category === category);

export interface Listing {
  id: string;
  business_id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  display_title: string | null; // Custom title override (null = use auto-generated title)
  description: string | null;
  amenities_config: AmenityConfig[] | null; // Structured amenity toggles
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
