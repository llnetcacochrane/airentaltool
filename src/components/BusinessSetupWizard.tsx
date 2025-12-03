import { useState } from 'react';
import { X, ArrowRight, Check, Building2, Home, Grid, Users } from 'lucide-react';
import { businessService } from '../services/businessService';
import { propertyService } from '../services/propertyService';
import { tenantService } from '../services/tenantService';
import { propertyOwnerService } from '../services/propertyOwnerService';

interface BusinessSetupWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

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
  unitIndex: number;
}

export function BusinessSetupWizard({ onClose, onComplete }: BusinessSetupWizardProps) {
  const [step, setStep] = useState(1);
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

  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  const [units, setUnits] = useState<UnitData[]>([
    { unitNumber: '101', bedrooms: 1, bathrooms: 1, squareFeet: 800, monthlyRent: 1200 },
  ]);

  const [tenants, setTenants] = useState<TenantData[]>([]);

  const totalSteps = 5;

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
      { firstName: '', lastName: '', email: '', phone: '', unitIndex: 0 },
    ]);
  };

  const removeTenant = (index: number) => {
    setTenants(tenants.filter((_, i) => i !== index));
  };

  const updateTenant = (index: number, field: keyof TenantData, value: string | number) => {
    const updated = [...tenants];
    updated[index] = { ...updated[index], [field]: value };
    setTenants(updated);
  };

  const validateStep = () => {
    setError('');

    if (step === 1) {
      if (!businessName.trim()) {
        setError('Business name is required');
        return false;
      }
      if (!ownerFirstName.trim() || !ownerLastName.trim()) {
        setError('Owner name is required');
        return false;
      }
    }

    if (step === 2) {
      if (!properties[currentPropertyIndex].name.trim()) {
        setError('Property name is required');
        return false;
      }
    }

    if (step === 3) {
      const hasEmptyUnitNumber = units.some(u => !u.unitNumber.trim());
      if (hasEmptyUnitNumber) {
        setError('All units must have a unit number');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');

    try {
      const business = await businessService.createBusiness({
        name: businessName,
      });

      const owner = await propertyOwnerService.createPropertyOwner({
        first_name: ownerFirstName,
        last_name: ownerLastName,
        email: ownerEmail,
        phone: ownerPhone,
        business_id: business.id,
      });

      for (const prop of properties) {
        const property = await propertyService.createProperty({
          name: prop.name,
          address: prop.address,
          city: prop.city,
          state_province: prop.province,
          postal_code: prop.postalCode,
          country: 'Canada',
          property_type: 'residential',
          total_units: prop.numberOfUnits,
          business_id: business.id,
          property_owner_id: owner.id,
        });

        for (const unit of units) {
          await propertyService.createUnit(property.id, {
            unit_number: unit.unitNumber,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            square_feet: unit.squareFeet,
            monthly_rent: unit.monthlyRent,
          });
        }
      }

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

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Business Setup</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const s = idx + 1;
              return (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      s === step
                        ? 'bg-blue-600 text-white'
                        : s < step
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s < step ? <Check size={20} /> : s}
                  </div>
                  {s < totalSteps && (
                    <div
                      className={`w-12 h-1 ${s < step ? 'bg-green-600' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Business Information
                </h3>
                <p className="text-gray-600">Start by creating the business entity</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="ABC Property Management Inc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Property Owner Information
                </h4>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={ownerFirstName}
                      onChange={(e) => setOwnerFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Home className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Add Properties
                </h3>
                <p className="text-gray-600">Add one or more properties</p>
              </div>

              {properties.map((property, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Property Name *
                      </label>
                      <input
                        type="text"
                        value={property.name}
                        onChange={(e) => updateProperty(index, 'name', e.target.value)}
                        placeholder="Main Street Apartments"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={property.address}
                        onChange={(e) => updateProperty(index, 'address', e.target.value)}
                        placeholder="123 Main Street"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={property.city}
                          onChange={(e) => updateProperty(index, 'city', e.target.value)}
                          placeholder="Toronto"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Province
                        </label>
                        <input
                          type="text"
                          value={property.province}
                          onChange={(e) => updateProperty(index, 'province', e.target.value)}
                          placeholder="ON"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={property.postalCode}
                          onChange={(e) => updateProperty(index, 'postalCode', e.target.value)}
                          placeholder="M1M 1M1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Units
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={property.numberOfUnits}
                        onChange={(e) =>
                          updateProperty(index, 'numberOfUnits', parseInt(e.target.value) || 1)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Grid className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Configure Units
                </h3>
                <p className="text-gray-600">Define the units for your properties</p>
              </div>

              {units.map((unit, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Unit Number *
                      </label>
                      <input
                        type="text"
                        value={unit.unitNumber}
                        onChange={(e) => updateUnit(index, 'unitNumber', e.target.value)}
                        placeholder="101"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Monthly Rent
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unit.monthlyRent}
                        onChange={(e) =>
                          updateUnit(index, 'monthlyRent', parseInt(e.target.value) || 0)
                        }
                        placeholder="1200"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unit.bedrooms}
                        onChange={(e) =>
                          updateUnit(index, 'bedrooms', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unit.bathrooms}
                        onChange={(e) =>
                          updateUnit(index, 'bathrooms', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Square Feet
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unit.squareFeet}
                        onChange={(e) =>
                          updateUnit(index, 'squareFeet', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Add Tenants (Optional)
                </h3>
                <p className="text-gray-600">You can add tenants now or later</p>
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
                        <h4 className="text-lg font-semibold text-gray-900">
                          Tenant {index + 1}
                        </h4>
                        <button
                          onClick={() => removeTenant(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={tenant.firstName}
                            onChange={(e) => updateTenant(index, 'firstName', e.target.value)}
                            placeholder="Jane"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={tenant.lastName}
                            onChange={(e) => updateTenant(index, 'lastName', e.target.value)}
                            placeholder="Smith"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={tenant.email}
                            onChange={(e) => updateTenant(index, 'email', e.target.value)}
                            placeholder="jane@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={tenant.phone}
                            onChange={(e) => updateTenant(index, 'phone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Review & Confirm
                </h3>
                <p className="text-gray-600">Review your setup before creating</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Business</h4>
                  <p className="text-gray-700">{businessName}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Owner: {ownerFirstName} {ownerLastName}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Properties</h4>
                  <ul className="space-y-2">
                    {properties.map((prop, idx) => (
                      <li key={idx} className="text-gray-700">
                        {prop.name || `Property ${idx + 1}`}
                        <span className="text-sm text-gray-600 ml-2">
                          ({prop.numberOfUnits} units)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Units</h4>
                  <p className="text-gray-700">{units.length} units configured</p>
                </div>

                {tenants.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Tenants</h4>
                    <p className="text-gray-700">{tenants.length} tenants to be added</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                {isLoading ? 'Creating...' : 'Create Business'}
                <Check size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
