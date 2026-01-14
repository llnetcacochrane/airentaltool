import { supabase } from '../lib/supabase';
import {
  GLAccount,
  GLAccountType,
  GLAccountSubtype,
  NormalBalance,
  GLAccountTemplate,
  BusinessAccountingSettings,
  TaxRate,
} from '../types';

export interface GLAccountFilters {
  accountType?: GLAccountType;
  accountSubtype?: GLAccountSubtype;
  isActive?: boolean;
  isHeaderAccount?: boolean;
  isBankAccount?: boolean;
  parentAccountId?: string | null;
  searchTerm?: string;
}

export interface AccountNode extends GLAccount {
  children: AccountNode[];
}

export const glAccountService = {
  // ========================================
  // GL Account CRUD Operations
  // ========================================

  /**
   * Create a new GL account
   */
  async createAccount(
    businessId: string,
    account: Partial<GLAccount>
  ): Promise<GLAccount> {
    // Determine normal balance based on account type if not provided
    const normalBalance = account.normal_balance || getNormalBalanceForType(account.account_type!);

    const { data, error } = await supabase
      .from('gl_accounts')
      .insert({
        business_id: businessId,
        account_number: account.account_number,
        account_name: account.account_name,
        account_type: account.account_type,
        account_subtype: account.account_subtype,
        parent_account_id: account.parent_account_id,
        normal_balance: normalBalance,
        currency_code: account.currency_code,
        is_active: account.is_active ?? true,
        is_system: account.is_system ?? false,
        is_header_account: account.is_header_account ?? false,
        is_bank_account: account.is_bank_account ?? false,
        is_control_account: account.is_control_account ?? false,
        bank_name: account.bank_name,
        bank_account_number_masked: account.bank_account_number_masked,
        default_tax_rate_id: account.default_tax_rate_id,
        description: account.description,
        notes: account.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all GL accounts for a business
   */
  async getAccounts(
    businessId: string,
    filters?: GLAccountFilters
  ): Promise<GLAccount[]> {
    let query = supabase
      .from('gl_accounts')
      .select('*')
      .eq('business_id', businessId)
      .order('account_number');

    if (filters?.accountType) {
      query = query.eq('account_type', filters.accountType);
    }

    if (filters?.accountSubtype) {
      query = query.eq('account_subtype', filters.accountSubtype);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.isHeaderAccount !== undefined) {
      query = query.eq('is_header_account', filters.isHeaderAccount);
    }

    if (filters?.isBankAccount !== undefined) {
      query = query.eq('is_bank_account', filters.isBankAccount);
    }

    if (filters?.parentAccountId !== undefined) {
      if (filters.parentAccountId === null) {
        query = query.is('parent_account_id', null);
      } else {
        query = query.eq('parent_account_id', filters.parentAccountId);
      }
    }

    if (filters?.searchTerm) {
      query = query.or(
        `account_name.ilike.%${filters.searchTerm}%,account_number.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single GL account by ID
   */
  async getAccountById(accountId: string): Promise<GLAccount | null> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get a GL account by number within a business
   */
  async getAccountByNumber(
    businessId: string,
    accountNumber: string
  ): Promise<GLAccount | null> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .select('*')
      .eq('business_id', businessId)
      .eq('account_number', accountNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Update a GL account
   */
  async updateAccount(
    accountId: string,
    updates: Partial<GLAccount>
  ): Promise<GLAccount> {
    // Remove fields that shouldn't be updated directly
    const { id, business_id, created_at, current_balance_cents, ytd_debit_cents, ytd_credit_cents, ...safeUpdates } = updates as any;

    const { data, error } = await supabase
      .from('gl_accounts')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deactivate a GL account (soft delete)
   * Cannot delete accounts with transactions
   */
  async deactivateAccount(accountId: string): Promise<GLAccount> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reactivate a GL account
   */
  async reactivateAccount(accountId: string): Promise<GLAccount> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========================================
  // Chart of Accounts Hierarchy
  // ========================================

  /**
   * Get accounts as a hierarchical tree structure
   */
  async getAccountHierarchy(businessId: string): Promise<AccountNode[]> {
    const accounts = await this.getAccounts(businessId, { isActive: true });
    return buildAccountTree(accounts);
  },

  /**
   * Get child accounts of a parent
   */
  async getChildAccounts(parentAccountId: string): Promise<GLAccount[]> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .select('*')
      .eq('parent_account_id', parentAccountId)
      .eq('is_active', true)
      .order('account_number');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get accounts by type for selection dropdowns
   */
  async getAccountsByType(
    businessId: string,
    types: GLAccountType[]
  ): Promise<GLAccount[]> {
    const { data, error } = await supabase
      .from('gl_accounts')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .eq('is_header_account', false)
      .in('account_type', types)
      .order('account_number');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get bank accounts only
   */
  async getBankAccounts(businessId: string): Promise<GLAccount[]> {
    return this.getAccounts(businessId, { isBankAccount: true, isActive: true });
  },

  /**
   * Get posting accounts (non-header accounts)
   */
  async getPostingAccounts(businessId: string): Promise<GLAccount[]> {
    return this.getAccounts(businessId, { isHeaderAccount: false, isActive: true });
  },

  // ========================================
  // Account Balance Operations
  // ========================================

  /**
   * Get the current balance of an account
   */
  async getAccountBalance(accountId: string): Promise<number> {
    const account = await this.getAccountById(accountId);
    return account?.current_balance_cents || 0;
  },

  /**
   * Get balances for multiple accounts
   */
  async getAccountBalances(
    businessId: string,
    accountType?: GLAccountType
  ): Promise<Array<{ accountId: string; accountNumber: string; balance: number }>> {
    let query = supabase
      .from('gl_accounts')
      .select('id, account_number, current_balance_cents')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (accountType) {
      query = query.eq('account_type', accountType);
    }

    const { data, error } = await query.order('account_number');

    if (error) throw error;

    return (data || []).map((a) => ({
      accountId: a.id,
      accountNumber: a.account_number,
      balance: a.current_balance_cents,
    }));
  },

  // ========================================
  // Chart of Accounts Templates
  // ========================================

  /**
   * Get available chart of accounts templates
   */
  async getAccountTemplates(jurisdiction?: string): Promise<GLAccountTemplate[]> {
    let query = supabase
      .from('gl_account_templates')
      .select('*')
      .eq('is_active', true);

    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Initialize chart of accounts for a business from a template
   */
  async initializeChartOfAccounts(
    businessId: string,
    templateName: string = 'property_management_standard',
    jurisdiction: string = 'CA'
  ): Promise<number> {
    // Use the database function for initialization
    const { data, error } = await supabase.rpc('initialize_chart_of_accounts', {
      p_business_id: businessId,
      p_template_name: templateName,
      p_jurisdiction: jurisdiction,
    });

    if (error) throw error;
    return data || 0;
  },

  /**
   * Check if a business has chart of accounts initialized
   */
  async hasChartOfAccounts(businessId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('gl_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (error) throw error;
    return (count || 0) > 0;
  },

  // ========================================
  // Business Accounting Settings
  // ========================================

  /**
   * Get accounting settings for a business
   */
  async getAccountingSettings(
    businessId: string
  ): Promise<BusinessAccountingSettings | null> {
    const { data, error } = await supabase
      .from('business_accounting_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create or update accounting settings for a business
   */
  async upsertAccountingSettings(
    businessId: string,
    settings: Partial<BusinessAccountingSettings>
  ): Promise<BusinessAccountingSettings> {
    const { data, error } = await supabase
      .from('business_accounting_settings')
      .upsert(
        {
          business_id: businessId,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========================================
  // Tax Rate Operations
  // ========================================

  /**
   * Get tax rates for a business (includes system defaults)
   */
  async getTaxRates(
    businessId: string,
    jurisdiction?: string
  ): Promise<TaxRate[]> {
    let query = supabase
      .from('tax_rates')
      .select('*')
      .eq('is_active', true)
      .or(`business_id.eq.${businessId},business_id.is.null`);

    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data, error } = await query.order('jurisdiction').order('tax_name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get system default tax rates
   */
  async getSystemTaxRates(jurisdiction?: string): Promise<TaxRate[]> {
    let query = supabase
      .from('tax_rates')
      .select('*')
      .is('business_id', null)
      .eq('is_active', true);

    if (jurisdiction) {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data, error } = await query.order('jurisdiction').order('tax_name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a custom tax rate for a business
   */
  async createTaxRate(
    businessId: string,
    taxRate: Partial<TaxRate>
  ): Promise<TaxRate> {
    const { data, error } = await supabase
      .from('tax_rates')
      .insert({
        business_id: businessId,
        jurisdiction: taxRate.jurisdiction,
        region_code: taxRate.region_code,
        tax_name: taxRate.tax_name,
        tax_code: taxRate.tax_code,
        rate_basis_points: taxRate.rate_basis_points,
        component_rates: taxRate.component_rates,
        is_recoverable: taxRate.is_recoverable ?? false,
        is_compound: taxRate.is_compound ?? false,
        is_active: true,
        effective_from: taxRate.effective_from,
        effective_to: taxRate.effective_to,
        description: taxRate.description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ========================================
// Helper Functions
// ========================================

/**
 * Get the normal balance for an account type
 */
function getNormalBalanceForType(accountType: GLAccountType): NormalBalance {
  switch (accountType) {
    case 'asset':
    case 'expense':
      return 'debit';
    case 'liability':
    case 'equity':
    case 'revenue':
      return 'credit';
    default:
      return 'debit';
  }
}

/**
 * Build a tree structure from flat account list
 */
function buildAccountTree(accounts: GLAccount[]): AccountNode[] {
  const accountMap = new Map<string, AccountNode>();
  const roots: AccountNode[] = [];

  // First pass: create nodes
  for (const account of accounts) {
    accountMap.set(account.id, { ...account, children: [] });
  }

  // Second pass: build tree
  for (const account of accounts) {
    const node = accountMap.get(account.id)!;

    if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
      const parent = accountMap.get(account.parent_account_id)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by account number
  const sortChildren = (nodes: AccountNode[]) => {
    nodes.sort((a, b) => a.account_number.localeCompare(b.account_number));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };

  sortChildren(roots);

  return roots;
}

/**
 * Flatten tree back to array (useful for exports)
 */
export function flattenAccountTree(nodes: AccountNode[]): GLAccount[] {
  const result: GLAccount[] = [];

  const traverse = (nodes: AccountNode[], level: number) => {
    for (const node of nodes) {
      const { children, ...account } = node;
      result.push({ ...account, hierarchy_level: level });
      traverse(node.children, level + 1);
    }
  };

  traverse(nodes, 0);
  return result;
}

/**
 * Get account type label for display
 */
export function getAccountTypeLabel(type: GLAccountType): string {
  const labels: Record<GLAccountType, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expenses',
  };
  return labels[type] || type;
}

/**
 * Get account number range for a type
 */
export function getAccountNumberRange(type: GLAccountType): { start: string; end: string } {
  const ranges: Record<GLAccountType, { start: string; end: string }> = {
    asset: { start: '1000', end: '1999' },
    liability: { start: '2000', end: '2999' },
    equity: { start: '3000', end: '3999' },
    revenue: { start: '4000', end: '4999' },
    expense: { start: '5000', end: '6999' },
  };
  return ranges[type] || { start: '0000', end: '9999' };
}
