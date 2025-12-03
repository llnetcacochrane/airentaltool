import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building, Mail, Phone, Percent } from 'lucide-react';
import { propertyOwnerService, PropertyOwner, PropertyOwnership } from '../services/propertyOwnerService';
import { propertyService } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';

export default function PropertyOwners() {
  const { currentOrganization } = useAuth();
  const [owners, setOwners] = useState<PropertyOwner[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<PropertyOwner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
  });
  const [assignData, setAssignData] = useState({
    property_id: '',
    ownership_percentage: 100,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ownersData, propertiesData] = await Promise.all([
        propertyOwnerService.getPropertyOwners(),
        propertyService.getProperties(),
      ]);
      setOwners(ownersData);
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await propertyOwnerService.createPropertyOwner(formData);
      setShowForm(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        password: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating property owner:', error);
      alert('Failed to create property owner');
    }
  };

  const handleAssignProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner || !currentOrganization) return;

    try {
      await propertyOwnerService.assignPropertyToOwner({
        property_id: assignData.property_id,
        owner_id: selectedOwner.id,
        organization_id: currentOrganization.id,
        ownership_percentage: assignData.ownership_percentage,
      });
      setShowAssignForm(false);
      setAssignData({ property_id: '', ownership_percentage: 100 });
      alert('Property assigned successfully');
    } catch (error) {
      console.error('Error assigning property:', error);
      alert('Failed to assign property');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this property owner?')) {
      try {
        await propertyOwnerService.deactivatePropertyOwner(id);
        loadData();
      } catch (error) {
        console.error('Error deactivating owner:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Owners</h1>
            <p className="text-gray-600 mt-1">
              Manage property owners who have read-only access to their properties
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Owner
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Property Owner</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignForm && selectedOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Assign Property to {selectedOwner.first_name} {selectedOwner.last_name}
            </h2>
            <form onSubmit={handleAssignProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  required
                  value={assignData.property_id}
                  onChange={(e) => setAssignData({ ...assignData, property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ownership Percentage
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={assignData.ownership_percentage}
                  onChange={(e) =>
                    setAssignData({ ...assignData, ownership_percentage: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Assign Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {owner.first_name} {owner.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        {owner.email}
                      </div>
                      {owner.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          {owner.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{owner.company_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        owner.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {owner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedOwner(owner);
                          setShowAssignForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Assign Property"
                      >
                        <Building size={18} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(owner.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Deactivate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {owners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No property owners yet. Click "Add Owner" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
