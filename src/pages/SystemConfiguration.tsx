import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemSettingsService, PaymentGatewayConfig } from '../services/systemSettingsService';
import { superAdminService } from '../services/superAdminService';
import { brandingService } from '../services/brandingService';
import { Settings, CreditCard, Key, ToggleLeft, ToggleRight, Save, Check, ArrowLeft, Zap, Mail, Palette } from 'lucide-react';

export function SystemConfiguration() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'gateways' | 'features' | 'branding'>('gateways');

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
      const [config, flags, branding] = await Promise.all([
        systemSettingsService.getPaymentGatewayConfig(),
        systemSettingsService.getFeatureFlags(),
        brandingService.getSystemBranding(),
      ]);
      setGatewayConfig(config);
      setFeatureFlags(flags);
      setSystemBranding({
        application_name: branding.application_name,
        logo_url: branding.logo_url || '/AiRentalTools-logo1t.svg',
        primary_color: branding.primary_color,
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/super-admin')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                title="Back to Super Admin Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <Settings className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">System Configuration</h1>
                <p className="text-blue-100 mt-1">Payment gateways, API keys, and feature toggles</p>
              </div>
            </div>
            {savedMessage && (
              <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-lg">
                <Check size={18} />
                <span>{savedMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
      </div>
    </div>
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
