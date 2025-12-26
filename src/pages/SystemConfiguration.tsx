import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemSettingsService, PaymentGatewayConfig } from '../services/systemSettingsService';
import { superAdminService } from '../services/superAdminService';
import { brandingService } from '../services/brandingService';
import { systemConfigService } from '../services/systemConfigService';
import { Settings, CreditCard, Key, ToggleLeft, ToggleRight, Save, Check, Zap, Mail, Palette, BarChart3 } from 'lucide-react';
import { SuperAdminLayout } from '../components/SuperAdminLayout';

export function SystemConfiguration() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'gateways' | 'features' | 'branding' | 'analytics'>('gateways');

  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>({
    stripe: { enabled: false },
    square: { enabled: false },
    paypal: { enabled: false },
  });

  const [stripeKeys, setStripeKeys] = useState({ publishable_key: '', secret_key: '' });
  const [squareKeys, setSquareKeys] = useState({ application_id: '', access_token: '', location_id: '' });
  const [paypalKeys, setPaypalKeys] = useState({ client_id: '', client_secret: '' });
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [systemBranding, setSystemBranding] = useState({
    application_name: 'AI Rental Tools',
    logo_url: '/AiRentalTools-logo1t.svg',
    primary_color: '#2563eb',
  });
  const [analyticsConfig, setAnalyticsConfig] = useState({
    ga_tracking_id: '',
    analytics_enabled: 'true',
    site_name: 'AI Rental Tools',
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const isSuperAdmin = await superAdminService.isSuperAdmin();
      if (!isSuperAdmin) {
        navigate('/dashboard');
        return;
      }

      setIsAuthorized(true);
      await loadData();
    } catch (error) {
      console.error('Access check failed:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [config, flags, branding, analyticsConf] = await Promise.all([
        systemSettingsService.getPaymentGatewayConfig(),
        systemSettingsService.getFeatureFlags(),
        brandingService.getSystemBranding(),
        systemConfigService.getConfigs(['ga_tracking_id', 'analytics_enabled', 'site_name']),
      ]);
      setGatewayConfig(config);
      setFeatureFlags(flags);
      setSystemBranding({
        application_name: branding.application_name,
        logo_url: branding.logo_url || '/AiRentalTools-logo1t.svg',
        primary_color: branding.primary_color,
      });
      setAnalyticsConfig({
        ga_tracking_id: analyticsConf.ga_tracking_id || '',
        analytics_enabled: analyticsConf.analytics_enabled || 'true',
        site_name: analyticsConf.site_name || 'AI Rental Tools',
      });
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleToggleGateway = async (gateway: 'stripe' | 'square' | 'paypal') => {
    try {
      const newValue = !gatewayConfig[gateway].enabled;
      await systemSettingsService.updateSetting(`${gateway}_enabled`, newValue ? 'true' : 'false');
      setGatewayConfig({
        ...gatewayConfig,
        [gateway]: { ...gatewayConfig[gateway], enabled: newValue },
      });
      showSavedMessage();
    } catch (error) {
      console.error('Failed to toggle gateway:', error);
    }
  };

  const handleSaveKeys = async (gateway: 'stripe' | 'square' | 'paypal') => {
    setIsSaving(true);
    try {
      let keys: Record<string, string> = {};
      if (gateway === 'stripe') keys = stripeKeys;
      else if (gateway === 'square') keys = squareKeys;
      else if (gateway === 'paypal') keys = paypalKeys;

      await systemSettingsService.savePaymentGatewayKeys(gateway, keys);
      showSavedMessage();

      if (gateway === 'stripe') setStripeKeys({ publishable_key: '', secret_key: '' });
      else if (gateway === 'square') setSquareKeys({ application_id: '', access_token: '', location_id: '' });
      else if (gateway === 'paypal') setPaypalKeys({ client_id: '', client_secret: '' });
    } catch (error) {
      console.error('Failed to save keys:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFeature = async (key: string) => {
    try {
      const newValue = !featureFlags[key];
      await systemSettingsService.toggleFeatureFlag(key, newValue);
      setFeatureFlags({ ...featureFlags, [key]: newValue });
      showSavedMessage();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      await brandingService.updateSystemBranding(systemBranding);
      showSavedMessage();
    } catch (error) {
      console.error('Failed to save branding:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnalytics = async () => {
    setIsSaving(true);
    try {
      await systemConfigService.updateConfigs(analyticsConfig);
      showSavedMessage();
      // Reload the page to reinitialize analytics with new config
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to save analytics config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const showSavedMessage = () => {
    setSavedMessage('Changes saved successfully');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading configuration...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const actionButton = savedMessage ? (
    <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-lg">
      <Check size={18} />
      <span>{savedMessage}</span>
    </div>
  ) : null;

  return (
    <SuperAdminLayout
      title="System Configuration"
      subtitle="Payment gateways, API keys, and feature toggles"
      actionButton={actionButton || undefined}
    >
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('gateways')}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === 'gateways'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={18} />
                  Payment Gateways
                </div>
              </button>
              <button
                onClick={() => navigate('/super-admin/ai-keys')}
                className="px-6 py-4 font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                <div className="flex items-center gap-2">
                  <Zap size={18} />
                  AI API Keys
                </div>
              </button>
              <button
                onClick={() => navigate('/super-admin/email-diagnostics')}
                className="px-6 py-4 font-semibold text-gray-600 hover:text-gray-900 transition"
              >
                <div className="flex items-center gap-2">
                  <Mail size={18} />
                  Email System
                </div>
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === 'features'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ToggleLeft size={18} />
                  Feature Flags
                </div>
              </button>
              <button
                onClick={() => setActiveTab('branding')}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === 'branding'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Palette size={18} />
                  System Branding
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} />
                  Analytics
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'gateways' && (
              <div className="space-y-6">
                <GatewayCard
                  title="Stripe"
                  description="Accept credit cards and ACH payments"
                  enabled={gatewayConfig.stripe.enabled}
                  onToggle={() => handleToggleGateway('stripe')}
                  keys={stripeKeys}
                  onKeysChange={setStripeKeys}
                  onSave={() => handleSaveKeys('stripe')}
                  isSaving={isSaving}
                  fields={[
                    { key: 'publishable_key', label: 'Publishable Key', type: 'text' },
                    { key: 'secret_key', label: 'Secret Key', type: 'password' },
                  ]}
                />

                <GatewayCard
                  title="Square"
                  description="Point of sale and online payments"
                  enabled={gatewayConfig.square.enabled}
                  onToggle={() => handleToggleGateway('square')}
                  keys={squareKeys}
                  onKeysChange={setSquareKeys}
                  onSave={() => handleSaveKeys('square')}
                  isSaving={isSaving}
                  fields={[
                    { key: 'application_id', label: 'Application ID', type: 'text' },
                    { key: 'access_token', label: 'Access Token', type: 'password' },
                    { key: 'location_id', label: 'Location ID', type: 'text' },
                  ]}
                />

                <GatewayCard
                  title="PayPal"
                  description="Global payment solution"
                  enabled={gatewayConfig.paypal.enabled}
                  onToggle={() => handleToggleGateway('paypal')}
                  keys={paypalKeys}
                  onKeysChange={setPaypalKeys}
                  onSave={() => handleSaveKeys('paypal')}
                  isSaving={isSaving}
                  fields={[
                    { key: 'client_id', label: 'Client ID', type: 'text' },
                    { key: 'client_secret', label: 'Client Secret', type: 'password' },
                  ]}
                />
              </div>
            )}


            {activeTab === 'features' && (
              <div className="space-y-4">
                {Object.entries(featureFlags).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">{formatFeatureName(key)}</div>
                      <div className="text-sm text-gray-600">Enable or disable this feature system-wide</div>
                    </div>
                    <button
                      onClick={() => handleToggleFeature(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      {enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Default System Branding</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    These are the default branding settings shown to all organizations unless they have white label branding enabled.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Application Name
                      </label>
                      <input
                        type="text"
                        value={systemBranding.application_name}
                        onChange={(e) => setSystemBranding({ ...systemBranding, application_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Logo URL
                      </label>
                      <input
                        type="url"
                        value={systemBranding.logo_url}
                        onChange={(e) => setSystemBranding({ ...systemBranding, logo_url: e.target.value })}
                        placeholder="/AiRentalTools-logo1t.svg"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={systemBranding.primary_color}
                          onChange={(e) => setSystemBranding({ ...systemBranding, primary_color: e.target.value })}
                          className="h-10 w-20 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={systemBranding.primary_color}
                          onChange={(e) => setSystemBranding({ ...systemBranding, primary_color: e.target.value })}
                          placeholder="#2563eb"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={systemBranding.logo_url}
                            alt="Logo preview"
                            className="h-8"
                            onError={(e) => { e.currentTarget.src = '/AiRentalTools-logo1t.svg'; }}
                          />
                          <span className="font-bold text-xl text-gray-900">
                            {systemBranding.application_name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            style={{ backgroundColor: systemBranding.primary_color }}
                            className="px-4 py-2 text-white rounded-lg font-medium"
                          >
                            Primary Button
                          </button>
                          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium">
                            Secondary Button
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveBranding}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save System Branding'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Configuration</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure Google Analytics 4 tracking for this deployment. Perfect for white-label installations that need custom analytics tracking.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-900 mb-2">How to Set Up Google Analytics 4</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline">analytics.google.com</a> and create a new property</li>
                      <li>Select "Web" as the platform</li>
                      <li>Copy your Measurement ID (format: G-XXXXXXXXXX)</li>
                      <li>Paste it below and save</li>
                      <li>Analytics will be automatically initialized across the entire platform</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Google Analytics Measurement ID
                      </label>
                      <input
                        type="text"
                        value={analyticsConfig.ga_tracking_id}
                        onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, ga_tracking_id: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to disable Google Analytics tracking
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Site Name (for Analytics)
                      </label>
                      <input
                        type="text"
                        value={analyticsConfig.site_name}
                        onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, site_name: e.target.value })}
                        placeholder="AI Rental Tools"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used for identifying this deployment in analytics reports
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="analytics_enabled"
                        checked={analyticsConfig.analytics_enabled === 'true'}
                        onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, analytics_enabled: e.target.checked ? 'true' : 'false' })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="analytics_enabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Enable analytics tracking globally
                      </label>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2">Privacy & Compliance</h4>
                      <p className="text-sm text-amber-800">
                        This platform respects Do Not Track (DNT) browser settings and sanitizes personally identifiable information (PII) before sending to analytics.
                        Users can also disable analytics in their browser preferences.
                      </p>
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveAnalytics}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <Save size={18} />
                        {isSaving ? 'Saving...' : 'Save Analytics Configuration'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Important Notes</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Payment gateway changes affect all organizations</li>
            <li>• API keys are encrypted and stored securely</li>
            <li>• Test your payment integrations in sandbox mode first</li>
            <li>• Feature flags can be toggled instantly without restart</li>
            <li>• All changes are logged for security audit purposes</li>
          </ul>
        </div>
    </SuperAdminLayout>
  );
}

function GatewayCard({
  title,
  description,
  enabled,
  onToggle,
  keys,
  onKeysChange,
  onSave,
  isSaving,
  fields,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  keys: Record<string, string>;
  onKeysChange: (keys: Record<string, string>) => void;
  onSave: () => void;
  isSaving: boolean;
  fields: Array<{ key: string; label: string; type: string }>;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold ${
            enabled
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {enabled && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={keys[field.key] || ''}
                  onChange={(e) => onKeysChange({ ...keys, [field.key]: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save API Keys'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFeatureName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
