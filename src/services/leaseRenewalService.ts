import { supabase } from '../lib/supabase';
import { rentOptimizationService } from './rentOptimizationService';

export interface LeaseRenewalOpportunity {
  lease_id: string;
  tenant_id: string;
  tenant_name: string;
  property_id: string;
  property_name: string;
  current_rent: number;
  suggested_rent: number;
  end_date: string;
  days_until_expiry: number;
  priority: 'immediate' | 'high' | 'medium';
  renewal_probability: number;
  recommendation: string;
  tenant_score: {
    payment_history: 'excellent' | 'good' | 'fair' | 'poor';
    lease_duration: number;
    maintenance_requests: number;
  };
}

export const leaseRenewalService = {
  async getExpiringLeases(
    organizationId: string,
    daysAhead: number = 90
  ): Promise<LeaseRenewalOpportunity[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data: leases, error } = await supabase
      .from('leases')
      .select(`
        id,
        tenant_id,
        property_id,
        monthly_rent_cents,
        start_date,
        end_date,
        status,
        tenants (
          id,
          first_name,
          last_name,
          email
        ),
        properties (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('end_date', futureDate.toISOString().split('T')[0])
      .order('end_date', { ascending: true });

    if (error) throw error;
    if (!leases || leases.length === 0) return [];

    const opportunities: LeaseRenewalOpportunity[] = [];

    for (const lease of leases) {
      if (!lease.tenants || !lease.properties) continue;

      const endDate = new Date(lease.end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const { data: schedules } = await supabase
        .from('payment_schedules')
        .select('is_paid, paid_date, payment_date')
        .eq('lease_id', lease.id);

      const totalPayments = schedules?.length || 0;
      const paidOnTime = schedules?.filter((s: any) => {
        if (!s.is_paid || !s.paid_date) return false;
        const dueDate = new Date(s.payment_date);
        const paidDate = new Date(s.paid_date);
        return paidDate <= dueDate;
      }).length || 0;

      const onTimePercentage = totalPayments > 0 ? (paidOnTime / totalPayments) * 100 : 100;

      let paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
      if (onTimePercentage >= 95) paymentHistory = 'excellent';
      else if (onTimePercentage >= 85) paymentHistory = 'good';
      else if (onTimePercentage >= 70) paymentHistory = 'fair';
      else paymentHistory = 'poor';

      const { data: maintenanceRequests } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('tenant_id', lease.tenant_id);

      const maintenanceCount = maintenanceRequests?.length || 0;

      const leaseDuration = Math.floor(
        (endDate.getTime() - new Date(lease.start_date).getTime()) / (1000 * 60 * 60 * 24 * 365)
      );

      let renewalProbability = 70;
      if (paymentHistory === 'excellent') renewalProbability += 20;
      else if (paymentHistory === 'good') renewalProbability += 10;
      else if (paymentHistory === 'poor') renewalProbability -= 20;

      if (leaseDuration >= 2) renewalProbability += 10;
      if (maintenanceCount > 5) renewalProbability -= 10;
      if (maintenanceCount === 0) renewalProbability += 5;

      renewalProbability = Math.max(20, Math.min(95, renewalProbability));

      let priority: 'immediate' | 'high' | 'medium';
      if (daysUntilExpiry <= 30) priority = 'immediate';
      else if (daysUntilExpiry <= 60) priority = 'high';
      else priority = 'medium';

      const rentRecommendation = await rentOptimizationService.analyzeProperty(
        lease.property_id,
        organizationId
      );

      const currentRentDollars = (lease.monthly_rent_cents || 0) / 100;
      const suggestedRent = rentRecommendation?.recommended_rent || currentRentDollars;

      let recommendation = '';
      if (paymentHistory === 'excellent' && renewalProbability >= 80) {
        recommendation = `Strong renewal candidate. Consider ${rentRecommendation?.adjustment_percentage ? `${rentRecommendation.adjustment_percentage}% increase` : 'market rate adjustment'}.`;
      } else if (paymentHistory === 'good') {
        recommendation = 'Good tenant. Offer renewal early with modest increase.';
      } else if (paymentHistory === 'fair' || paymentHistory === 'poor') {
        recommendation = 'Payment concerns. Consider renewal carefully or seek new tenant.';
      } else {
        recommendation = 'Standard renewal process. Monitor tenant interest.';
      }

      if (daysUntilExpiry <= 30) {
        recommendation += ' URGENT: Contact tenant immediately.';
      }

      opportunities.push({
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        tenant_name: `${lease.tenants.first_name} ${lease.tenants.last_name}`,
        property_id: lease.property_id,
        property_name: lease.properties.name,
        current_rent: currentRentDollars,
        suggested_rent: suggestedRent,
        end_date: lease.end_date,
        days_until_expiry: daysUntilExpiry,
        priority,
        renewal_probability: Math.round(renewalProbability),
        recommendation,
        tenant_score: {
          payment_history: paymentHistory,
          lease_duration: leaseDuration,
          maintenance_requests: maintenanceCount,
        },
      });
    }

    return opportunities;
  },

  async getStats(organizationId: string) {
    const opportunities = await this.getExpiringLeases(organizationId, 90);

    return {
      total: opportunities.length,
      immediate: opportunities.filter(o => o.priority === 'immediate').length,
      high: opportunities.filter(o => o.priority === 'high').length,
      medium: opportunities.filter(o => o.priority === 'medium').length,
      high_probability: opportunities.filter(o => o.renewal_probability >= 75).length,
      low_probability: opportunities.filter(o => o.renewal_probability < 50).length,
    };
  },
};
