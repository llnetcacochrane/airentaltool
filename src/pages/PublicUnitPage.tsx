import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  MapPin, Phone, Mail, ArrowRight, ArrowLeft, DoorClosed,
  Bed, Bath, Maximize, DollarSign, Calendar, CheckCircle,
  Globe, Home, Send, User, Briefcase
} from 'lucide-react';

interface PublicListing {
  id: string;
  business_id: string;
  property_id: string;
  unit_id: string;
  title: string;
  description: string;
  monthly_rent_cents: number;
  deposit_cents: number;
  pet_deposit_cents: number;
  available_date: string;
  lease_term_months: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  photos: string[];
  amenities: string[];
  pets_allowed: boolean;
  pet_policy: string;
  utilities_included: string[];
  application_count: number;
  unit: {
    unit_number: string;
  };
  property: {
    name: string;
    address: string;
    city: string;
    state_province: string;
    postal_code: string;
    public_page_slug: string;
  };
  business: {
    business_name: string;
    public_page_slug: string;
    public_page_contact_email: string;
    public_page_contact_phone: string;
  };
}

export function PublicUnitPage() {
  const { businessSlug, propertySlug, unitId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [applicationData, setApplicationData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    current_address: '',
    move_in_date: '',
    monthly_income: '',
    employer_name: '',
    has_pets: false,
    message: '',
  });

  useEffect(() => {
    loadPublicListingData();
  }, [businessSlug, propertySlug, unitId]);

  const loadPublicListingData = async () => {
    if (!businessSlug || !propertySlug || !unitId) return;
    setIsLoading(true);
    try {
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          unit:units!inner(unit_number),
          property:properties!inner(
            name,
            address,
            city,
            state_province,
            postal_code,
            public_page_slug
          ),
          business:businesses!inner(
            business_name,
            public_page_slug,
            public_page_contact_email,
            public_page_contact_phone
          )
        `)
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .eq('property.public_page_slug', propertySlug)
        .eq('business.public_page_slug', businessSlug)
        .maybeSingle();

      if (listingError) throw listingError;
      if (!listingData) {
        setError('Listing not found or not available');
        setIsLoading(false);
        return;
      }

      setListing(listingData);

      // Track view
      await supabase.from('listing_views').insert({
        listing_id: listingData.id,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error('Failed to load public listing data:', err);
      setError('Failed to load listing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    setIsSubmitting(true);
    try {
      // First, try to create a tenant prospect for better tracking
      let prospectId = null;
      try {
        const { data: prospect, error: prospectError } = await supabase
          .from('tenant_prospects')
          .insert({
            first_name: applicationData.first_name,
            last_name: applicationData.last_name,
            email: applicationData.email,
            phone: applicationData.phone,
            current_address: applicationData.current_address || null,
            preferred_move_in_date: applicationData.move_in_date || null,
            monthly_income_cents: applicationData.monthly_income ? parseInt(applicationData.monthly_income) * 100 : null,
            employer_name: applicationData.employer_name || null,
            has_pets: applicationData.has_pets,
            notes: applicationData.message || null,
            profile_completed: true,
            is_active: true,
          })
          .select('id')
          .single();

        if (!prospectError && prospect) {
          prospectId = prospect.id;
        }
      } catch (prospectErr) {
        // Prospect creation is optional, continue with application
        console.log('Prospect creation skipped:', prospectErr);
      }

      // Build the responses object (required by rental_applications schema)
      const responses = {
        first_name: applicationData.first_name,
        last_name: applicationData.last_name,
        email: applicationData.email,
        phone: applicationData.phone,
        current_address: applicationData.current_address,
        move_in_date: applicationData.move_in_date,
        monthly_income: applicationData.monthly_income,
        employer: applicationData.employer_name,
        pets: applicationData.has_pets ? 'Yes' : 'No',
        occupants: 1, // Default
        references: applicationData.message,
      };

      // Create the rental application
      const { error: applicationError } = await supabase
        .from('rental_applications')
        .insert({
          listing_id: listing.id,
          unit_id: listing.unit_id,
          property_id: listing.property_id,
          organization_id: listing.business_id, // Business ID serves as organization for this context
          status: 'submitted',
          application_type: 'unit_specific',
          prospect_id: prospectId,
          applicant_email: applicationData.email,
          applicant_phone: applicationData.phone,
          applicant_first_name: applicationData.first_name,
          applicant_last_name: applicationData.last_name,
          responses: responses,
        });

      if (applicationError) {
        console.error('Application creation error:', applicationError);
        throw applicationError;
      }

      // Update listing application count
      await supabase
        .from('listings')
        .update({ application_count: (listing.application_count || 0) + 1 })
        .eq('id', listing.id);

      setSubmitSuccess(true);
      setShowApplicationForm(false);
    } catch (err) {
      console.error('Failed to submit application:', err);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DoorClosed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This listing is not available'}</p>
          <button
            onClick={() => navigate(`/browse/${businessSlug}/${propertySlug}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Back to Property
          </button>
        </div>
      </div>
    );
  }

  const photos = listing.photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags */}
      <title>{listing.title} - {listing.property.name}</title>
      <meta name="description" content={listing.description || `${listing.bedrooms} bed, ${listing.bathrooms} bath unit available for rent`} />

      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(`/browse/${businessSlug}/${propertySlug}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {listing.property.name}</span>
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="relative h-96 bg-gray-900 overflow-hidden">
          <img
            src={photos[currentPhotoIndex]}
            alt={`${listing.title} - Photo ${currentPhotoIndex + 1}`}
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
      ) : (
        <div className="h-96 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <DoorClosed className="w-24 h-24 text-white/30" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <p className="text-gray-600">Unit {listing.unit.unit_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">
                    ${(listing.monthly_rent_cents / 100).toLocaleString()}
                  </p>
                  <p className="text-gray-600">per month</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>
                  {listing.property.address_line1}, {listing.property.city}, {listing.property.state}
                </span>
              </div>
            </div>

            {/* Key Features */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Key Features</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="text-center">
                  <Bed className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{listing.bedrooms}</p>
                  <p className="text-sm text-gray-600">Bedrooms</p>
                </div>
                <div className="text-center">
                  <Bath className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{listing.bathrooms}</p>
                  <p className="text-sm text-gray-600">Bathrooms</p>
                </div>
                {listing.square_feet && (
                  <div className="text-center">
                    <Maximize className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{listing.square_feet}</p>
                    <p className="text-sm text-gray-600">Sq Ft</p>
                  </div>
                )}
                {listing.available_date && (
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(listing.available_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">Available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About This Unit</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {listing.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Utilities */}
            {listing.utilities_included && listing.utilities_included.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Utilities Included</h2>
                <div className="grid grid-cols-2 gap-3">
                  {listing.utilities_included.map((utility, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="capitalize">{utility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pet Policy */}
            {listing.pets_allowed && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pet Policy</h2>
                <div className="flex items-start gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Pets Allowed</p>
                    {listing.pet_policy && <p className="text-sm text-gray-600">{listing.pet_policy}</p>}
                    {listing.pet_deposit_cents > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Pet deposit: ${(listing.pet_deposit_cents / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Pricing Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pricing Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Rent</span>
                    <span className="font-semibold">${(listing.monthly_rent_cents / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-semibold">${(listing.deposit_cents / 100).toLocaleString()}</span>
                  </div>
                  {listing.lease_term_months && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lease Term</span>
                      <span className="font-semibold">{listing.lease_term_months} months</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowApplicationForm(!showApplicationForm)}
                  className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Apply Now
                </button>

                {submitSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">
                      Application submitted! We'll contact you soon.
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Us</h3>
                <div className="space-y-3">
                  {listing.business.public_page_contact_phone && (
                    <a
                      href={`tel:${listing.business.public_page_contact_phone}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{listing.business.public_page_contact_phone}</span>
                    </a>
                  )}
                  {listing.business.public_page_contact_email && (
                    <a
                      href={`mailto:${listing.business.public_page_contact_email}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-sm">{listing.business.public_page_contact_email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form Modal */}
        {showApplicationForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Apply for This Unit</h2>
                  <button
                    onClick={() => setShowApplicationForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitApplication} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={applicationData.first_name}
                      onChange={(e) => setApplicationData({ ...applicationData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={applicationData.last_name}
                      onChange={(e) => setApplicationData({ ...applicationData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={applicationData.email}
                    onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={applicationData.phone}
                    onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Address
                  </label>
                  <input
                    type="text"
                    value={applicationData.current_address}
                    onChange={(e) => setApplicationData({ ...applicationData, current_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desired Move-in Date
                    </label>
                    <input
                      type="date"
                      value={applicationData.move_in_date}
                      onChange={(e) => setApplicationData({ ...applicationData, move_in_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Income
                    </label>
                    <input
                      type="number"
                      value={applicationData.monthly_income}
                      onChange={(e) => setApplicationData({ ...applicationData, monthly_income: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="$"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employer
                  </label>
                  <input
                    type="text"
                    value={applicationData.employer_name}
                    onChange={(e) => setApplicationData({ ...applicationData, employer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applicationData.has_pets}
                      onChange={(e) => setApplicationData({ ...applicationData, has_pets: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">I have pets</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={applicationData.message}
                    onChange={(e) => setApplicationData({ ...applicationData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                © {new Date().getFullYear()} {listing.business.business_name}. All rights reserved.
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
