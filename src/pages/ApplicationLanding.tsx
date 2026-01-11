import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rentalApplicationService } from '../services/rentalApplicationService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { RentalListing, Property, Unit } from '../types';
import { Home, DollarSign, Calendar, MapPin, Check, ArrowRight, Loader } from 'lucide-react';

export function ApplicationLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<RentalListing | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadListing();
  }, [code]);

  const loadListing = async () => {
    if (!code) return;

    try {
      setLoading(true);
      const listingData = await rentalApplicationService.getListing(code);

      if (!listingData) {
        setError('Listing not found or no longer accepting applications');
        return;
      }

      setListing(listingData);

      // Load property and unit details
      const [propertyData, unitData] = await Promise.all([
        propertyService.getProperty(listingData.property_id),
        unitService.getUnit(listingData.unit_id),
      ]);

      setProperty(propertyData);
      setUnit(unitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    navigate(`/apply/${code}/form`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !listing || !property || !unit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Available</h2>
          <p className="text-gray-600">{error || 'This listing is no longer accepting applications.'}</p>
        </div>
      </div>
    );
  }

  const monthlyRent = listing.monthly_rent_cents / 100;
  const securityDeposit = listing.security_deposit_cents ? listing.security_deposit_cents / 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Now Accepting Applications</p>
                <h1 className="text-3xl font-bold">{listing.title}</h1>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{property.name}</p>
                      <p className="text-sm text-gray-600">{property.address_line1}</p>
                      {property.address_line2 && (
                        <p className="text-sm text-gray-600">{property.address_line2}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {property.city}, {property.state} {property.postal_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Unit Number</p>
                      <p className="font-medium text-gray-900">{unit.unit_number}</p>
                    </div>
                  </div>

                  {unit.bedrooms && (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 text-gray-400">🛏️</div>
                      <div>
                        <p className="text-sm text-gray-600">Bedrooms / Bathrooms</p>
                        <p className="font-medium text-gray-900">
                          {unit.bedrooms} bed / {unit.bathrooms} bath
                        </p>
                      </div>
                    </div>
                  )}

                  {unit.square_feet && (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 text-gray-400">📐</div>
                      <div>
                        <p className="text-sm text-gray-600">Square Feet</p>
                        <p className="font-medium text-gray-900">{unit.square_feet.toLocaleString()} sq ft</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Terms</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <p className="text-sm text-gray-600">Monthly Rent</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">${monthlyRent.toLocaleString()}</p>
                  </div>

                  {securityDeposit > 0 && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <span className="text-gray-600">Security Deposit</span>
                      <span className="font-semibold text-gray-900">${securityDeposit.toLocaleString()}</span>
                    </div>
                  )}

                  {listing.available_date && (
                    <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Available Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(listing.available_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {listing.lease_term_months && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <span className="text-gray-600">Lease Term</span>
                      <span className="font-semibold text-gray-900">{listing.lease_term_months} months</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {listing.pet_policy && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Pet Policy</p>
                  <p className="font-medium text-gray-900">{listing.pet_policy}</p>
                </div>
              )}

              {listing.parking_included && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Parking</p>
                  <p className="font-medium text-gray-900">Included</p>
                </div>
              )}

              {listing.utilities_included && listing.utilities_included.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Utilities Included</p>
                  <p className="font-medium text-gray-900">{listing.utilities_included.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Application Fee */}
            {listing.application_fee_cents > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-yellow-800">
                  <strong>Application Fee:</strong> ${(listing.application_fee_cents / 100).toFixed(2)} -
                  A non-refundable fee required to process your application.
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={handleApply}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition text-lg shadow-lg"
              >
                Apply Now
                <ArrowRight size={20} />
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Application takes approximately 10-15 minutes to complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
