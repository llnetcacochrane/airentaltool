import { useState, useEffect } from 'react';
import { Property, PropertyType, Business, PROPERTY_TYPE_OPTIONS } from '../types';
import { businessService } from '../services/businessService';
import { useAuth } from '../context/AuthContext';
import { validators, validate, getFieldError, getInputClassName, ValidationError } from '../utils/formValidation';
import { FieldError } from './FieldError';
import { SlidePanel } from './SlidePanel';
import { AddressInput } from './AddressInput';

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: Partial<Property>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Use standardized property type options from types/index.ts
const propertyTypes = PROPERTY_TYPE_OPTIONS;

export function PropertyForm({ property, onSubmit, onCancel, isSubmitting }: PropertyFormProps) {
  const { currentBusiness } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    business_id: property?.business_id || '',
    name: property?.name || '',
    property_type: property?.property_type || 'single_family' as PropertyType,
    address_line1: property?.address_line1 || '',
    address_line2: property?.address_line2 || '',
    city: property?.city || '',
    state: property?.state || '',
    postal_code: property?.postal_code || '',
    country: property?.country || 'CA',
    bedrooms: property?.bedrooms?.toString() || '',
    bathrooms: property?.bathrooms?.toString() || '',
    square_feet: property?.square_feet?.toString() || '',
    lot_size: property?.lot_size?.toString() || '',
    year_built: property?.year_built?.toString() || '',
    purchase_price_cents: property?.purchase_price_cents ? (property.purchase_price_cents / 100).toString() : '',
    purchase_date: property?.purchase_date || '',
    current_value_cents: property?.current_value_cents ? (property.current_value_cents / 100).toString() : '',
    notes: property?.notes || '',
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const data = await businessService.getOwnedBusinesses();
      setBusinesses(data);
      // If editing a property and no currentBusiness, set form's business_id from property
      if (property?.business_id && !formData.business_id) {
        setFormData(prev => ({ ...prev, business_id: property.business_id }));
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const validateForm = (): ValidationError[] => {
    const validations = [
      validators.required(formData.name, 'Property Name'),
      validators.minLength(formData.name, 2, 'Property Name'),
      validators.maxLength(formData.name, 100, 'Property Name'),
      validators.required(formData.address_line1, 'Address'),
      validators.required(formData.city, 'City'),
      validators.required(formData.state, 'State/Province'),
      validators.required(formData.postal_code, 'Postal Code'),
      validators.postalCode(formData.postal_code, formData.country, 'Postal Code'),
      validators.yearBuilt(formData.year_built, 'Year Built'),
      validators.range(formData.bedrooms, 0, 50, 'Bedrooms'),
      validators.range(formData.bathrooms, 0, 50, 'Bathrooms'),
      validators.positive(formData.square_feet, 'Square Feet'),
      validators.positive(formData.lot_size, 'Lot Size'),
      validators.positive(formData.purchase_price_cents, 'Purchase Price'),
      validators.positive(formData.current_value_cents, 'Current Value'),
      validators.dateInPast(formData.purchase_date, 'Purchase Date'),
    ];

    if (currentBusiness && businesses.length > 0) {
      validations.push(validators.required(formData.business_id, 'Business'));
    }

    return validations.filter((e): e is ValidationError => e !== null);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validateForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    const data: Partial<Property> = {
      business_id: formData.business_id || undefined,
      name: formData.name,
      property_type: formData.property_type,
      address_line1: formData.address_line1,
      address_line2: formData.address_line2 || undefined,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      country: formData.country,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
      square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
      lot_size: formData.lot_size ? parseFloat(formData.lot_size) : undefined,
      year_built: formData.year_built ? parseInt(formData.year_built) : undefined,
      purchase_price_cents: formData.purchase_price_cents ? Math.round(parseFloat(formData.purchase_price_cents) * 100) : undefined,
      purchase_date: formData.purchase_date || undefined,
      current_value_cents: formData.current_value_cents ? Math.round(parseFloat(formData.current_value_cents) * 100) : undefined,
      notes: formData.notes || undefined,
    };

    await onSubmit(data);
  };

  if (isLoadingBusinesses) {
    return (
      <SlidePanel
        isOpen={true}
        onClose={onCancel}
        title={property ? 'Edit Property' : 'Add Property'}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading businesses...</p>
        </div>
      </SlidePanel>
    );
  }

  // Only show "No Business Found" when CREATING a new property and there are no businesses
  // When editing an existing property, we already have the property's business_id
  if (!property && businesses.length === 0) {
    return (
      <SlidePanel
        isOpen={true}
        onClose={onCancel}
        title="No Business Found"
        footer={
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        }
      >
        <div className="text-center py-8">
          <p className="text-gray-600">
            You need to create a business before adding properties. Businesses help you organize properties for accounting and tax purposes.
          </p>
        </div>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel
      isOpen={true}
      onClose={onCancel}
      title={property ? 'Edit Property' : 'Add Property'}
      size="large"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="property-form"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : property ? 'Update Property' : 'Add Property'}
          </button>
        </div>
      }
    >
      <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && Object.keys(touched).length > 5 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {currentBusiness && businesses.length > 0 && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business <span className="text-red-500">*</span>
                </label>
                <select
                  id="business_id"
                  name="business_id"
                  value={formData.business_id}
                  onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a business...</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.business_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Properties are organized under businesses for accounting</p>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={() => handleBlur('name')}
                className={getInputClassName(touched.name && !!getFieldError(errors, 'Property Name'))}
                placeholder="e.g., Sunset Apartments"
                autoComplete="organization"
              />
              {touched.name && <FieldError error={getFieldError(errors, 'Property Name')} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value as PropertyType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Built
              </label>
              <input
                type="number"
                id="year_built"
                name="year_built"
                value={formData.year_built}
                onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                onBlur={() => handleBlur('year_built')}
                className={getInputClassName(touched.year_built && !!getFieldError(errors, 'Year Built'))}
                placeholder="e.g., 2010"
                min="1800"
                max={new Date().getFullYear() + 5}
              />
              {touched.year_built && <FieldError error={getFieldError(errors, 'Year Built')} />}
            </div>

            <div className="col-span-2">
              <AddressInput
                value={{
                  address_line1: formData.address_line1,
                  address_line2: formData.address_line2,
                  city: formData.city,
                  state: formData.state,
                  postal_code: formData.postal_code,
                  country: formData.country,
                }}
                onChange={(addressData) => {
                  setFormData({ ...formData, ...addressData });
                  // Mark fields as touched when changed via autocomplete
                  if (addressData.address_line1 !== formData.address_line1) handleBlur('address_line1');
                  if (addressData.city !== formData.city) handleBlur('city');
                  if (addressData.state !== formData.state) handleBlur('state');
                  if (addressData.postal_code !== formData.postal_code) handleBlur('postal_code');
                }}
                required={true}
              />
              {touched.address_line1 && <FieldError error={getFieldError(errors, 'Address')} />}
              {touched.city && <FieldError error={getFieldError(errors, 'City')} />}
              {touched.state && <FieldError error={getFieldError(errors, 'State/Province')} />}
              {touched.postal_code && <FieldError error={getFieldError(errors, 'Postal Code')} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Square Feet
              </label>
              <input
                type="number"
                id="square_feet"
                name="square_feet"
                value={formData.square_feet}
                onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lot Size (acres)
              </label>
              <input
                type="number"
                id="lot_size"
                name="lot_size"
                step="0.01"
                value={formData.lot_size}
                onChange={(e) => setFormData({ ...formData, lot_size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Price ($)
              </label>
              <input
                type="number"
                id="purchase_price_cents"
                name="purchase_price_cents"
                step="0.01"
                value={formData.purchase_price_cents}
                onChange={(e) => setFormData({ ...formData, purchase_price_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Value ($)
              </label>
              <input
                type="number"
                id="current_value_cents"
                name="current_value_cents"
                step="0.01"
                value={formData.current_value_cents}
                onChange={(e) => setFormData({ ...formData, current_value_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information about this property"
              />
            </div>
          </div>

        </form>
    </SlidePanel>
  );
}
