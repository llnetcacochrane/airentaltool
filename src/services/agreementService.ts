import { supabase } from '../lib/supabase';
import {
  agreementPlaceholderService,
  PlaceholderContext,
} from './agreementPlaceholderService';

export interface AgreementTemplate {
  id: string;
  created_by: string;
  business_id?: string;
  portfolio_id?: string;
  template_name: string;
  description?: string;
  agreement_type: 'lease' | 'sublease' | 'month-to-month' | 'short-term';
  agreement_title: string;
  template_content: string; // Contains placeholder variables like {{TENANT_NAME}}
  content?: any; // Legacy field for backwards compatibility
  generated_text?: string; // Legacy field for backwards compatibility
  default_lease_term_months?: number;
  default_rent_amount?: number; // in cents
  default_security_deposit?: number; // in cents
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
  content?: any;
  generated_text?: string;
  final_content: string; // The rendered agreement with placeholders substituted
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
  auto_sent_on_approval?: boolean;
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
    try {
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

      if (error) {
        // Table doesn't exist yet - return empty array instead of crashing
        console.warn('agreement_templates table not found, returning empty array');
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching agreement templates:', error);
      return [];
    }
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
    // SECURITY: RLS policies in Supabase should restrict access, but we also
    // verify the user has permission to view this agreement
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('Unauthorized: Must be logged in to view agreements');
    }

    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Additional authorization check: user must be the creator, landlord, or tenant
    // TODO: Add proper RLS policies in Supabase for defense-in-depth
    const canAccess =
      data.created_by === user.user.id ||
      data.landlord_email === user.user.email ||
      data.tenant_email === user.user.email;

    if (!canAccess) {
      throw new Error('Unauthorized: You do not have permission to view this agreement');
    }

    return data;
  }

  /**
   * Get agreement for public signing (uses signing token, not auth)
   * SECURITY: This endpoint should be rate-limited and the signing token should expire
   */
  async getAgreementForSigning(id: string, _signingToken?: string): Promise<LeaseAgreement> {
    // TODO: Implement proper signing token validation using _signingToken
    // For now, this allows unauthenticated access for signing purposes
    // In production, implement a separate signed URL mechanism
    const { data, error } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('id', id)
      .in('status', ['sent', 'viewed']) // Only allow access to pending agreements
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
    // TODO: SECURITY - Implement signature integrity verification
    // 1. Hash the agreement content at time of signing to detect tampering
    // 2. Store hash with signature for later verification
    // 3. Consider using a third-party e-signature service (DocuSign, HelloSign)
    //    for legally binding signatures with audit trails
    // 4. Implement timestamp from a trusted time source
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

  // ============================================================================
  // UNIT TEMPLATE ASSIGNMENT METHODS
  // ============================================================================

  /**
   * Get the default agreement template assigned to a unit
   */
  async getUnitDefaultTemplate(unitId: string): Promise<AgreementTemplate | null> {
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('default_agreement_template_id')
      .eq('id', unitId)
      .single();

    if (unitError || !unit?.default_agreement_template_id) return null;

    const { data: template, error: templateError } = await supabase
      .from('agreement_templates')
      .select('*')
      .eq('id', unit.default_agreement_template_id)
      .single();

    if (templateError) return null;
    return template;
  }

  /**
   * Set the default agreement template for a unit
   */
  async setUnitDefaultTemplate(unitId: string, templateId: string | null): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({ default_agreement_template_id: templateId })
      .eq('id', unitId);

    if (error) throw error;
  }

  /**
   * Get units that have a specific template assigned
   */
  async getUnitsWithTemplate(templateId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('units')
      .select('id, unit_number, property_id')
      .eq('default_agreement_template_id', templateId);

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // AGREEMENT GENERATION METHODS
  // ============================================================================

  /**
   * Generate a lease agreement from a template by substituting placeholders
   */
  async generateAgreementFromTemplateWithContext(
    templateId: string,
    context: PlaceholderContext,
    options: {
      tenantId?: string;
      unitId: string;
      propertyId: string;
      businessId: string;
      leaseId?: string;
      startDate: string;
      endDate: string;
      rentAmount: number; // in cents
      securityDeposit?: number; // in cents
      paymentDueDay?: number;
      autoSend?: boolean;
    }
  ): Promise<LeaseAgreement> {
    // Get the template
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    // Get template content (support both new and legacy formats)
    const templateContent =
      template.template_content || template.generated_text || '';
    if (!templateContent) {
      throw new Error('Template has no content');
    }

    // Substitute placeholders with actual values
    const finalContent = agreementPlaceholderService.substitutePlaceholders(
      templateContent,
      context
    );

    // Get property for address
    const { data: property } = await supabase
      .from('properties')
      .select('name, address_line1, address_line2, city, state, postal_code')
      .eq('id', options.propertyId)
      .single();

    // Build property address
    const propertyAddress = property
      ? [
          property.address_line1,
          property.address_line2,
          property.city,
          property.state,
          property.postal_code,
        ]
          .filter(Boolean)
          .join(', ')
      : '';

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Create the lease agreement
    const agreement: Partial<LeaseAgreement> = {
      template_id: templateId,
      lease_id: options.leaseId,
      tenant_id: options.tenantId,
      unit_id: options.unitId,
      property_id: options.propertyId,
      business_id: options.businessId,
      landlord_name: context.landlord_name || '',
      landlord_email: context.landlord_email || '',
      landlord_phone: context.landlord_phone,
      tenant_name: context.tenant_name || '',
      tenant_email: context.tenant_email || '',
      tenant_phone: context.tenant_phone,
      agreement_title: template.agreement_title,
      agreement_type: template.agreement_type,
      final_content: finalContent,
      start_date: options.startDate,
      end_date: options.endDate,
      rent_amount: options.rentAmount,
      security_deposit: options.securityDeposit || template.default_security_deposit || 0,
      payment_frequency: template.payment_frequency || 'monthly',
      payment_due_day: options.paymentDueDay || 1,
      property_address: propertyAddress,
      status: 'draft',
      requires_signature: true,
      auto_sent_on_approval: options.autoSend || false,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('lease_agreements')
      .insert([agreement])
      .select()
      .single();

    if (error) throw error;

    // If auto-send is enabled, send immediately
    if (options.autoSend && data.id) {
      await this.sendAgreementToTenant(data.id);
    }

    return data;
  }

  /**
   * Send an agreement to the tenant (updates status to 'sent')
   */
  async sendAgreementToTenant(agreementId: string): Promise<void> {
    const { error } = await supabase.rpc('send_agreement_to_tenant', {
      p_agreement_id: agreementId,
    });

    if (error) throw error;

    // TODO: Send actual email notification to tenant
    // This would integrate with an email service like SendGrid
    console.log(`Agreement ${agreementId} marked as sent. Email notification not yet implemented.`);
  }

  /**
   * Build context from database records for placeholder substitution
   */
  async buildContextForAgreement(
    businessId: string,
    propertyId: string,
    unitId: string,
    tenantData: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    },
    leaseDetails: {
      start_date: string;
      end_date: string;
      rent_amount: number;
      security_deposit?: number;
      payment_due_day?: number;
    },
    templateId?: string
  ): Promise<PlaceholderContext> {
    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('business_name, owner_user_id')
      .eq('id', businessId)
      .single();

    // Get business owner info
    let businessOwner = null;
    if (business?.owner_user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, email, phone')
        .eq('user_id', business.owner_user_id)
        .single();
      businessOwner = profile;
    }

    // Get property info
    const { data: property } = await supabase
      .from('properties')
      .select('name, address_line1, address_line2, city, state, postal_code')
      .eq('id', propertyId)
      .single();

    // Get unit info
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number, bedrooms, bathrooms, square_feet')
      .eq('id', unitId)
      .single();

    // Get template if provided
    let template = null;
    if (templateId) {
      const { data: templateData } = await supabase
        .from('agreement_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = templateData;
    }

    return agreementPlaceholderService.buildContextFromData({
      business,
      businessOwner,
      property,
      unit,
      tenant: {
        first_name: tenantData.first_name,
        last_name: tenantData.last_name,
        email: tenantData.email,
        phone: tenantData.phone,
      },
      leaseDetails,
      template,
    });
  }
}

export const agreementService = new AgreementService();
