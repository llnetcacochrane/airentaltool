import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, Users, Home, Plus, Edit2, Save, X, History, Trash2, Archive, AlertTriangle, ArrowRight, Check, CreditCard, Layers } from 'lucide-react';
import { packageTierService, PackageTier } from '../services/packageTierService';
import { featureService, Feature } from '../services/featureService';
import { useAuth } from '../context/AuthContext';
import { SuperAdminLayout } from '../components/SuperAdminLayout';
import { SlidePanel } from '../components/SlidePanel';

interface PackageWithSubscribers extends PackageTier {
  subscriber_count?: number;
}

export function PackageManagement() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [packages, setPackages] = useState<PackageWithSubscribers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<PackageTier>>({});

  // Features and addons
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [allAddons, setAllAddons] = useState<Feature[]>([]);
  const [includedFeatureIds, setIncludedFeatureIds] = useState<Set<string>>(new Set());
  const [addonConfig, setAddonConfig] = useState<Record<string, { enabled: boolean; price_cents: number; allow_multiple: boolean }>>({});

  // Panel states
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageTier | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<PackageWithSubscribers | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Delete options
  const [deleteOption, setDeleteOption] = useState<'archive' | 'migrate' | 'delete'>('archive');
  const [migrateToPackageId, setMigrateToPackageId] = useState('');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    loadPackages();
  }, [isSuperAdmin]);

  const loadPackages = async () => {
    try {
      const [data, features, addons] = await Promise.all([
        packageTierService.getAllPackageTiersAdmin(),
        featureService.getFeaturesByType('feature'),
        featureService.getFeaturesByType('addon'),
      ]);

      // Load subscriber counts for each package
      const packagesWithCounts = await Promise.all(
        data.map(async (pkg) => {
          const subscriber_count = await packageTierService.getPackageSubscriberCount(pkg.id);
          return { ...pkg, subscriber_count };
        })
      );
      setPackages(packagesWithCounts);
      setAllFeatures(features);
      setAllAddons(addons);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setErrorMessage('Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (pkg: PackageTier) => {
    setEditingPackage(pkg);
    setFormData(pkg);
    setIsCreating(false);

    // Load included features and addon config for this package
    try {
      const [included, availableAddons] = await Promise.all([
        featureService.getTierIncludedFeatures(pkg.id),
        featureService.getTierAvailableAddons(pkg.id),
      ]);

      setIncludedFeatureIds(new Set(included.map(f => f.id)));

      // Build addon config
      const config: Record<string, { enabled: boolean; price_cents: number; allow_multiple: boolean }> = {};
      allAddons.forEach(addon => {
        const existing = availableAddons.find(a => a.id === addon.id);
        config[addon.id] = {
          enabled: !!existing,
          price_cents: existing?.addon_price_cents || 0,
          allow_multiple: false,
        };
      });
      setAddonConfig(config);
    } catch (error) {
      console.error('Failed to load package features:', error);
    }

    setShowEditPanel(true);
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

    // Reset feature selections
    setIncludedFeatureIds(new Set());
    const config: Record<string, { enabled: boolean; price_cents: number; allow_multiple: boolean }> = {};
    allAddons.forEach(addon => {
      config[addon.id] = { enabled: false, price_cents: 0, allow_multiple: false };
    });
    setAddonConfig(config);

    setShowEditPanel(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      let packageId: string;

      if (isCreating) {
        const newPkg = await packageTierService.createPackageTier(formData);
        packageId = newPkg.id;
        setSuccessMessage('Package created successfully');
      } else if (editingPackage) {
        await packageTierService.updatePackageTier(editingPackage.id, formData);
        packageId = editingPackage.id;
        setSuccessMessage('Package updated successfully');
      } else {
        throw new Error('No package to save');
      }

      // Save included features
      await featureService.setTierIncludedFeatures(packageId, Array.from(includedFeatureIds));

      // Save addon configuration
      const addonConfigs = Object.entries(addonConfig)
        .filter(([_, config]) => config.enabled)
        .map(([featureId, config]) => ({
          feature_id: featureId,
          addon_price_cents: config.price_cents,
          billing_period: 'monthly',
        }));
      await featureService.setTierAvailableAddons(packageId, addonConfigs);

      await loadPackages();
      setShowEditPanel(false);
      setEditingPackage(null);
      setIsCreating(false);
      setFormData({});
    } catch (error) {
      console.error('Failed to save package:', error);
      setErrorMessage('Failed to save package');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (pkg: PackageWithSubscribers) => {
    setDeletingPackage(pkg);
    setDeleteOption(pkg.subscriber_count && pkg.subscriber_count > 0 ? 'archive' : 'delete');
    setMigrateToPackageId('');
    setShowDeletePanel(true);
  };

  const handleDelete = async () => {
    if (!deletingPackage) return;
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (deleteOption === 'archive') {
        await packageTierService.archivePackageTier(deletingPackage.id);
        setSuccessMessage(`Package "${deletingPackage.display_name}" archived. Existing subscribers will keep their current plan.`);
      } else if (deleteOption === 'migrate') {
        if (!migrateToPackageId) {
          setErrorMessage('Please select a package to migrate subscribers to');
          setIsSaving(false);
          return;
        }
        const migratedCount = await packageTierService.migrateSubscribers(deletingPackage.id, migrateToPackageId);
        await packageTierService.archivePackageTier(deletingPackage.id);
        setSuccessMessage(`Migrated ${migratedCount} subscribers and archived package "${deletingPackage.display_name}"`);
      } else if (deleteOption === 'delete') {
        await packageTierService.hardDeletePackageTier(deletingPackage.id);
        setSuccessMessage(`Package "${deletingPackage.display_name}" permanently deleted`);
      }

      await loadPackages();
      setShowDeletePanel(false);
      setDeletingPackage(null);
    } catch (error) {
      console.error('Failed to delete package:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete package');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  if (isLoading) {
    return (
      <SuperAdminLayout title="Package Management" subtitle="Manage subscription tiers and pricing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SuperAdminLayout>
    );
  }

  const actionButton = (
    <button
      onClick={handleCreate}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition font-semibold"
    >
      <Plus size={18} />
      Create Package
    </button>
  );

  return (
    <SuperAdminLayout
      title="Package Management"
      subtitle="Manage subscription tiers and pricing"
      actionButton={actionButton}
    >
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
          <button onClick={clearMessages} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {errorMessage}
          <button onClick={clearMessages} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden border-2 transition ${
              pkg.is_active ? 'border-gray-200 hover:border-blue-500' : 'border-gray-100 opacity-60'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{pkg.display_name}</h3>
                <div className="flex items-center gap-2">
                  {pkg.is_featured && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      FEATURED
                    </span>
                  )}
                  {!pkg.is_active && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                      ARCHIVED
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>

              {/* Subscriber Count */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{pkg.subscriber_count || 0} subscribers</span>
                </div>
              </div>

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

              <div className="space-y-2 mb-6 pb-6 border-b text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span>
                    {pkg.max_businesses === 999999 ? 'Unlimited' : pkg.max_businesses} {pkg.max_businesses === 1 ? 'Business' : 'Businesses'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span>
                    {pkg.max_properties === 999999 ? 'Unlimited' : pkg.max_properties} Properties
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span>
                    {pkg.max_units === 999999 ? 'Unlimited' : pkg.max_units} Units
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>
                    {pkg.max_tenants === 999999 ? 'Unlimited' : pkg.max_tenants} Tenants
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
                <button
                  onClick={() => handleOpenDelete(pkg)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Version {pkg.version}</span>
                <span className={pkg.is_active ? 'text-green-600' : 'text-gray-400'}>
                  {pkg.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Panel */}
      <SlidePanel
        isOpen={showEditPanel}
        onClose={() => {
          setShowEditPanel(false);
          setEditingPackage(null);
          setIsCreating(false);
        }}
        title={isCreating ? 'Create Package' : 'Edit Package'}
        subtitle={isCreating ? 'Add a new subscription tier' : `Editing ${editingPackage?.display_name}`}
        size="large"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowEditPanel(false);
                setEditingPackage(null);
                setIsCreating(false);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Package'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Name *
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
                URL Slug *
              </label>
              <input
                type="text"
                value={formData.tier_slug || ''}
                onChange={(e) => setFormData({ ...formData, tier_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., professional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name *
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price ($)
              </label>
              <input
                type="number"
                value={(formData.monthly_price_cents || 0) / 100}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_price_cents: Math.round(parseFloat(e.target.value) * 100) })
                }
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Price ($)
              </label>
              <input
                type="number"
                value={(formData.annual_price_cents || 0) / 100}
                onChange={(e) =>
                  setFormData({ ...formData, annual_price_cents: Math.round(parseFloat(e.target.value) * 100) })
                }
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Package Limits</h3>
            <div className="grid grid-cols-2 gap-4">
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
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use 999999 for unlimited</p>
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
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Team Members
                </label>
                <input
                  type="number"
                  value={formData.max_users || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, max_users: parseInt(e.target.value) })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
            <div className="grid grid-cols-3 gap-4">
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

              <div className="flex items-center pt-8">
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

              <div className="flex items-center pt-8">
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

          {/* Included Features Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Included Features
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select which features are included in this package at no extra cost.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {allFeatures.map((feature) => (
                <label
                  key={feature.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    includedFeatureIds.has(feature.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={includedFeatureIds.has(feature.id)}
                    onChange={(e) => {
                      const newSet = new Set(includedFeatureIds);
                      if (e.target.checked) {
                        newSet.add(feature.id);
                      } else {
                        newSet.delete(feature.id);
                      }
                      setIncludedFeatureIds(newSet);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{feature.name}</div>
                    {feature.description && (
                      <div className="text-xs text-gray-500 truncate">{feature.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Payment Providers
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select which payment providers are included or available as add-ons.
            </p>
            <div className="space-y-3">
              {allAddons
                .filter(addon => addon.category === 'payments')
                .map((addon) => (
                  <div
                    key={addon.id}
                    className={`p-4 border rounded-lg ${
                      includedFeatureIds.has(addon.id) || addonConfig[addon.id]?.enabled
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{addon.name}</div>
                          {addon.description && (
                            <div className="text-sm text-gray-500">{addon.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includedFeatureIds.has(addon.id)}
                            onChange={(e) => {
                              const newSet = new Set(includedFeatureIds);
                              if (e.target.checked) {
                                newSet.add(addon.id);
                                // Remove from addon config if included
                                setAddonConfig({
                                  ...addonConfig,
                                  [addon.id]: { ...addonConfig[addon.id], enabled: false },
                                });
                              } else {
                                newSet.delete(addon.id);
                              }
                              setIncludedFeatureIds(newSet);
                            }}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-green-700">Included</span>
                        </label>

                        {!includedFeatureIds.has(addon.id) && (
                          <>
                            <div className="h-6 w-px bg-gray-300" />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={addonConfig[addon.id]?.enabled || false}
                                onChange={(e) => {
                                  setAddonConfig({
                                    ...addonConfig,
                                    [addon.id]: {
                                      ...addonConfig[addon.id],
                                      enabled: e.target.checked,
                                    },
                                  });
                                }}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-purple-700">Add-On</span>
                            </label>
                            {addonConfig[addon.id]?.enabled && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-600">$</span>
                                <input
                                  type="number"
                                  value={(addonConfig[addon.id]?.price_cents || 0) / 100}
                                  onChange={(e) => {
                                    setAddonConfig({
                                      ...addonConfig,
                                      [addon.id]: {
                                        ...addonConfig[addon.id],
                                        price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                                      },
                                    });
                                  }}
                                  step="0.01"
                                  min="0"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-600">/mo</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Other Add-Ons Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Available Add-Ons
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure which add-ons users can purchase and set pricing per add-on.
            </p>
            <div className="space-y-3">
              {allAddons
                .filter(addon => addon.category !== 'payments')
                .map((addon) => (
                  <div
                    key={addon.id}
                    className={`p-4 border rounded-lg ${
                      addonConfig[addon.id]?.enabled
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{addon.name}</div>
                        {addon.description && (
                          <div className="text-sm text-gray-500">{addon.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Category: {featureService.getCategoryDisplayName(addon.category)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addonConfig[addon.id]?.enabled || false}
                            onChange={(e) => {
                              setAddonConfig({
                                ...addonConfig,
                                [addon.id]: {
                                  ...addonConfig[addon.id],
                                  enabled: e.target.checked,
                                },
                              });
                            }}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Available</span>
                        </label>
                        {addonConfig[addon.id]?.enabled && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-600">$</span>
                            <input
                              type="number"
                              value={(addonConfig[addon.id]?.price_cents || 0) / 100}
                              onChange={(e) => {
                                setAddonConfig({
                                  ...addonConfig,
                                  [addon.id]: {
                                    ...addonConfig[addon.id],
                                    price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                                  },
                                });
                              }}
                              step="0.01"
                              min="0"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-600">/mo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* Delete Panel */}
      <SlidePanel
        isOpen={showDeletePanel}
        onClose={() => {
          setShowDeletePanel(false);
          setDeletingPackage(null);
        }}
        title="Delete Package"
        subtitle={`${deletingPackage?.display_name}`}
        size="medium"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDeletePanel(false);
                setDeletingPackage(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isSaving || (deleteOption === 'migrate' && !migrateToPackageId)}
              className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                deleteOption === 'delete'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {deleteOption === 'archive' && <Archive size={18} />}
              {deleteOption === 'migrate' && <ArrowRight size={18} />}
              {deleteOption === 'delete' && <Trash2 size={18} />}
              {isSaving ? 'Processing...' : deleteOption === 'archive' ? 'Archive Package' : deleteOption === 'migrate' ? 'Migrate & Archive' : 'Delete Permanently'}
            </button>
          </div>
        }
      >
        {deletingPackage && (
          <div className="space-y-6">
            {/* Subscriber Warning */}
            {deletingPackage.subscriber_count && deletingPackage.subscriber_count > 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">
                      This package has {deletingPackage.subscriber_count} active subscriber{deletingPackage.subscriber_count > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You can archive the package (subscribers keep their plan), migrate subscribers to another package, or the option to permanently delete is disabled.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  This package has no active subscribers. You can safely delete it permanently.
                </p>
              </div>
            )}

            {/* Delete Options */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Choose an action:
              </label>

              {/* Archive Option */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                  deleteOption === 'archive'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deleteOption"
                  value="archive"
                  checked={deleteOption === 'archive'}
                  onChange={() => setDeleteOption('archive')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Archive Package</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Hide from new signups but keep existing subscribers on this plan. They will continue with their current features and pricing.
                  </p>
                </div>
              </label>

              {/* Migrate Option */}
              {deletingPackage.subscriber_count && deletingPackage.subscriber_count > 0 && (
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                    deleteOption === 'migrate'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteOption"
                    value="migrate"
                    checked={deleteOption === 'migrate'}
                    onChange={() => setDeleteOption('migrate')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Migrate Subscribers</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Move all {deletingPackage.subscriber_count} subscriber{deletingPackage.subscriber_count > 1 ? 's' : ''} to another package, then archive this one.
                    </p>

                    {deleteOption === 'migrate' && (
                      <div className="mt-3">
                        <select
                          value={migrateToPackageId}
                          onChange={(e) => setMigrateToPackageId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select destination package...</option>
                          {packages
                            .filter((p) => p.id !== deletingPackage.id && p.is_active)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.display_name} - {formatPrice(p.monthly_price_cents)}/mo
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              )}

              {/* Delete Option (only if no subscribers) */}
              {(!deletingPackage.subscriber_count || deletingPackage.subscriber_count === 0) && (
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition ${
                    deleteOption === 'delete'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteOption"
                    value="delete"
                    checked={deleteOption === 'delete'}
                    onChange={() => setDeleteOption('delete')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-gray-900">Delete Permanently</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Permanently remove this package from the system. This action cannot be undone.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </SuperAdminLayout>
  );
}
