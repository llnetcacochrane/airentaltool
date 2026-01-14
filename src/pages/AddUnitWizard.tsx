import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { businessService } from '../services/businessService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { onboardingService } from '../services/onboardingService';
import { FullPageWizard } from '../components/FullPageWizard';
import { Business, Property, Unit, OccupancyStatus } from '../types';
import {
  Building2,
  DoorClosed,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  DollarSign,
  Bed,
  Bath,
  Ruler,
} from 'lucide-react';

interface UnitFormData {
  business_id: string;
  property_id: string;
  unit_number: string;
  floor_number: string;
  bedrooms: string;
  bathrooms: string;
  square_feet: string;
  monthly_rent: string;
  security_deposit: string;
  occupancy_status: OccupancyStatus;
  notes: string;
}

const initialFormData: UnitFormData = {
  business_id: '',
  property_id: '',
  unit_number: '',
  floor_number: '',
  bedrooms: '',
  bathrooms: '',
  square_feet: '',
  monthly_rent: '',
  security_deposit: '',
  occupancy_status: 'vacant',
  notes: '',
};

const OCCUPANCY_OPTIONS = [
  { value: 'vacant', label: 'Vacant', color: 'green' },
  { value: 'occupied', label: 'Occupied', color: 'blue' },
  { value: 'reserved', label: 'Reserved', color: 'purple' },
  { value: 'maintenance', label: 'Under Maintenance', color: 'amber' },
];

export default function AddUnitWizard() {
  const navigate = useNavigate();
  const { currentBusiness, businesses } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UnitFormData>(initialFormData);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load properties when business changes
  useEffect(() => {
    if (formData.business_id) {
      loadProperties(formData.business_id);
    } else {
      setProperties([]);
      setFormData(prev => ({ ...prev, property_id: '' }));
    }
  }, [formData.business_id]);

  const loadBusinesses = async () => {
    try {
      const owned = await businessService.getOwnedBusinesses();
      setUserBusinesses(owned);

      // Auto-select if only one business
      if (owned.length === 1) {
        setFormData(prev => ({ ...prev, business_id: owned[0].id }));
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

  const loadProperties = async (businessId: string) => {
    setIsLoadingProperties(true);
    try {
      const props = await propertyService.getBusinessProperties(businessId);
      setProperties(props);

      // Auto-select if only one property
      if (props.length === 1) {
        setFormData(prev => ({ ...prev, property_id: props[0].id }));
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const updateFormData = (field: keyof UnitFormData, value: string) => {
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
      // Property selection
      if (!formData.property_id) {
        errors.property_id = 'Please select a property';
      }
    } else if (step === 2) {
      // Unit details
      if (!formData.unit_number.trim()) {
        errors.unit_number = 'Unit number is required';
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
      const unitData: Partial<Unit> = {
        unit_number: formData.unit_number.trim(),
        floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        monthly_rent_cents: formData.monthly_rent
          ? Math.round(parseFloat(formData.monthly_rent) * 100)
          : null,
        security_deposit_cents: formData.security_deposit
          ? Math.round(parseFloat(formData.security_deposit) * 100)
          : null,
        occupancy_status: formData.occupancy_status,
        notes: formData.notes.trim() || null,
      };

      const newUnit = await unitService.createUnit(
        formData.business_id,
        formData.property_id,
        unitData
      );

      // Update onboarding state
      await onboardingService.markUnitAdded(newUnit.id);

      // Navigate to dashboard with success message
      navigate('/dashboard', {
        state: { toast: { type: 'success', message: 'Unit created successfully!' } },
      });
    } catch (err: any) {
      console.error('Failed to create unit:', err);
      if (err.message?.includes('LIMIT_REACHED')) {
        setError('You have reached your unit limit. Please upgrade your plan to add more units.');
      } else {
        setError(err.message || 'Failed to create unit. Please try again.');
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
            You need to create a business before adding units.
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

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const selectedBusiness = userBusinesses.find(b => b.id === formData.business_id);

  const steps = [
    // Step 1: Select Business
    {
      id: 'select_business',
      title: 'Select Business',
      description: 'Choose which business this unit belongs to',
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
    // Step 2: Select Property
    {
      id: 'select_property',
      title: 'Select Property',
      description: 'Choose which property this unit belongs to',
      isValid: !!formData.property_id,
      content: (
        <div className="space-y-6">
          {isLoadingProperties ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading properties...</span>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-600 mb-6">
                You need to add a property before creating units.
              </p>
              <button
                onClick={() => navigate('/setup/add-property')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Add Your First Property
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.map(property => (
                <button
                  key={property.id}
                  onClick={() => updateFormData('property_id', property.id)}
                  className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                    formData.property_id === property.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        formData.property_id === property.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Home className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {property.address_line1}
                      </p>
                      {property.city && property.state && (
                        <p className="text-sm text-gray-400">
                          {property.city}, {property.state}
                        </p>
                      )}
                    </div>
                    {formData.property_id === property.id && (
                      <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {validationErrors.property_id && (
            <p className="text-red-600 text-sm">{validationErrors.property_id}</p>
          )}
        </div>
      ),
    },
    // Step 3: Unit Details
    {
      id: 'unit_details',
      title: 'Unit Details',
      description: 'Enter the details for this rental unit',
      isValid: formData.unit_number.trim() !== '',
      content: (
        <div className="space-y-6">
          {/* Unit Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Number/Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={e => updateFormData('unit_number', e.target.value)}
              placeholder="e.g., 101, A, 1A, Suite 200"
              className={`w-full px-4 py-3 rounded-lg border ${
                validationErrors.unit_number ? 'border-red-300' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
            />
            {validationErrors.unit_number && (
              <p className="text-red-600 text-sm mt-1">{validationErrors.unit_number}</p>
            )}
          </div>

          {/* Rent & Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline-block mr-1" />
                Monthly Rent
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.monthly_rent}
                  onChange={e => updateFormData('monthly_rent', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline-block mr-1" />
                Security Deposit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.security_deposit}
                  onChange={e => updateFormData('security_deposit', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Physical Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bed className="w-4 h-4 inline-block mr-1" />
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
                <Bath className="w-4 h-4 inline-block mr-1" />
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
                <Ruler className="w-4 h-4 inline-block mr-1" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
              <input
                type="number"
                value={formData.floor_number}
                onChange={e => updateFormData('floor_number', e.target.value)}
                placeholder="1"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Occupancy Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occupancy Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {OCCUPANCY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormData('occupancy_status', option.value as OccupancyStatus)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.occupancy_status === option.value
                      ? option.color === 'green'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : option.color === 'blue'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : option.color === 'purple'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => updateFormData('notes', e.target.value)}
              placeholder="Any additional notes about this unit..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>
      ),
    },
    // Step 4: Review
    {
      id: 'review',
      title: 'Review & Create',
      description: 'Review your unit details before creating',
      isValid: true,
      content: (
        <div className="space-y-6">
          {/* Unit Summary Card */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <DoorClosed className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  Unit {formData.unit_number || 'Unnamed'}
                </h3>
                <p className="text-gray-600 mt-1">{selectedProperty?.name || 'Unknown Property'}</p>
                {formData.monthly_rent && (
                  <p className="text-blue-600 font-semibold mt-2">
                    ${parseFloat(formData.monthly_rent).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}
                    /month
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  formData.occupancy_status === 'vacant'
                    ? 'bg-green-100 text-green-700'
                    : formData.occupancy_status === 'occupied'
                    ? 'bg-blue-100 text-blue-700'
                    : formData.occupancy_status === 'reserved'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {OCCUPANCY_OPTIONS.find(o => o.value === formData.occupancy_status)?.label}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Property Info */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-gray-400" />
                Property
              </h4>
              <div className="text-gray-700 space-y-1">
                <p className="font-medium">{selectedProperty?.name}</p>
                <p className="text-sm text-gray-500">{selectedProperty?.address_line1}</p>
                {selectedProperty?.city && selectedProperty?.state && (
                  <p className="text-sm text-gray-500">
                    {selectedProperty.city}, {selectedProperty.state}
                  </p>
                )}
              </div>
            </div>

            {/* Unit Details */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <DoorClosed className="w-5 h-5 text-gray-400" />
                Unit Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                {formData.floor_number && (
                  <div>
                    <span className="text-gray-500">Floor:</span>
                    <span className="ml-2 font-medium text-gray-900">{formData.floor_number}</span>
                  </div>
                )}
              </div>
              {!formData.bedrooms &&
                !formData.bathrooms &&
                !formData.square_feet &&
                !formData.floor_number && (
                  <p className="text-gray-500 text-sm italic">No physical details provided</p>
                )}
            </div>
          </div>

          {/* Financial Summary */}
          {(formData.monthly_rent || formData.security_deposit) && (
            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                Financial Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {formData.monthly_rent && (
                  <div>
                    <span className="text-gray-500 text-sm">Monthly Rent</span>
                    <p className="text-xl font-bold text-green-700">
                      $
                      {parseFloat(formData.monthly_rent).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                {formData.security_deposit && (
                  <div>
                    <span className="text-gray-500 text-sm">Security Deposit</span>
                    <p className="text-xl font-bold text-gray-900">
                      $
                      {parseFloat(formData.security_deposit).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {formData.notes && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}

          {/* Business */}
          <div className="text-sm text-gray-500">
            This unit will be added under:{' '}
            <span className="font-medium text-gray-900">
              {selectedBusiness?.business_name || 'Unknown Business'}
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
            <h1 className="text-xl font-bold text-gray-900">Add New Unit</h1>
            <p className="text-sm text-gray-600">Create a new rental unit</p>
          </div>
        </div>
      }
    />
  );
}
