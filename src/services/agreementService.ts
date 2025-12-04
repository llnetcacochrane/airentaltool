import { supabase } from '../lib/supabase';

export interface AgreementTemplate {
  id: string;
  created_by: string;
  business_id?: string;
  portfolio_id?: string;
  template_name: string;
  description?: string;
  agreement_type: 'lease' | 'sublease' | 'month-to-month' | 'short-term';
  agreement_title: string;
  content: any;
  generated_text?: string;
  default_lease_term_months?: number;
  default_rent_amount?: number;
  default_security_deposit?: number;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  pet_policy?: string;
  house_rules?: string;
  cancellation_policy?: string;
  damage_policy?: string;
  refund_policy?: string;
  utilities_included?: string[];
  amenities?: string[];
  parking_details?: string;
  max_occupants?: number;
  ai_prompt_used?: string;
  ai_model_used?: string;
  ai_generated_at?: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LeaseAgreement {
  id: string;
  template_id?: string;
  lease_id?: string;
  tenant_id: string;
  unit_id: string;
  property_id: string;
  business_id?: string;
  portfolio_id?: string;
  landlord_name: string;
  landlord_email: string;
  landlord_phone?: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone?: string;
  agreement_title: string;
  agreement_type: string;
  content: any;
  generated_text: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number;
  payment_frequency: string;
  payment_due_day: number;
  late_fee_amount?: number;
  late_fee_grace_days: number;
  property_address: string;
  property_description?: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'executed' | 'terminated' | 'expired';
  sent_at?: string;
  viewed_at?: string;
  signed_at?: string;
  executed_at?: string;
  terminated_at?: string;
  requires_signature: boolean;
  signature_deadline?: string;
  landlord_signed: boolean;
  landlord_signed_at?: string;
  tenant_signed: boolean;
  tenant_signed_at?: string;
  pdf_url?: string;
  signed_pdf_url?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgreementSignature {
  id: string;
  agreement_id: string;
  signer_id?: string;
  signer_type: 'landlord' | 'tenant' | 'guarantor' | 'witness';
  signer_name: string;
  signer_email: string;
  signer_ip?: string;
  signature_data?: string;
  signature_method: 'digital' | 'typed' | 'esign_service';
  signed_at: string;
  consent_text: string;
  consent_agreed: boolean;
  user_agent?: string;
  device_info?: any;
  created_at: string;
}

export interface AgreementAuditLog {
  id: string;
  agreement_id?: string;
  template_id?: string;
  action_type: string;
  action_by?: string;
  action_by_name?: string;
  action_by_email?: string;
  old_status?: string;
  new_status?: string;
  changes?: any;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

class AgreementService {
  async createTemplate(template: Partial<AgreementTemplate>): Promise<AgreementTemplate> {
    const { data, error } = await supabase
      .from('agreement_templates')
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(id: string, updates: Partial<AgreementTemplate>): Promise<AgreementTemplate> {
    const { data, error } = await supabase
      .from('agreement_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTemplates(filters?: { business_id?: string; portfolio_id?: string; is_active?: boolean }): Promise<AgreementTemplate[]> {
    let query = supabase
      .from('agreement_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.portfolio_id) {
      query = query.eq('portfolio_id', filters.portfolio_id);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getTemplate(id: string): Promise<AgreementTemplate> {
    const { data, error } = await supabase
      .from('agreement_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('agreement_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async setDefaultTemplate(id: string, portfolioId: string): Promise<void> {
    await supabase
      .from('agreement_templates')
      .update({ is_default: false })
      .eq('portfolio_id', portfolioId);

    const { error } = await supabase
      .from('agreement_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }

  async generateAgreementFromTemplate(
    templateId: string,
    tenantId: string,
    leaseId: string,
    customData?: any
  ): Promise<string> {
    const { data, error } = await supabase.rpc('generate_agreement_from_template', {
      p_template_id: templateId,
      p_tenant_id: tenantId,
      p_lease_id: leaseId,
      p_custom_data: customData || {}
    });

    if (error) throw error;
    return data;
  }

  async createAgreement(agreement: Partial<LeaseAgreement>): Promise<LeaseAgreement> {
    const { data, error } = await supabase
      .from('lease_agreements')
      .insert([agreement])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAgreement(id: string, updates: Partial<LeaseAgreement>): Promise<LeaseAgreement> {
    const { data, error } = await supabase
      .from('lease_agreements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAgreements(filters?: {
    tenant_id?: string;
    property_id?: string;
    business_id?: string;
    portfolio_id?: string;
    status?: string;
  }): Promise<LeaseAgreement[]> {
    let query = supabase
      .from('lease_agreements')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.tenant_id) {
      query = query.eq('tenant_id', filters.tenant_id);
    }

    if (filters?.property_id) {
      query = query.eq('property_id', filters.property_id);
    }

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.portfolio_id) {
      query = query.eq('portfolio_id', filters.portfolio_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getAgreement(id: string): Promise<LeaseAgreement> {
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async sendAgreement(agreementId: string): Promise<void> {
    const { error } = await supabase.rpc('send_agreement_to_tenant', {
      p_agreement_id: agreementId
    });

    if (error) throw error;
  }

  async markAgreementViewed(agreementId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_agreement_viewed', {
      p_agreement_id: agreementId
    });

    if (error) throw error;
  }

  async signAgreement(
    agreementId: string,
    signerType: 'landlord' | 'tenant',
    signatureData: string,
    signatureMethod: 'digital' | 'typed' | 'esign_service' = 'digital'
  ): Promise<void> {
    const { error } = await supabase.rpc('sign_agreement', {
      p_agreement_id: agreementId,
      p_signer_type: signerType,
      p_signature_data: signatureData,
      p_signature_method: signatureMethod
    });

    if (error) throw error;
  }

  async getSignatures(agreementId: string): Promise<AgreementSignature[]> {
    const { data, error } = await supabase
      .from('agreement_signatures')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('signed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAuditLog(agreementId: string): Promise<AgreementAuditLog[]> {
    const { data, error } = await supabase
      .from('agreement_audit_log')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAgreementsForTenant(tenantEmail: string): Promise<LeaseAgreement[]> {
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('tenant_email', tenantEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPendingSignatures(): Promise<LeaseAgreement[]> {
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .in('status', ['sent', 'viewed'])
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getExecutedAgreements(filters?: {
    business_id?: string;
    portfolio_id?: string;
  }): Promise<LeaseAgreement[]> {
    let query = supabase
      .from('lease_agreements')
      .select('*')
      .eq('status', 'executed')
      .order('executed_at', { ascending: false });

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.portfolio_id) {
      query = query.eq('portfolio_id', filters.portfolio_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}

export const agreementService = new AgreementService();
