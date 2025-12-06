import { supabase } from '../lib/supabase';

export interface TenantPayment {
  id: string;
  amount_cents: number;
  payment_type: string;
  payment_method: string | null;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'late' | 'failed' | 'refunded';
  description: string | null;
  created_at: string;
}

export interface TenantMaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'submitted' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  images: string[] | null;
  submitted_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface TenantDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface TenantAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  expires_at: string | null;
}

export interface PaymentSummary {
  current_balance_cents: number;
  next_due_date: string | null;
  next_due_amount_cents: number;
  total_paid_this_year_cents: number;
  payments_on_time: number;
  payments_late: number;
}

export const tenantPortalService = {
  // Get payment history for a tenant
  async getPaymentHistory(tenantId: string): Promise<TenantPayment[]> {
    const { data, error } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get payment summary for dashboard
  async getPaymentSummary(tenantId: string, unitId: string): Promise<PaymentSummary> {
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;

    // Get all payments for this tenant
    const { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('due_date', startOfYear);

    if (paymentsError) throw paymentsError;

    const paymentList = payments || [];

    // Calculate totals
    const paidPayments = paymentList.filter(p => p.status === 'paid');
    const pendingPayments = paymentList.filter(p => p.status === 'pending' || p.status === 'late');
    const latePayments = paymentList.filter(p => p.status === 'late');
    const onTimePayments = paidPayments.filter(p => {
      if (!p.payment_date) return false;
      return new Date(p.payment_date) <= new Date(p.due_date);
    });

    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
    const currentBalance = pendingPayments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    // Find next due payment
    const now = new Date();
    const upcomingPayments = pendingPayments
      .filter(p => new Date(p.due_date) >= now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const nextPayment = upcomingPayments[0];

    return {
      current_balance_cents: currentBalance,
      next_due_date: nextPayment?.due_date || null,
      next_due_amount_cents: nextPayment?.amount_cents || 0,
      total_paid_this_year_cents: totalPaid,
      payments_on_time: onTimePayments.length,
      payments_late: latePayments.length,
    };
  },

  // Get maintenance requests for a tenant
  async getMaintenanceRequests(tenantId: string): Promise<TenantMaintenanceRequest[]> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Submit a new maintenance request
  async submitMaintenanceRequest(
    tenantId: string,
    propertyId: string,
    unitId: string,
    organizationId: string,
    request: {
      title: string;
      description: string;
      category: string;
      priority: 'low' | 'medium' | 'high' | 'emergency';
      images?: string[];
      entry_allowed?: boolean;
      entry_notes?: string;
    }
  ): Promise<TenantMaintenanceRequest> {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert({
        organization_id: organizationId,
        property_id: propertyId,
        unit_id: unitId,
        tenant_id: tenantId,
        title: request.title,
        description: request.description,
        category: request.category,
        priority: request.priority,
        images: request.images || [],
        entry_allowed: request.entry_allowed ?? true,
        entry_notes: request.entry_notes,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get tenant documents (lease agreements, etc.)
  async getDocuments(tenantId: string, unitId: string): Promise<TenantDocument[]> {
    // First try to get documents from the agreements table
    const { data: agreements, error: agreementsError } = await supabase
      .from('agreements')
      .select('id, title, document_url, signed_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'signed');

    if (agreementsError) {
      console.error('Error fetching agreements:', agreementsError);
    }

    // Also get any lease documents from the leases table
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, document_url, signed_date, created_at')
      .eq('unit_id', unitId)
      .not('document_url', 'is', null);

    if (leasesError) {
      console.error('Error fetching leases:', leasesError);
    }

    const documents: TenantDocument[] = [];

    // Add agreements as documents
    if (agreements) {
      agreements.forEach(agreement => {
        if (agreement.document_url) {
          documents.push({
            id: agreement.id,
            document_type: 'agreement',
            file_name: agreement.title || 'Signed Agreement',
            file_url: agreement.document_url,
            uploaded_at: agreement.signed_at || agreement.created_at,
          });
        }
      });
    }

    // Add lease documents
    if (leases) {
      leases.forEach(lease => {
        if (lease.document_url) {
          documents.push({
            id: lease.id,
            document_type: 'lease',
            file_name: 'Lease Agreement',
            file_url: lease.document_url,
            uploaded_at: lease.signed_date || lease.created_at,
          });
        }
      });
    }

    return documents;
  },

  // Get announcements for the tenant's property/organization
  async getAnnouncements(organizationId: string, propertyId: string): Promise<TenantAnnouncement[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`property_id.is.null,property_id.eq.${propertyId}`)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet, return empty array
      return [];
    }

    return data || [];
  },

  // Update tenant profile
  async updateProfile(
    tenantId: string,
    updates: {
      phone?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      emergency_contact_relationship?: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) throw error;
  },

  // Record last login for tenant portal
  async recordPortalLogin(tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({
        portal_last_login_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      console.error('Failed to record portal login:', error);
    }
  },

  // Get lease details
  async getLeaseDetails(unitId: string): Promise<{
    id: string;
    start_date: string;
    end_date: string | null;
    monthly_rent_cents: number;
    security_deposit_cents: number;
    rent_due_day: number;
    late_fee_cents: number;
    late_fee_grace_days: number;
    status: string;
    terms_and_conditions: string | null;
  } | null> {
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Send a message to the property manager
  async sendMessage(
    tenantId: string,
    organizationId: string,
    subject: string,
    message: string
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_messages')
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId,
        subject,
        message,
        status: 'unread',
        sent_at: new Date().toISOString(),
      });

    if (error) {
      // Table might not exist, log error
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message. Please try again later.');
    }
  },
};
