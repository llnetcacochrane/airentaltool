import { supabase } from '../lib/supabase';

export interface PortfolioHealth {
  health_score: number;
  health_level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  occupancy_rate: number;
  collection_rate: number;
  maintenance_response_rate: number;
  tenant_satisfaction_score: number;
  roi_percentage: number;
  recommendations: string[];
  metrics: {
    total_properties: number;
    occupied_units: number;
    total_units: number;
    monthly_income: number;
    monthly_expenses: number;
    late_payments: number;
    total_due_payments: number;
    open_maintenance: number;
    avg_maintenance_response_days: number;
  };
}

export const portfolioHealthService = {
  async calculateHealthScore(organizationId: string): Promise<PortfolioHealth> {
    const [
      propertiesData,
      leasesData,
      paymentsData,
      schedulesData,
      expensesData,
      maintenanceData,
    ] = await Promise.all([
      supabase.from('properties').select('id').eq('organization_id', organizationId),
      supabase.from('leases').select('id, status, monthly_rent_cents').eq('organization_id', organizationId),
      supabase.from('rent_payments').select('amount_cents, status, payment_date').eq('organization_id', organizationId).gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('payment_schedules').select('is_paid, due_amount, payment_date, paid_date').gte('payment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('expenses').select('amount_cents, expense_date').eq('organization_id', organizationId).gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('maintenance_requests').select('status, requested_date, assigned_at').eq('organization_id', organizationId),
    ]);

    const properties = propertiesData.data || [];
    const leases = leasesData.data || [];
    const payments = paymentsData.data || [];
    const schedules = schedulesData.data || [];
    const expenses = expensesData.data || [];
    const maintenance = maintenanceData.data || [];

    const totalUnits = properties.length * 10;
    const activeLeases = leases.filter(l => l.status === 'active');
    const occupiedUnits = activeLeases.length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const totalDuePayments = schedules.length;
    const paidOnTime = schedules.filter((s: any) => {
      if (!s.is_paid || !s.paid_date) return false;
      const dueDate = new Date(s.payment_date);
      const paidDate = new Date(s.paid_date);
      return paidDate <= dueDate;
    }).length;
    const collectionRate = totalDuePayments > 0 ? (paidOnTime / totalDuePayments) * 100 : 100;

    const latePayments = schedules.filter((s: any) => {
      if (!s.is_paid) return false;
      if (!s.paid_date) return false;
      const dueDate = new Date(s.payment_date);
      const paidDate = new Date(s.paid_date);
      return paidDate > dueDate;
    }).length;

    const monthlyIncome = activeLeases.reduce((sum, l) => sum + ((l.monthly_rent_cents || 0) / 100), 0);
    const monthlyExpenses = expenses.reduce((sum, e) => sum + ((e.amount_cents || 0) / 100), 0);

    const openMaintenance = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled').length;
    const acknowledgedMaintenance = maintenance.filter(m => m.assigned_at);
    const maintenanceResponseTimes = acknowledgedMaintenance.map((m: any) => {
      const submitted = new Date(m.requested_date);
      const acknowledged = new Date(m.assigned_at);
      return (acknowledged.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgMaintenanceResponseDays = maintenanceResponseTimes.length > 0
      ? maintenanceResponseTimes.reduce((a, b) => a + b, 0) / maintenanceResponseTimes.length
      : 0;
    const maintenanceResponseRate = avgMaintenanceResponseDays < 2 ? 95 : avgMaintenanceResponseDays < 5 ? 75 : 50;

    const netIncome = monthlyIncome - monthlyExpenses;
    const roiPercentage = monthlyIncome > 0 ? (netIncome / monthlyIncome) * 100 : 0;

    let healthScore = 0;
    healthScore += occupancyRate * 0.30;
    healthScore += collectionRate * 0.35;
    healthScore += maintenanceResponseRate * 0.15;
    healthScore += Math.min(roiPercentage * 2, 20);

    const recommendations: string[] = [];
    if (occupancyRate < 80) {
      recommendations.push('Occupancy below optimal. Consider marketing vacant units or adjusting pricing.');
    }
    if (collectionRate < 90) {
      recommendations.push('Collection rate needs improvement. Implement automated payment reminders.');
    }
    if (avgMaintenanceResponseDays > 3) {
      recommendations.push('Maintenance response time is slow. Consider hiring additional vendors.');
    }
    if (roiPercentage < 10) {
      recommendations.push('ROI is low. Review expenses and consider rent adjustments.');
    }
    if (latePayments > totalDuePayments * 0.2) {
      recommendations.push('High rate of late payments. Review tenant screening process.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Portfolio is performing well. Continue current management practices.');
    }

    let healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 90) healthLevel = 'excellent';
    else if (healthScore >= 75) healthLevel = 'good';
    else if (healthScore >= 60) healthLevel = 'fair';
    else if (healthScore >= 40) healthLevel = 'poor';
    else healthLevel = 'critical';

    return {
      health_score: Math.round(healthScore),
      health_level: healthLevel,
      occupancy_rate: Math.round(occupancyRate * 10) / 10,
      collection_rate: Math.round(collectionRate * 10) / 10,
      maintenance_response_rate: Math.round(maintenanceResponseRate),
      tenant_satisfaction_score: Math.min(collectionRate, maintenanceResponseRate),
      roi_percentage: Math.round(roiPercentage * 10) / 10,
      recommendations,
      metrics: {
        total_properties: properties.length,
        occupied_units: occupiedUnits,
        total_units: totalUnits,
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        late_payments: latePayments,
        total_due_payments: totalDuePayments,
        open_maintenance: openMaintenance,
        avg_maintenance_response_days: Math.round(avgMaintenanceResponseDays * 10) / 10,
      },
    };
  },
};
