import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { businessService } from '../services/businessService';
import { addonService } from '../services/addonService';
import { Business } from '../types';
import { Plus, Building2, Edit2, Trash2, X, MapPin, Phone, Mail, Zap, Upload, Save } from 'lucide-react';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { BusinessSetupWizard } from '../components/BusinessSetupWizard';
import { EnhancedImportWizard } from '../components/EnhancedImportWizard';
import { SlidePanel } from '../components/SlidePanel';

export function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitStatus, setLimitStatus] = useState<any>(null);
  const [showBusinessWizard, setShowBusinessWizard] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const { currentBusiness } = useAuth();

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
    registration_number: '',
    tax_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'CA',
    phone: '',
    email: '',
    website: '',
    notes: '',
  });

  useEffect(() => {
    loadBusinesses();
    loadLimitStatus();
  }, [currentBusiness?.id]);

  const loadLimitStatus = async () => {
    if (!currentBusiness) return;
    try {
      const status = await addonService.getLimitStatus(currentBusiness.id);
      setLimitStatus(status);
    } catch (err) {
      console.error('Failed to load limit status:', err);
    }
  };

  const loadBusinesses = async () => {
    setIsLoading(true);
    try {
      const data = await businessService.getOwnedBusinesses();
      setBusinesses(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      business_name: '',
      business_type: '',
      registration_number: '',
      tax_id: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      notes: '',
    });
    setEditingBusiness(null);
    setShowForm(false);
  };

  const handleEdit = (business: Business) => {
    setFormData({
      business_name: business.business_name,
      business_type: business.business_type || '',
      registration_number: business.registration_number || '',
      tax_id: business.tax_id || '',
      address_line1: business.address_line1 || '',
      address_line2: business.address_line2 || '',
      city: business.city || '',
      state: business.state || '',
      postal_code: business.postal_code || '',
      country: business.country || 'CA',
      phone: business.phone || '',
      email: business.email || '',
      website: business.website || '',
      notes: business.notes || '',
    });
    setEditingBusiness(business);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!currentBusiness || !formData.business_name) return;
    setIsSubmitting(true);

    try {
      const data = {
        business_name: formData.business_name,
        business_type: formData.business_type || undefined,
        registration_number: formData.registration_number || undefined,
        tax_id: formData.tax_id || undefined,
        address_line1: formData.address_line1 || undefined,
        address_line2: formData.address_line2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        country: formData.country,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
        notes: formData.notes || undefined,
      };

      if (editingBusiness) {
        await businessService.updateBusiness(editingBusiness.id, data);
      } else {
        await businessService.createBusiness(currentBusiness.id, data);
      }

      await loadBusinesses();
      await loadLimitStatus();
      resetForm();
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save business';
      if (errorMessage.includes('LIMIT_REACHED:business')) {
        setShowUpgradePrompt(true);
        setShowForm(false);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business? This will also delete all associated properties and data.')) {
      return;
    }
    setDeletingId(id);
    try {
      await businessService.deleteBusiness(id);
      await loadBusinesses();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete business');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading businesses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Businesses</h1>
            <p className="text-gray-600 mt-1">
              {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} registered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportWizard(true)}
              className="flex items-center gap-2 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <Upload size={20} />
              Import Data
            </button>
            <button
              onClick={() => setShowBusinessWizard(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              <Zap size={20} />
              Setup Wizard
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={20} />
              Add Business
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        {businesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No businesses yet</h3>
            <p className="text-gray-600 mb-6">
              Start by adding a business entity. Businesses help organize your properties for accounting and tax purposes.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Your First Business
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((business) => (
              <div key={business.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{business.business_name}</h3>
                      {business.business_type && (
                        <p className="text-sm text-gray-500 mt-1">{business.business_type}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      business.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {business.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {business.registration_number && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reg #:</span> {business.registration_number}
                    </p>
                  )}

                  {business.tax_id && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Tax ID:</span> {business.tax_id}
                    </p>
                  )}

                  {business.city && business.state && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <MapPin size={14} />
                      {business.city}, {business.state}
                    </p>
                  )}

                  {business.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <Phone size={14} />
                      {business.phone}
                    </p>
                  )}

                  {business.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <Mail size={14} />
                      {business.email}
                    </p>
                  )}

                  {business.notes && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{business.notes}</p>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-4">
                    <button
                      onClick={() => handleEdit(business)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(business.id)}
                      disabled={deletingId === business.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {deletingId === business.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlidePanel
        isOpen={showForm}
        onClose={resetForm}
        title={editingBusiness ? 'Edit Business' : 'Add Business'}
        subtitle={editingBusiness ? `Editing: ${editingBusiness.business_name}` : 'Create a new business entity'}
        size="large"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isSubmitting || !formData.business_name}
            >
              <Save size={18} />
              {isSubmitting ? 'Saving...' : editingBusiness ? 'Update Business' : 'Add Business'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <input
                type="text"
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., LLC, Corporation, Partnership"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Number
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID / EIN
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://"
              />
            </div>

            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Address</h3>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information about this business"
              />
            </div>
          </div>
        </div>
      </SlidePanel>

      {showUpgradePrompt && limitStatus && (
        <UpgradePrompt
          resourceType="business"
          currentCount={limitStatus.businesses.current}
          maxAllowed={limitStatus.businesses.max}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}

      {showBusinessWizard && (
        <BusinessSetupWizard
          onClose={() => setShowBusinessWizard(false)}
          onComplete={() => {
            setShowBusinessWizard(false);
            loadBusinesses();
          }}
        />
      )}

      <EnhancedImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
      />
    </div>
  );
}
