import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  MapPin, Phone, Mail, ArrowRight, ArrowLeft, DoorClosed,
  Bed, Bath, Maximize, DollarSign, Calendar, CheckCircle,
  Globe, Home
} from 'lucide-react';

interface PublicProperty {
  id: string;
  business_id: string;
  name: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  property_type: string;
  public_page_slug: string;
  public_page_title: string;
  public_page_description: string;
  public_page_photos: string[];
  public_page_amenities: string[];
  public_page_custom_content: any;
  business: {
    business_name: string;
    public_page_slug: string;
    public_page_contact_email: string;
    public_page_contact_phone: string;
  };
}

interface PublicListing {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  monthly_rent_cents: number;
  deposit_cents: number;
  available_date: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  photos: string[];
  amenities: string[];
  pets_allowed: boolean;
  unit: {
    unit_number: string;
  };
}

export function PublicPropertyPage() {
  const { businessSlug, propertySlug } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadPublicPropertyData();
  }, [businessSlug, propertySlug]);

  const loadPublicPropertyData = async () => {
    if (!businessSlug || !propertySlug) return;
    setIsLoading(true);
    try {
      // Get property with business info
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          business:businesses!inner(
            business_name,
            public_page_slug,
            public_page_contact_email,
            public_page_contact_phone
          )
        `)
        .eq('public_page_slug', propertySlug)
        .eq('public_page_enabled', true)
        .eq('is_active', true)
        .eq('business.public_page_slug', businessSlug)
        .maybeSingle();

      if (propertyError) throw propertyError;
      if (!propertyData) {
        setError('Property not found or not publicly available');
        setIsLoading(false);
        return;
      }

      setProperty(propertyData);

      // Get active listings for this property
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          unit:units!inner(unit_number)
        `)
        .eq('property_id', propertyData.id)
        .eq('status', 'active')
        .order('monthly_rent_cents', { ascending: true });

      if (listingsError) throw listingsError;

      setListings(listingsData || []);
    } catch (err) {
      console.error('Failed to load public property data:', err);
      setError('Failed to load property information');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This page is not available'}</p>
          <button
            onClick={() => navigate(`/browse/${businessSlug}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = property.public_page_title || property.name;
  const pageDescription = property.public_page_description || `Browse available rental units at ${property.name}`;
  const photos = property.public_page_photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags */}
      <title>{pageTitle} - {property.business.business_name}</title>
      <meta name="description" content={pageDescription} />

      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(`/browse/${businessSlug}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {property.business.business_name}</span>
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="relative h-96 bg-gray-900 overflow-hidden">
          <img
            src={photos[currentPhotoIndex]}
            alt={`${property.name} - Photo ${currentPhotoIndex + 1}`}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
              <button
                onClick={() => setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition shadow-lg"
              >
                <ArrowRight className="w-5 h-5 text-gray-900" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Property Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{pageTitle}</h1>
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <MapPin className="w-5 h-5" />
            <span className="text-lg">
              {property.address_line1}, {property.city}, {property.state} {property.postal_code}
            </span>
          </div>
          {pageDescription && (
            <p className="text-lg text-gray-600 max-w-3xl">{pageDescription}</p>
          )}
        </div>
      </div>

      {/* Amenities */}
      {property.public_page_amenities && property.public_page_amenities.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {property.public_page_amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Content */}
      {property.public_page_custom_content?.sections && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {property.public_page_custom_content.sections.map((section: any, index: number) => (
              <div key={index} className="mb-6 last:mb-0">
                {section.title && (
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                )}
                {section.content && (
                  <div className="text-gray-600 whitespace-pre-wrap">{section.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Units */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Available Units</h2>
          <p className="text-gray-600">
            {listings.length} {listings.length === 1 ? 'unit' : 'units'} available for rent
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <DoorClosed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Units Available</h3>
            <p className="text-gray-600 mb-6">All units are currently occupied. Please check back later.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {property.business.public_page_contact_email && (
                <a
                  href={`mailto:${property.business.public_page_contact_email}`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Contact Us
                </a>
              )}
              {property.business.public_page_contact_phone && (
                <a
                  href={`tel:${property.business.public_page_contact_phone}`}
                  className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Call Us
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <button
                key={listing.id}
                onClick={() => navigate(`/browse/${businessSlug}/${propertySlug}/${listing.unit_id}`)}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-blue-200 overflow-hidden text-left"
              >
                {/* Unit Image */}
                {listing.photos && listing.photos.length > 0 ? (
                  <div className="relative h-56 bg-gray-200 overflow-hidden">
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="relative h-56 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <DoorClosed className="w-16 h-16 text-white/50" />
                  </div>
                )}

                {/* Unit Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-gray-600">Unit {listing.unit.unit_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        ${(listing.monthly_rent_cents / 100).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">per month</p>
                    </div>
                  </div>

                  {listing.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Bed className="w-5 h-5" />
                      <span className="text-sm">{listing.bedrooms} bed</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Bath className="w-5 h-5" />
                      <span className="text-sm">{listing.bathrooms} bath</span>
                    </div>
                    {listing.square_feet && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Maximize className="w-5 h-5" />
                        <span className="text-sm">{listing.square_feet} ft²</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Available {listing.available_date ? new Date(listing.available_date).toLocaleDateString() : 'Now'}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section */}
      {(property.business.public_page_contact_email || property.business.public_page_contact_phone) && (
        <div className="bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Interested in Renting?</h2>
              <p className="text-blue-100 mb-8 text-lg">
                Contact us to schedule a viewing or learn more about our available units
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {property.business.public_page_contact_email && (
                  <a
                    href={`mailto:${property.business.public_page_contact_email}`}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                  >
                    <Mail className="w-5 h-5" />
                    Email Us
                  </a>
                )}
                {property.business.public_page_contact_phone && (
                  <a
                    href={`tel:${property.business.public_page_contact_phone}`}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition font-medium"
                  >
                    <Phone className="w-5 h-5" />
                    Call Us
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                © {new Date().getFullYear()} {property.business.business_name}. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Powered by</span>
              <Globe className="w-4 h-4" />
              <span className="font-semibold">AI Rental Tools</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
