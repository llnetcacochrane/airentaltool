import { supabase } from '../lib/supabase';
import { Tenant, Lease } from '../types';
import { portfolioService } from './portfolioService';

export const tenantService = {
  async getPortfolioTenants(portfolioId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('is_active', true)
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async getAllUserTenants(): Promise<Tenant[]> {
    const defaultPortfolio = await portfolioService.getUserDefaultPortfolio();
    if (!defaultPortfolio) return [];

    return this.getPortfolioTenants(defaultPortfolio.id);
  },

  async getTenantsByUnit(unitId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('tenant_type');

    if (error) throw error;
    return data || [];
  },

  async getTenant(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createTenant(organizationId: string, unitId: string, tenant: Partial<Tenant>): Promise<Tenant> {
    const canAdd = await addonService.checkLimit(organizationId, 'tenant');
    if (!canAdd) {
      throw new Error('LIMIT_REACHED:tenant');
    }

    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('tenants')
      .insert({
        organization_id: organizationId,
        unit_id: unitId,
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        email: tenant.email,
        phone: tenant.phone,
        emergency_contact_name: tenant.emergency_contact_name,
        emergency_contact_phone: tenant.emergency_contact_phone,
        emergency_contact_relationship: tenant.emergency_contact_relationship,
        employer: tenant.employer,
        employer_phone: tenant.employer_phone,
        monthly_income_cents: tenant.monthly_income_cents,
        tenant_type: tenant.tenant_type || 'primary',
        lease_start_date: tenant.lease_start_date,
        lease_end_date: tenant.lease_end_date,
        monthly_rent_cents: tenant.monthly_rent_cents,
        security_deposit_paid_cents: tenant.security_deposit_paid_cents || 0,
        move_in_date: tenant.move_in_date,
        move_out_date: tenant.move_out_date,
        has_portal_access: tenant.has_portal_access ?? true,
        status: tenant.status || 'active',
        notes: tenant.notes,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-update unit occupancy status to 'occupied'
    if (tenant.tenant_type === 'primary' || tenant.tenant_type === 'co_tenant') {
      await supabase
        .from('units')
        .update({ occupancy_status: 'occupied' })
        .eq('id', unitId);
    }

    return data;
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({
        unit_id: updates.unit_id,
        first_name: updates.first_name,
        last_name: updates.last_name,
        email: updates.email,
        phone: updates.phone,
        emergency_contact_name: updates.emergency_contact_name,
        emergency_contact_phone: updates.emergency_contact_phone,
        emergency_contact_relationship: updates.emergency_contact_relationship,
        employer: updates.employer,
        employer_phone: updates.employer_phone,
        monthly_income_cents: updates.monthly_income_cents,
        tenant_type: updates.tenant_type,
        lease_start_date: updates.lease_start_date,
        lease_end_date: updates.lease_end_date,
        monthly_rent_cents: updates.monthly_rent_cents,
        security_deposit_paid_cents: updates.security_deposit_paid_cents,
        move_in_date: updates.move_in_date,
        move_out_date: updates.move_out_date,
        has_portal_access: updates.has_portal_access,
        status: updates.status,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTenant(id: string): Promise<void> {
    // Get tenant to find unit_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('unit_id, tenant_type')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('tenants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // Check if there are any other active tenants in the unit
    if (tenant?.unit_id) {
      const { data: remainingTenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('unit_id', tenant.unit_id)
        .eq('is_active', true)
        .neq('id', id);

      // If no active tenants remain, mark unit as vacant
      if (!remainingTenants || remainingTenants.length === 0) {
        await supabase
          .from('units')
          .update({ occupancy_status: 'vacant' })
          .eq('id', tenant.unit_id);
      }
    }
  },

  async getActiveTenants(organizationId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async getTenantLease(unitId: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async searchTenants(organizationId: string, searchTerm: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('last_name');

    if (error) throw error;
    return data || [];
  },

  async inviteTenantToPortal(tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({
        portal_invite_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) throw error;
  },

  async getTenantStats(tenantId: string): Promise<{
    payments_made: number;
    payments_pending: number;
    total_paid_cents: number;
    maintenance_requests: number;
    lease_end_date?: string;
  }> {
    const [paymentsData, maintenanceCount, lease] = await Promise.all([
      supabase
        .from('rent_payments')
        .select('status, amount_cents')
        .eq('tenant_id', tenantId),
      supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabase
        .from('tenants')
        .select('lease_end_date')
        .eq('id', tenantId)
        .maybeSingle(),
    ]);

    const payments = paymentsData.data || [];
    const paid = payments.filter(p => p.status === 'paid');
    const pending = payments.filter(p => p.status === 'pending');
    const totalPaid = paid.reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    return {
      payments_made: paid.length,
      payments_pending: pending.length,
      total_paid_cents: totalPaid,
      maintenance_requests: maintenanceCount.count || 0,
      lease_end_date: lease.data?.lease_end_date,
    };
  },
};
