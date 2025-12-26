import { supabase } from '../lib/supabase';

export interface SystemConfig {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  updated_by: string | null;
}

export const systemConfigService = {
  /**
   * Get a system configuration value by key
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('value')
        .eq('key', key)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      return data?.value || null;
    } catch (error) {
      console.error('Failed to get system config:', error);
      return null;
    }
  },

  /**
   * Get multiple configuration values
   */
  async getConfigs(keys: string[]): Promise<Record<string, string | null>> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('key, value')
        .in('key', keys)
        .eq('is_public', true);

      if (error) throw error;

      const configs: Record<string, string | null> = {};
      (data || []).forEach((config) => {
        configs[config.key] = config.value;
      });

      return configs;
    } catch (error) {
      console.error('Failed to get system configs:', error);
      return {};
    }
  },

  /**
   * Get all public configuration
   */
  async getAllPublicConfig(): Promise<SystemConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('*')
        .eq('is_public', true)
        .order('key');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get all public configs:', error);
      return [];
    }
  },

  /**
   * Get all configuration (super admin only)
   */
  async getAllConfig(): Promise<SystemConfig[]> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('*')
        .order('key');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get all configs:', error);
      return [];
    }
  },

  /**
   * Update a system configuration value (super admin only)
   */
  async updateConfig(key: string, value: string): Promise<void> {
    try {
      // First try to update
      const { data: existing } = await supabase
        .from('system_configuration')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_configuration')
          .update({
            value,
            updated_at: new Date().toISOString(),
          })
          .eq('key', key);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_configuration')
          .insert({
            key,
            value,
            is_public: true,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to update system config:', error);
      throw error;
    }
  },

  /**
   * Update multiple configuration values (super admin only)
   */
  async updateConfigs(configs: Record<string, string>): Promise<void> {
    try {
      const promises = Object.entries(configs).map(([key, value]) =>
        this.updateConfig(key, value)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to update system configs:', error);
      throw error;
    }
  },

  /**
   * Create a new configuration entry (super admin only)
   */
  async createConfig(
    key: string,
    value: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<void> {
    try {
      const { error } = await supabase.from('system_configuration').insert({
        key,
        value,
        description,
        is_public: isPublic,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to create system config:', error);
      throw error;
    }
  },

  /**
   * Delete a configuration entry (super admin only)
   */
  async deleteConfig(key: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_configuration')
        .delete()
        .eq('key', key);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete system config:', error);
      throw error;
    }
  },

  /**
   * Get Google Analytics tracking ID
   */
  async getGATrackingId(): Promise<string | null> {
    return this.getConfig('ga_tracking_id');
  },

  /**
   * Check if analytics is enabled globally
   */
  async isAnalyticsEnabled(): Promise<boolean> {
    const enabled = await this.getConfig('analytics_enabled');
    return enabled === 'true';
  },

  /**
   * Get site name
   */
  async getSiteName(): Promise<string> {
    const name = await this.getConfig('site_name');
    return name || 'AI Rental Tools';
  },
};
