import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, DollarSign, Check, X, Edit2, Save, ToggleLeft, ToggleRight, Package, Layers, CreditCard, Brain, Palette, Users, Building2, AlertTriangle } from 'lucide-react';
import { featureService, Feature, FeatureWithTierConfig } from '../services/featureService';
import { packageTierService, PackageTier } from '../services/packageTierService';
import { useAuth } from '../context/AuthContext';
import { SuperAdminLayout } from '../components/SuperAdminLayout';
import { SlidePanel } from '../components/SlidePanel';

export function FeatureManagement() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [features, setFeatures] = useState<FeatureWithTierConfig[]>([]);
  const [packages, setPackages] = useState<PackageTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Panel states
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureWithTierConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    is_active: boolean;
  }>({
    name: '',
    description: '',
    is_active: true,
  });

  // Addon pricing per tier
  const [addonPricing, setAddonPricing] = useState<Record<string, { enabled: boolean; price_cents: number }>>({});

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Filter
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'feature' | 'addon'>('all');

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [isSuperAdmin]);

  const loadData = async () => {
    try {
      const [featuresData, packagesData] = await Promise.all([
        featureService.getAllFeaturesWithTierConfig(),
        packageTierService.getAllPackageTiersAdmin(),
      ]);
      setFeatures(featuresData);
      setPackages(packagesData.filter(p => p.is_active));
    } catch (error) {
      console.error('Failed to load data:', error);
      setErrorMessage('Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (feature: FeatureWithTierConfig) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description || '',
      is_active: feature.is_active,
    });

    // Initialize addon pricing for each package
    const pricing: Record<string, { enabled: boolean; price_cents: number }> = {};
    packages.forEach(pkg => {
      const existingConfig = feature.addon_config.find(c => c.tier_id === pkg.id);
      pricing[pkg.id] = {
        enabled: !!existingConfig,
        price_cents: existingConfig?.addon_price_cents || 0,
      };
    });
    setAddonPricing(pricing);
    setShowEditPanel(true);
  };

  const handleSave = async () => {
    if (!editingFeature) return;
    setIsSaving(true);
    setErrorMessage('');

    try {
      // Update feature details
      await featureService.updateFeature(editingFeature.id, {
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active,
      });

      // If this is an addon, update pricing per tier
      if (editingFeature.feature_type === 'addon') {
        const addonConfigs = Object.entries(addonPricing)
          .filter(([_, config]) => config.enabled && config.price_cents > 0)
          .map(([tierId, config]) => ({
            feature_id: editingFeature.id,
            addon_price_cents: config.price_cents,
            billing_period: 'monthly',
          }));

        // Update each tier's addon availability
        for (const pkg of packages) {
          const config = addonPricing[pkg.id];
          if (config?.enabled && config.price_cents > 0) {
            await featureService.updateTierAddonPricing(
              pkg.id,
              editingFeature.id,
              config.price_cents,
              'monthly'
            );
          } else {
            await featureService.removeTierAddon(pkg.id, editingFeature.id);
          }
        }
      }

      setSuccessMessage(`Feature "${formData.name}" updated successfully`);
      await loadData();
      setShowEditPanel(false);
      setEditingFeature(null);
    } catch (error) {
      console.error('Failed to save feature:', error);
      setErrorMessage('Failed to save feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (feature: Feature) => {
    try {
      await featureService.updateFeature(feature.id, {
        is_active: !feature.is_active,
      });
      setSuccessMessage(`Feature "${feature.name}" ${!feature.is_active ? 'enabled' : 'disabled'}`);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
      setErrorMessage('Failed to update feature');
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'core':
        return <Layers className="w-4 h-4" />;
      case 'payments':
        return <CreditCard className="w-4 h-4" />;
      case 'ai':
        return <Brain className="w-4 h-4" />;
      case 'branding':
        return <Palette className="w-4 h-4" />;
      case 'team':
        return <Users className="w-4 h-4" />;
      case 'enterprise':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Get unique categories
  const categories = ['all', ...new Set(features.map(f => f.category || 'other'))];

  // Filter features
  const filteredFeatures = features.filter(f => {
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    if (filterType !== 'all' && f.feature_type !== filterType) return false;
    return true;
  });

  // Group by category
  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    const cat = feature.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {} as Record<string, FeatureWithTierConfig[]>);

  if (isLoading) {
    return (
      <SuperAdminLayout title="Features & Add-Ons" subtitle="Manage feature settings and add-on pricing">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Features & Add-Ons"
      subtitle="Manage feature settings and add-on pricing"
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

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Feature Management</p>
            <p className="text-blue-700 text-sm mt-1">
              Features are system-defined and cannot be created or deleted. You can edit display names, descriptions,
              enable/disable features, and set add-on pricing per package tier.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>
                {featureService.getCategoryDisplayName(cat)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="feature">Features Only</option>
            <option value="addon">Add-Ons Only</option>
          </select>
        </div>
      </div>

      {/* Features by Category */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {getCategoryIcon(category)}
            {featureService.getCategoryDisplayName(category)}
            <span className="text-sm font-normal text-gray-500">
              ({categoryFeatures.length} items)
            </span>
          </h2>

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Add-On Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryFeatures.map((feature) => (
                  <tr key={feature.id} className={!feature.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-gray-900">{feature.name}</div>
                          <div className="text-sm text-gray-500">{feature.slug}</div>
                          {feature.description && (
                            <div className="text-sm text-gray-400 mt-1 max-w-md truncate">
                              {feature.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          feature.feature_type === 'addon'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {feature.feature_type === 'addon' ? 'Add-On' : 'Feature'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {feature.feature_type === 'addon' && feature.addon_config.length > 0 ? (
                        <div className="text-sm">
                          {feature.addon_config.slice(0, 2).map((config, idx) => {
                            const pkg = packages.find(p => p.id === config.tier_id);
                            return (
                              <div key={idx} className="text-gray-600">
                                {pkg?.display_name}: {formatPrice(config.addon_price_cents)}/mo
                              </div>
                            );
                          })}
                          {feature.addon_config.length > 2 && (
                            <div className="text-gray-400">
                              +{feature.addon_config.length - 2} more...
                            </div>
                          )}
                        </div>
                      ) : feature.feature_type === 'addon' ? (
                        <span className="text-gray-400 text-sm">No pricing set</span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(feature)}
                        className={`flex items-center gap-2 ${
                          feature.is_active ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {feature.is_active ? (
                          <>
                            <ToggleRight className="w-6 h-6" />
                            <span className="text-sm">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6" />
                            <span className="text-sm">Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(feature)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Edit Panel */}
      <SlidePanel
        isOpen={showEditPanel}
        onClose={() => {
          setShowEditPanel(false);
          setEditingFeature(null);
        }}
        title="Edit Feature"
        subtitle={editingFeature?.slug}
        size="large"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowEditPanel(false);
                setEditingFeature(null);
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
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {editingFeature && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe what this feature does..."
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Feature is Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Addon Pricing (only for addons) */}
            {editingFeature.feature_type === 'addon' && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Add-On Pricing by Package
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set the monthly price for this add-on when purchased by users on each package tier.
                  Leave unchecked if this add-on is not available for that tier.
                </p>

                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 border rounded-lg ${
                        addonPricing[pkg.id]?.enabled
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={addonPricing[pkg.id]?.enabled || false}
                            onChange={(e) =>
                              setAddonPricing({
                                ...addonPricing,
                                [pkg.id]: {
                                  ...addonPricing[pkg.id],
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{pkg.display_name}</div>
                            <div className="text-sm text-gray-500">
                              Base: {formatPrice(pkg.monthly_price_cents)}/mo
                            </div>
                          </div>
                        </div>

                        {addonPricing[pkg.id]?.enabled && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">$</span>
                            <input
                              type="number"
                              value={(addonPricing[pkg.id]?.price_cents || 0) / 100}
                              onChange={(e) =>
                                setAddonPricing({
                                  ...addonPricing,
                                  [pkg.id]: {
                                    ...addonPricing[pkg.id],
                                    price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                                  },
                                })
                              }
                              step="0.01"
                              min="0"
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
                            />
                            <span className="text-sm text-gray-600">/month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Read-only Info */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Slug:</span>
                  <span className="ml-2 text-gray-900 font-mono">{editingFeature.slug}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 text-gray-900 capitalize">{editingFeature.feature_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 text-gray-900">
                    {featureService.getCategoryDisplayName(editingFeature.category)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Included in:</span>
                  <span className="ml-2 text-gray-900">
                    {editingFeature.included_in_tiers.length} packages
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </SuperAdminLayout>
  );
}
