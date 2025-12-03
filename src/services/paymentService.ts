import { supabase } from '../lib/supabase';
import { Payment, PaymentSchedule, PaymentMethod, PaymentGateway } from '../types';

export const paymentService = {
  async createPaymentSchedule(leaseId: string, schedules: Partial<PaymentSchedule>[]) {
    const { data, error } = await supabase
      .from('payment_schedules')
      .insert(schedules.map((s) => ({ ...s, lease_id: leaseId })))
      .select();

    if (error) throw error;
    return data;
  },

  async getPaymentSchedules(leaseId: string, filters?: any): Promise<PaymentSchedule[]> {
    let query = supabase
      .from('payment_schedules')
      .select('*')
      .eq('lease_id', leaseId);

    if (filters?.isPaid !== undefined) {
      query = query.eq('is_paid', filters.isPaid);
    }

    const { data, error } = await query.order('payment_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getOutstandingPayments(organizationId: string): Promise<PaymentSchedule[]> {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select(`
        *,
        leases(id, tenant_id, property_id, monthly_rent)
      `)
      .eq('leases.organization_id', organizationId)
      .eq('is_paid', false)
      .lt('payment_date', new Date().toISOString().split('T')[0])
      .order('payment_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async recordPayment(organizationId: string, payment: Partial<Payment>) {
    const { data, error } = await supabase
      .from('rent_payments')
      .insert({
        ...payment,
        organization_id: organizationId,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    // If lease_id is provided, update payment schedule
    if (data && payment.lease_id) {
      // Find payment schedule for this lease and date
      const scheduleData = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('lease_id', payment.lease_id)
        .maybeSingle();

      if (scheduleData.data) {
        const newPaidAmount = (scheduleData.data.paid_amount || 0) + ((payment.amount_cents || 0) / 100);
        const isPaid = newPaidAmount >= scheduleData.data.due_amount;

        await supabase
          .from('payment_schedules')
          .update({
            paid_amount: newPaidAmount,
            is_paid: isPaid,
          })
          .eq('id', scheduleData.data.id);
      }
    }

    return data;
  },

  async getPayments(organizationId: string, filters?: any): Promise<Payment[]> {
    let query = supabase
      .from('rent_payments')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.leaseId) {
      query = query.eq('lease_id', filters.leaseId);
    }

    if (filters?.status) {
      query = query.eq('payment_status', filters.status);
    }

    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPaymentHistory(leaseId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', leaseId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPaymentMethods(organizationId: string): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  async createPaymentMethod(organizationId: string, method: Partial<PaymentMethod>) {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        ...method,
        organization_id: organizationId,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPaymentGateways(organizationId: string): Promise<PaymentGateway[]> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    return data || [];
  },

  async configurePaymentGateway(organizationId: string, gateway: Partial<PaymentGateway>) {
    const { data: existing } = await supabase
      .from('payment_gateways')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('gateway_name', gateway.gateway_name || '')
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('payment_gateways')
        .update(gateway)
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('payment_gateways')
        .insert({
          ...gateway,
          organization_id: organizationId,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      result = data;
    }

    return result;
  },

  async getTenantOutstandingBalance(leaseId: string): Promise<number> {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('due_amount, paid_amount')
      .eq('lease_id', leaseId)
      .eq('is_paid', false);

    if (error) throw error;

    return (data || []).reduce((total, schedule) => {
      return total + (schedule.due_amount - (schedule.paid_amount || 0));
    }, 0);
  },

  async getMonthlyIncome(organizationId: string, month: string): Promise<number> {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-');
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const endDate = `${month}-${lastDay}`;

    const { data, error} = await supabase
      .from('rent_payments')
      .select('amount')
      .eq('organization_id', organizationId)
      .eq('payment_status', 'completed')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    if (error) throw error;

    return (data || []).reduce((total, payment) => total + payment.amount, 0);
  },
};
