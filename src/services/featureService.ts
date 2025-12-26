import { supabase } from '../lib/supabase';

export interface Feature {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  feature_type: 'feature' | 'addon';
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TierIncludedFeature {
  id: string;
  tier_id: string;
  feature_id: string;
  created_at: string;
}

export interface TierAvailableAddon {
  id: string;
  tier_id: string;
  feature_id: string;
  addon_price_cents: number;
  billing_period: 'monthly' | 'yearly' | 'one_time' | 'usage';
  created_at: string;
  updated_at: string;
}

export interface FeatureWithTierConfig extends Feature {
  included_in_tiers: string[];
  addon_config: {
    tier_id: string;
    addon_price_cents: number;
    billing_period: string;
  }[];
}

export const featureService = {
  /**
   * Get all features (admin view)
   */
  async getAllFeatures(): Promise<Feature[]> {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get active features only
   */
  async getActiveFeatures(): Promise<Feature[]> {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get features by type
   */
  async getFeaturesByType(featureType: 'feature' | 'addon'): Promise<Feature[]> {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('feature_type', featureType)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get features by category
   */
  async getFeaturesByCategory(category: string): Promise<Feature[]> {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update a feature (admin only - can edit name, description, is_active)
   */
  async updateFeature(id: string, updates: Partial<Pick<Feature, 'name' | 'description' | 'is_active'>>): Promise<Feature> {
    const { data, error } = await supabase
      .from('features')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get features included in a tier
   */
  async getTierIncludedFeatures(tierId: string): Promise<Feature[]> {
    const { data, error } = await supabase
      .from('tier_included_features')
      .select('feature:features(*)')
      .eq('tier_id', tierId);

    if (error) throw error;
    return (data || []).map(d => d.feature as unknown as Feature);
  },

  /**
   * Get addons available for a tier with pricing
   */
  async getTierAvailableAddons(tierId: string): Promise<(Feature & { addon_price_cents: number; billing_period: string })[]> {
    const { data, error } = await supabase
      .from('tier_available_addons')
      .select('addon_price_cents, billing_period, feature:features(*)')
      .eq('tier_id', tierId);

    if (error) throw error;
    return (data || []).map(d => ({
      ...(d.feature as unknown as Feature),
      addon_price_cents: d.addon_price_cents,
      billing_period: d.billing_period,
    }));
  },

  /**
   * Set which features are included in a tier
   */
  async setTierIncludedFeatures(tierId: string, featureIds: string[]): Promise<void> {
    // Delete existing
    const { error: deleteError } = await supabase
      .from('tier_included_features')
      .delete()
      .eq('tier_id', tierId);

    if (deleteError) throw deleteError;

    // Insert new
    if (featureIds.length > 0) {
      const { error: insertError } = await supabase
        .from('tier_included_features')
        .insert(featureIds.map(featureId => ({
          tier_id: tierId,
          feature_id: featureId,
        })));

      if (insertError) throw insertError;
    }
  },

  /**
   * Set which addons are available for a tier with pricing
   */
  async setTierAvailableAddons(
    tierId: string,
    addons: { feature_id: string; addon_price_cents: number; billing_period: string }[]
  ): Promise<void> {
    // Delete existing
    const { error: deleteError } = await supabase
      .from('tier_available_addons')
      .delete()
      .eq('tier_id', tierId);

    if (deleteError) throw deleteError;

    // Insert new
    if (addons.length > 0) {
      const { error: insertError } = await supabase
        .from('tier_available_addons')
        .insert(addons.map(addon => ({
          tier_id: tierId,
          feature_id: addon.feature_id,
          addon_price_cents: addon.addon_price_cents,
          billing_period: addon.billing_period,
        })));

      if (insertError) throw insertError;
    }
  },

  /**
   * Update addon pricing for a specific tier
   */
  async updateTierAddonPricing(
    tierId: string,
    featureId: string,
    priceCents: number,
    billingPeriod: string = 'monthly'
  ): Promise<void> {
    const { error } = await supabase
      .from('tier_available_addons')
      .upsert({
        tier_id: tierId,
        feature_id: featureId,
        addon_price_cents: priceCents,
        billing_period: billingPeriod,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tier_id,feature_id',
      });

    if (error) throw error;
  },

  /**
   * Remove addon availability from a tier
   */
  async removeTierAddon(tierId: string, featureId: string): Promise<void> {
    const { error } = await supabase
      .from('tier_available_addons')
      .delete()
      .eq('tier_id', tierId)
      .eq('feature_id', featureId);

    if (error) throw error;
  },

  /**
   * Get complete feature configuration with tier info
   */
  async getFeatureWithTierConfig(featureId: string): Promise<FeatureWithTierConfig | null> {
    const { data: feature, error: featureError } = await supabase
      .from('features')
      .select('*')
      .eq('id', featureId)
      .single();

    if (featureError) throw featureError;
    if (!feature) return null;

    // Get tiers that include this feature
    const { data: included, error: includedError } = await supabase
      .from('tier_included_features')
      .select('tier_id')
      .eq('feature_id', featureId);

    if (includedError) throw includedError;

    // Get addon pricing per tier
    const { data: addons, error: addonsError } = await supabase
      .from('tier_available_addons')
      .select('tier_id, addon_price_cents, billing_period')
      .eq('feature_id', featureId);

    if (addonsError) throw addonsError;

    return {
      ...feature,
      included_in_tiers: (included || []).map(i => i.tier_id),
      addon_config: (addons || []).map(a => ({
        tier_id: a.tier_id,
        addon_price_cents: a.addon_price_cents,
        billing_period: a.billing_period,
      })),
    };
  },

  /**
   * Get all features with their complete tier configurations
   */
  async getAllFeaturesWithTierConfig(): Promise<FeatureWithTierConfig[]> {
    const features = await this.getAllFeatures();

    // Batch get included features
    const { data: allIncluded } = await supabase
      .from('tier_included_features')
      .select('tier_id, feature_id');

    // Batch get addon configs
    const { data: allAddons } = await supabase
      .from('tier_available_addons')
      .select('tier_id, feature_id, addon_price_cents, billing_period');

    return features.map(feature => ({
      ...feature,
      included_in_tiers: (allIncluded || [])
        .filter(i => i.feature_id === feature.id)
        .map(i => i.tier_id),
      addon_config: (allAddons || [])
        .filter(a => a.feature_id === feature.id)
        .map(a => ({
          tier_id: a.tier_id,
          addon_price_cents: a.addon_price_cents,
          billing_period: a.billing_period,
        })),
    }));
  },

  /**
   * Check if a user has access to a feature
   */
  async userHasFeature(userId: string, featureSlug: string): Promise<boolean> {
    // Get user's tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('selected_tier')
      .eq('user_id', userId)
      .single();

    if (!profile) return false;

    // Get the tier ID from slug
    const { data: tier } = await supabase
      .from('package_tiers')
      .select('id')
      .eq('tier_slug', profile.selected_tier)
      .eq('is_active', true)
      .single();

    if (!tier) return false;

    // Get the feature ID from slug
    const { data: feature } = await supabase
      .from('features')
      .select('id')
      .eq('slug', featureSlug)
      .eq('is_active', true)
      .single();

    if (!feature) return false;

    // Check if feature is included in tier
    const { data: included } = await supabase
      .from('tier_included_features')
      .select('id')
      .eq('tier_id', tier.id)
      .eq('feature_id', feature.id)
      .maybeSingle();

    if (included) return true;

    // TODO: Check if user has purchased this as an addon
    // This would require a user_purchased_addons table

    return false;
  },

  /**
   * Format price for display
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  },

  /**
   * Get category display names
   */
  getCategoryDisplayName(category: string | null): string {
    const categories: Record<string, string> = {
      core: 'Core Features',
      advanced: 'Advanced Features',
      ai: 'AI Features',
      payments: 'Payment Providers',
      branding: 'Branding',
      team: 'Team Features',
      enterprise: 'Enterprise',
    };
    return categories[category || ''] || category || 'Other';
  },
};
