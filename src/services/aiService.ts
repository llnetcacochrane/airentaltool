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
}

export const aiService = new AIService();
