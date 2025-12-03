import { supabase } from '../lib/supabase';
import { Expense } from '../types';

export const expenseService = {
  async createExpense(organizationId: string, expense: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        organization_id: organizationId,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getExpenses(organizationId: string, filters?: any): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', organizationId);

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
    let query = supabase
      .from('expenses')
      .select('amount')
      .eq('organization_id', organizationId);

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

    return (data || []).reduce((total, expense) => total + expense.amount, 0);
  },

  async getExpensesByCategory(organizationId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('organization_id', organizationId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (error) throw error;

    const categorized: Record<string, number> = {};
    (data || []).forEach((expense) => {
      categorized[expense.category] = (categorized[expense.category] || 0) + expense.amount;
    });

    return categorized;
  },
};
