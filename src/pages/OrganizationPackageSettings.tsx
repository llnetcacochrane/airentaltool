import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, DollarSign, Home, Users, Save, X, ArrowLeft } from 'lucide-react';
import {
  packageTierService,
  PackageTier,
  OrganizationPackageSettings as OrgPackageSettings,
} from '../services/packageTierService';
import { superAdminService } from '../services/superAdminService';
import { useAuth } from '../context/AuthContext';

export function OrganizationPackageSettings() {
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();
  const { isSuperAdmin } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [packages, setPackages] = useState<PackageTier[]>([]);
  const [currentSettings, setCurrentSettings] = useState<OrgPackageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<OrgPackageSettings>>({});

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }
    if (organizationId) {
      loadData();
    }
  }, [isSuperAdmin, organizationId]);

  const loadData = async () => {
    if (!organizationId) return;

    try {
      const [orgs, pkgs, settings] = await Promise.all([
        superAdminService.getAllOrganizations(),
        packageTierService.getAllPackageTiers(),
        packageTierService.getOrganizationPackageSettings(organizationId),
      ]);

      const org = orgs.find((o: any) => o.org_id === organizationId);
      setOrganization(org);
      setPackages(pkgs);
      setCurrentSettings(settings);

      if (settings) {
        setFormData(settings);
      } else {
        setFormData({
          organization_id: organizationId,
          package_tier_id: pkgs[0]?.id,
          package_version: 1,
          billing_cycle: 'monthly',
          has_custom_pricing: false,
          has_custom_limits: false,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      await packageTierService.setOrganizationPackageSettings(organizationId, formData);
      alert('Package settings saved successfully');
      navigate('/super-admin');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save package settings');
    }
  };

  const formatPrice = (cents: number | null | undefined) => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const selectedPackage = packages.find((p) => p.id === formData.package_tier_id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/super-admin')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Organization Package Settings</h1>
                <p className="text-sm text-gray-600">{organization?.org_name}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/super-admin')}
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
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Base Package</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Package Tier
              </label>
              <select
                value={formData.package_tier_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    package_tier_id: e.target.value,
                    package_version: packages.find((p) => p.id === e.target.value)?.version || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.display_name} - {formatPrice(pkg.monthly_price_cents)}/mo
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
              <select
                value={formData.billing_cycle || 'monthly'}
                onChange={(e) =>
                  setFormData({ ...formData, billing_cycle: e.target.value as 'monthly' | 'annual' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            {selectedPackage && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Base Package Limits</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Properties:</span>{' '}
                    <span className="font-semibold">{selectedPackage.max_properties}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tenants:</span>{' '}
                    <span className="font-semibold">{selectedPackage.max_tenants}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Users:</span>{' '}
                    <span className="font-semibold">{selectedPackage.max_users}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly:</span>{' '}
                    <span className="font-semibold">
                      {formatPrice(selectedPackage.monthly_price_cents)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Custom Pricing Overrides</h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_custom_pricing || false}
                onChange={(e) =>
                  setFormData({ ...formData, has_custom_pricing: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable Custom Pricing</span>
            </label>
          </div>

          {formData.has_custom_pricing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Monthly Price (cents)
                  </label>
                  <input
                    type="number"
                    value={formData.custom_monthly_price_cents || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_monthly_price_cents: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formatPrice(formData.custom_monthly_price_cents)}/month
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Annual Price (cents)
                  </label>
                  <input
                    type="number"
                    value={formData.custom_annual_price_cents || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_annual_price_cents: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formatPrice(formData.custom_annual_price_cents)}/year
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Custom Limit Overrides</h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.has_custom_limits || false}
                onChange={(e) => setFormData({ ...formData, has_custom_limits: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable Custom Limits</span>
            </label>
          </div>

          {formData.has_custom_limits && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Max Properties
                  </label>
                  <input
                    type="number"
                    value={formData.custom_max_properties || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_max_properties: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Max Tenants
                  </label>
                  <input
                    type="number"
                    value={formData.custom_max_tenants || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_max_tenants: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Max Users
                  </label>
                  <input
                    type="number"
                    value={formData.custom_max_users || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_max_users: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Max Payment Methods
                  </label>
                  <input
                    type="number"
                    value={formData.custom_max_payment_methods || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_max_payment_methods: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use package default"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Notes</h2>
          <textarea
            value={formData.override_notes || ''}
            onChange={(e) => setFormData({ ...formData, override_notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add notes about why these custom settings were applied..."
          />
        </div>
      </div>
    </div>
  );
}
