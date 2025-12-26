import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Home, Grid, Users, CheckCircle, DoorClosed } from 'lucide-react';
import { FullPageWizard } from '../components/FullPageWizard';
import { businessService } from '../services/businessService';
import { propertyService } from '../services/propertyService';
import { tenantService } from '../services/tenantService';
import { propertyOwnerService } from '../services/propertyOwnerService';

/**
 * Business Setup Wizard - Full Page
 *
 * Guides property managers through setting up a new client business
 * Used by Type 3 users (Property Management Companies)
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

interface PropertyData {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  numberOfUnits: number;
}

interface UnitData {
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyRent: number;
}

interface TenantData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function BusinessSetupWizard() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const [properties, setProperties] = useState<PropertyData[]>([
    { name: '', address: '', city: '', province: '', postalCode: '', numberOfUnits: 1 },
  ]);

  const [units, setUnits] = useState<UnitData[]>([
    { unitNumber: '101', bedrooms: 1, bathrooms: 1, squareFeet: 800, monthlyRent: 1200 },
  ]);

  const [tenants, setTenants] = useState<TenantData[]>([]);

  const addProperty = () => {
    setProperties([
      ...properties,
      { name: '', address: '', city: '', province: '', postalCode: '', numberOfUnits: 1 },
    ]);
  };

  const removeProperty = (index: number) => {
    if (properties.length > 1) {
      setProperties(properties.filter((_, i) => i !== index));
    }
  };

  const updateProperty = (index: number, field: keyof PropertyData, value: string | number) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], [field]: value };
    setProperties(updated);
  };

  const addUnit = () => {
    setUnits([
      ...units,
      { unitNumber: '', bedrooms: 1, bathrooms: 1, squareFeet: 800, monthlyRent: 1200 },
    ]);
  };

  const removeUnit = (index: number) => {
    if (units.length > 1) {
      setUnits(units.filter((_, i) => i !== index));
    }
  };

  const updateUnit = (index: number, field: keyof UnitData, value: string | number) => {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    setUnits(updated);
  };

  const addTenant = () => {
    setTenants([
      ...tenants,
      { firstName: '', lastName: '', email: '', phone: '' },
    ]);
  };

  const removeTenant = (index: number) => {
    setTenants(tenants.filter((_, i) => i !== index));
  };

  const updateTenant = (index: number, field: keyof TenantData, value: string) => {
    const updated = [...tenants];
    updated[index] = { ...updated[index], [field]: value };
    setTenants(updated);
  };

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 0) {
      if (!businessName.trim()) {
        setError('Business name is required');
        return false;
      }
      if (!ownerFirstName.trim() || !ownerLastName.trim()) {
        setError('Owner name is required');
        return false;
      }
    }

    if (step === 1) {
      const currentProp = properties[0];
      if (!currentProp.name.trim()) {
        setError('At least one property name is required');
        return false;
      }
    }

    if (step === 2) {
      const hasEmptyUnitNumber = units.some(u => !u.unitNumber.trim());
      if (hasEmptyUnitNumber) {
        setError('All units must have a unit number');
        return false;
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

    setIsLoading(true);
    setError('');

    try {
      // Create the business
      const business = await businessService.createBusiness({
        name: businessName,
      });

      // Create property owner
      const owner = await propertyOwnerService.createPropertyOwner({
        first_name: ownerFirstName,
        last_name: ownerLastName,
        email: ownerEmail,
        phone: ownerPhone,
        business_id: business.id,
      });

      // Create properties and units
      for (const prop of properties) {
        if (prop.name.trim()) {
          const property = await propertyService.createProperty({
            business_id: business.id,
            name: prop.name,
            property_type: 'residential' as any,
            address_line1: prop.address,
            city: prop.city,
            state: prop.province,
            postal_code: prop.postalCode,
            country: 'CA',
            total_units: prop.numberOfUnits,
            property_owner_id: owner.id,
          });

          // Create units for this property
          for (const unit of units) {
            if (unit.unitNumber.trim()) {
              await propertyService.createUnit(property.id, {
                unit_number: unit.unitNumber,
                bedrooms: unit.bedrooms,
                bathrooms: unit.bathrooms,
                square_feet: unit.squareFeet,
                monthly_rent: Math.round(unit.monthlyRent * 100), // Convert to cents
              });
            }
          }
        }
      }

      // Create tenants
      for (const tenant of tenants) {
        if (tenant.firstName.trim() && tenant.lastName.trim()) {
          await tenantService.createTenant({
            first_name: tenant.firstName,
            last_name: tenant.lastName,
            email: tenant.email,
            phone: tenant.phone,
            business_id: business.id,
          });
        }
      }

      // Refetch auth context to update businesses list
      await refetch();

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
      setIsLoading(false);
    }
  };

  const steps = [
    {
      id: 'business',
      title: 'Business Information',
      description: 'Create the client business entity',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Set up a new client business that you'll manage. This business will have its own properties, tenants, and financial records.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., ABC Property Holdings Inc."
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Property Owner Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ownerFirstName}
                  onChange={(e) => setOwnerFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ownerLastName}
                  onChange={(e) => setOwnerLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>
      ),
      isValid: businessName.trim() !== '' && ownerFirstName.trim() !== '' && ownerLastName.trim() !== '',
    },
    {
      id: 'properties',
      title: 'Add Properties',
      description: 'Add one or more properties',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Home className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Add the properties that this business owns or manages. You can add more later from the dashboard.
              </div>
            </div>
          </div>

          {properties.map((property, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Property {index + 1}
                </h4>
                {properties.length > 1 && (
                  <button
                    onClick={() => removeProperty(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={property.name}
                    onChange={(e) => updateProperty(index, 'name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Main Street Apartments"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={property.address}
                    onChange={(e) => updateProperty(index, 'address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={property.city}
                      onChange={(e) => updateProperty(index, 'city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Toronto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province
                    </label>
                    <select
                      value={property.province}
                      onChange={(e) => updateProperty(index, 'province', e.target.value)}
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
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={property.postalCode}
                      onChange={(e) => updateProperty(index, 'postalCode', e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="M1M 1M1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={property.numberOfUnits}
                    onChange={(e) =>
                      updateProperty(index, 'numberOfUnits', parseInt(e.target.value) || 1)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addProperty}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-medium transition"
          >
            + Add Another Property
          </button>
        </div>
      ),
      isValid: properties.some(p => p.name.trim() !== ''),
    },
    {
      id: 'units',
      title: 'Configure Units',
      description: 'Define units for your properties',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Grid className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                Add information for each rental unit. This helps track occupancy and rental income.
              </div>
            </div>
          </div>

          {units.map((unit, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Unit {index + 1}
                </h4>
                {units.length > 1 && (
                  <button
                    onClick={() => removeUnit(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
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
                    placeholder="101"
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
                    onChange={(e) =>
                      updateUnit(index, 'monthlyRent', parseFloat(e.target.value) || 0)
                    }
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
                    onChange={(e) =>
                      updateUnit(index, 'bedrooms', parseInt(e.target.value) || 0)
                    }
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
                    onChange={(e) =>
                      updateUnit(index, 'bathrooms', parseFloat(e.target.value) || 0)
                    }
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
                    onChange={(e) =>
                      updateUnit(index, 'squareFeet', parseInt(e.target.value) || 0)
                    }
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
      ),
      isValid: units.every(u => u.unitNumber.trim() !== ''),
    },
    {
      id: 'tenants',
      title: 'Add Tenants',
      description: 'Add tenants (optional)',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                You can add current tenants now or skip this step and add them later from the dashboard.
              </div>
            </div>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">No tenants added yet</p>
              <button
                onClick={addTenant}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Add First Tenant
              </button>
            </div>
          ) : (
            <>
              {tenants.map((tenant, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Tenant {index + 1}
                    </h4>
                    <button
                      onClick={() => removeTenant(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={tenant.firstName}
                        onChange={(e) => updateTenant(index, 'firstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jane"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={tenant.lastName}
                        onChange={(e) => updateTenant(index, 'lastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={tenant.email}
                        onChange={(e) => updateTenant(index, 'email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="jane@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={tenant.phone}
                        onChange={(e) => updateTenant(index, 'phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addTenant}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-medium transition"
              >
                + Add Another Tenant
              </button>
            </>
          )}
        </div>
      ),
      isValid: true,
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Confirm your setup',
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Business Information
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Business Name</dt>
                <dd className="text-gray-900 font-medium">{businessName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Property Owner</dt>
                <dd className="text-gray-900">
                  {ownerFirstName} {ownerLastName}
                </dd>
              </div>
              {ownerEmail && (
                <div>
                  <dt className="text-sm text-gray-600">Email</dt>
                  <dd className="text-gray-900">{ownerEmail}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              Properties ({properties.filter(p => p.name.trim()).length})
            </h3>
            <ul className="space-y-2">
              {properties
                .filter(p => p.name.trim())
                .map((prop, idx) => (
                  <li key={idx} className="text-gray-700">
                    {prop.name}
                    <span className="text-sm text-gray-600 ml-2">
                      ({prop.numberOfUnits} units)
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DoorClosed className="w-5 h-5 text-blue-600" />
              Units ({units.filter(u => u.unitNumber.trim()).length})
            </h3>
            <div className="space-y-2">
              {units
                .filter(u => u.unitNumber.trim())
                .map((unit, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    Unit {unit.unitNumber} - {unit.bedrooms} bed, {unit.bathrooms} bath • ${unit.monthlyRent}/month
                  </div>
                ))}
            </div>
          </div>

          {tenants.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Tenants ({tenants.length})
              </h3>
              <p className="text-gray-700">{tenants.length} tenants to be added</p>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              Once you complete setup, this business will be ready to manage from your dashboard.
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
              <h1 className="text-2xl font-bold text-gray-900">New Business Setup</h1>
              <p className="text-sm text-gray-600">Add a new client business to manage</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Cancel
            </button>
          </div>
        }
      />
    </div>
  );
}
