import { supabase } from '../lib/supabase';

export interface AIApiKey {
  id: string;
  key_name: string;
  provider_name: string;
  api_key_encrypted: string;
  supported_models: string[];
  is_active: boolean;
  last_verified_at: string | null;
  verification_status: 'pending' | 'verified' | 'failed';
  total_spent_cents: number;
  monthly_limit_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface AILLMProvider {
  id: string;
  provider_name: string;
  model_name: string;
  model_version: string | null;
  input_price_per_1k_tokens: number;
  output_price_per_1k_tokens: number;
  context_window: number | null;
  supports_functions: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
  capabilities: string[];
  is_active: boolean;
}

export interface AIUsageLog {
  id: string;
  api_key_id: string | null;
  provider_name: string;
  model_name: string;
  feature_name: string;
  organization_id: string | null;
  user_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_cents: number;
  success: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface AIFeatureLLMMapping {
  id: string;
  feature_name: string;
  feature_description: string | null;
  selected_provider: string | null;
  selected_model: string | null;
  fallback_provider: string | null;
  fallback_model: string | null;
  recommended_providers: any[];
  requirements: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  period_start: string;
  provider_name: string;
  model_name: string;
  feature_name: string;
  total_calls: number;
  total_tokens: number;
  total_cost_cents: number;
}

export const aiApiKeyService = {
  async getAllApiKeys(): Promise<AIApiKey[]> {
    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createApiKey(keyData: {
    key_name: string;
    provider_name: string;
    api_key: string;
    monthly_limit_cents?: number;
  }): Promise<AIApiKey> {
    const { data, error } = await supabase
      .from('ai_api_keys')
      .insert({
        key_name: keyData.key_name,
        provider_name: keyData.provider_name,
        api_key_encrypted: keyData.api_key,
        monthly_limit_cents: keyData.monthly_limit_cents,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateApiKey(
    keyId: string,
    updates: Partial<{
      key_name: string;
      is_active: boolean;
      monthly_limit_cents: number;
      api_key: string;
    }>
  ): Promise<AIApiKey> {
    const updateData: any = { ...updates };
    if (updates.api_key) {
      updateData.api_key_encrypted = updates.api_key;
      delete updateData.api_key;
    }

    const { data, error } = await supabase
      .from('ai_api_keys')
      .update(updateData)
      .eq('id', keyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_api_keys')
      .delete()
      .eq('id', keyId);

    if (error) throw error;
  },

  async verifyApiKey(keyId: string): Promise<any> {
    const { data, error } = await supabase.rpc('verify_ai_api_key', {
      key_id: keyId,
    });

    if (error) throw error;
    return data;
  },

  async getAllProviders(): Promise<AILLMProvider[]> {
    const { data, error } = await supabase
      .from('ai_llm_providers')
      .select('*')
      .eq('is_active', true)
      .order('provider_name', { ascending: true })
      .order('model_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getUsageStats(
    timePeriod: 'hour' | 'day' | 'week' | 'month' = 'day',
    startDate?: string
  ): Promise<UsageStats[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase.rpc('get_ai_usage_stats', {
      time_period: timePeriod,
      start_date: start,
    });

    if (error) throw error;
    return data || [];
  },

  async getUsageSummary(): Promise<{
    total_spent_cents: number;
    total_calls: number;
    total_tokens: number;
    by_provider: Record<string, number>;
    by_feature: Record<string, number>;
  }> {
    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('provider_name, feature_name, cost_cents, total_tokens')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const summary = {
      total_spent_cents: 0,
      total_calls: logs?.length || 0,
      total_tokens: 0,
      by_provider: {} as Record<string, number>,
      by_feature: {} as Record<string, number>,
    };

    logs?.forEach((log) => {
      summary.total_spent_cents += log.cost_cents || 0;
      summary.total_tokens += log.total_tokens || 0;

      summary.by_provider[log.provider_name] =
        (summary.by_provider[log.provider_name] || 0) + (log.cost_cents || 0);

      summary.by_feature[log.feature_name] =
        (summary.by_feature[log.feature_name] || 0) + (log.cost_cents || 0);
    });

    return summary;
  },

  async getAllFeatureMappings(): Promise<AIFeatureLLMMapping[]> {
    const { data, error } = await supabase
      .from('ai_feature_llm_mappings')
      .select('*')
      .order('feature_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateFeatureMapping(
    featureName: string,
    updates: {
      selected_provider?: string;
      selected_model?: string;
      fallback_provider?: string;
      fallback_model?: string;
      is_enabled?: boolean;
    }
  ): Promise<AIFeatureLLMMapping> {
    const { data, error } = await supabase
      .from('ai_feature_llm_mappings')
      .update(updates)
      .eq('feature_name', featureName)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  detectProviderFromKey(apiKey: string): string {
    if (apiKey.startsWith('sk-ant-')) return 'anthropic';
    if (apiKey.startsWith('sk-')) return 'openai';
    if (apiKey.startsWith('AIza')) return 'google';
    return 'unknown';
  },

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  },

  getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
    };
    return names[provider] || provider;
  },

  async generateLLMRecommendations(featureName: string): Promise<any> {
    const { data, error } = await supabase.rpc('generate_llm_recommendations_for_feature', {
      p_feature_name: featureName,
    });

    if (error) throw error;
    return data;
  },

  async getFeatureUsageBreakdown(
    featureName: string,
    days: number = 30
  ): Promise<{
    period_date: string;
    provider_name: string;
    model_name: string;
    total_calls: number;
    total_tokens: number;
    cost_cents: number;
  }[]> {
    const { data, error } = await supabase.rpc('get_feature_usage_breakdown', {
      p_feature_name: featureName,
      p_days: days,
    });

    if (error) throw error;
    return data || [];
  },
};
