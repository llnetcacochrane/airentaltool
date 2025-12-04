import { supabase } from '../lib/supabase';
import { aiService } from './aiService';

export interface PaymentRiskScore {
  tenant_id: string;
  tenant_name: string;
  unit_number: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  total_payments: number;
  late_payments: number;
  on_time_percentage: number;
  average_days_late: number;
  last_payment_date: string | null;
  next_payment_due: string | null;
  outstanding_balance: number;
  recommendation: string;
  ai_insights?: string;
}

export interface CashFlowForecast {
  month: string;
  expected_income: number;
  expected_expenses: number;
  net_cash_flow: number;
  confidence_level: number;
}

export const paymentPredictionService = {
  async calculateTenantRiskScores(organizationId: string): Promise<PaymentRiskScore[]> {
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, unit_id, monthly_rent_cents, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (leasesError) throw leasesError;
    if (!leases || leases.length === 0) return [];

    const riskScores: PaymentRiskScore[] = [];

    for (const lease of leases) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, email')
        .eq('unit_id', lease.unit_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!tenant) continue;

      const { data: unit } = await supabase
        .from('units')
        .select('unit_number')
        .eq('id', lease.unit_id)
        .single();

      if (!unit) continue;

      const { data: payments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select('payment_date, amount_cents, status')
        .eq('lease_id', lease.id)
        .order('payment_date', { ascending: false });

      if (paymentsError) continue;

      const { data: schedules, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('payment_date, due_amount, is_paid, paid_date')
        .eq('lease_id', lease.id)
        .order('payment_date', { ascending: false });

      if (schedulesError) continue;

      const totalPayments = schedules?.length || 0;
      const latePayments = schedules?.filter((s: any) => {
        if (!s.is_paid || !s.paid_date) return false;
        const dueDate = new Date(s.payment_date);
        const paidDate = new Date(s.paid_date);
        return paidDate > dueDate;
      }).length || 0;

      const daysLateArray = schedules
        ?.filter((s: any) => s.is_paid && s.paid_date)
        .map((s: any) => {
          const dueDate = new Date(s.payment_date);
          const paidDate = new Date(s.paid_date);
          const diffTime = paidDate.getTime() - dueDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays : 0;
        }) || [];

      const averageDaysLate = daysLateArray.length > 0
        ? daysLateArray.reduce((a, b) => a + b, 0) / daysLateArray.length
        : 0;

      const onTimePercentage = totalPayments > 0
        ? ((totalPayments - latePayments) / totalPayments) * 100
        : 100;

      const outstandingSchedules = schedules?.filter((s: any) => !s.is_paid) || [];
      const outstandingBalance = outstandingSchedules.reduce((sum: number, s: any) => sum + (s.due_amount || 0), 0);

      const nextDue = schedules?.find((s: any) => !s.is_paid && new Date(s.payment_date) >= new Date());
      const lastPayment = payments?.[0];

      let riskScore = 0;
      if (onTimePercentage < 50) riskScore += 40;
      else if (onTimePercentage < 70) riskScore += 30;
      else if (onTimePercentage < 85) riskScore += 15;

      if (averageDaysLate > 10) riskScore += 30;
      else if (averageDaysLate > 5) riskScore += 20;
      else if (averageDaysLate > 2) riskScore += 10;

      const monthlyRent = (lease.monthly_rent_cents || 0) / 100;
      if (outstandingBalance > monthlyRent * 2) riskScore += 30;
      else if (outstandingBalance > monthlyRent) riskScore += 15;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      let recommendation: string;

      if (riskScore >= 70) {
        riskLevel = 'critical';
        recommendation = 'Immediate action required. Consider payment plan or legal consultation.';
      } else if (riskScore >= 45) {
        riskLevel = 'high';
        recommendation = 'Send urgent payment reminder. Schedule meeting to discuss payment options.';
      } else if (riskScore >= 20) {
        riskLevel = 'medium';
        recommendation = 'Send payment reminder 5 days before due date. Monitor closely.';
      } else {
        riskLevel = 'low';
        recommendation = 'Tenant has good payment history. Continue standard reminders.';
      }

      riskScores.push({
        tenant_id: tenant.id,
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        unit_number: unit.unit_number,
        risk_score: Math.min(riskScore, 100),
        risk_level: riskLevel,
        total_payments: totalPayments,
        late_payments: latePayments,
        on_time_percentage: Math.round(onTimePercentage),
        average_days_late: Math.round(averageDaysLate * 10) / 10,
        last_payment_date: lastPayment?.payment_date || null,
        next_payment_due: nextDue?.payment_date || null,
        outstanding_balance: outstandingBalance,
        recommendation,
      });
    }

    return riskScores.sort((a, b) => b.risk_score - a.risk_score);
  },

  async forecastCashFlow(organizationId: string, months: number = 6): Promise<CashFlowForecast[]> {
    const forecasts: CashFlowForecast[] = [];
    const today = new Date();

    const { data: leases } = await supabase
      .from('leases')
      .select('monthly_rent, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    const totalMonthlyRent = leases?.reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0) || 0;

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('organization_id', organizationId)
      .gte('expense_date', new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString());

    const monthlyExpenses = expenses?.reduce((acc: any, expense: any) => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + (expense.amount || 0);
      return acc;
    }, {}) || {};

    const avgMonthlyExpenses = Object.values(monthlyExpenses).length > 0
      ? (Object.values(monthlyExpenses) as number[]).reduce((a, b) => a + b, 0) / Object.values(monthlyExpenses).length
      : totalMonthlyRent * 0.3;

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const expectedIncome = totalMonthlyRent * 0.95;
      const expectedExpenses = avgMonthlyExpenses * (1 + (Math.random() * 0.2 - 0.1));
      const netCashFlow = expectedIncome - expectedExpenses;
      const confidenceLevel = Math.max(60, 95 - (i * 5));

      forecasts.push({
        month: monthKey,
        expected_income: Math.round(expectedIncome * 100) / 100,
        expected_expenses: Math.round(expectedExpenses * 100) / 100,
        net_cash_flow: Math.round(netCashFlow * 100) / 100,
        confidence_level: confidenceLevel,
      });
    }

    return forecasts;
  },

  async getUpcomingPaymentReminders(organizationId: string, daysAhead: number = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('payment_schedules')
      .select(`
        id,
        payment_date,
        due_amount,
        is_paid,
        lease:leases (
          id,
          tenant:tenants (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .gte('payment_date', today.toISOString().split('T')[0])
      .lte('payment_date', futureDate.toISOString().split('T')[0])
      .eq('is_paid', false);

    if (error) throw error;

    return data || [];
  },

  async generateRiskInsights(
    riskScore: PaymentRiskScore,
    organizationId: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a financial analyst specializing in tenant payment behavior. Provide practical, empathetic insights on payment risk management.`;

      const userPrompt = `Analyze this tenant's payment behavior:

Tenant: ${riskScore.tenant_name}
Risk Score: ${riskScore.risk_score}/100
Risk Level: ${riskScore.risk_level}

Payment History:
- Total Payments: ${riskScore.total_payments}
- Late Payments: ${riskScore.late_payments}
- On-Time Percentage: ${riskScore.on_time_percentage}%
- Average Days Late: ${riskScore.average_days_late}
- Outstanding Balance: $${riskScore.outstanding_balance.toLocaleString()}

Last Payment: ${riskScore.last_payment_date || 'None recorded'}
Next Payment Due: ${riskScore.next_payment_due || 'None scheduled'}

Current Recommendation: ${riskScore.recommendation}

Provide a brief analysis (2-3 paragraphs) that:
1. Explains the payment patterns in context
2. Identifies root causes or trends
3. Suggests specific actions the landlord should take`;

      const response = await aiService.generateCompletion({
        featureName: 'payment_risk_analysis',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 350,
        temperature: 0.6,
      });

      return response.content;
    } catch (error) {
      console.error('Failed to generate risk insights:', error);
      return '';
    }
  },

  async generateCashFlowNarrative(
    forecasts: CashFlowForecast[],
    organizationId: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a financial analyst helping property managers understand their cash flow projections.`;

      const forecastSummary = forecasts.map(f =>
        `${f.month}: Income $${f.expected_income.toLocaleString()}, Expenses $${f.expected_expenses.toLocaleString()}, Net $${f.net_cash_flow.toLocaleString()} (${f.confidence_level}% confidence)`
      ).join('\n');

      const userPrompt = `Analyze this ${forecasts.length}-month cash flow forecast:

${forecastSummary}

Provide a 2-3 paragraph analysis that:
1. Summarizes the overall cash flow trend
2. Highlights any months of concern
3. Offers 1-2 strategic recommendations for cash flow optimization

Be specific and actionable.`;

      const response = await aiService.generateCompletion({
        featureName: 'cashflow_analysis',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 350,
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      console.error('Failed to generate cash flow narrative:', error);
      return '';
    }
  },
};
