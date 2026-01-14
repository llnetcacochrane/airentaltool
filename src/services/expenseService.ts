import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { journalService } from './journalService';
import { glAccountService } from './glAccountService';

// Helper function to post expense to GL
async function postExpenseToGL(businessId: string, expense: Expense): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return; // No user session
    }

    // Check if auto-posting is enabled for this business
    const { data: settings } = await supabase
      .from('business_accounting_settings')
      .select('auto_post_expenses, base_currency')
      .eq('business_id', businessId)
      .maybeSingle();

    if (!settings?.auto_post_expenses) {
      return; // Auto-posting disabled
    }

    // Check if chart of accounts is initialized
    const accounts = await glAccountService.getAccounts(businessId);
    if (accounts.length === 0) {
      return; // No chart of accounts yet
    }

    // Create journal entry from expense
    await journalService.createFromExpense(businessId, user.id, {
      id: expense.id,
      amountCents: expense.amount_cents || 0,
      expenseDate: expense.expense_date,
      category: expense.category,
      propertyId: expense.property_id,
      unitId: expense.unit_id,
    });
  } catch (error) {
    // Log but don't fail the expense if GL posting fails
    console.error('Failed to post expense to GL:', error);
  }
}

export const expenseService = {
  async createExpense(organizationId: string, expense: Partial<Expense>) {
    // organizationId parameter is actually businessId in business-centric model
    const businessId = organizationId;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        business_id: businessId,
        organization_id: null,
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    // Post to GL if auto-posting is enabled
    if (data) {
      await postExpenseToGL(businessId, data);
    }

    return data;
  },

  async getExpenses(organizationId: string, filters?: any): Promise<Expense[]> {
    // organizationId parameter is actually businessId in business-centric model
    const businessId = organizationId;

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId);

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate && filters?.endDate) {
      query = query.gte('expense_date', filters.startDate).lte('expense_date', filters.endDate);
    }

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getExpense(expenseId: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateExpense(expenseId: string, updates: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteExpense(expenseId: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async getTotalExpenses(organizationId: string, filters?: any): Promise<number> {
    // organizationId parameter is actually businessId in business-centric model
    const businessId = organizationId;

    let query = supabase
      .from('expenses')
      .select('amount_cents')
      .eq('business_id', businessId);

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.startDate && filters?.endDate) {
      query = query.gte('expense_date', filters.startDate).lte('expense_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).reduce((total, expense) => total + (expense.amount_cents || 0) / 100, 0);
  },

  async getExpensesByCategory(organizationId: string, startDate: string, endDate: string) {
    // organizationId parameter is actually businessId in business-centric model
    const businessId = organizationId;

    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount_cents')
      .eq('business_id', businessId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) throw error;

    const categorized: Record<string, number> = {};
    (data || []).forEach((expense) => {
      categorized[expense.category] = (categorized[expense.category] || 0) + ((expense.amount_cents || 0) / 100);
    });

    return categorized;
  },
};
