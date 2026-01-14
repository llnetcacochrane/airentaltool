import { supabase } from '../lib/supabase';
import {
  GLAccountType,
  TrialBalance,
  TrialBalanceAccount,
  BalanceSheet,
  BalanceSheetSection,
  IncomeStatement,
  IncomeStatementSection,
  CashFlowStatement,
} from '../types';
import { glAccountService } from './glAccountService';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  asOfDate?: string;
  comparePriorPeriod?: boolean;
  comparePriorYear?: boolean;
}

export interface AccountBalance {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: GLAccountType;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
}

export const financialReportingService = {
  // ========================================
  // Trial Balance
  // ========================================

  /**
   * Generate a trial balance report
   */
  async generateTrialBalance(
    businessId: string,
    asOfDate: string,
    options?: {
      propertyId?: string;
      includeZeroBalances?: boolean;
    }
  ): Promise<TrialBalance> {
    // Get all active accounts
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
      isHeaderAccount: false,
    });

    // Get ledger balances as of the date
    let query = supabase
      .from('gl_ledger')
      .select('account_id, base_debit_cents, base_credit_cents')
      .eq('business_id', businessId)
      .lte('posting_date', asOfDate);

    if (options?.propertyId) {
      query = query.eq('property_id', options.propertyId);
    }

    const { data: ledgerEntries, error } = await query;

    if (error) throw error;

    // Aggregate by account
    const balances = new Map<
      string,
      { debits: number; credits: number }
    >();

    for (const entry of ledgerEntries || []) {
      const existing = balances.get(entry.account_id) || {
        debits: 0,
        credits: 0,
      };
      existing.debits += entry.base_debit_cents;
      existing.credits += entry.base_credit_cents;
      balances.set(entry.account_id, existing);
    }

    // Build trial balance rows
    const rows: TrialBalanceAccount[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balance = balances.get(account.id) || { debits: 0, credits: 0 };

      // Skip zero balances if not requested
      if (
        !options?.includeZeroBalances &&
        balance.debits === 0 &&
        balance.credits === 0
      ) {
        continue;
      }

      // Calculate debit/credit balance based on normal balance
      let debitBalance = 0;
      let creditBalance = 0;
      const netBalance = balance.debits - balance.credits;

      if (account.normal_balance === 'debit') {
        if (netBalance >= 0) {
          debitBalance = netBalance;
        } else {
          creditBalance = -netBalance;
        }
      } else {
        if (netBalance <= 0) {
          creditBalance = -netBalance;
        } else {
          debitBalance = netBalance;
        }
      }

      rows.push({
        account_id: account.id,
        account_number: account.account_number,
        account_name: account.account_name,
        account_type: account.account_type,
        debit_balance_cents: debitBalance,
        credit_balance_cents: creditBalance,
        debit_cents: debitBalance,
        credit_cents: creditBalance,
      });

      totalDebits += debitBalance;
      totalCredits += creditBalance;
    }

    // Sort by account number
    rows.sort((a, b) => a.account_number.localeCompare(b.account_number));

    return {
      business_id: businessId,
      as_of_date: asOfDate,
      property_id: options?.propertyId,
      currency_code: 'CAD', // TODO: Get from business settings
      accounts: rows,
      rows,
      total_debits_cents: totalDebits,
      total_credits_cents: totalCredits,
      is_balanced: totalDebits === totalCredits,
      generated_at: new Date().toISOString(),
    };
  },

  // ========================================
  // Balance Sheet
  // ========================================

  /**
   * Generate a balance sheet
   */
  async generateBalanceSheet(
    businessId: string,
    asOfDate: string,
    options?: {
      propertyId?: string;
      comparePriorYear?: boolean;
    }
  ): Promise<BalanceSheet> {
    // Get account balances
    const accountBalances = await this.getAccountBalances(
      businessId,
      asOfDate,
      options?.propertyId
    );

    // Group accounts into sections
    const assets: BalanceSheetSection = {
      title: 'Assets',
      accounts: [],
      total_cents: 0,
      subsections: [
        { title: 'Current Assets', accounts: [], total_cents: 0 },
        { title: 'Fixed Assets', accounts: [], total_cents: 0 },
        { title: 'Other Assets', accounts: [], total_cents: 0 },
      ],
    };

    const liabilities: BalanceSheetSection = {
      title: 'Liabilities',
      accounts: [],
      total_cents: 0,
      subsections: [
        { title: 'Current Liabilities', accounts: [], total_cents: 0 },
        { title: 'Long-term Liabilities', accounts: [], total_cents: 0 },
      ],
    };

    const equity: BalanceSheetSection = {
      title: 'Equity',
      accounts: [],
      total_cents: 0,
    };

    // Calculate retained earnings (net income)
    const netIncome = await this.calculateNetIncome(
      businessId,
      `${new Date(asOfDate).getFullYear()}-01-01`,
      asOfDate,
      options?.propertyId
    );

    for (const balance of accountBalances) {
      const accountInfo = {
        account_id: balance.accountId,
        account_number: balance.accountNumber,
        account_name: balance.accountName,
        balance_cents: balance.netBalance,
      };

      // Get subsections with safe access
      const assetSubsections = assets.subsections || [];
      const liabilitySubsections = liabilities.subsections || [];

      switch (balance.accountType) {
        case 'asset':
          // Classify by account number range
          const assetNum = parseInt(balance.accountNumber);
          if (assetNum >= 1000 && assetNum < 1500 && assetSubsections[0]) {
            assetSubsections[0].accounts.push(accountInfo);
            assetSubsections[0].total_cents += balance.netBalance;
          } else if (assetNum >= 1500 && assetNum < 1800 && assetSubsections[1]) {
            assetSubsections[1].accounts.push(accountInfo);
            assetSubsections[1].total_cents += balance.netBalance;
          } else if (assetSubsections[2]) {
            assetSubsections[2].accounts.push(accountInfo);
            assetSubsections[2].total_cents += balance.netBalance;
          }
          assets.total_cents += balance.netBalance;
          break;

        case 'liability':
          const liabNum = parseInt(balance.accountNumber);
          if (liabNum >= 2000 && liabNum < 2500 && liabilitySubsections[0]) {
            liabilitySubsections[0].accounts.push(accountInfo);
            liabilitySubsections[0].total_cents += balance.netBalance;
          } else if (liabilitySubsections[1]) {
            liabilitySubsections[1].accounts.push(accountInfo);
            liabilitySubsections[1].total_cents += balance.netBalance;
          }
          liabilities.total_cents += balance.netBalance;
          break;

        case 'equity':
          equity.accounts.push(accountInfo);
          equity.total_cents += balance.netBalance;
          break;
      }
    }

    // Add current year earnings to equity
    equity.accounts.push({
      account_id: 'current_year_earnings',
      account_number: '3400',
      account_name: 'Current Year Earnings',
      balance_cents: netIncome,
    });
    equity.total_cents += netIncome;

    // Get prior year comparison if requested
    let priorYearAssets: number | undefined;
    let priorYearLiabilities: number | undefined;
    let priorYearEquity: number | undefined;

    if (options?.comparePriorYear) {
      const priorDate = new Date(asOfDate);
      priorDate.setFullYear(priorDate.getFullYear() - 1);
      const priorAsOfDate = priorDate.toISOString().slice(0, 10);

      const priorBalance = await this.generateBalanceSheet(
        businessId,
        priorAsOfDate,
        { propertyId: options.propertyId }
      );

      priorYearAssets = priorBalance.total_assets_cents;
      priorYearLiabilities = priorBalance.total_liabilities_cents;
      priorYearEquity = priorBalance.total_equity_cents;
    }

    const totalLiabilitiesEquity = liabilities.total_cents + equity.total_cents;

    return {
      business_id: businessId,
      as_of_date: asOfDate,
      property_id: options?.propertyId,
      currency_code: 'CAD', // TODO: Get from business settings
      assets,
      liabilities,
      equity,
      total_assets_cents: assets.total_cents,
      total_liabilities_cents: liabilities.total_cents,
      total_equity_cents: equity.total_cents,
      total_liabilities_and_equity_cents: totalLiabilitiesEquity,
      total_liabilities_equity_cents: totalLiabilitiesEquity,
      is_balanced: assets.total_cents === totalLiabilitiesEquity,
      prior_year_assets: priorYearAssets,
      prior_year_liabilities: priorYearLiabilities,
      prior_year_equity: priorYearEquity,
      generated_at: new Date().toISOString(),
    };
  },

  // ========================================
  // Income Statement (P&L)
  // ========================================

  /**
   * Generate an income statement
   */
  async generateIncomeStatement(
    businessId: string,
    startDate: string,
    endDate: string,
    options?: {
      propertyId?: string;
      comparePriorPeriod?: boolean;
      comparePriorYear?: boolean;
    }
  ): Promise<IncomeStatement> {
    // Get account activity for the period
    const activityMap = await this.getAccountActivity(
      businessId,
      startDate,
      endDate,
      options?.propertyId
    );

    // Get all accounts
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
      isHeaderAccount: false,
    });

    // Build revenue section
    const revenue: IncomeStatementSection = {
      title: 'Revenue',
      accounts: [],
      total_cents: 0,
      subsections: [
        { title: 'Rental Income', accounts: [], total_cents: 0 },
        { title: 'Other Income', accounts: [], total_cents: 0 },
      ],
    };

    // Build expense sections
    const operatingExpenses: IncomeStatementSection = {
      title: 'Operating Expenses',
      accounts: [],
      total_cents: 0,
      subsections: [
        { title: 'Repairs & Maintenance', accounts: [], total_cents: 0 },
        { title: 'Utilities', accounts: [], total_cents: 0 },
        { title: 'Insurance & Taxes', accounts: [], total_cents: 0 },
        { title: 'Administrative', accounts: [], total_cents: 0 },
        { title: 'Other Operating', accounts: [], total_cents: 0 },
      ],
    };

    const otherExpenses: IncomeStatementSection = {
      title: 'Other Expenses',
      accounts: [],
      total_cents: 0,
    };

    for (const account of accounts) {
      const activity = activityMap.get(account.id);
      if (!activity) continue;

      // Calculate net activity
      let netActivity = activity.debits - activity.credits;
      if (account.normal_balance === 'credit') {
        netActivity = -netActivity;
      }

      if (netActivity === 0) continue;

      const accountInfo = {
        account_id: account.id,
        account_number: account.account_number,
        account_name: account.account_name,
        amount_cents: netActivity,
      };

      // Get subsections with safe access
      const revenueSubsections = revenue.subsections || [];
      const opExpSubsections = operatingExpenses.subsections || [];

      if (account.account_type === 'revenue') {
        const accNum = parseInt(account.account_number);
        if (accNum >= 4000 && accNum < 4100 && revenueSubsections[0]) {
          revenueSubsections[0].accounts.push(accountInfo);
          revenueSubsections[0].total_cents += netActivity;
        } else if (revenueSubsections[1]) {
          revenueSubsections[1].accounts.push(accountInfo);
          revenueSubsections[1].total_cents += netActivity;
        }
        revenue.total_cents += netActivity;
      } else if (account.account_type === 'expense') {
        const accNum = parseInt(account.account_number);

        if (accNum >= 5100 && accNum < 5200 && opExpSubsections[0]) {
          opExpSubsections[0].accounts.push(accountInfo);
          opExpSubsections[0].total_cents += netActivity;
        } else if (accNum >= 5200 && accNum < 5300 && opExpSubsections[1]) {
          opExpSubsections[1].accounts.push(accountInfo);
          opExpSubsections[1].total_cents += netActivity;
        } else if (accNum >= 5300 && accNum < 5500 && opExpSubsections[2]) {
          opExpSubsections[2].accounts.push(accountInfo);
          opExpSubsections[2].total_cents += netActivity;
        } else if (accNum >= 5500 && accNum < 6000 && opExpSubsections[3]) {
          opExpSubsections[3].accounts.push(accountInfo);
          opExpSubsections[3].total_cents += netActivity;
        } else if (accNum >= 6000) {
          otherExpenses.accounts.push(accountInfo);
          otherExpenses.total_cents += netActivity;
        } else if (opExpSubsections[4]) {
          opExpSubsections[4].accounts.push(accountInfo);
          opExpSubsections[4].total_cents += netActivity;
        }

        operatingExpenses.total_cents += netActivity;
      }
    }

    const grossProfit = revenue.total_cents;
    const operatingIncome = grossProfit - operatingExpenses.total_cents;
    const netIncome = operatingIncome - otherExpenses.total_cents;

    // Get comparison periods if requested
    let priorPeriodRevenue: IncomeStatementSection | undefined;
    let priorPeriodExpenses: IncomeStatementSection | undefined;
    let priorYearRevenue: IncomeStatementSection | undefined;
    let priorYearExpenses: IncomeStatementSection | undefined;

    if (options?.comparePriorPeriod) {
      const periodDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const priorStart = new Date(startDate);
      priorStart.setDate(priorStart.getDate() - periodDays - 1);
      const priorEnd = new Date(startDate);
      priorEnd.setDate(priorEnd.getDate() - 1);

      const priorStatement = await this.generateIncomeStatement(
        businessId,
        priorStart.toISOString().slice(0, 10),
        priorEnd.toISOString().slice(0, 10),
        { propertyId: options.propertyId }
      );

      priorPeriodRevenue = priorStatement.revenue;
      priorPeriodExpenses = priorStatement.operating_expenses;
    }

    if (options?.comparePriorYear) {
      const priorYearStart = new Date(startDate);
      priorYearStart.setFullYear(priorYearStart.getFullYear() - 1);
      const priorYearEnd = new Date(endDate);
      priorYearEnd.setFullYear(priorYearEnd.getFullYear() - 1);

      const priorStatement = await this.generateIncomeStatement(
        businessId,
        priorYearStart.toISOString().slice(0, 10),
        priorYearEnd.toISOString().slice(0, 10),
        { propertyId: options.propertyId }
      );

      priorYearRevenue = priorStatement.revenue;
      priorYearExpenses = priorStatement.operating_expenses;
    }

    // Create combined expenses section
    const totalExpensesCents = operatingExpenses.total_cents + otherExpenses.total_cents;
    const combinedExpenses: IncomeStatementSection = {
      title: 'Expenses',
      accounts: [...operatingExpenses.accounts, ...otherExpenses.accounts],
      total_cents: totalExpensesCents,
      subsections: [operatingExpenses, otherExpenses],
    };

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      property_id: options?.propertyId,
      currency_code: 'CAD', // TODO: Get from business settings
      revenue,
      expenses: combinedExpenses,
      operating_expenses: operatingExpenses,
      other_expenses: otherExpenses,
      total_revenue_cents: revenue.total_cents,
      total_expenses_cents: totalExpensesCents,
      gross_profit_cents: grossProfit,
      operating_income_cents: operatingIncome,
      net_income_cents: netIncome,
      prior_period_revenue: priorPeriodRevenue,
      prior_period_expenses: priorPeriodExpenses,
      prior_year_revenue: priorYearRevenue,
      prior_year_expenses: priorYearExpenses,
      generated_at: new Date().toISOString(),
    };
  },

  // ========================================
  // Cash Flow Statement
  // ========================================

  /**
   * Generate a cash flow statement (simplified direct method)
   */
  async generateCashFlowStatement(
    businessId: string,
    startDate: string,
    endDate: string,
    options?: {
      propertyId?: string;
    }
  ): Promise<CashFlowStatement> {
    // Get all cash/bank account IDs
    const bankAccounts = await glAccountService.getBankAccounts(businessId);
    const bankAccountIds = bankAccounts.map((a) => a.id);

    // Get opening cash balance
    const openingBalance = await this.getCashBalance(
      businessId,
      startDate,
      bankAccountIds
    );

    // Get closing cash balance
    const closingBalance = await this.getCashBalance(
      businessId,
      endDate,
      bankAccountIds
    );

    // Get cash receipts and payments
    let query = supabase
      .from('gl_ledger')
      .select(
        'account_id, base_debit_cents, base_credit_cents, gl_journals(source_type)'
      )
      .eq('business_id', businessId)
      .in('account_id', bankAccountIds)
      .gte('posting_date', startDate)
      .lte('posting_date', endDate);

    if (options?.propertyId) {
      query = query.eq('property_id', options.propertyId);
    }

    const { data: cashEntries, error } = await query;

    if (error) throw error;

    // Categorize cash flows
    const operating = {
      receipts: { items: [] as Array<{ description: string; amount_cents: number }>, total_cents: 0 },
      payments: { items: [] as Array<{ description: string; amount_cents: number }>, total_cents: 0 },
      net_cents: 0,
    };

    const investing = {
      items: [] as Array<{ description: string; amount_cents: number }>,
      total_cents: 0,
    };

    const financing = {
      items: [] as Array<{ description: string; amount_cents: number }>,
      total_cents: 0,
    };

    // Group entries by source type
    const sourceGroups = new Map<string, { debits: number; credits: number }>();

    for (const entry of cashEntries || []) {
      const sourceType = (entry as any).gl_journals?.source_type || 'other';
      const existing = sourceGroups.get(sourceType) || { debits: 0, credits: 0 };
      existing.debits += entry.base_debit_cents;
      existing.credits += entry.base_credit_cents;
      sourceGroups.set(sourceType, existing);
    }

    // Classify by source type
    for (const [sourceType, amounts] of sourceGroups) {
      const netReceipts = amounts.debits - amounts.credits;

      switch (sourceType) {
        case 'rent_payment':
          operating.receipts.items.push({
            description: 'Rent Receipts',
            amount_cents: amounts.debits,
          });
          operating.receipts.total_cents += amounts.debits;
          break;

        case 'expense':
          operating.payments.items.push({
            description: 'Operating Expenses',
            amount_cents: amounts.credits,
          });
          operating.payments.total_cents += amounts.credits;
          break;

        case 'special_transaction':
          // Could be financing (owner draw/contribution)
          if (netReceipts > 0) {
            financing.items.push({
              description: 'Owner Contributions',
              amount_cents: netReceipts,
            });
          } else {
            financing.items.push({
              description: 'Owner Draws',
              amount_cents: -netReceipts,
            });
          }
          financing.total_cents += netReceipts;
          break;

        default:
          if (netReceipts > 0) {
            operating.receipts.items.push({
              description: 'Other Receipts',
              amount_cents: netReceipts,
            });
            operating.receipts.total_cents += netReceipts;
          } else {
            operating.payments.items.push({
              description: 'Other Payments',
              amount_cents: -netReceipts,
            });
            operating.payments.total_cents += -netReceipts;
          }
      }
    }

    operating.net_cents = operating.receipts.total_cents - operating.payments.total_cents;

    const netChange = operating.net_cents + investing.total_cents + financing.total_cents;

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      property_id: options?.propertyId,
      operating_activities: operating,
      investing_activities: investing,
      financing_activities: financing,
      net_change_cents: netChange,
      opening_cash_cents: openingBalance,
      closing_cash_cents: closingBalance,
      generated_at: new Date().toISOString(),
    };
  },

  // ========================================
  // Property-Level Financials
  // ========================================

  /**
   * Generate P&L for a specific property
   */
  async generatePropertyPL(
    businessId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<IncomeStatement> {
    return this.generateIncomeStatement(businessId, startDate, endDate, {
      propertyId,
    });
  },

  /**
   * Generate comparative property report
   */
  async generatePropertyComparison(
    businessId: string,
    propertyIds: string[],
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      propertyId: string;
      revenue: number;
      expenses: number;
      netIncome: number;
      noi: number;
    }>
  > {
    const results = [];

    for (const propertyId of propertyIds) {
      const statement = await this.generateIncomeStatement(
        businessId,
        startDate,
        endDate,
        { propertyId }
      );

      const operatingExpenses = statement.operating_expenses ?? statement.expenses;

      results.push({
        propertyId,
        revenue: statement.revenue.total_cents,
        expenses: operatingExpenses.total_cents,
        netIncome: statement.net_income_cents,
        noi: statement.operating_income_cents ?? statement.net_income_cents,
      });
    }

    return results;
  },

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get account balances as of a date
   */
  async getAccountBalances(
    businessId: string,
    asOfDate: string,
    propertyId?: string
  ): Promise<AccountBalance[]> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
      isHeaderAccount: false,
    });

    let query = supabase
      .from('gl_ledger')
      .select('account_id, base_debit_cents, base_credit_cents')
      .eq('business_id', businessId)
      .lte('posting_date', asOfDate);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: ledgerEntries, error } = await query;

    if (error) throw error;

    // Aggregate by account
    const balances = new Map<string, { debits: number; credits: number }>();

    for (const entry of ledgerEntries || []) {
      const existing = balances.get(entry.account_id) || {
        debits: 0,
        credits: 0,
      };
      existing.debits += entry.base_debit_cents;
      existing.credits += entry.base_credit_cents;
      balances.set(entry.account_id, existing);
    }

    // Build result
    const result: AccountBalance[] = [];

    for (const account of accounts) {
      if (
        account.account_type === 'revenue' ||
        account.account_type === 'expense'
      ) {
        continue; // Skip income statement accounts for balance sheet
      }

      const balance = balances.get(account.id) || { debits: 0, credits: 0 };
      let netBalance = balance.debits - balance.credits;

      if (account.normal_balance === 'credit') {
        netBalance = -netBalance;
      }

      if (netBalance !== 0) {
        result.push({
          accountId: account.id,
          accountNumber: account.account_number,
          accountName: account.account_name,
          accountType: account.account_type,
          debitBalance: balance.debits,
          creditBalance: balance.credits,
          netBalance,
        });
      }
    }

    return result;
  },

  /**
   * Get account activity for a period
   */
  async getAccountActivity(
    businessId: string,
    startDate: string,
    endDate: string,
    propertyId?: string
  ): Promise<Map<string, { debits: number; credits: number }>> {
    let query = supabase
      .from('gl_ledger')
      .select('account_id, base_debit_cents, base_credit_cents')
      .eq('business_id', businessId)
      .gte('posting_date', startDate)
      .lte('posting_date', endDate);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: ledgerEntries, error } = await query;

    if (error) throw error;

    const activity = new Map<string, { debits: number; credits: number }>();

    for (const entry of ledgerEntries || []) {
      const existing = activity.get(entry.account_id) || {
        debits: 0,
        credits: 0,
      };
      existing.debits += entry.base_debit_cents;
      existing.credits += entry.base_credit_cents;
      activity.set(entry.account_id, existing);
    }

    return activity;
  },

  /**
   * Calculate net income for a period
   */
  async calculateNetIncome(
    businessId: string,
    startDate: string,
    endDate: string,
    propertyId?: string
  ): Promise<number> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
      isHeaderAccount: false,
    });

    const activity = await this.getAccountActivity(
      businessId,
      startDate,
      endDate,
      propertyId
    );

    let revenue = 0;
    let expenses = 0;

    for (const account of accounts) {
      const act = activity.get(account.id);
      if (!act) continue;

      let netActivity = act.debits - act.credits;
      if (account.normal_balance === 'credit') {
        netActivity = -netActivity;
      }

      if (account.account_type === 'revenue') {
        revenue += netActivity;
      } else if (account.account_type === 'expense') {
        expenses += netActivity;
      }
    }

    return revenue - expenses;
  },

  /**
   * Get cash balance as of a date
   */
  async getCashBalance(
    businessId: string,
    asOfDate: string,
    bankAccountIds: string[]
  ): Promise<number> {
    if (bankAccountIds.length === 0) return 0;

    const { data, error } = await supabase
      .from('gl_ledger')
      .select('base_debit_cents, base_credit_cents')
      .eq('business_id', businessId)
      .in('account_id', bankAccountIds)
      .lte('posting_date', asOfDate);

    if (error) throw error;

    let balance = 0;
    for (const entry of data || []) {
      balance += entry.base_debit_cents - entry.base_credit_cents;
    }

    return balance;
  },
};
