import { supabase } from '../lib/supabase';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: 'payment_gateway' | 'api_key' | 'feature_flag' | 'config';
  is_encrypted: boolean;
  description: string | null;
  updated_at: string;
  created_at: string;
}

export interface PaymentGatewayConfig {
  stripe: {
    enabled: boolean;
    publishable_key?: string;
    secret_key?: string;
  };
  square: {
    enabled: boolean;
    application_id?: string;
    access_token?: string;
    location_id?: string;
  };
  paypal: {
    enabled: boolean;
    client_id?: string;
    client_secret?: string;
  };
}

export const systemSettingsService = {
  async getAllSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_type', { ascending: true })
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getSetting(key: string): Promise<SystemSetting | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key',
      });

    if (error) throw error;
  },

  async getPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_type', 'payment_gateway');

    if (error) throw error;

    const config: PaymentGatewayConfig = {
      stripe: { enabled: false },
      square: { enabled: false },
      paypal: { enabled: false },
    };

    data?.forEach((setting) => {
      if (setting.setting_key === 'stripe_enabled') {
        config.stripe.enabled = setting.setting_value === 'true';
      } else if (setting.setting_key === 'square_enabled') {
        config.square.enabled = setting.setting_value === 'true';
      } else if (setting.setting_key === 'paypal_enabled') {
        config.paypal.enabled = setting.setting_value === 'true';
      }
    });

    return config;
  },

  async savePaymentGatewayKeys(gateway: 'stripe' | 'square' | 'paypal', keys: Record<string, string>): Promise<void> {
    const updates: any[] = [];

    if (gateway === 'stripe') {
      if (keys.publishable_key) {
        updates.push({
          setting_key: 'stripe_publishable_key',
          setting_value: keys.publishable_key,
          setting_type: 'api_key',
          is_encrypted: true,
          description: 'Stripe Publishable Key',
        });
      }
      if (keys.secret_key) {
        updates.push({
          setting_key: 'stripe_secret_key',
          setting_value: keys.secret_key,
          setting_type: 'api_key',
          is_encrypted: true,
          description: 'Stripe Secret Key',
        });
      }
    } else if (gateway === 'square') {
      if (keys.application_id) {
        updates.push({
          setting_key: 'square_application_id',
          setting_value: keys.application_id,
          setting_type: 'api_key',
          is_encrypted: false,
          description: 'Square Application ID',
        });
      }
      if (keys.access_token) {
        updates.push({
          setting_key: 'square_access_token',
          setting_value: keys.access_token,
          setting_type: 'api_key',
          is_encrypted: true,
          description: 'Square Access Token',
        });
      }
      if (keys.location_id) {
        updates.push({
          setting_key: 'square_location_id',
          setting_value: keys.location_id,
          setting_type: 'api_key',
          is_encrypted: false,
          description: 'Square Location ID',
        });
      }
    } else if (gateway === 'paypal') {
      if (keys.client_id) {
        updates.push({
          setting_key: 'paypal_client_id',
          setting_value: keys.client_id,
          setting_type: 'api_key',
          is_encrypted: false,
          description: 'PayPal Client ID',
        });
      }
      if (keys.client_secret) {
        updates.push({
          setting_key: 'paypal_client_secret',
          setting_value: keys.client_secret,
          setting_type: 'api_key',
          is_encrypted: true,
          description: 'PayPal Client Secret',
        });
      }
    }

    for (const update of updates) {
      await supabase
        .from('system_settings')
        .upsert(update, { onConflict: 'setting_key' });
    }
  },

  async getAPIKeys(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_type', 'api_key');

    if (error) throw error;

    const keys: Record<string, any> = {};
    data?.forEach((setting) => {
      keys[setting.setting_key] = {
        value: setting.is_encrypted ? '••••••••' : setting.setting_value,
        description: setting.description,
        is_encrypted: setting.is_encrypted,
      };
    });

    return keys;
  },

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_type', 'feature_flag');

    if (error) throw error;

    const flags: Record<string, boolean> = {};
    data?.forEach((setting) => {
      flags[setting.setting_key] = setting.setting_value === 'true';
    });

    return flags;
  },

  async toggleFeatureFlag(key: string, enabled: boolean): Promise<void> {
    await this.updateSetting(key, enabled ? 'true' : 'false');
  },
};
