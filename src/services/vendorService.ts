import { supabase } from '../lib/supabase';
import {
  Vendor,
  VendorType,
  VendorPaymentTerms,
  VendorTaxForm,
  VendorTaxFormType,
  VendorTaxFormStatus,
} from '../types';

export interface VendorFilters {
  vendorType?: VendorType;
  isActive?: boolean;
  is1099Eligible?: boolean;
  isT5018Eligible?: boolean;
  searchTerm?: string;
}

export interface VendorPaymentSummary {
  vendorId: string;
  vendorName: string;
  taxYear: number;
  totalPaymentsCents: number;
  paymentCount: number;
  is1099Eligible: boolean;
  isT5018Eligible: boolean;
}

export const vendorService = {
  // ========================================
  // Vendor CRUD Operations
  // ========================================

  /**
   * Create a new vendor
   */
  async createVendor(businessId: string, vendor: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        business_id: businessId,
        vendor_code: vendor.vendor_code,
        vendor_name: vendor.vendor_name,
        legal_name: vendor.legal_name,
        vendor_type: vendor.vendor_type || 'other',
        contact_name: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        fax: vendor.fax,
        website: vendor.website,
        address_line1: vendor.address_line1,
        address_line2: vendor.address_line2,
        city: vendor.city,
        state_province: vendor.state_province,
        postal_code: vendor.postal_code,
        country: vendor.country || 'CA',
        tax_jurisdiction: vendor.tax_jurisdiction,
        tax_id: vendor.tax_id,
        tax_id_type: vendor.tax_id_type,
        is_1099_eligible: vendor.is_1099_eligible || false,
        is_t5018_eligible: vendor.is_t5018_eligible || false,
        form_1099_type: vendor.form_1099_type,
        w9_on_file: vendor.w9_on_file || false,
        w9_received_date: vendor.w9_received_date,
        currency_code: vendor.currency_code || 'CAD',
        payment_terms: vendor.payment_terms || 'net_30',
        custom_payment_days: vendor.custom_payment_days,
        default_expense_account_id: vendor.default_expense_account_id,
        accepts_ach: vendor.accepts_ach || false,
        accepts_check: vendor.accepts_check || true,
        is_active: vendor.is_active ?? true,
        notes: vendor.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all vendors for a business
   */
  async getVendors(businessId: string, filters?: VendorFilters): Promise<Vendor[]> {
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('business_id', businessId)
      .order('vendor_name');

    if (filters?.vendorType) {
      query = query.eq('vendor_type', filters.vendorType);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.is1099Eligible !== undefined) {
      query = query.eq('is_1099_eligible', filters.is1099Eligible);
    }

    if (filters?.isT5018Eligible !== undefined) {
      query = query.eq('is_t5018_eligible', filters.isT5018Eligible);
    }

    if (filters?.searchTerm) {
      query = query.or(
        `vendor_name.ilike.%${filters.searchTerm}%,legal_name.ilike.%${filters.searchTerm}%,contact_name.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single vendor by ID
   */
  async getVendorById(vendorId: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get vendor by name (for duplicate checking)
   */
  async getVendorByName(businessId: string, vendorName: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('business_id', businessId)
      .eq('vendor_name', vendorName)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Update a vendor
   */
  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<Vendor> {
    // Remove fields that shouldn't be updated directly
    const {
      id,
      business_id,
      created_at,
      total_paid_ytd_cents,
      total_paid_all_time_cents,
      open_balance_cents,
      ...safeUpdates
    } = updates as any;

    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deactivate a vendor (soft delete)
   */
  async deactivateVendor(vendorId: string): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reactivate a vendor
   */
  async reactivateVendor(vendorId: string): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========================================
  // Vendor Payment Tracking
  // ========================================

  /**
   * Update vendor payment statistics
   * Called after posting a payment to a vendor
   */
  async updateVendorPaymentStats(
    vendorId: string,
    paymentAmountCents: number,
    paymentDate: string
  ): Promise<void> {
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    const currentYear = new Date().getFullYear();
    const paymentYear = new Date(paymentDate).getFullYear();

    const updates: Partial<Vendor> = {
      total_paid_all_time_cents: vendor.total_paid_all_time_cents + paymentAmountCents,
      last_payment_date: paymentDate,
    };

    // Only update YTD if payment is in current year
    if (paymentYear === currentYear) {
      updates.total_paid_ytd_cents = vendor.total_paid_ytd_cents + paymentAmountCents;
    }

    await this.updateVendor(vendorId, updates);
  },

  /**
   * Reset YTD totals for all vendors (run at year start)
   */
  async resetYTDTotals(businessId: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({
        total_paid_ytd_cents: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId);

    if (error) throw error;
  },

  // ========================================
  // 1099/T5018 Tax Form Operations
  // ========================================

  /**
   * Get 1099-eligible vendors for a tax year
   */
  async get1099EligibleVendors(
    businessId: string,
    taxYear: number,
    minimumAmountCents: number = 60000 // $600 threshold for 1099
  ): Promise<VendorPaymentSummary[]> {
    const vendors = await this.getVendors(businessId, {
      is1099Eligible: true,
      isActive: true,
    });

    const summaries: VendorPaymentSummary[] = [];

    for (const vendor of vendors) {
      // Get total payments for this vendor in the tax year
      const { data: payments, error } = await supabase
        .from('expenses')
        .select('amount_cents')
        .eq('vendor_id', vendor.id)
        .gte('expense_date', `${taxYear}-01-01`)
        .lte('expense_date', `${taxYear}-12-31`)
        .eq('status', 'paid');

      if (error) throw error;

      const totalPayments = (payments || []).reduce((sum, p) => sum + p.amount_cents, 0);

      if (totalPayments >= minimumAmountCents) {
        summaries.push({
          vendorId: vendor.id,
          vendorName: vendor.vendor_name,
          taxYear,
          totalPaymentsCents: totalPayments,
          paymentCount: payments?.length || 0,
          is1099Eligible: vendor.is_1099_eligible,
          isT5018Eligible: vendor.is_t5018_eligible,
        });
      }
    }

    return summaries.sort((a, b) => b.totalPaymentsCents - a.totalPaymentsCents);
  },

  /**
   * Get T5018-eligible vendors for a tax year (Canadian contractor payments)
   */
  async getT5018EligibleVendors(
    businessId: string,
    taxYear: number,
    minimumAmountCents: number = 50000 // $500 threshold for T5018
  ): Promise<VendorPaymentSummary[]> {
    const vendors = await this.getVendors(businessId, {
      isT5018Eligible: true,
      isActive: true,
    });

    const summaries: VendorPaymentSummary[] = [];

    for (const vendor of vendors) {
      const { data: payments, error } = await supabase
        .from('expenses')
        .select('amount_cents')
        .eq('vendor_id', vendor.id)
        .gte('expense_date', `${taxYear}-01-01`)
        .lte('expense_date', `${taxYear}-12-31`)
        .eq('status', 'paid');

      if (error) throw error;

      const totalPayments = (payments || []).reduce((sum, p) => sum + p.amount_cents, 0);

      if (totalPayments >= minimumAmountCents) {
        summaries.push({
          vendorId: vendor.id,
          vendorName: vendor.vendor_name,
          taxYear,
          totalPaymentsCents: totalPayments,
          paymentCount: payments?.length || 0,
          is1099Eligible: vendor.is_1099_eligible,
          isT5018Eligible: vendor.is_t5018_eligible,
        });
      }
    }

    return summaries.sort((a, b) => b.totalPaymentsCents - a.totalPaymentsCents);
  },

  // ========================================
  // Vendor Tax Form Management
  // ========================================

  /**
   * Get tax forms for a vendor
   */
  async getVendorTaxForms(vendorId: string): Promise<VendorTaxForm[]> {
    const { data, error } = await supabase
      .from('vendor_tax_forms')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('tax_year', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all tax forms for a business and year
   */
  async getTaxFormsByYear(
    businessId: string,
    taxYear: number,
    formType?: VendorTaxFormType
  ): Promise<VendorTaxForm[]> {
    let query = supabase
      .from('vendor_tax_forms')
      .select('*')
      .eq('business_id', businessId)
      .eq('tax_year', taxYear);

    if (formType) {
      query = query.eq('form_type', formType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create or update a tax form record
   */
  async upsertTaxForm(
    vendorId: string,
    businessId: string,
    taxYear: number,
    formType: VendorTaxFormType,
    totalPaymentsCents: number,
    boxAmounts?: Record<string, number>
  ): Promise<VendorTaxForm> {
    const { data, error } = await supabase
      .from('vendor_tax_forms')
      .upsert(
        {
          vendor_id: vendorId,
          business_id: businessId,
          tax_year: taxYear,
          form_type: formType,
          total_payments_cents: totalPaymentsCents,
          box_amounts: boxAmounts,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'vendor_id,tax_year,form_type' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update tax form status
   */
  async updateTaxFormStatus(
    taxFormId: string,
    status: VendorTaxFormStatus,
    additionalFields?: Partial<VendorTaxForm>
  ): Promise<VendorTaxForm> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'generated') {
      updates.generated_at = new Date().toISOString();
    } else if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    } else if (status === 'filed') {
      updates.filed_at = new Date().toISOString();
    }

    if (additionalFields) {
      Object.assign(updates, additionalFields);
    }

    const { data, error } = await supabase
      .from('vendor_tax_forms')
      .update(updates)
      .eq('id', taxFormId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Generate 1099 forms for all eligible vendors
   */
  async generate1099Forms(
    businessId: string,
    taxYear: number
  ): Promise<VendorTaxForm[]> {
    const eligibleVendors = await this.get1099EligibleVendors(businessId, taxYear);
    const forms: VendorTaxForm[] = [];

    for (const summary of eligibleVendors) {
      const vendor = await this.getVendorById(summary.vendorId);
      if (!vendor) continue;

      const formType = vendor.form_1099_type || '1099-NEC';

      // Determine box amounts based on form type
      const boxAmounts: Record<string, number> = {};
      if (formType === '1099-NEC') {
        boxAmounts['box1'] = summary.totalPaymentsCents; // Nonemployee compensation
      } else if (formType === '1099-MISC') {
        boxAmounts['box7'] = summary.totalPaymentsCents; // Legacy nonemployee comp
      }

      const form = await this.upsertTaxForm(
        summary.vendorId,
        businessId,
        taxYear,
        formType,
        summary.totalPaymentsCents,
        boxAmounts
      );

      forms.push(form);
    }

    return forms;
  },

  /**
   * Generate T5018 forms for all eligible vendors
   */
  async generateT5018Forms(
    businessId: string,
    taxYear: number
  ): Promise<VendorTaxForm[]> {
    const eligibleVendors = await this.getT5018EligibleVendors(businessId, taxYear);
    const forms: VendorTaxForm[] = [];

    for (const summary of eligibleVendors) {
      const boxAmounts: Record<string, number> = {
        gross_income: summary.totalPaymentsCents,
      };

      const form = await this.upsertTaxForm(
        summary.vendorId,
        businessId,
        taxYear,
        'T5018',
        summary.totalPaymentsCents,
        boxAmounts
      );

      forms.push(form);
    }

    return forms;
  },

  // ========================================
  // Vendor Utilities
  // ========================================

  /**
   * Get vendor types for dropdown
   */
  getVendorTypes(): Array<{ value: VendorType; label: string }> {
    return [
      { value: 'contractor', label: 'Contractor' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'utility', label: 'Utility Company' },
      { value: 'government', label: 'Government Agency' },
      { value: 'professional_service', label: 'Professional Services' },
      { value: 'property_management', label: 'Property Management' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'bank', label: 'Bank/Financial' },
      { value: 'other', label: 'Other' },
    ];
  },

  /**
   * Get payment terms for dropdown
   */
  getPaymentTerms(): Array<{ value: VendorPaymentTerms; label: string }> {
    return [
      { value: 'due_on_receipt', label: 'Due on Receipt' },
      { value: 'net_10', label: 'Net 10 Days' },
      { value: 'net_15', label: 'Net 15 Days' },
      { value: 'net_30', label: 'Net 30 Days' },
      { value: 'net_45', label: 'Net 45 Days' },
      { value: 'net_60', label: 'Net 60 Days' },
      { value: 'net_90', label: 'Net 90 Days' },
      { value: 'custom', label: 'Custom' },
    ];
  },

  /**
   * Calculate payment due date based on terms
   */
  calculateDueDate(invoiceDate: string, paymentTerms: VendorPaymentTerms, customDays?: number): string {
    const date = new Date(invoiceDate);
    let daysToAdd = 30; // default

    switch (paymentTerms) {
      case 'due_on_receipt':
        daysToAdd = 0;
        break;
      case 'net_10':
        daysToAdd = 10;
        break;
      case 'net_15':
        daysToAdd = 15;
        break;
      case 'net_30':
        daysToAdd = 30;
        break;
      case 'net_45':
        daysToAdd = 45;
        break;
      case 'net_60':
        daysToAdd = 60;
        break;
      case 'net_90':
        daysToAdd = 90;
        break;
      case 'custom':
        daysToAdd = customDays || 30;
        break;
    }

    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().slice(0, 10);
  },
};
