import { supabase } from '../lib/supabase';
import { aiApiKeyService } from './aiApiKeyService';

export interface AIPromptOptions {
  featureName: string;
  organizationId: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider: string;
  model: string;
}

class AIService {
  private async getActiveKeyForFeature(featureName: string, organizationId: string) {
    const mapping = await aiApiKeyService.getFeatureMapping(featureName);

    if (!mapping || !mapping.assigned_key_id) {
      throw new Error(`No AI API key assigned for feature: ${featureName}`);
    }

    const apiKey = await aiApiKeyService.getApiKey(mapping.assigned_key_id);

    if (!apiKey || !apiKey.is_active) {
      throw new Error(`API key for feature ${featureName} is not active`);
    }

    return apiKey;
  }

  private async callOpenAI(apiKey: string, model: string, messages: any[], options: any): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      provider: 'openai',
      model: data.model,
    };
  }

  private async callAnthropic(apiKey: string, model: string, messages: any[], options: any): Promise<AIResponse> {
    const systemMessage = messages.find((m: any) => m.role === 'system');
    const userMessages = messages.filter((m: any) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        system: systemMessage?.content || '',
        messages: userMessages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      provider: 'anthropic',
      model: data.model,
    };
  }

  private async callGroq(apiKey: string, model: string, messages: any[], options: any): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama3-70b-8192',
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      provider: 'groq',
      model: data.model,
    };
  }

  async generateCompletion(options: AIPromptOptions): Promise<AIResponse> {
    const apiKeyConfig = await this.getActiveKeyForFeature(options.featureName, options.organizationId);

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.userPrompt });

    let response: AIResponse;

    switch (apiKeyConfig.provider_name.toLowerCase()) {
      case 'openai':
        response = await this.callOpenAI(
          apiKeyConfig.api_key,
          apiKeyConfig.model_name || 'gpt-4o-mini',
          messages,
          options
        );
        break;

      case 'anthropic':
        response = await this.callAnthropic(
          apiKeyConfig.api_key,
          apiKeyConfig.model_name || 'claude-3-haiku-20240307',
          messages,
          options
        );
        break;

      case 'groq':
        response = await this.callGroq(
          apiKeyConfig.api_key,
          apiKeyConfig.model_name || 'llama3-70b-8192',
          messages,
          options
        );
        break;

      default:
        throw new Error(`Unsupported provider: ${apiKeyConfig.provider_name}`);
    }

    await this.trackUsage(
      apiKeyConfig.id,
      options.featureName,
      response.usage?.prompt_tokens || 0,
      response.usage?.completion_tokens || 0,
      response.usage?.total_tokens || 0
    );

    return response;
  }

  private async trackUsage(
    keyId: string,
    featureName: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  ): Promise<void> {
    await aiApiKeyService.trackUsage(keyId, {
      feature_name: featureName,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    });
  }

  async isFeatureAvailable(featureName: string, organizationId: string): Promise<boolean> {
    try {
      await this.getActiveKeyForFeature(featureName, organizationId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the configured provider and model for a specific feature
   */
  private async getFeatureConfig(featureName: string): Promise<{
    provider: string;
    model: string;
    apiKey: string;
  }> {
    // Get the feature mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('ai_feature_llm_mappings')
      .select('*')
      .eq('feature_name', featureName)
      .eq('is_enabled', true)
      .single();

    if (mappingError || !mapping) {
      throw new Error(`AI feature "${featureName}" is not configured or is disabled. Please configure it in Super Admin > AI API Keys.`);
    }

    if (!mapping.selected_provider || !mapping.selected_model) {
      throw new Error(`No provider/model selected for feature "${featureName}". Please configure it in Super Admin > AI API Keys.`);
    }

    // Get the API key for the selected provider
    const { data: apiKeyRecord, error: keyError } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('provider_name', mapping.selected_provider)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (keyError || !apiKeyRecord) {
      // Try fallback provider if configured
      if (mapping.fallback_provider && mapping.fallback_model) {
        const { data: fallbackKey, error: fallbackError } = await supabase
          .from('ai_api_keys')
          .select('*')
          .eq('provider_name', mapping.fallback_provider)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!fallbackError && fallbackKey) {
          return {
            provider: mapping.fallback_provider,
            model: mapping.fallback_model,
            apiKey: fallbackKey.api_key_encrypted,
          };
        }
      }

      throw new Error(`No active API key found for provider "${mapping.selected_provider}". Please add an API key in Super Admin > AI API Keys.`);
    }

    return {
      provider: mapping.selected_provider,
      model: mapping.selected_model,
      apiKey: apiKeyRecord.api_key_encrypted,
    };
  }

  /**
   * Generate text using the configured AI for a specific feature
   * @param featureName - The feature name from ai_feature_llm_mappings (e.g., 'document_generation', 'tenant_screening')
   * @param options - The prompt and generation options
   */
  async generateForFeature(
    featureName: string,
    options: {
      prompt: string;
      systemPrompt?: string;
      max_tokens?: number;
      temperature?: number;
    }
  ): Promise<{ text: string; model: string; provider: string }> {
    const config = await this.getFeatureConfig(featureName);

    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    let response: AIResponse;
    const callOptions = {
      maxTokens: options.max_tokens || 3000,
      temperature: options.temperature || 0.7,
    };

    switch (config.provider.toLowerCase()) {
      case 'openai':
        response = await this.callOpenAI(config.apiKey, config.model, messages, callOptions);
        break;

      case 'anthropic':
        response = await this.callAnthropic(config.apiKey, config.model, messages, callOptions);
        break;

      case 'groq':
        response = await this.callGroq(config.apiKey, config.model, messages, callOptions);
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Log usage
    await this.logUsage(featureName, config.provider, config.model, response.usage);

    return {
      text: response.content,
      model: response.model,
      provider: response.provider,
    };
  }

  /**
   * Log AI usage for tracking
   */
  private async logUsage(
    featureName: string,
    provider: string,
    model: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      await supabase.from('ai_usage_logs').insert({
        provider_name: provider,
        model_name: model,
        feature_name: featureName,
        user_id: user?.id,
        prompt_tokens: usage?.prompt_tokens || 0,
        completion_tokens: usage?.completion_tokens || 0,
        total_tokens: usage?.total_tokens || 0,
        success: true,
      });
    } catch (error) {
      console.warn('Failed to log AI usage:', error);
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   * Maps context to feature names and calls generateForFeature
   */
  async generateText(options: {
    prompt: string;
    context?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<{ text: string; model?: string }> {
    // Map context to feature name
    const contextToFeature: Record<string, string> = {
      'lease_agreement': 'document_generation',
      'document': 'document_generation',
      'email': 'email_responses',
      'tenant_screening': 'tenant_screening',
      'rent_optimization': 'rent_optimization',
      'maintenance': 'maintenance_categorization',
      'financial': 'financial_insights',
      'lease_renewal': 'lease_renewal_recommendations',
    };

    const featureName = contextToFeature[options.context || ''] || 'document_generation';

    const result = await this.generateForFeature(featureName, {
      prompt: options.prompt,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
    });

    return {
      text: result.text,
      model: result.model,
    };
  }
}

export const aiService = new AIService();
