import { supabase } from '../lib/supabase';

export interface AddonProduct {
  id: string;
  addon_type: 'property' | 'unit' | 'tenant' | 'team_member' | 'business';
  display_name: string;
  description: string | null;
  monthly_price_cents: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonPurchase {
  id: string;
  organization_id: string;
  addon_product_id: string;
  addon_product?: AddonProduct;
  quantity: number;
  status: 'active' | 'cancelled' | 'expired';
  purchase_date: string;
  next_billing_date: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUsage {
  organization_id: string;
  current_businesses: number;
  current_properties: number;
  current_units: number;
  current_tenants: number;
  current_users: number;
  updated_at: string;
}

export interface OrganizationLimits {
  max_businesses: number;
  max_properties: number;
  max_units: number;
  max_tenants: number;
  max_users: number;
  base_limits: {
    max_businesses: number;
    max_properties: number;
    max_units: number;
    max_tenants: number;
    max_users: number;
  };
  addon_limits: {
    addon_businesses: number;
    addon_properties: number;
    addon_units: number;
    addon_tenants: number;
    addon_users: number;
  };
}

class AddonService {
  async getAvailableAddons(): Promise<AddonProduct[]> {
    const { data, error } = await supabase
      .from('addon_products')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price_cents', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getOrganizationPurchases(organizationId: string): Promise<AddonPurchase[]> {
    const { data, error } = await supabase
      .from('organization_addon_purchases')
      .select(`
        *,
        addon_product:addon_products(*)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async purchaseAddon(
    organizationId: string,
    addonProductId: string,
    quantity: number = 1
  ): Promise<AddonPurchase> {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const { data, error } = await supabase
      .from('organization_addon_purchases')
      .insert({
        organization_id: organizationId,
        addon_product_id: addonProductId,
        quantity,
        status: 'active',
        purchase_date: new Date().toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancelAddon(purchaseId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_addon_purchases')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    if (error) throw error;
  }

  async updateAddonQuantity(purchaseId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const { error } = await supabase
      .from('organization_addon_purchases')
      .update({ quantity })
      .eq('id', purchaseId);

    if (error) throw error;
  }

  async getOrganizationUsage(organizationId: string): Promise<OrganizationUsage | null> {
    const { data, error } = await supabase
      .from('organization_usage_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getOrganizationLimits(organizationId: string): Promise<OrganizationLimits> {
    const { data, error } = await supabase
      .rpc('get_organization_limits', { org_id: organizationId });

    if (error) throw error;
    return data as OrganizationLimits;
  }

  async checkLimit(organizationId: string, resourceType: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_organization_limit', {
        org_id: organizationId,
        resource_type: resourceType,
      });

    if (error) throw error;
    return data as boolean;
  }

  async getLimitStatus(organizationId: string) {
    const [usage, limits] = await Promise.all([
      this.getOrganizationUsage(organizationId),
      this.getOrganizationLimits(organizationId),
    ]);

    if (!usage) {
      return null;
    }

    const calculatePercentage = (current: number, max: number) => {
      if (max === 999999) return 0;
      return Math.round((current / max) * 100);
    };

    return {
      businesses: {
        current: usage.current_businesses,
        max: limits.max_businesses,
        percentage: calculatePercentage(usage.current_businesses, limits.max_businesses),
        atLimit: limits.max_businesses !== 999999 && usage.current_businesses >= limits.max_businesses,
      },
      properties: {
        current: usage.current_properties,
        max: limits.max_properties,
        percentage: calculatePercentage(usage.current_properties, limits.max_properties),
        atLimit: limits.max_properties !== 999999 && usage.current_properties >= limits.max_properties,
      },
      units: {
        current: usage.current_units,
        max: limits.max_units,
        percentage: calculatePercentage(usage.current_units, limits.max_units),
        atLimit: limits.max_units !== 999999 && usage.current_units >= limits.max_units,
      },
      tenants: {
        current: usage.current_tenants,
        max: limits.max_tenants,
        percentage: calculatePercentage(usage.current_tenants, limits.max_tenants),
        atLimit: limits.max_tenants !== 999999 && usage.current_tenants >= limits.max_tenants,
      },
      users: {
        current: usage.current_users,
        max: limits.max_users,
        percentage: calculatePercentage(usage.current_users, limits.max_users),
        atLimit: limits.max_users !== 999999 && usage.current_users >= limits.max_users,
      },
      limits,
    };
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export const addonService = new AddonService();
