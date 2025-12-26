import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, MapPin, DoorClosed, CheckCircle, Building2 } from 'lucide-react';
import { FullPageWizard } from '../components/FullPageWizard';
import { propertyService } from '../services/propertyService';

/**
 * Property Setup Wizard - Full Page
 *
 * Guides users through setting up their first property
 * Used in onboarding flow after registration
 */

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'apartment_building', label: 'Apartment Building' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

interface PropertyInfo {
  name: string;
  propertyType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  totalUnits: number;
}

interface UnitInfo {
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyRent: number;
}

export function PropertySetupWizard() {
  const navigate = useNavigate();
  const { currentBusiness } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo>({
    name: '',
    propertyType: 'single_family',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    totalUnits: 1,
  });

  const [units, setUnits] = useState<UnitInfo[]>([{
    unitNumber: '1',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 800,
    monthlyRent: 1200,
  }]);

  const addUnit = () => {
    const nextUnitNumber = (units.length + 1).toString();
    setUnits([...units, {
      unitNumber: nextUnitNumber,
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 800,
      monthlyRent: 1200,
    }]);
  };

  const removeUnit = (index: number) => {
    if (units.length > 1) {
      setUnits(units.filter((_, i) => i !== index));
    }
  };

  const updateUnit = (index: number, field: keyof UnitInfo, value: string | number) => {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    setUnits(updated);
  };

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 0) {
      if (!propertyInfo.name.trim()) {
        setError('Property name is required');
        return false;
      }
      if (!propertyInfo.addressLine1.trim() || !propertyInfo.city.trim() ||
          !propertyInfo.stateProvince.trim() || !propertyInfo.postalCode.trim()) {
        setError('Complete address is required');
        return false;
      }
    }

    if (step === 1) {
      for (const unit of units) {
        if (!unit.unitNumber.trim()) {
          setError('All units must have a unit number');
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    if (!currentBusiness?.id) {
      setError('No business found. Please contact support.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create the property
      const property = await propertyService.createProperty({
        business_id: currentBusiness.id,
        name: propertyInfo.name,
        property_type: propertyInfo.propertyType as any,
        address_line1: propertyInfo.addressLine1,
        address_line2: propertyInfo.addressLine2 || undefined,
        city: propertyInfo.city,
        state: propertyInfo.stateProvince,
        postal_code: propertyInfo.postalCode,
        country: 'CA',
        total_units: propertyInfo.totalUnits,
      });

      // Create all units
      for (const unit of units) {
        await propertyService.createUnit(property.id, {
          unit_number: unit.unitNumber,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          square_feet: unit.squareFeet,
          monthly_rent: Math.round(unit.monthlyRent * 100), // Convert to cents
        });
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
      setIsLoading(false);
    }
  };

  const steps = [
    {
      id: 'property',
      title: 'Property Details',
      description: 'Basic information about your property',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Home className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Let's start by adding your first property. You can add more properties later from your dashboard.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={propertyInfo.name}
              onChange={(e) => setPropertyInfo({ ...propertyInfo, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Sunset Apartments, 123 Main Street"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={propertyInfo.propertyType}
              onChange={(e) => setPropertyInfo({ ...propertyInfo, propertyType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={propertyInfo.addressLine1}
                  onChange={(e) => setPropertyInfo({ ...propertyInfo, addressLine1: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street address"
                />
              </div>

              <input
                type="text"
                value={propertyInfo.addressLine2}
                onChange={(e) => setPropertyInfo({ ...propertyInfo, addressLine2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Apartment, suite, unit (optional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={propertyInfo.city}
                onChange={(e) => setPropertyInfo({ ...propertyInfo, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Toronto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                value={propertyInfo.stateProvince}
                onChange={(e) => setPropertyInfo({ ...propertyInfo, stateProvince: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {CANADIAN_PROVINCES.map((prov) => (
                  <option key={prov.code} value={prov.code}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={propertyInfo.postalCode}
                onChange={(e) => setPropertyInfo({ ...propertyInfo, postalCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="M1M 1M1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Number of Units
            </label>
            <input
              type="number"
              min="1"
              value={propertyInfo.totalUnits}
              onChange={(e) => setPropertyInfo({ ...propertyInfo, totalUnits: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can add details for individual units in the next step
            </p>
          </div>
        </div>
      ),
      isValid: propertyInfo.name && propertyInfo.addressLine1 && propertyInfo.city &&
               propertyInfo.stateProvince && propertyInfo.postalCode,
    },
    {
      id: 'units',
      title: 'Unit Information',
      description: 'Add details for each unit',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DoorClosed className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Add information for each rental unit in your property. This helps track occupancy and rental income.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {units.map((unit, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Unit {index + 1}</h4>
                  {units.length > 1 && (
                    <button
                      onClick={() => removeUnit(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={unit.unitNumber}
                      onChange={(e) => updateUnit(index, 'unitNumber', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="101, A, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Rent ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unit.monthlyRent}
                      onChange={(e) => updateUnit(index, 'monthlyRent', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unit.bedrooms}
                      onChange={(e) => updateUnit(index, 'bedrooms', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={unit.bathrooms}
                      onChange={(e) => updateUnit(index, 'bathrooms', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Square Feet
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unit.squareFeet}
                      onChange={(e) => updateUnit(index, 'squareFeet', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addUnit}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-medium transition"
            >
              + Add Another Unit
            </button>
          </div>
        </div>
      ),
      isValid: units.every(u => u.unitNumber.trim() !== ''),
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Confirm your property details',
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Property Information
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Name</dt>
                <dd className="text-gray-900 font-medium">{propertyInfo.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Type</dt>
                <dd className="text-gray-900">
                  {PROPERTY_TYPES.find(t => t.value === propertyInfo.propertyType)?.label}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Address</dt>
                <dd className="text-gray-900">
                  {propertyInfo.addressLine1}
                  {propertyInfo.addressLine2 && <>, {propertyInfo.addressLine2}</>}
                  <br />
                  {propertyInfo.city}, {propertyInfo.stateProvince} {propertyInfo.postalCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Total Units</dt>
                <dd className="text-gray-900">{propertyInfo.totalUnits}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DoorClosed className="w-5 h-5 text-blue-600" />
              Units ({units.length})
            </h3>
            <div className="space-y-3">
              {units.map((unit, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">Unit {unit.unitNumber}</span>
                    <span className="text-sm text-gray-600">
                      {unit.bedrooms} bed, {unit.bathrooms} bath
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {unit.squareFeet} sq ft • ${unit.monthlyRent}/month
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              Once you complete setup, your property will be ready to manage. You can add tenants, track payments, and more from your dashboard.
            </div>
          </div>
        </div>
      ),
      isValid: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <FullPageWizard
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
        onStepChange={setCurrentStep}
        isLoading={isLoading}
        error={error}
        showProgress={true}
        showStepList={true}
        headerContent={
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property Setup</h1>
              <p className="text-sm text-gray-600">Add your first rental property</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Skip for now
            </button>
          </div>
        }
      />
    </div>
  );
}
