import { supabase } from '../lib/supabase';
import { Budget, BudgetItem, BudgetStatus, GLAccount } from '../types';
import { glAccountService } from './glAccountService';

export interface BudgetFilters {
  fiscalYear?: number;
  status?: BudgetStatus;
  propertyId?: string | null;
}

export interface BudgetItemInput {
  accountId: string;
  periodAmounts: number[]; // Array of 12 period amounts in cents
  notes?: string;
}

export interface BudgetVariance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  budgetedCents: number;
  actualCents: number;
  varianceCents: number;
  variancePercent: number;
  isFavorable: boolean;
}

export interface BudgetVarianceReport {
  budget: Budget;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  periodNumber?: number;
  items: BudgetVariance[];
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
}

export const budgetService = {
  // ========================================
  // Budget CRUD Operations
  // ========================================

  /**
   * Create a new budget
   */
  async createBudget(
    businessId: string,
    budget: {
      budgetName: string;
      fiscalYear: number;
      budgetType?: 'annual' | 'quarterly' | 'monthly';
      propertyId?: string;
      currencyCode: string;
      notes?: string;
    }
  ): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        business_id: businessId,
        budget_name: budget.budgetName,
        fiscal_year: budget.fiscalYear,
        budget_type: budget.budgetType || 'annual',
        property_id: budget.propertyId,
        currency_code: budget.currencyCode,
        status: 'draft',
        notes: budget.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all budgets for a business
   */
  async getBudgets(
    businessId: string,
    filters?: BudgetFilters
  ): Promise<Budget[]> {
    let query = supabase
      .from('budgets')
      .select('*')
      .eq('business_id', businessId)
      .order('fiscal_year', { ascending: false })
      .order('budget_name');

    if (filters?.fiscalYear !== undefined) {
      query = query.eq('fiscal_year', filters.fiscalYear);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.propertyId !== undefined) {
      if (filters.propertyId === null) {
        query = query.is('property_id', null);
      } else {
        query = query.eq('property_id', filters.propertyId);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a budget by ID with its items
   */
  async getBudgetById(
    budgetId: string
  ): Promise<{ budget: Budget; items: BudgetItem[] } | null> {
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .maybeSingle();

    if (budgetError) throw budgetError;
    if (!budget) return null;

    const { data: items, error: itemsError } = await supabase
      .from('budget_items')
      .select('*, gl_accounts(account_number, account_name, account_type)')
      .eq('budget_id', budgetId)
      .order('gl_accounts(account_number)');

    if (itemsError) throw itemsError;

    return { budget, items: items || [] };
  },

  /**
   * Update a budget
   */
  async updateBudget(
    budgetId: string,
    updates: Partial<Budget>
  ): Promise<Budget> {
    // Only allow updates to draft budgets
    const existing = await this.getBudgetById(budgetId);
    if (!existing) {
      throw new Error('Budget not found');
    }

    if (existing.budget.status !== 'draft') {
      throw new Error('Can only update draft budgets');
    }

    const { id, business_id, created_at, ...safeUpdates } = updates as any;

    const { data, error } = await supabase
      .from('budgets')
      .update(safeUpdates)
      .eq('id', budgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a budget
   */
  async deleteBudget(budgetId: string): Promise<void> {
    const existing = await this.getBudgetById(budgetId);
    if (!existing) {
      throw new Error('Budget not found');
    }

    if (existing.budget.status !== 'draft') {
      throw new Error('Can only delete draft budgets');
    }

    const { error } = await supabase.from('budgets').delete().eq('id', budgetId);

    if (error) throw error;
  },

  // ========================================
  // Budget Item Operations
  // ========================================

  /**
   * Add or update budget items
   */
  async upsertBudgetItems(
    budgetId: string,
    items: BudgetItemInput[]
  ): Promise<BudgetItem[]> {
    // Verify budget is in draft status
    const existing = await this.getBudgetById(budgetId);
    if (!existing) {
      throw new Error('Budget not found');
    }

    if (existing.budget.status !== 'draft') {
      throw new Error('Can only modify draft budgets');
    }

    // Upsert items
    const upsertData = items.map((item) => ({
      budget_id: budgetId,
      account_id: item.accountId,
      period_1_cents: item.periodAmounts[0] || 0,
      period_2_cents: item.periodAmounts[1] || 0,
      period_3_cents: item.periodAmounts[2] || 0,
      period_4_cents: item.periodAmounts[3] || 0,
      period_5_cents: item.periodAmounts[4] || 0,
      period_6_cents: item.periodAmounts[5] || 0,
      period_7_cents: item.periodAmounts[6] || 0,
      period_8_cents: item.periodAmounts[7] || 0,
      period_9_cents: item.periodAmounts[8] || 0,
      period_10_cents: item.periodAmounts[9] || 0,
      period_11_cents: item.periodAmounts[10] || 0,
      period_12_cents: item.periodAmounts[11] || 0,
      notes: item.notes,
    }));

    const { data, error } = await supabase
      .from('budget_items')
      .upsert(upsertData, { onConflict: 'budget_id,account_id' })
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete a budget item
   */
  async deleteBudgetItem(budgetItemId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_items')
      .delete()
      .eq('id', budgetItemId);

    if (error) throw error;
  },

  /**
   * Get budget item totals
   */
  async getBudgetTotals(budgetId: string): Promise<{
    totalBudgetCents: number;
    periodTotals: number[];
    accountTypeTotals: Record<string, number>;
  }> {
    const result = await this.getBudgetById(budgetId);
    if (!result) {
      throw new Error('Budget not found');
    }

    const periodTotals = new Array(12).fill(0);
    let totalBudgetCents = 0;
    const accountTypeTotals: Record<string, number> = {
      revenue: 0,
      expense: 0,
    };

    for (const item of result.items) {
      const amounts = [
        item.period_1_cents ?? 0,
        item.period_2_cents ?? 0,
        item.period_3_cents ?? 0,
        item.period_4_cents ?? 0,
        item.period_5_cents ?? 0,
        item.period_6_cents ?? 0,
        item.period_7_cents ?? 0,
        item.period_8_cents ?? 0,
        item.period_9_cents ?? 0,
        item.period_10_cents ?? 0,
        item.period_11_cents ?? 0,
        item.period_12_cents ?? 0,
      ];

      for (let i = 0; i < 12; i++) {
        const amount = amounts[i] ?? 0;
        periodTotals[i] += amount;
        totalBudgetCents += amount;
      }

      const account = (item as any).gl_accounts;
      if (account) {
        const type = account.account_type as string;
        if (accountTypeTotals[type] !== undefined) {
          accountTypeTotals[type] += amounts.reduce((a, b) => a + b, 0);
        }
      }
    }

    return { totalBudgetCents, periodTotals, accountTypeTotals };
  },

  // ========================================
  // Budget Approval & Status
  // ========================================

  /**
   * Approve a budget
   */
  async approveBudget(budgetId: string, userId: string): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
      })
      .eq('id', budgetId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Close a budget (after fiscal year end)
   */
  async closeBudget(budgetId: string): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update({ status: 'closed' })
      .eq('id', budgetId)
      .eq('status', 'approved')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Copy budget to new fiscal year
   */
  async copyBudget(
    sourceBudgetId: string,
    newFiscalYear: number,
    adjustmentPercent: number = 0
  ): Promise<Budget> {
    const source = await this.getBudgetById(sourceBudgetId);
    if (!source) {
      throw new Error('Source budget not found');
    }

    // Create new budget
    const newBudget = await this.createBudget(source.budget.business_id, {
      budgetName: `${source.budget.budget_name} - ${newFiscalYear}`,
      fiscalYear: newFiscalYear,
      budgetType: source.budget.budget_type as any,
      propertyId: source.budget.property_id || undefined,
      currencyCode: source.budget.currency_code,
      notes: `Copied from ${source.budget.budget_name} with ${adjustmentPercent}% adjustment`,
    });

    // Copy items with adjustment
    const multiplier = 1 + adjustmentPercent / 100;
    const newItems: BudgetItemInput[] = source.items.map((item) => ({
      accountId: item.account_id,
      periodAmounts: [
        Math.round(item.period_1_cents * multiplier),
        Math.round(item.period_2_cents * multiplier),
        Math.round(item.period_3_cents * multiplier),
        Math.round(item.period_4_cents * multiplier),
        Math.round(item.period_5_cents * multiplier),
        Math.round(item.period_6_cents * multiplier),
        Math.round(item.period_7_cents * multiplier),
        Math.round(item.period_8_cents * multiplier),
        Math.round(item.period_9_cents * multiplier),
        Math.round(item.period_10_cents * multiplier),
        Math.round(item.period_11_cents * multiplier),
        Math.round(item.period_12_cents * multiplier),
      ],
      notes: item.notes || undefined,
    }));

    await this.upsertBudgetItems(newBudget.id, newItems);

    return newBudget;
  },

  // ========================================
  // Budget vs Actual Variance
  // ========================================

  /**
   * Calculate budget vs actual variance for a period or full year
   */
  async calculateVariance(
    budgetId: string,
    options?: {
      periodNumber?: number; // 1-12, or undefined for full year
      startDate?: string;
      endDate?: string;
    }
  ): Promise<BudgetVarianceReport> {
    const result = await this.getBudgetById(budgetId);
    if (!result) {
      throw new Error('Budget not found');
    }

    const { budget, items } = result;
    const businessId = budget.business_id;
    if (!businessId) {
      throw new Error('Budget has no associated business');
    }

    // Get accounts for the business
    const accounts = await glAccountService.getAccounts(businessId);
    const accountMap = new Map<string, GLAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    // Determine date range
    let startDate: string;
    let endDate: string;

    if (options?.startDate && options?.endDate) {
      startDate = options.startDate;
      endDate = options.endDate;
    } else if (options?.periodNumber) {
      // Calculate dates for specific period
      const periodStart = new Date(budget.fiscal_year, options.periodNumber - 1, 1);
      const periodEnd = new Date(budget.fiscal_year, options.periodNumber, 0);
      startDate = periodStart.toISOString().slice(0, 10);
      endDate = periodEnd.toISOString().slice(0, 10);
    } else {
      // Full year
      startDate = `${budget.fiscal_year}-01-01`;
      endDate = `${budget.fiscal_year}-12-31`;
    }

    // Get actual amounts from GL ledger
    const { data: actuals, error: actualsError } = await supabase
      .from('gl_ledger')
      .select('account_id, debit_cents, credit_cents')
      .eq('business_id', businessId)
      .gte('posting_date', startDate)
      .lte('posting_date', endDate);

    if (actualsError) throw actualsError;

    // Aggregate actuals by account
    const actualsByAccount = new Map<string, number>();
    for (const entry of actuals || []) {
      const existing = actualsByAccount.get(entry.account_id) || 0;
      const account = accountMap.get(entry.account_id);

      // Calculate balance based on normal balance
      let amount = entry.debit_cents - entry.credit_cents;
      if (account?.normal_balance === 'credit') {
        amount = -amount;
      }

      actualsByAccount.set(entry.account_id, existing + amount);
    }

    // Build variance items
    const varianceItems: BudgetVariance[] = [];
    let totalBudgeted = 0;
    let totalActual = 0;

    for (const item of items) {
      const account = accountMap.get(item.account_id);
      if (!account) continue;

      // Calculate budgeted amount for period(s)
      let budgetedCents = 0;
      if (options?.periodNumber) {
        const periodKey = `period_${options.periodNumber}_cents` as keyof BudgetItem;
        budgetedCents = (item[periodKey] as number) || 0;
      } else {
        // Sum all periods
        budgetedCents =
          item.period_1_cents +
          item.period_2_cents +
          item.period_3_cents +
          item.period_4_cents +
          item.period_5_cents +
          item.period_6_cents +
          item.period_7_cents +
          item.period_8_cents +
          item.period_9_cents +
          item.period_10_cents +
          item.period_11_cents +
          item.period_12_cents;
      }

      const actualCents = actualsByAccount.get(item.account_id) || 0;
      const varianceCents = budgetedCents - actualCents;
      const variancePercent =
        budgetedCents !== 0 ? (varianceCents / budgetedCents) * 100 : 0;

      // Determine if favorable
      // For expenses: under budget is favorable
      // For revenue: over budget is favorable
      const isFavorable =
        account.account_type === 'expense'
          ? actualCents < budgetedCents
          : actualCents > budgetedCents;

      varianceItems.push({
        accountId: item.account_id,
        accountNumber: account.account_number,
        accountName: account.account_name,
        accountType: account.account_type,
        budgetedCents,
        actualCents,
        varianceCents,
        variancePercent: Math.round(variancePercent * 100) / 100,
        isFavorable,
      });

      totalBudgeted += budgetedCents;
      totalActual += actualCents;
    }

    // Sort by account number
    varianceItems.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

    return {
      budget,
      fiscalYear: budget.fiscal_year,
      startDate,
      endDate,
      periodNumber: options?.periodNumber,
      items: varianceItems,
      totalBudgeted,
      totalActual,
      totalVariance: totalBudgeted - totalActual,
    };
  },

  /**
   * Get variance summary by account type
   */
  async getVarianceSummaryByType(
    budgetId: string,
    periodNumber?: number
  ): Promise<{
    revenue: { budgeted: number; actual: number; variance: number };
    expense: { budgeted: number; actual: number; variance: number };
    netIncome: { budgeted: number; actual: number; variance: number };
  }> {
    const variance = await this.calculateVariance(budgetId, { periodNumber });

    const summary = {
      revenue: { budgeted: 0, actual: 0, variance: 0 },
      expense: { budgeted: 0, actual: 0, variance: 0 },
      netIncome: { budgeted: 0, actual: 0, variance: 0 },
    };

    for (const item of variance.items) {
      if (item.accountType === 'revenue') {
        summary.revenue.budgeted += item.budgetedCents;
        summary.revenue.actual += item.actualCents;
        summary.revenue.variance += item.varianceCents;
      } else if (item.accountType === 'expense') {
        summary.expense.budgeted += item.budgetedCents;
        summary.expense.actual += item.actualCents;
        summary.expense.variance += item.varianceCents;
      }
    }

    summary.netIncome = {
      budgeted: summary.revenue.budgeted - summary.expense.budgeted,
      actual: summary.revenue.actual - summary.expense.actual,
      variance: summary.revenue.variance - summary.expense.variance,
    };

    return summary;
  },

  // ========================================
  // Budget Templates & Helpers
  // ========================================

  /**
   * Create a budget from expense account templates
   */
  async createBudgetFromAccounts(
    businessId: string,
    fiscalYear: number,
    budgetName: string,
    currencyCode: string,
    propertyId?: string
  ): Promise<Budget> {
    // Create the budget
    const budget = await this.createBudget(businessId, {
      budgetName,
      fiscalYear,
      currencyCode,
      propertyId,
    });

    // Get all expense and revenue accounts
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
      isHeaderAccount: false,
    });

    const budgetableAccounts = accounts.filter(
      (a) => a.account_type === 'expense' || a.account_type === 'revenue'
    );

    // Create empty budget items for each account
    const items: BudgetItemInput[] = budgetableAccounts.map((account) => ({
      accountId: account.id,
      periodAmounts: new Array(12).fill(0),
    }));

    await this.upsertBudgetItems(budget.id, items);

    return budget;
  },

  /**
   * Spread annual amount evenly across periods
   */
  spreadAnnualAmount(annualAmountCents: number): number[] {
    const monthlyAmount = Math.floor(annualAmountCents / 12);
    const remainder = annualAmountCents - monthlyAmount * 12;

    // Distribute evenly with remainder in last period
    const amounts = new Array(12).fill(monthlyAmount);
    amounts[11] += remainder;

    return amounts;
  },

  /**
   * Apply seasonal distribution to an annual amount
   * Useful for utilities, landscaping, etc.
   */
  applySeasonalDistribution(
    annualAmountCents: number,
    pattern: 'winter_heavy' | 'summer_heavy' | 'quarterly_spike'
  ): number[] {
    const patterns: Record<typeof pattern, number[]> = {
      // Higher in winter months (heating)
      winter_heavy: [0.12, 0.12, 0.10, 0.07, 0.05, 0.04, 0.04, 0.05, 0.07, 0.10, 0.12, 0.12],
      // Higher in summer months (cooling, landscaping)
      summer_heavy: [0.05, 0.05, 0.07, 0.10, 0.12, 0.14, 0.14, 0.12, 0.10, 0.07, 0.05, 0.05],
      // Quarterly spikes (insurance, property tax)
      quarterly_spike: [0.25, 0.02, 0.02, 0.25, 0.02, 0.02, 0.25, 0.02, 0.02, 0.25, 0.02, 0.02],
    };

    const distribution = patterns[pattern];
    const amounts = distribution.map((pct) => Math.round(annualAmountCents * pct));

    // Adjust for rounding to match annual total
    const total = amounts.reduce((a, b) => a + b, 0);
    const diff = annualAmountCents - total;
    if (amounts.length > 0) {
      amounts[0] = (amounts[0] ?? 0) + diff;
    }

    return amounts;
  },
};
