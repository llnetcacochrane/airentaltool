import { supabase } from '../lib/supabase';
import { paymentService } from './paymentService';
import { expenseService } from './expenseService';
import { aiService } from './aiService';

export const financialService = {
  async getPortfolioSummary(organizationId: string) {
    // Get all active leases
    const { data: leases, error: leaseError } = await supabase
      .from('leases')
      .select('id, monthly_rent_cents, start_date, end_date, status')
      .eq('organization_id', organizationId);

    if (leaseError) throw leaseError;

    // Calculate total expected monthly income
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let totalMonthlyRent = 0;
    let activeLeases = 0;

    if (leases) {
      for (const lease of leases) {
        const startDate = new Date(lease.start_date);
        const endDate = new Date(lease.end_date);

        if (startDate <= today && endDate >= today && lease.status === 'active') {
          totalMonthlyRent += (lease.monthly_rent_cents || 0) / 100;
          activeLeases++;
        }
      }
    }

    // Get actual income this month
    const actualIncome = await paymentService.getMonthlyIncome(organizationId, currentMonth);

    // Get total expenses this month
    const [year, month] = currentMonth.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const monthStart = `${currentMonth}-01`;
    const monthEnd = `${currentMonth}-${lastDay}`;
    const totalExpenses = await expenseService.getTotalExpenses(organizationId, {
      startDate: monthStart,
      endDate: monthEnd,
    });

    // Calculate net income
    const netIncome = actualIncome - totalExpenses;

    // Get outstanding payments
    const { data: outstanding } = await supabase
      .from('payment_schedules')
      .select('due_amount, paid_amount')
      .in('lease_id', leases?.map((l) => l.id) || [])
      .eq('is_paid', false);

    let totalOutstanding = 0;
    if (outstanding) {
      totalOutstanding = outstanding.reduce((sum, payment) => {
        return sum + (payment.due_amount - (payment.paid_amount || 0));
      }, 0);
    }

    // Get total properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId);

    // Get total tenants
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      totalProperties: properties?.length || 0,
      totalTenants: tenants?.length || 0,
      activeLeases,
      expectedMonthlyIncome: totalMonthlyRent,
      actualMonthlyIncome: actualIncome,
      monthlyExpenses: totalExpenses,
      netMonthlyIncome: netIncome,
      outstandingPayments: totalOutstanding,
      collectionRate: totalMonthlyRent > 0 ? (actualIncome / totalMonthlyRent) * 100 : 0,
    };
  },

  async getPropertyFinancials(propertyId: string, startDate: string, endDate: string) {
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .eq('property_id', propertyId);

    if (!units || units.length === 0) return null;

    const unitIds = units.map(u => u.id);

    const { data: leases } = await supabase
      .from('leases')
      .select('id, monthly_rent_cents, unit_id')
      .in('unit_id', unitIds);

    if (!leases) return null;

    let totalIncome = 0;
    let totalExpenses = 0;
    const leaseDetails = [];

    for (const lease of leases) {
      const { data: payments } = await supabase
        .from('rent_payments')
        .select('amount_cents')
        .eq('lease_id', lease.id)
        .eq('status', 'paid')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      const leaseIncome = payments?.reduce((sum, p) => sum + (p.amount_cents || 0) / 100, 0) || 0;
      totalIncome += leaseIncome;

      const { data: tenant } = await supabase
        .from('tenants')
        .select('first_name, last_name')
        .eq('unit_id', lease.unit_id)
        .eq('is_active', true)
        .maybeSingle();

      leaseDetails.push({
        leaseId: lease.id,
        tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
        monthlyRent: (lease.monthly_rent_cents || 0) / 100,
        income: leaseIncome,
      });
    }

    // Get expenses for this property
    totalExpenses = await expenseService.getTotalExpenses(propertyId, {
      startDate,
      endDate,
    });

    return {
      propertyId,
      period: { start: startDate, end: endDate },
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      leaseDetails,
    };
  },

  async getExpenseReport(organizationId: string, startDate: string, endDate: string) {
    const expensesByCategory = await expenseService.getExpensesByCategory(organizationId, startDate, endDate);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('category');

    const total = Object.values(expensesByCategory).reduce((sum: number, amount: number) => sum + amount, 0);

    return {
      period: { start: startDate, end: endDate },
      total,
      byCategory: expensesByCategory,
      expenses: expenses || [],
    };
  },

  async getIncomeReport(organizationId: string, startDate: string, endDate: string) {
    const { data: payments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false });

    const total = payments?.reduce((sum, p) => sum + (p.amount_cents || 0) / 100, 0) || 0;

    return {
      period: { start: startDate, end: endDate },
      total,
      paymentCount: payments?.length || 0,
      payments: payments || [],
      averagePayment: payments?.length ? total / payments.length : 0,
    };
  },

  calculateLateFeesForLease(monthlyRent: number, lateDays: number, lateFeeType: 'fixed' | 'percentage', feeAmount?: number, feePercentage?: number): number {
    if (lateDays <= 0) return 0;

    switch (lateFeeType) {
      case 'fixed':
        return feeAmount || 0;
      case 'percentage':
        return (monthlyRent * (feePercentage || 5)) / 100;
      default:
        return 0;
    }
  },

  async generateTaxReport(organizationId: string, year: string) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const incomeReport = await this.getIncomeReport(organizationId, startDate, endDate);
    const expenseReport = await this.getExpenseReport(organizationId, startDate, endDate);

    return {
      year,
      totalIncome: incomeReport.total,
      totalExpenses: expenseReport.total,
      netIncome: incomeReport.total - expenseReport.total,
      expensesByCategory: expenseReport.byCategory,
      properties: await supabase
        .from('properties')
        .select('id, name, address')
        .eq('organization_id', organizationId),
    };
  },

  async generateAISummary(organizationId: string, summaryData: any): Promise<string> {
    try {
      const systemPrompt = `You are a financial analyst specializing in property management. Provide clear, actionable insights on financial performance in plain English.`;

      const userPrompt = `Analyze this property portfolio's financial performance:

Total Properties: ${summaryData.totalProperties}
Active Leases: ${summaryData.activeLeases}
Total Tenants: ${summaryData.totalTenants}

Expected Monthly Income: $${summaryData.expectedMonthlyIncome?.toLocaleString()}
Actual Monthly Income: $${summaryData.actualMonthlyIncome?.toLocaleString()}
Monthly Expenses: $${summaryData.monthlyExpenses?.toLocaleString()}
Net Monthly Income: $${summaryData.netMonthlyIncome?.toLocaleString()}

Collection Rate: ${summaryData.collectionRate?.toFixed(1)}%
Outstanding Payments: $${summaryData.outstandingPayments?.toLocaleString()}

Provide a 2-3 paragraph executive summary that:
1. Highlights overall financial health
2. Identifies key strengths and concerns
3. Offers 1-2 actionable recommendations

Write in a professional but conversational tone.`;

      const response = await aiService.generateCompletion({
        featureName: 'financial_reporting',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 400,
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      return '';
    }
  },

  async generateExpenseInsights(organizationId: string, expenseData: any): Promise<string> {
    try {
      const systemPrompt = `You are a financial analyst helping property managers optimize their expenses. Provide practical advice on cost management.`;

      const topCategories = Object.entries(expenseData.byCategory || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5);

      const userPrompt = `Analyze these property management expenses:

Period: ${expenseData.period.start} to ${expenseData.period.end}
Total Expenses: $${expenseData.total?.toLocaleString()}

Top Expense Categories:
${topCategories.map(([cat, amount]: any) => `- ${cat}: $${amount.toLocaleString()}`).join('\n')}

Provide a brief analysis (2-3 paragraphs) that:
1. Comments on expense distribution
2. Identifies any categories that seem high
3. Suggests 1-2 ways to optimize costs`;

      const response = await aiService.generateCompletion({
        featureName: 'expense_analysis',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 350,
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      console.error('Failed to generate expense insights:', error);
      return '';
    }
  },
};
