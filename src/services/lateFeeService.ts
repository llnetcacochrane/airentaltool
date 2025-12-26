import { supabase } from '../lib/supabase';

export interface LateFee {
  id: string;
  business_id: string;
  payment_schedule_id: string | null;
  lease_id: string;
  unit_id: string;
  tenant_id: string;
  original_amount_cents: number;
  late_fee_cents: number;
  total_amount_cents: number;
  original_due_date: string;
  assessed_date: string;
  paid_date: string | null;
  status: 'unpaid' | 'paid' | 'waived';
  waived_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LateFeeConfiguration {
  id: string;
  business_id: string;
  fee_type: 'fixed' | 'percentage' | 'both';
  fixed_fee_cents: number;
  percentage_rate: number;
  grace_period_days: number;
  max_fee_cents: number | null;
  is_recurring: boolean;
  recurring_frequency_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const lateFeeService = {
  /**
   * Get late fee configuration for a business
   */
  async getConfiguration(businessId: string): Promise<LateFeeConfiguration | null> {
    const { data, error } = await supabase
      .from('late_fee_configurations')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching late fee configuration:', error);
      return null;
    }

    return data;
  },

  /**
   * Create or update late fee configuration
   */
  async saveConfiguration(
    businessId: string,
    config: Partial<LateFeeConfiguration>
  ): Promise<LateFeeConfiguration | null> {
    const existing = await this.getConfiguration(businessId);

    if (existing) {
      const { data, error } = await supabase
        .from('late_fee_configurations')
        .update(config)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating late fee configuration:', error);
        return null;
      }

      return data;
    } else {
      const { data, error } = await supabase
        .from('late_fee_configurations')
        .insert({
          business_id: businessId,
          ...config,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating late fee configuration:', error);
        return null;
      }

      return data;
    }
  },

  /**
   * Calculate late fee amount for a payment
   */
  async calculateLateFee(
    businessId: string,
    originalAmountCents: number,
    daysOverdue: number
  ): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_late_fee', {
      p_business_id: businessId,
      p_original_amount_cents: originalAmountCents,
      p_days_overdue: daysOverdue,
    });

    if (error) {
      console.error('Error calculating late fee:', error);
      return 0;
    }

    return data || 0;
  },

  /**
   * Assess late fees for all overdue payments in a business
   */
  async assessLateFees(businessId: string): Promise<{
    payment_schedule_id: string;
    late_fee_cents: number;
    late_fee_id: string;
  }[]> {
    const { data, error } = await supabase.rpc('assess_late_fees_for_business', {
      p_business_id: businessId,
    });

    if (error) {
      console.error('Error assessing late fees:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all late fees for a business
   */
  async getLateFees(
    businessId: string,
    filters?: {
      status?: 'unpaid' | 'paid' | 'waived';
      tenantId?: string;
      leaseId?: string;
    }
  ): Promise<LateFee[]> {
    let query = supabase
      .from('late_fees')
      .select('*')
      .eq('business_id', businessId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters?.leaseId) {
      query = query.eq('lease_id', filters.leaseId);
    }

    const { data, error } = await query.order('assessed_date', { ascending: false });

    if (error) {
      console.error('Error fetching late fees:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get unpaid late fees for a tenant
   */
  async getTenantUnpaidLateFees(tenantId: string): Promise<LateFee[]> {
    const { data, error } = await supabase
      .from('late_fees')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'unpaid')
      .order('assessed_date', { ascending: true });

    if (error) {
      console.error('Error fetching tenant late fees:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Mark a late fee as paid
   */
  async markAsPaid(lateFeeId: string, paidDate: string = new Date().toISOString()): Promise<LateFee | null> {
    const { data, error } = await supabase
      .from('late_fees')
      .update({
        status: 'paid',
        paid_date: paidDate.split('T')[0], // Extract date only
      })
      .eq('id', lateFeeId)
      .select()
      .single();

    if (error) {
      console.error('Error marking late fee as paid:', error);
      return null;
    }

    return data;
  },

  /**
   * Waive a late fee
   */
  async waiveLateFee(lateFeeId: string, reason: string): Promise<LateFee | null> {
    const { data, error } = await supabase
      .from('late_fees')
      .update({
        status: 'waived',
        waived_reason: reason,
      })
      .eq('id', lateFeeId)
      .select()
      .single();

    if (error) {
      console.error('Error waiving late fee:', error);
      return null;
    }

    return data;
  },

  /**
   * Get total unpaid late fees for a business
   */
  async getTotalUnpaidLateFees(businessId: string): Promise<number> {
    const { data, error } = await supabase
      .from('late_fees')
      .select('late_fee_cents')
      .eq('business_id', businessId)
      .eq('status', 'unpaid');

    if (error) {
      console.error('Error calculating total unpaid late fees:', error);
      return 0;
    }

    return (data || []).reduce((total, fee) => total + fee.late_fee_cents, 0) / 100;
  },

  /**
   * Get late fee statistics for a business
   */
  async getStatistics(businessId: string): Promise<{
    total_assessed: number;
    total_paid: number;
    total_waived: number;
    total_unpaid: number;
    count_unpaid: number;
  }> {
    const { data, error } = await supabase
      .from('late_fees')
      .select('status, late_fee_cents')
      .eq('business_id', businessId);

    if (error) {
      console.error('Error fetching late fee statistics:', error);
      return {
        total_assessed: 0,
        total_paid: 0,
        total_waived: 0,
        total_unpaid: 0,
        count_unpaid: 0,
      };
    }

    const stats = (data || []).reduce(
      (acc, fee) => {
        const amount = fee.late_fee_cents / 100;
        acc.total_assessed += amount;

        if (fee.status === 'paid') {
          acc.total_paid += amount;
        } else if (fee.status === 'waived') {
          acc.total_waived += amount;
        } else if (fee.status === 'unpaid') {
          acc.total_unpaid += amount;
          acc.count_unpaid += 1;
        }

        return acc;
      },
      {
        total_assessed: 0,
        total_paid: 0,
        total_waived: 0,
        total_unpaid: 0,
        count_unpaid: 0,
      }
    );

    return stats;
  },

  /**
   * Create a manual late fee (for special cases)
   */
  async createManualLateFee(lateFee: {
    business_id: string;
    lease_id: string;
    unit_id: string;
    tenant_id: string;
    original_amount_cents: number;
    late_fee_cents: number;
    original_due_date: string;
    notes?: string;
  }): Promise<LateFee | null> {
    const totalAmountCents = lateFee.original_amount_cents + lateFee.late_fee_cents;

    const { data, error } = await supabase
      .from('late_fees')
      .insert({
        ...lateFee,
        total_amount_cents: totalAmountCents,
        status: 'unpaid',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating manual late fee:', error);
      return null;
    }

    return data;
  },
};
