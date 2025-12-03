import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, Users, Home, Plus, Edit2, Save, X, ArrowLeft, History } from 'lucide-react';
import { packageTierService, PackageTier } from '../services/packageTierService';
import { useAuth } from '../context/AuthContext';

export function PackageManagement() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [packages, setPackages] = useState<PackageTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<PackageTier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<PackageTier>>({});

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    loadPackages();
  }, [isSuperAdmin]);

  const loadPackages = async () => {
    try {
      const data = await packageTierService.getAllPackageTiers();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pkg: PackageTier) => {
    setEditingPackage(pkg);
    setFormData(pkg);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPackage(null);
    setFormData({
      tier_name: '',
      tier_slug: '',
      display_name: '',
      description: '',
      monthly_price_cents: 0,
      annual_price_cents: 0,
      currency: 'CAD',
      max_businesses: 1,
      max_properties: 0,
      max_units: 0,
      max_tenants: 0,
      max_users: 1,
      max_payment_methods: 1,
      features: {},
      is_active: true,
      is_featured: false,
      display_order: packages.length + 1,
    });
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await packageTierService.createPackageTier(formData);
      } else if (editingPackage) {
        await packageTierService.updatePackageTier(editingPackage.id, formData);
      }
      await loadPackages();
      setEditingPackage(null);
      setIsCreating(false);
      setFormData({});
    } catch (error) {
      console.error('Failed to save package:', error);
      alert('Failed to save package');
    }
  };

  const handleCancel = () => {
    setEditingPackage(null);
    setIsCreating(false);
    setFormData({});
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading packages...</p>
      </div>
    );
  }

  if (isCreating || editingPackage) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">
                  {isCreating ? 'Create Package' : 'Edit Package'}
                </h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Package
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={formData.tier_name || ''}
                  onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Professional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Slug
                </label>
                <input
                  type="text"
                  value={formData.tier_slug || ''}
                  onChange={(e) => setFormData({ ...formData, tier_slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., professional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Price (cents)
                </label>
                <input
                  type="number"
                  value={formData.monthly_price_cents || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_price_cents: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formatPrice(formData.monthly_price_cents || 0)}/month
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Price (cents)
                </label>
                <input
                  type="number"
                  value={formData.annual_price_cents || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, annual_price_cents: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formatPrice(formData.annual_price_cents || 0)}/year
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Package Limits</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Businesses
                  </label>
                  <input
                    type="number"
                    value={formData.max_businesses || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, max_businesses: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate accounting entities (LLCs, Corps)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Properties
                  </label>
                  <input
                    type="number"
                    value={formData.max_properties || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, max_properties: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buildings, houses, complexes</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Units
                  </label>
                  <input
                    type="number"
                    value={formData.max_units || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, max_units: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Apartments, suites, rental spaces</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tenants
                  </label>
                  <input
                    type="number"
                    value={formData.max_tenants || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, max_tenants: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tenant accounts with portal access</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Users (Team Members)
                  </label>
                  <input
                    type="number"
                    value={formData.max_users || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, max_users: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Landlord staff accounts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Payment Methods
                  </label>
                  <input
                    type="number"
                    value={formData.max_payment_methods || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, max_payment_methods: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured || false}
                      onChange={(e) =>
                        setFormData({ ...formData, is_featured: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/super-admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
                <p className="text-gray-600 mt-1">Manage subscription tiers and pricing</p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Create Package
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{pkg.display_name}</h3>
                  {pkg.is_featured && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      FEATURED
                    </span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-6">{pkg.description}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(pkg.monthly_price_cents)}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    or {formatPrice(pkg.annual_price_cents)}/year
                  </div>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span>
                      {pkg.max_businesses === 999999 ? 'Unlimited' : pkg.max_businesses} {pkg.max_businesses === 1 ? 'Business' : 'Businesses'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-gray-500" />
                    <span>
                      {pkg.max_properties === 999999 ? 'Unlimited' : pkg.max_properties} {pkg.max_properties === 1 ? 'Property' : 'Properties'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-gray-500" />
                    <span>
                      {pkg.max_units === 999999 ? 'Unlimited' : pkg.max_units} Units
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {pkg.max_tenants === 999999 ? 'Unlimited' : pkg.max_tenants} Tenants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {pkg.max_users === 999999 ? 'Unlimited' : pkg.max_users} Team {pkg.max_users === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pkg)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/super-admin/packages/${pkg.id}/history`)}
                    className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition"
                    title="View History"
                  >
                    <History size={16} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Version {pkg.version}</span>
                  <span className={pkg.is_active ? 'text-green-600' : 'text-red-600'}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
