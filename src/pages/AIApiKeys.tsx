import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Key, Trash2, Eye, EyeOff, DollarSign, TrendingUp, Zap, Settings, Sparkles, ChevronDown, ChevronUp, BarChart3, X, Check } from 'lucide-react';
import { aiApiKeyService, AIApiKey, AILLMProvider, AIFeatureLLMMapping } from '../services/aiApiKeyService';
import { SuperAdminLayout } from '../components/SuperAdminLayout';

type TabType = 'keys' | 'features';

export function AIApiKeys() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('keys');
  const [apiKeys, setApiKeys] = useState<AIApiKey[]>([]);
  const [providers, setProviders] = useState<AILLMProvider[]>([]);
  const [featureMappings, setFeatureMappings] = useState<AIFeatureLLMMapping[]>([]);
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newMonthlyLimit, setNewMonthlyLimit] = useState('');
  const [detectedProvider, setDetectedProvider] = useState('');

  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [featureUsage, setFeatureUsage] = useState<Record<string, any[]>>({});
  const [recommendations, setRecommendations] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (newApiKey) {
      const provider = aiApiKeyService.detectProviderFromKey(newApiKey);
      setDetectedProvider(provider);
    } else {
      setDetectedProvider('');
    }
  }, [newApiKey]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysData, providersData, featuresData, summaryData] = await Promise.all([
        aiApiKeyService.getAllApiKeys(),
        aiApiKeyService.getAllProviders(),
        aiApiKeyService.getAllFeatureMappings(),
        aiApiKeyService.getUsageSummary(),
      ]);
      setApiKeys(keysData);
      setProviders(providersData);
      setFeatureMappings(featuresData);
      setUsageSummary(summaryData);
    } catch (error) {
      console.error('Failed to load AI API data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await aiApiKeyService.createApiKey({
        key_name: newKeyName,
        provider_name: detectedProvider,
        api_key: newApiKey,
        monthly_limit_cents: newMonthlyLimit ? parseFloat(newMonthlyLimit) * 100 : undefined,
      });
      setShowNewKeyForm(false);
      setNewKeyName('');
      setNewApiKey('');
      setNewMonthlyLimit('');
      await loadData();
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await aiApiKeyService.deleteApiKey(keyId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleToggleKeyActive = async (keyId: string, isActive: boolean) => {
    try {
      await aiApiKeyService.updateApiKey(keyId, { is_active: !isActive });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle API key:', error);
    }
  };

  const handleUpdateFeatureMapping = async (
    featureName: string,
    field: string,
    value: string | boolean
  ) => {
    try {
      await aiApiKeyService.updateFeatureMapping(featureName, { [field]: value });
      await loadData();
    } catch (error) {
      console.error('Failed to update feature mapping:', error);
    }
  };

  const getModelsForProvider = (provider: string) => {
    return providers.filter((p) => p.provider_name === provider);
  };

  const handleToggleFeatureDetails = async (featureName: string) => {
    if (expandedFeature === featureName) {
      setExpandedFeature(null);
    } else {
      setExpandedFeature(featureName);
      if (!featureUsage[featureName]) {
        try {
          const usage = await aiApiKeyService.getFeatureUsageBreakdown(featureName, 30);
          setFeatureUsage({ ...featureUsage, [featureName]: usage });
        } catch (error) {
          console.error('Failed to load usage:', error);
        }
      }
    }
  };

  const handleGenerateRecommendation = async (featureName: string) => {
    try {
      const recommendation = await aiApiKeyService.generateLLMRecommendations(featureName);
      setRecommendations({ ...recommendations, [featureName]: recommendation });
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
    }
  };

  const getKeysByProvider = () => {
    const grouped: Record<string, AIApiKey[]> = {};
    apiKeys.forEach((key) => {
      if (!grouped[key.provider_name]) {
        grouped[key.provider_name] = [];
      }
      grouped[key.provider_name].push(key);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <SuperAdminLayout title="AI API Keys" subtitle="Manage LLM providers and feature assignments">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout title="AI API Keys" subtitle="Manage LLM providers and feature assignments">
      <div>
        {usageSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Spent (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {aiApiKeyService.formatCurrency(usageSummary.total_spent_cents)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">API Calls</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {usageSummary.total_calls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <Key className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Keys</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {apiKeys.filter((k) => k.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">AI Features</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {featureMappings.filter((f) => f.is_enabled).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('keys')}
                className={`px-6 py-4 font-semibold border-b-2 transition ${
                  activeTab === 'keys'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                LLM API Keys
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-6 py-4 font-semibold border-b-2 transition ${
                  activeTab === 'features'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Feature Assignments
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'keys' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Keys are stored encrypted. Available models are auto-detected.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewKeyForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add API Key
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Status Indicators</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 flex-shrink-0">Active</span>
                      <span className="text-gray-700">Key is enabled and will be used by the system</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 flex-shrink-0">Inactive</span>
                      <span className="text-gray-700">Key is disabled and will not be used</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 flex-shrink-0">Verified</span>
                      <span className="text-gray-700">Key has been tested and works correctly</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 flex-shrink-0">Pending</span>
                      <span className="text-gray-700">Key verification is in progress or not yet attempted</span>
                    </div>
                  </div>
                </div>

                {showNewKeyForm && (
                  <form
                    onSubmit={handleCreateKey}
                    className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-blue-200"
                  >
                    <h3 className="text-lg font-semibold mb-4">Add New API Key</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Name
                        </label>
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production OpenAI"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={newApiKey}
                          onChange={(e) => setNewApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        {detectedProvider && detectedProvider !== 'unknown' && (
                          <p className="text-sm text-green-600 mt-1">
                            Detected: {aiApiKeyService.getProviderDisplayName(detectedProvider)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Limit (USD)
                        </label>
                        <input
                          type="number"
                          value={newMonthlyLimit}
                          onChange={(e) => setNewMonthlyLimit(e.target.value)}
                          placeholder="100.00"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewKeyForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {Object.entries(getKeysByProvider()).map(([provider, keys]) => (
                  <div key={provider} className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {aiApiKeyService.getProviderDisplayName(provider)}
                    </h3>
                    <div className="space-y-3">
                      {keys.map((key) => (
                        <div
                          key={key.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-gray-900">{key.key_name}</h4>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    key.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                  title={key.is_active ? 'This key is enabled and can be used' : 'This key is disabled and will not be used'}
                                >
                                  {key.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold ${
                                    key.verification_status === 'verified'
                                      ? 'bg-blue-100 text-blue-800'
                                      : key.verification_status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                  title={
                                    key.verification_status === 'verified'
                                      ? 'Key has been verified and works correctly'
                                      : key.verification_status === 'failed'
                                      ? 'Key verification failed - check if the key is valid'
                                      : 'Key verification is pending'
                                  }
                                >
                                  {key.verification_status}
                                </span>
                              </div>
                              <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600">Total Spent</p>
                                    <p className="font-semibold">
                                      {aiApiKeyService.formatCurrency(key.total_spent_cents)}
                                    </p>
                                  </div>
                                  {key.monthly_limit_cents && (
                                    <div>
                                      <p className="text-gray-600">Monthly Limit</p>
                                      <p className="font-semibold">
                                        {aiApiKeyService.formatCurrency(key.monthly_limit_cents)}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-gray-600">Supported Models</p>
                                    <p className="font-semibold">
                                      {getModelsForProvider(key.provider_name).length} available
                                    </p>
                                  </div>
                                </div>
                                {getModelsForProvider(key.provider_name).length > 0 && (
                                  <div className="border-t border-gray-200 pt-3">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Available Models:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {getModelsForProvider(key.provider_name).map((model: any) => (
                                        <span
                                          key={model.id}
                                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
                                          title={`Context: ${(model.context_window / 1000).toFixed(0)}K | Input: $${model.input_price_per_1k_tokens}/1K | Output: $${model.output_price_per_1k_tokens}/1K`}
                                        >
                                          {model.model_name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleToggleKeyActive(key.id, key.is_active)
                                }
                                className={`px-3 py-1 rounded text-sm font-semibold ${
                                  key.is_active
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {key.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => handleDeleteKey(key.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {apiKeys.length === 0 && !showNewKeyForm && (
                  <div className="text-center py-12">
                    <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys</h3>
                    <p className="text-gray-600 mb-4">Add your first LLM API key to get started</p>
                    <button
                      onClick={() => setShowNewKeyForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add API Key
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">AI Feature Assignments</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure which LLM models power each AI feature
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {featureMappings.map((feature) => (
                    <div
                      key={feature.id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        feature.is_enabled
                          ? 'border-blue-200 bg-white shadow-sm hover:shadow-md'
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base truncate">
                            {feature.feature_name.replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {feature.feature_description}
                          </p>
                        </div>
                        <label className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={feature.is_enabled}
                            onChange={(e) =>
                              handleUpdateFeatureMapping(
                                feature.feature_name,
                                'is_enabled',
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-xs font-medium text-gray-700">On</span>
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Primary LLM
                          </label>
                          <div className="space-y-1.5">
                            <select
                              value={feature.selected_provider || ''}
                              onChange={(e) =>
                                handleUpdateFeatureMapping(
                                  feature.feature_name,
                                  'selected_provider',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                            >
                              <option value="">Provider</option>
                              {Array.from(new Set(providers.map((p) => p.provider_name))).map(
                                (prov) => (
                                  <option key={prov} value={prov}>
                                    {aiApiKeyService.getProviderDisplayName(prov)}
                                  </option>
                                )
                              )}
                            </select>
                            <select
                              value={feature.selected_model || ''}
                              onChange={(e) =>
                                handleUpdateFeatureMapping(
                                  feature.feature_name,
                                  'selected_model',
                                  e.target.value
                                )
                              }
                              disabled={!feature.selected_provider}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs disabled:bg-gray-100"
                            >
                              <option value="">Model</option>
                              {feature.selected_provider &&
                                getModelsForProvider(feature.selected_provider).map((model) => (
                                  <option key={model.id} value={model.model_name}>
                                    {model.model_name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Fallback LLM
                          </label>
                          <div className="space-y-1.5">
                            <select
                              value={feature.fallback_provider || ''}
                              onChange={(e) =>
                                handleUpdateFeatureMapping(
                                  feature.feature_name,
                                  'fallback_provider',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs"
                            >
                              <option value="">Provider</option>
                              {Array.from(new Set(providers.map((p) => p.provider_name))).map(
                                (prov) => (
                                  <option key={prov} value={prov}>
                                    {aiApiKeyService.getProviderDisplayName(prov)}
                                  </option>
                                )
                              )}
                            </select>
                            <select
                              value={feature.fallback_model || ''}
                              onChange={(e) =>
                                handleUpdateFeatureMapping(
                                  feature.feature_name,
                                  'fallback_model',
                                  e.target.value
                                )
                              }
                              disabled={!feature.fallback_provider}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs disabled:bg-gray-100"
                            >
                              <option value="">Model</option>
                              {feature.fallback_provider &&
                                getModelsForProvider(feature.fallback_provider).map((model) => (
                                  <option key={model.id} value={model.model_name}>
                                    {model.model_name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {feature.selected_provider && feature.selected_model && (
                          <div className="p-2 bg-blue-50 rounded text-xs">
                            <p className="text-blue-900 font-medium">
                              {aiApiKeyService.getProviderDisplayName(feature.selected_provider)} - {feature.selected_model}
                            </p>
                            {(() => {
                              const model = providers.find(
                                (p) =>
                                  p.provider_name === feature.selected_provider &&
                                  p.model_name === feature.selected_model
                              );
                              return model ? (
                                <p className="text-blue-700 mt-0.5">
                                  ${model.input_price_per_1k_tokens}/1K in • ${model.output_price_per_1k_tokens}/1K out
                                </p>
                              ) : null;
                            })()}
                          </div>
                        )}

                        <div className="flex gap-1.5 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => handleGenerateRecommendation(feature.feature_name)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 text-xs font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Suggest
                          </button>
                          <button
                            onClick={() => handleToggleFeatureDetails(feature.feature_name)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-medium"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Usage
                            {expandedFeature === feature.feature_name ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>

        {expandedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                {expandedFeature.replace(/_/g, ' ').toUpperCase()} - Usage & Cost
              </h3>
              <button
                onClick={() => setExpandedFeature(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {featureUsage[expandedFeature]?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Provider</th>
                        <th className="text-left py-3 px-4 font-semibold">Model</th>
                        <th className="text-right py-3 px-4 font-semibold">Calls</th>
                        <th className="text-right py-3 px-4 font-semibold">Tokens</th>
                        <th className="text-right py-3 px-4 font-semibold">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureUsage[expandedFeature].map((usage: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {new Date(usage.period_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            {aiApiKeyService.getProviderDisplayName(usage.provider_name)}
                          </td>
                          <td className="py-3 px-4">{usage.model_name}</td>
                          <td className="text-right py-3 px-4">
                            {usage.total_calls.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4">
                            {usage.total_tokens.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            {aiApiKeyService.formatCurrency(usage.cost_cents)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-blue-50 border-t-2 border-blue-200">
                        <td colSpan={3} className="py-4 px-4 text-blue-900 text-base">
                          Total (30 days)
                        </td>
                        <td className="text-right py-4 px-4 text-blue-900">
                          {featureUsage[expandedFeature]
                            .reduce((sum: number, u: any) => sum + u.total_calls, 0)
                            .toLocaleString()}
                        </td>
                        <td className="text-right py-4 px-4 text-blue-900">
                          {featureUsage[expandedFeature]
                            .reduce((sum: number, u: any) => sum + u.total_tokens, 0)
                            .toLocaleString()}
                        </td>
                        <td className="text-right py-4 px-4 text-blue-900 text-base">
                          {aiApiKeyService.formatCurrency(
                            featureUsage[expandedFeature].reduce(
                              (sum: number, u: any) => sum + u.cost_cents,
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No usage data available for this feature yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {Object.keys(recommendations).length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-purple-200 bg-white bg-opacity-80">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI Recommendations
              </h3>
              <button
                onClick={() => setRecommendations({})}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {Object.entries(recommendations).map(([featureName, rec]: [string, any]) => (
                <div key={featureName} className="mb-8 last:mb-0">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    {featureName.replace(/_/g, ' ').toUpperCase()}
                  </h4>
                  {rec.all_providers?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {rec.all_providers.slice(0, 3).map((prov: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            handleUpdateFeatureMapping(featureName, 'selected_provider', prov.provider);
                            handleUpdateFeatureMapping(featureName, 'selected_model', prov.model);
                            setRecommendations({});
                          }}
                          className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all text-left group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-gray-900 text-base truncate">
                                  {aiApiKeyService.getProviderDisplayName(prov.provider)}
                                </p>
                                {prov.quality_tier && (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                    prov.quality_tier === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                                    prov.quality_tier === 'balanced' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {prov.quality_tier}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">{prov.model}</p>
                            </div>
                            <span className="ml-2 px-2.5 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full flex-shrink-0">
                              {prov.score}
                            </span>
                          </div>

                          {prov.reasoning && (
                            <div className="mb-3 p-2 bg-purple-50 rounded text-xs text-purple-900 border border-purple-100">
                              {prov.reasoning}
                            </div>
                          )}

                          <div className="text-sm text-gray-700 space-y-2">
                            <div className="flex justify-between">
                              <span>Input:</span>
                              <span className="font-medium">${prov.input_price}/1K</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Output:</span>
                              <span className="font-medium">${prov.output_price}/1K</span>
                            </div>
                            {prov.context_window && (
                              <div className="flex justify-between">
                                <span>Context:</span>
                                <span className="font-medium">
                                  {(prov.context_window / 1000).toFixed(0)}K
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                            {prov.has_key ? (
                              <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-xs">
                                <Check className="w-4 h-4" />
                                You have this
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">API key not configured</span>
                            )}
                            <span className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to apply →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                      <p className="text-gray-600">
                        Add API keys to get personalized recommendations
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </SuperAdminLayout>
  );
}
