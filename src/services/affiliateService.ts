import { supabase } from '../lib/supabase';
import type {
  Affiliate,
  AffiliateApplication,
  AffiliateReferral,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateSettings,
  AffiliateStats,
  AffiliateDashboardData,
} from '../types';

// Cookie/localStorage keys for referral tracking
const AFFILIATE_REF_KEY = 'affiliate_ref';
const AFFILIATE_REF_TIME_KEY = 'affiliate_ref_time';
const AFFILIATE_CLICK_ID_KEY = 'affiliate_click_id';

/**
 * Affiliate Service
 * Handles affiliate program functionality for affiliates
 */
export const affiliateService = {
  // ============================================
  // Settings
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

  // ============================================
  // Affiliate Management
  // ============================================

  /**
   * Apply to become an affiliate
   */
  async applyToBeAffiliate(application: AffiliateApplication): Promise<Affiliate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to apply');

    // Check if already an affiliate
    const existing = await this.getAffiliateByUserId(user.id);
    if (existing) {
      throw new Error('You already have an affiliate account');
    }

    // Generate referral code via RPC
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_affiliate_code');

    if (codeError) throw codeError;

    // Create affiliate record
    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        referral_code: codeData,
        company_name: application.company_name,
        website_url: application.website_url,
        promotional_methods: application.promotional_methods,
        payout_method: application.payout_method,
        payout_email: application.payout_email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get affiliate by user ID
   */
  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching affiliate:', error);
      return null;
    }
    return data;
  },

  /**
   * Get current user's affiliate account
   */
  async getCurrentAffiliate(): Promise<Affiliate | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getAffiliateByUserId(user.id);
  },

  /**
   * Update affiliate profile
   */
  async updateProfile(
    affiliateId: string,
    updates: Partial<Pick<Affiliate, 'company_name' | 'website_url' | 'promotional_methods' | 'payout_method' | 'payout_email'>>
  ): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('id', affiliateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================================
  // Referral Tracking
  // ============================================

  /**
   * Validate a referral code
   */
  async validateCode(code: string): Promise<{ isValid: boolean; affiliateId?: string }> {
    const { data, error } = await supabase
      .rpc('validate_affiliate_code', { p_code: code });

    if (error || !data || data.length === 0) {
      return { isValid: false };
    }

    return {
      isValid: data[0].is_valid,
      affiliateId: data[0].affiliate_id,
    };
  },

  /**
   * Track a click on an affiliate link
   * Called when someone visits with ?ref=CODE
   */
  async trackClick(
    referralCode: string,
    metadata?: {
      landingPage?: string;
      referrerUrl?: string;
    }
  ): Promise<string | null> {
    try {
      const { data: clickId, error } = await supabase
        .rpc('track_affiliate_click', {
          p_referral_code: referralCode.toUpperCase(),
          p_ip_address: null, // Can't get IP from client
          p_user_agent: navigator.userAgent,
          p_landing_page: metadata?.landingPage || window.location.href,
          p_referrer_url: metadata?.referrerUrl || document.referrer,
        });

      if (error) {
        console.error('Error tracking affiliate click:', error);
        return null;
      }

      // Store in localStorage for attribution
      if (clickId) {
        localStorage.setItem(AFFILIATE_REF_KEY, referralCode.toUpperCase());
        localStorage.setItem(AFFILIATE_REF_TIME_KEY, Date.now().toString());
        localStorage.setItem(AFFILIATE_CLICK_ID_KEY, clickId);
      }

      return clickId;
    } catch (err) {
      console.error('Error tracking affiliate click:', err);
      return null;
    }
  },

  /**
   * Get stored referral info from localStorage
   */
  getStoredReferral(): { code: string; clickId: string; timestamp: number } | null {
    const code = localStorage.getItem(AFFILIATE_REF_KEY);
    const clickId = localStorage.getItem(AFFILIATE_CLICK_ID_KEY);
    const timestamp = localStorage.getItem(AFFILIATE_REF_TIME_KEY);

    if (!code || !clickId || !timestamp) return null;

    return {
      code,
      clickId,
      timestamp: parseInt(timestamp, 10),
    };
  },

  /**
   * Clear stored referral info
   */
  clearStoredReferral(): void {
    localStorage.removeItem(AFFILIATE_REF_KEY);
    localStorage.removeItem(AFFILIATE_REF_TIME_KEY);
    localStorage.removeItem(AFFILIATE_CLICK_ID_KEY);
  },

  /**
   * Track signup from referral
   * Called after successful user registration
   */
  async trackSignup(clickId: string, userId: string, organizationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('track_affiliate_signup', {
          p_click_id: clickId,
          p_user_id: userId,
          p_organization_id: organizationId,
        });

      if (error) {
        console.error('Error tracking affiliate signup:', error);
        return false;
      }

      // Clear stored referral after successful tracking
      if (data) {
        this.clearStoredReferral();
      }

      return data === true;
    } catch (err) {
      console.error('Error tracking affiliate signup:', err);
      return false;
    }
  },

  // ============================================
  // Referral History
  // ============================================

  /**
   * Get referral history for an affiliate
   */
  async getReferrals(
    affiliateId: string,
    options?: { limit?: number; offset?: number; converted?: boolean }
  ): Promise<AffiliateReferral[]> {
    let query = supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('clicked_at', { ascending: false });

    if (options?.converted !== undefined) {
      query = query.eq('converted', options.converted);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching referrals:', error);
      return [];
    }
    return data || [];
  },

  // ============================================
  // Commission History
  // ============================================

  /**
   * Get commission history for an affiliate
   */
  async getCommissions(
    affiliateId: string,
    options?: { limit?: number; offset?: number; status?: string }
  ): Promise<AffiliateCommission[]> {
    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        referral:affiliate_referrals(*)
      `)
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching commissions:', error);
      return [];
    }
    return data || [];
  },

  // ============================================
  // Payouts
  // ============================================

  /**
   * Request a payout
   */
  async requestPayout(affiliateId: string): Promise<AffiliatePayout> {
    const { data, error } = await supabase
      .rpc('request_affiliate_payout', { p_affiliate_id: affiliateId });

    if (error) throw error;

    // Fetch the created payout
    const { data: payout, error: fetchError } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    return payout;
  },

  /**
   * Get payout history for an affiliate
   */
  async getPayouts(
    affiliateId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<AffiliatePayout[]> {
    let query = supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('requested_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return [];
    }
    return data || [];
  },

  // ============================================
  // Stats & Dashboard
  // ============================================

  /**
   * Get affiliate stats
   */
  async getStats(affiliateId: string): Promise<AffiliateStats> {
    // Get affiliate record for totals
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('total_clicks, total_signups, total_paid_signups, total_commission_earned_cents, total_commission_paid_cents, pending_commission_cents')
      .eq('id', affiliateId)
      .single();

    if (affError) throw affError;

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthClicks } = await supabase
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateId)
      .gte('clicked_at', startOfMonth.toISOString());

    const { count: thisMonthSignups } = await supabase
      .from('affiliate_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateId)
      .not('signup_at', 'is', null)
      .gte('signup_at', startOfMonth.toISOString());

    const { data: thisMonthCommissions } = await supabase
      .from('affiliate_commissions')
      .select('commission_amount_cents')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', startOfMonth.toISOString());

    const thisMonthCommissionCents = (thisMonthCommissions || [])
      .reduce((sum, c) => sum + (c.commission_amount_cents || 0), 0);

    const conversionRate = affiliate.total_clicks > 0
      ? (affiliate.total_paid_signups / affiliate.total_clicks) * 100
      : 0;

    return {
      total_clicks: affiliate.total_clicks || 0,
      total_signups: affiliate.total_signups || 0,
      total_paid_signups: affiliate.total_paid_signups || 0,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      total_commission_earned_cents: affiliate.total_commission_earned_cents || 0,
      total_commission_paid_cents: affiliate.total_commission_paid_cents || 0,
      pending_commission_cents: affiliate.pending_commission_cents || 0,
      this_month_clicks: thisMonthClicks || 0,
      this_month_signups: thisMonthSignups || 0,
      this_month_commission_cents: thisMonthCommissionCents,
    };
  },

  /**
   * Get full dashboard data
   */
  async getDashboard(affiliateId: string): Promise<AffiliateDashboardData | null> {
    try {
      const [affiliate, stats, recentReferrals, recentCommissions, settings] = await Promise.all([
        supabase.from('affiliates').select('*').eq('id', affiliateId).single(),
        this.getStats(affiliateId),
        this.getReferrals(affiliateId, { limit: 5 }),
        this.getCommissions(affiliateId, { limit: 5 }),
        this.getSettings(),
      ]);

      if (affiliate.error || !settings) {
        return null;
      }

      return {
        affiliate: affiliate.data,
        stats,
        recent_referrals: recentReferrals,
        recent_commissions: recentCommissions,
        settings,
      };
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      return null;
    }
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Generate referral URL for an affiliate
   */
  getReferralUrl(referralCode: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/register?ref=${referralCode}`;
  },

  /**
   * Format cents to currency string
   */
  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  },

  /**
   * Format commission percentage from basis points
   */
  formatPercentage(basisPoints: number): string {
    return `${(basisPoints / 100).toFixed(1)}%`;
  },
};

export default affiliateService;
