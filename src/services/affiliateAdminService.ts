import { supabase } from '../lib/supabase';
import { emailService } from './emailService';
import type {
  Affiliate,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateSettings,
  AffiliateStatus,
} from '../types';

interface AffiliateFilters {
  status?: AffiliateStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

interface AffiliateReport {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_referrals: number;
  total_conversions: number;
  total_commission_earned_cents: number;
  total_commission_paid_cents: number;
  pending_payouts_cents: number;
  pending_payouts_count: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Affiliate Admin Service
 * Handles affiliate program management for super admins
 */
export const affiliateAdminService = {
  // ============================================
  // Settings Management
  // ============================================

  /**
   * Get affiliate program settings
   */
  async getSettings(): Promise<AffiliateSettings | null> {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching affiliate settings:', error);
      return null;
    }
    return data;
  },

  /**
   * Update affiliate program settings
   */
  async updateSettings(settings: Partial<AffiliateSettings>): Promise<AffiliateSettings> {
    // Get existing settings to get the ID
    const existing = await this.getSettings();
    if (!existing) throw new Error('No settings record found');

    const { data, error } = await supabase
      .from('affiliate_settings')
      .update(settings)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================================
  // Affiliate Management
  // ============================================

  /**
   * Get all affiliates with optional filters
   */
  async getAllAffiliates(filters?: AffiliateFilters): Promise<Affiliate[]> {
    let query = supabase
      .from('affiliates')
      .select(`
        *,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(
        `referral_code.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,payout_email.ilike.%${filters.search}%`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching affiliates:', error);
      return [];
    }

    // Transform user data
    return (data || []).map(a => ({
      ...a,
      user: a.user ? {
        email: a.user.email,
        first_name: a.user.raw_user_meta_data?.first_name,
        last_name: a.user.raw_user_meta_data?.last_name,
      } : undefined,
    }));
  },

  /**
   * Get pending affiliate applications
   */
  async getPendingApplications(): Promise<Affiliate[]> {
    return this.getAllAffiliates({ status: 'pending' });
  },

  /**
   * Approve an affiliate application
   */
  async approveAffiliate(affiliateId: string): Promise<Affiliate> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('affiliates')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        rejection_reason: null,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;

    // Send approval email notification
    if (data.payout_email) {
      emailService.sendAffiliateApprovedEmail(data.payout_email, {
        affiliateName: data.company_name || 'Affiliate',
        referralCode: data.referral_code,
      }).catch(err => console.error('Failed to send approval email:', err));
    }

    return data;
  },

  /**
   * Reject an affiliate application
   */
  async rejectAffiliate(affiliateId: string, reason: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;

    // Send rejection email notification
    if (data.payout_email) {
      emailService.sendAffiliateRejectedEmail(data.payout_email, {
        affiliateName: data.company_name || 'Applicant',
        reason: reason,
      }).catch(err => console.error('Failed to send rejection email:', err));
    }

    return data;
  },

  /**
   * Suspend an affiliate
   */
  async suspendAffiliate(affiliateId: string, reason: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({
        status: 'suspended',
        suspension_reason: reason,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reactivate a suspended affiliate
   */
  async reactivateAffiliate(affiliateId: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({
        status: 'approved',
        suspension_reason: null,
      })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update affiliate notes
   */
  async updateNotes(affiliateId: string, notes: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({ notes })
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================================
  // Payout Management
  // ============================================

  /**
   * Get all pending payouts
   */
  async getPendingPayouts(): Promise<AffiliatePayout[]> {
    const { data, error } = await supabase
      .from('affiliate_payouts')
      .select(`
        *,
        affiliate:affiliates (
          id,
          user_id,
          referral_code,
          payout_email,
          payout_method
        )
      `)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending payouts:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Approve a payout request
   */
  async approvePayout(payoutId: string): Promise<AffiliatePayout> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark payout as processing
   */
  async startProcessingPayout(payoutId: string): Promise<AffiliatePayout> {
    const { data, error } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'processing',
      })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Complete a payout using atomic database function
   * This handles all updates in a single transaction with row locking
   */
  async completePayout(payoutId: string, transactionId: string): Promise<AffiliatePayout> {
    const { data, error } = await supabase.rpc('complete_affiliate_payout', {
      p_payout_id: payoutId,
      p_transaction_id: transactionId,
    });

    if (error) throw error;

    const payout = data as AffiliatePayout;

    // Fetch affiliate details for email notification
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('payout_email, company_name, payout_method')
      .eq('id', payout.affiliate_id)
      .single();

    if (affiliate?.payout_email) {
      emailService.sendAffiliatePayoutCompletedEmail(affiliate.payout_email, {
        affiliateName: affiliate.company_name || 'Affiliate',
        amount: this.formatCurrency(payout.amount_cents),
        transactionId: transactionId,
        payoutMethod: affiliate.payout_method?.replace('_', ' ') || 'direct deposit',
      }).catch(err => console.error('Failed to send payout completed email:', err));
    }

    return payout;
  },

  /**
   * Mark payout as failed using atomic database function
   * This reverts commissions back to earned status atomically
   */
  async failPayout(payoutId: string, reason: string): Promise<AffiliatePayout> {
    const { data, error } = await supabase.rpc('fail_affiliate_payout', {
      p_payout_id: payoutId,
      p_failure_reason: reason,
    });

    if (error) throw error;

    const payout = data as AffiliatePayout;

    // Fetch affiliate details for email notification
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('payout_email, company_name')
      .eq('id', payout.affiliate_id)
      .single();

    if (affiliate?.payout_email) {
      emailService.sendAffiliatePayoutFailedEmail(affiliate.payout_email, {
        affiliateName: affiliate.company_name || 'Affiliate',
        amount: this.formatCurrency(payout.amount_cents),
        reason: reason,
      }).catch(err => console.error('Failed to send payout failed email:', err));
    }

    return payout;
  },

  /**
   * Cancel a payout request using atomic database function
   * This reverts commissions back to earned status atomically
   */
  async cancelPayout(payoutId: string): Promise<AffiliatePayout> {
    const { data, error } = await supabase.rpc('cancel_affiliate_payout', {
      p_payout_id: payoutId,
    });

    if (error) throw error;
    return data as AffiliatePayout;
  },

  // ============================================
  // Reports
  // ============================================

  /**
   * Get overall affiliate program report
   */
  async getReport(): Promise<AffiliateReport> {
    // Get affiliate counts
    const { count: totalAffiliates } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true });

    const { count: activeAffiliates } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: pendingApplications } = await supabase
      .from('affiliates')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get referral stats
    const { count: totalReferrals } = await supabase
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true });

    const { count: totalConversions } = await supabase
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('converted', true);

    // Get commission totals
    const { data: affiliateTotals } = await supabase
      .from('affiliates')
      .select('total_commission_earned_cents, total_commission_paid_cents, pending_commission_cents');

    const totalCommissionEarned = (affiliateTotals || [])
      .reduce((sum, a) => sum + (a.total_commission_earned_cents || 0), 0);

    const totalCommissionPaid = (affiliateTotals || [])
      .reduce((sum, a) => sum + (a.total_commission_paid_cents || 0), 0);

    // Get pending payouts
    const { data: pendingPayouts } = await supabase
      .from('affiliate_payouts')
      .select('amount_cents')
      .in('status', ['pending', 'approved']);

    const pendingPayoutsCents = (pendingPayouts || [])
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    return {
      total_affiliates: totalAffiliates || 0,
      active_affiliates: activeAffiliates || 0,
      pending_applications: pendingApplications || 0,
      total_referrals: totalReferrals || 0,
      total_conversions: totalConversions || 0,
      total_commission_earned_cents: totalCommissionEarned,
      total_commission_paid_cents: totalCommissionPaid,
      pending_payouts_cents: pendingPayoutsCents,
      pending_payouts_count: pendingPayouts?.length || 0,
    };
  },

  /**
   * Get commissions for a date range
   */
  async getCommissionReport(dateRange: DateRange): Promise<AffiliateCommission[]> {
    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate:affiliates (
          id,
          referral_code,
          payout_email
        )
      `)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching commission report:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Get monthly commission summary
   */
  async getMonthlyCommissionSummary(months: number = 12): Promise<Array<{
    month: string;
    total_cents: number;
    count: number;
  }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .select('billing_month, commission_amount_cents')
      .gte('billing_month', startDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching monthly summary:', error);
      return [];
    }

    // Aggregate by month
    const monthlyMap = new Map<string, { total_cents: number; count: number }>();

    (data || []).forEach(c => {
      const month = c.billing_month;
      const existing = monthlyMap.get(month) || { total_cents: 0, count: 0 };
      monthlyMap.set(month, {
        total_cents: existing.total_cents + (c.commission_amount_cents || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Format cents to currency string
   */
  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  },
};

export default affiliateAdminService;
