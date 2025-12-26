import { supabase } from '../lib/supabase';
import { Expense } from '../types';

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
