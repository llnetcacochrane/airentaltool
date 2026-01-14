import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { businessService } from '../services/businessService';
import { propertyService } from '../services/propertyService';
import { onboardingService } from '../services/onboardingService';
import { FullPageWizard } from '../components/FullPageWizard';
import { Business, Property, PropertyType, PROPERTY_TYPE_OPTIONS } from '../types';
import {
  Building2,
  MapPin,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface PropertyFormData {
  business_id: string;
  name: string;
  property_type: PropertyType;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  year_built: string;
  bedrooms: string;
  bathrooms: string;
  square_feet: string;
  notes: string;
}

const initialFormData: PropertyFormData = {
  business_id: '',
  name: '',
  property_type: 'single_family',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'CA',
  year_built: '',
  bedrooms: '',
  bathrooms: '',
  square_feet: '',
  notes: '',
};

export default function AddPropertyWizard() {
  const navigate = useNavigate();
  const { currentBusiness, businesses } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const owned = await businessService.getOwnedBusinesses();
      setUserBusinesses(owned);

      // Auto-select if only one business (step will start at 0 which is property details when business step is skipped)
      if (owned.length === 1) {
        setFormData(prev => ({ ...prev, business_id: owned[0].id }));
        // Don't change step - when skipBusinessStep is true, step 0 is already property details
      } else if (currentBusiness) {
        setFormData(prev => ({ ...prev, business_id: currentBusiness.id }));
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setError('Failed to load your businesses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      // Business selection
      if (!formData.business_id) {
        errors.business_id = 'Please select a business';
      }
    } else if (step === 1) {
      // Property details
      if (!formData.name.trim()) {
        errors.name = 'Property name is required';
      }
      if (!formData.address_line1.trim()) {
        errors.address_line1 = 'Address is required';
      }
      if (!formData.city.trim()) {
        errors.city = 'City is required';
      }
      if (!formData.state.trim()) {
        errors.state = 'State/Province is required';
      }
      if (!formData.postal_code.trim()) {
        errors.postal_code = 'Postal code is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const propertyData: Partial<Property> = {
        name: formData.name.trim(),
        property_type: formData.property_type,
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2.trim() || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        notes: formData.notes.trim() || null,
      };

      const newProperty = await propertyService.createProperty(formData.business_id, propertyData);

      // Update onboarding state
      await onboardingService.markPropertyAdded(newProperty.id);

      // Navigate to dashboard with success message
      navigate('/dashboard', {
        state: { toast: { type: 'success', message: 'Property created successfully!' } },
      });
    } catch (err: any) {
      console.error('Failed to create property:', err);
      if (err.message?.includes('LIMIT_REACHED')) {
        setError('You have reached your property limit. Please upgrade your plan to add more properties.');
      } else {
        setError(err.message || 'Failed to create property. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No businesses found
  if (userBusinesses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Business Found</h2>
          <p className="text-gray-600 mb-6">
            You need to create a business before adding properties.
          </p>
          <button
            onClick={() => navigate('/businesses?action=add')}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Create Your First Business
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-3 px-6 py-3 text-gray-600 font-medium hover:text-gray-800 transition"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Determine if we should skip step 1 (only one business)
  const skipBusinessStep = userBusinesses.length === 1;
  const adjustedStep = skipBusinessStep ? currentStep + 1 : currentStep;

  const steps = [
    // Step 1: Select Business (skip if only one)
    ...(!skipBusinessStep
      ? [
          {
            id: 'select_business',
            title: 'Select Business',
            description: 'Choose which business this property belongs to',
            isValid: !!formData.business_id,
            content: (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {userBusinesses.map(business => (
                    <button
                      key={business.id}
                      onClick={() => updateFormData('business_id', business.id)}
                      className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                        formData.business_id === business.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            formData.business_id === business.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {business.business_name}
                          </h3>
                          {business.city && business.state && (
                            <p className="text-sm text-gray-500 mt-1">
                              {business.city}, {business.state}
                            </p>
                          )}
                        </div>
                        {formData.business_id === business.id && (
                          <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {validationErrors.business_id && (
                  <p className="text-red-600 text-sm">{validationErrors.business_id}</p>
                )}
              </div>
            ),
          },
        ]
      : []),
    // Step 2: Property Details
    {
      id: 'property_details',
      title: 'Property Details',
      description: 'Enter the basic information about your property',
      isValid:
        formData.name.trim() !== '' &&
        formData.address_line1.trim() !== '' &&
        formData.city.trim() !== '' &&
        formData.state.trim() !== '' &&
        formData.postal_code.trim() !== '',
      content: (
        <div className="space-y-6">
          {/* Property Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => updateFormData('name', e.target.value)}
              placeholder="e.g., Maple Street Apartments"
              className={`w-full px-4 py-3 rounded-lg border ${
                validationErrors.name ? 'border-red-300' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
            />
            {validationErrors.name && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.property_type}
              onChange={e => updateFormData('property_type', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              {PROPERTY_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              Property Address
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={e => updateFormData('address_line1', e.target.value)}
                placeholder="123 Main Street"
                className={`w-full px-4 py-3 rounded-lg border ${
                  validationErrors.address_line1 ? 'border-red-300' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
              />
              {validationErrors.address_line1 && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.address_line1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={e => updateFormData('address_line2', e.target.value)}
                placeholder="Suite, unit, building, floor, etc. (optional)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => updateFormData('city', e.target.value)}
                  placeholder="Toronto"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    validationErrors.city ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                />
                {validationErrors.city && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => updateFormData('state', e.target.value)}
                  placeholder="Ontario"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    validationErrors.state ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                />
                {validationErrors.state && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.state}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={e => updateFormData('postal_code', e.target.value)}
                  placeholder="M5V 2T6"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    validationErrors.postal_code ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                />
                {validationErrors.postal_code && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.postal_code}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.country}
                  onChange={e => updateFormData('country', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-gray-400" />
              Additional Details (Optional)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Built
                </label>
                <input
                  type="number"
                  value={formData.year_built}
                  onChange={e => updateFormData('year_built', e.target.value)}
                  placeholder="2000"
                  min="1800"
                  max={new Date().getFullYear() + 5}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={e => updateFormData('bedrooms', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={e => updateFormData('bathrooms', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sq. Feet
                </label>
                <input
                  type="number"
                  value={formData.square_feet}
                  onChange={e => updateFormData('square_feet', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => updateFormData('notes', e.target.value)}
                placeholder="Any additional notes about this property..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              />
            </div>
          </div>
        </div>
      ),
    },
    // Step 3: Review
    {
      id: 'review',
      title: 'Review & Create',
      description: 'Review your property details before creating',
      isValid: true,
      content: (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{formData.name || 'Unnamed Property'}</h3>
                <p className="text-gray-600 mt-1">
                  {PROPERTY_TYPE_OPTIONS.find(o => o.value === formData.property_type)?.label}
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Address */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                Address
              </h4>
              <div className="text-gray-700 space-y-1">
                <p>{formData.address_line1}</p>
                {formData.address_line2 && <p>{formData.address_line2}</p>}
                <p>
                  {formData.city}, {formData.state} {formData.postal_code}
                </p>
                <p>{formData.country === 'CA' ? 'Canada' : 'United States'}</p>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-gray-400" />
                Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {formData.year_built && (
                  <div>
                    <span className="text-gray-500">Year Built:</span>
                    <span className="ml-2 font-medium text-gray-900">{formData.year_built}</span>
                  </div>
                )}
                {formData.bedrooms && (
                  <div>
                    <span className="text-gray-500">Bedrooms:</span>
                    <span className="ml-2 font-medium text-gray-900">{formData.bedrooms}</span>
                  </div>
                )}
                {formData.bathrooms && (
                  <div>
                    <span className="text-gray-500">Bathrooms:</span>
                    <span className="ml-2 font-medium text-gray-900">{formData.bathrooms}</span>
                  </div>
                )}
                {formData.square_feet && (
                  <div>
                    <span className="text-gray-500">Sq. Feet:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {parseInt(formData.square_feet).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {!formData.year_built &&
                !formData.bedrooms &&
                !formData.bathrooms &&
                !formData.square_feet && (
                  <p className="text-gray-500 text-sm italic">No additional details provided</p>
                )}
            </div>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}

          {/* Business */}
          <div className="text-sm text-gray-500">
            This property will be added to:{' '}
            <span className="font-medium text-gray-900">
              {userBusinesses.find(b => b.id === formData.business_id)?.business_name ||
                'Unknown Business'}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <FullPageWizard
      steps={steps}
      currentStep={currentStep}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onComplete={handleComplete}
      isLoading={isSubmitting}
      error={error || undefined}
      completionPath="/dashboard"
      showProgress={true}
      showStepList={true}
      headerContent={
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-sm text-gray-600">Create a new rental property</p>
          </div>
        </div>
      }
    />
  );
}
