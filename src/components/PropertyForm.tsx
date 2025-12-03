import { useState, useEffect } from 'react';
import { Property, PropertyType, Business } from '../types';
import { businessService } from '../services/businessService';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: Partial<Property>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'apartment_building', label: 'Apartment Building' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

export function PropertyForm({ property, onSubmit, onCancel, isSubmitting }: PropertyFormProps) {
  const { currentOrganization } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);

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
  }, [currentOrganization?.id]);

  const loadBusinesses = async () => {
    if (!currentOrganization) return;
    try {
      const data = await businessService.getAllBusinesses(currentOrganization.id);
      setBusinesses(data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_id) {
      alert('Please select a business');
      return;
    }

    const data: Partial<Property> = {
      business_id: formData.business_id,
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <p>Loading businesses...</p>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">No Business Found</h2>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            You need to create a business before adding properties. Businesses help you organize properties for accounting and tax purposes.
          </p>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {property ? 'Edit Property' : 'Add Property'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business <span className="text-red-500">*</span>
              </label>
              <select
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Sunset Apartments"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <select
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
                value={formData.year_built}
                onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 2010"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Street address"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ON"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information about this property"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : property ? 'Update Property' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
