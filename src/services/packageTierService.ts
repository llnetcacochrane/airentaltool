import { supabase } from '../lib/supabase';

export interface PackageTier {
  id: string;
  tier_name: string;
  tier_slug: string;
  display_name: string;
  description: string;
  monthly_price_cents: number;
  annual_price_cents: number;
  currency: string;
  package_type: 'single_company' | 'management_company';
  max_businesses: number;
  max_properties: number;
  max_units: number;
  max_tenants: number;
  max_users: number;
  max_payment_methods: number;
  features: Record<string, boolean>;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PackageTierVersion {
  id: string;
  package_tier_id: string;
  version: number;
  tier_name: string;
  display_name: string;
  monthly_price_cents: number;
  annual_price_cents: number;
  max_businesses: number;
  max_properties: number;
  max_units: number;
  max_tenants: number;
  max_users: number;
  max_payment_methods: number;
  features: Record<string, boolean>;
  created_at: string;
  change_notes?: string;
}

export interface OrganizationPackageSettings {
  id: string;
  organization_id: string;
  package_tier_id: string;
  package_version: number;
  custom_monthly_price_cents?: number;
  custom_annual_price_cents?: number;
  custom_max_businesses?: number;
  custom_max_properties?: number;
  custom_max_units?: number;
  custom_max_tenants?: number;
  custom_max_users?: number;
  custom_max_payment_methods?: number;
  custom_features?: Record<string, boolean>;
  has_custom_pricing: boolean;
  has_custom_limits: boolean;
  override_notes?: string;
  billing_cycle: 'monthly' | 'annual';
  current_period_start?: string;
  current_period_end?: string;
}

export interface PackageUpgradeNotification {
  id: string;
  organization_id: string;
  old_package_tier_id: string;
  old_version: number;
  new_version: number;
  changes_summary: any;
  pricing_changed: boolean;
  limits_changed: boolean;
  features_changed: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  notified_at: string;
  responded_at?: string;
  expires_at?: string;
}

export const packageTierService = {
  async getAllPackageTiers(): Promise<PackageTier[]> {
    const { data, error } = await supabase
      .from('package_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return data || [];
  },

  async getPackageTier(id: string): Promise<PackageTier | null> {
    const { data, error } = await supabase
      .from('package_tiers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPackageTierBySlug(slug: string): Promise<PackageTier | null> {
    const { data, error } = await supabase
      .from('package_tiers')
      .select('*')
      .eq('tier_slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createPackageTier(tier: Partial<PackageTier>): Promise<PackageTier> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('package_tiers')
      .insert({
        ...tier,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePackageTier(id: string, updates: Partial<PackageTier>, changeNotes?: string): Promise<PackageTier> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('package_tiers')
      .update({
        ...updates,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePackageTier(id: string): Promise<void> {
    const { error } = await supabase
      .from('package_tiers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async getPackageTierVersions(packageTierId: string): Promise<PackageTierVersion[]> {
    const { data, error } = await supabase
      .from('package_tier_versions')
      .select('*')
      .eq('package_tier_id', packageTierId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOrganizationPackageSettings(organizationId: string): Promise<OrganizationPackageSettings | null> {
    const { data, error } = await supabase
      .from('organization_package_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async setOrganizationPackageSettings(
    organizationId: string,
    settings: Partial<OrganizationPackageSettings>
  ): Promise<OrganizationPackageSettings> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('organization_package_settings')
      .upsert({
        organization_id: organizationId,
        ...settings,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getEffectivePackageSettings(organizationId: string): Promise<{
    tier: PackageTier | null;
    settings: OrganizationPackageSettings | null;
    effective: {
      monthly_price_cents: number;
      annual_price_cents: number;
      max_businesses: number;
      max_properties: number;
      max_units: number;
      max_tenants: number;
      max_users: number;
      max_payment_methods: number;
      features: Record<string, boolean>;
    };
  }> {
    const settings = await this.getOrganizationPackageSettings(organizationId);

    if (!settings || !settings.package_tier_id) {
      return {
        tier: null,
        settings: null,
        effective: {
          monthly_price_cents: 0,
          annual_price_cents: 0,
          max_businesses: 1,
          max_properties: 0,
          max_units: 0,
          max_tenants: 0,
          max_users: 1,
          max_payment_methods: 0,
          features: {},
        },
      };
    }

    const tier = await this.getPackageTier(settings.package_tier_id);

    if (!tier) {
      throw new Error('Package tier not found');
    }

    const effective = {
      monthly_price_cents: settings.custom_monthly_price_cents ?? tier.monthly_price_cents,
      annual_price_cents: settings.custom_annual_price_cents ?? tier.annual_price_cents,
      max_businesses: settings.custom_max_businesses ?? tier.max_businesses,
      max_properties: settings.custom_max_properties ?? tier.max_properties,
      max_units: settings.custom_max_units ?? tier.max_units,
      max_tenants: settings.custom_max_tenants ?? tier.max_tenants,
      max_users: settings.custom_max_users ?? tier.max_users,
      max_payment_methods: settings.custom_max_payment_methods ?? tier.max_payment_methods,
      features: { ...tier.features, ...(settings.custom_features || {}) },
    };

    return { tier, settings, effective };
  },

  async getOrganizationUpgradeNotifications(organizationId: string): Promise<PackageUpgradeNotification[]> {
    const { data, error } = await supabase
      .from('package_upgrade_notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('notified_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async respondToUpgradeNotification(
    notificationId: string,
    accept: boolean
  ): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase
      .from('package_upgrade_notifications')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
        responded_by: user?.id,
      })
      .eq('id', notificationId);

    if (error) throw error;

    if (accept) {
      const { data: notification } = await supabase
        .from('package_upgrade_notifications')
        .select('organization_id, old_package_tier_id')
        .eq('id', notificationId)
        .single();

      if (notification) {
        const tier = await this.getPackageTier(notification.old_package_tier_id);
        if (tier) {
          await this.setOrganizationPackageSettings(notification.organization_id, {
            package_tier_id: tier.id,
            package_version: tier.version,
            has_custom_pricing: false,
            has_custom_limits: false,
            custom_monthly_price_cents: null,
            custom_annual_price_cents: null,
            custom_max_properties: null,
            custom_max_tenants: null,
            custom_max_users: null,
            custom_max_payment_methods: null,
            custom_features: null,
          });
        }
      }
    }
  },

  async checkPackageLimits(organizationId: string): Promise<{
    within_limits: boolean;
    violations: string[];
    current_usage: {
      businesses: number;
      properties: number;
      units: number;
      tenants: number;
      users: number;
    };
    limits: {
      max_businesses: number;
      max_properties: number;
      max_units: number;
      max_tenants: number;
      max_users: number;
    };
  }> {
    const { effective } = await this.getEffectivePackageSettings(organizationId);

    const [businessesCount, propertiesCount, unitsCount, tenantsCount, usersCount] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('units').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
    ]);

    const current_usage = {
      businesses: businessesCount.count || 0,
      properties: propertiesCount.count || 0,
      units: unitsCount.count || 0,
      tenants: tenantsCount.count || 0,
      users: usersCount.count || 0,
    };

    const violations: string[] = [];

    if (current_usage.businesses > effective.max_businesses) {
      violations.push(`Businesses: ${current_usage.businesses}/${effective.max_businesses}`);
    }

    if (current_usage.properties > effective.max_properties) {
      violations.push(`Properties: ${current_usage.properties}/${effective.max_properties}`);
    }

    if (current_usage.units > effective.max_units) {
      violations.push(`Units: ${current_usage.units}/${effective.max_units}`);
    }

    if (current_usage.tenants > effective.max_tenants) {
      violations.push(`Tenants: ${current_usage.tenants}/${effective.max_tenants}`);
    }

    if (current_usage.users > effective.max_users) {
      violations.push(`Users: ${current_usage.users}/${effective.max_users}`);
    }

    return {
      within_limits: violations.length === 0,
      violations,
      current_usage,
      limits: {
        max_businesses: effective.max_businesses,
        max_properties: effective.max_properties,
        max_units: effective.max_units,
        max_tenants: effective.max_tenants,
        max_users: effective.max_users,
      },
    };
  },
};
