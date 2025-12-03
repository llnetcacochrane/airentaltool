import { supabase } from '../lib/supabase';

export interface SystemBranding {
  id: string;
  application_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  support_email: string | null;
  support_phone: string | null;
}

export interface OrganizationBranding {
  id: string;
  organization_id: string;
  application_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  white_label_enabled: boolean;
}

export interface EffectiveBranding {
  application_name: string;
  logo_url: string;
  favicon_url: string | null;
  primary_color: string;
  support_email: string | null;
  support_phone: string | null;
  white_label_enabled: boolean;
}

class BrandingService {
  async getSystemBranding(): Promise<SystemBranding> {
    const { data, error } = await supabase
      .from('system_branding')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        id: '',
        application_name: 'AI Rental Tools',
        logo_url: '/AiRentalTools-logo1t.svg',
        favicon_url: null,
        primary_color: '#2563eb',
        support_email: null,
        support_phone: null,
      };
    }

    return data;
  }

  async updateSystemBranding(data: Partial<SystemBranding>): Promise<void> {
    const { error } = await supabase
      .from('system_branding')
      .update(data)
      .eq('id', (await this.getSystemBranding()).id);

    if (error) throw error;
  }

  async getOrganizationBranding(organizationId: string): Promise<OrganizationBranding | null> {
    const { data, error } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsertOrganizationBranding(
    organizationId: string,
    branding: Partial<OrganizationBranding>
  ): Promise<void> {
    const { error } = await supabase
      .from('organization_branding')
      .upsert({
        organization_id: organizationId,
        ...branding,
      }, {
        onConflict: 'organization_id'
      });

    if (error) throw error;
  }

  async getEffectiveBranding(organizationId: string): Promise<EffectiveBranding> {
    const { data, error } = await supabase
      .rpc('get_effective_branding', { org_id: organizationId });

    if (error) throw error;

    return data || {
      application_name: 'AI Rental Tools',
      logo_url: '/AiRentalTools-logo1t.svg',
      favicon_url: null,
      primary_color: '#2563eb',
      support_email: null,
      support_phone: null,
      white_label_enabled: false,
    };
  }
}

export const brandingService = new BrandingService();
