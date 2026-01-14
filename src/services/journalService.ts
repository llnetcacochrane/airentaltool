import { supabase } from '../lib/supabase';
import {
  GLJournal,
  GLJournalEntry,
  GLLedgerEntry,
  JournalType,
  JournalStatus,
  JournalSourceType,
} from '../types';
import { currencyService } from './currencyService';
import { glAccountService } from './glAccountService';
import {
  getPaymentMapping,
  getExpenseMapping,
  getSpecialMapping,
  formatDescription,
  GL_ACCOUNTS,
} from '../config/glAccountMappings';

export interface JournalFilters {
  journalType?: JournalType;
  status?: JournalStatus;
  startDate?: string;
  endDate?: string;
  sourceType?: JournalSourceType;
  sourceId?: string;
  propertyId?: string;
  searchTerm?: string;
}

export interface JournalEntryInput {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  vendorId?: string;
  taxRateId?: string;
  taxAmountCents?: number;
  description?: string;
}

export interface CreateJournalInput {
  journalDate: string;
  journalType: JournalType;
  sourceType?: JournalSourceType;
  sourceId?: string;
  transactionCurrency?: string;
  exchangeRate?: number;
  memo?: string;
  reference?: string;
  entries: JournalEntryInput[];
  autoPost?: boolean;
}

export const journalService = {
  // ========================================
  // Journal CRUD Operations
  // ========================================

  /**
   * Create a new journal entry with multiple lines
   */
  async createJournal(
    businessId: string,
    userId: string,
    input: CreateJournalInput
  ): Promise<GLJournal> {
    // Get business accounting settings
    const settings = await glAccountService.getAccountingSettings(businessId);
    const baseCurrency = settings?.base_currency || 'CAD';
    const transactionCurrency = input.transactionCurrency || baseCurrency;

    // Get exchange rate if different currency
    let exchangeRate = input.exchangeRate || 1;
    if (transactionCurrency !== baseCurrency && !input.exchangeRate) {
      exchangeRate = await currencyService.getExchangeRate(
        transactionCurrency,
        baseCurrency,
        input.journalDate
      );
    }

    // Calculate totals
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    for (const entry of input.entries) {
      totalDebitCents += entry.debitCents || 0;
      totalCreditCents += entry.creditCents || 0;
    }

    // Validate balance
    if (totalDebitCents !== totalCreditCents) {
      throw new Error(
        `Journal entry must balance. Debits: ${totalDebitCents}, Credits: ${totalCreditCents}`
      );
    }

    // Calculate base currency totals
    const baseTotalDebitCents = Math.round(totalDebitCents * exchangeRate);
    const baseTotalCreditCents = Math.round(totalCreditCents * exchangeRate);

    // Get next journal number
    const { data: journalNumber, error: numError } = await supabase.rpc(
      'get_next_journal_number',
      { p_business_id: businessId, p_journal_type: input.journalType }
    );

    if (numError) throw numError;

    // Create journal header
    const { data: journal, error: journalError } = await supabase
      .from('gl_journals')
      .insert({
        business_id: businessId,
        journal_number: journalNumber,
        journal_date: input.journalDate,
        journal_type: input.journalType,
        source_type: input.sourceType,
        source_id: input.sourceId,
        transaction_currency: transactionCurrency,
        exchange_rate: exchangeRate,
        status: 'draft',
        total_debit_cents: totalDebitCents,
        total_credit_cents: totalCreditCents,
        base_total_debit_cents: baseTotalDebitCents,
        base_total_credit_cents: baseTotalCreditCents,
        memo: input.memo,
        reference: input.reference,
        created_by: userId,
      })
      .select()
      .single();

    if (journalError) throw journalError;

    // Create journal entry lines
    const entryInserts = input.entries.map((entry, index) => ({
      journal_id: journal.id,
      account_id: entry.accountId,
      line_number: index + 1,
      debit_cents: entry.debitCents || 0,
      credit_cents: entry.creditCents || 0,
      base_debit_cents: Math.round((entry.debitCents || 0) * exchangeRate),
      base_credit_cents: Math.round((entry.creditCents || 0) * exchangeRate),
      property_id: entry.propertyId,
      unit_id: entry.unitId,
      tenant_id: entry.tenantId,
      vendor_id: entry.vendorId,
      tax_rate_id: entry.taxRateId,
      tax_amount_cents: entry.taxAmountCents || 0,
      description: entry.description,
    }));

    const { error: entriesError } = await supabase
      .from('gl_journal_entries')
      .insert(entryInserts);

    if (entriesError) throw entriesError;

    // Auto-post if requested
    if (input.autoPost) {
      return this.postJournal(journal.id, userId);
    }

    return journal;
  },

  /**
   * Get all journals for a business with filters
   */
  async getJournals(
    businessId: string,
    filters?: JournalFilters
  ): Promise<GLJournal[]> {
    let query = supabase
      .from('gl_journals')
      .select('*')
      .eq('business_id', businessId)
      .order('journal_date', { ascending: false })
      .order('journal_number', { ascending: false });

    if (filters?.journalType) {
      query = query.eq('journal_type', filters.journalType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('journal_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('journal_date', filters.endDate);
    }

    if (filters?.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }

    if (filters?.sourceId) {
      query = query.eq('source_id', filters.sourceId);
    }

    if (filters?.searchTerm) {
      query = query.or(
        `journal_number.ilike.%${filters.searchTerm}%,memo.ilike.%${filters.searchTerm}%,reference.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single journal by ID with its entries
   */
  async getJournalById(
    journalId: string
  ): Promise<{ journal: GLJournal; entries: GLJournalEntry[] } | null> {
    const { data: journal, error: journalError } = await supabase
      .from('gl_journals')
      .select('*')
      .eq('id', journalId)
      .maybeSingle();

    if (journalError) throw journalError;
    if (!journal) return null;

    const { data: entries, error: entriesError } = await supabase
      .from('gl_journal_entries')
      .select('*')
      .eq('journal_id', journalId)
      .order('line_number');

    if (entriesError) throw entriesError;

    return { journal, entries: entries || [] };
  },

  /**
   * Get journal by source reference
   */
  async getJournalBySource(
    businessId: string,
    sourceType: JournalSourceType,
    sourceId: string
  ): Promise<GLJournal | null> {
    const { data, error } = await supabase
      .from('gl_journals')
      .select('*')
      .eq('business_id', businessId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Update a draft journal
   */
  async updateJournal(
    journalId: string,
    updates: Partial<CreateJournalInput>
  ): Promise<GLJournal> {
    // Get existing journal
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error('Journal not found');
    }

    if (existing.journal.status !== 'draft') {
      throw new Error('Can only update draft journals');
    }

    // Update header if needed
    const headerUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.journalDate) headerUpdates.journal_date = updates.journalDate;
    if (updates.memo !== undefined) headerUpdates.memo = updates.memo;
    if (updates.reference !== undefined) headerUpdates.reference = updates.reference;

    // If entries are being updated, recalculate totals
    if (updates.entries) {
      let totalDebitCents = 0;
      let totalCreditCents = 0;

      for (const entry of updates.entries) {
        totalDebitCents += entry.debitCents || 0;
        totalCreditCents += entry.creditCents || 0;
      }

      if (totalDebitCents !== totalCreditCents) {
        throw new Error(
          `Journal entry must balance. Debits: ${totalDebitCents}, Credits: ${totalCreditCents}`
        );
      }

      const exchangeRate = existing.journal.exchange_rate;
      headerUpdates.total_debit_cents = totalDebitCents;
      headerUpdates.total_credit_cents = totalCreditCents;
      headerUpdates.base_total_debit_cents = Math.round(totalDebitCents * exchangeRate);
      headerUpdates.base_total_credit_cents = Math.round(totalCreditCents * exchangeRate);

      // Delete existing entries and insert new ones
      await supabase.from('gl_journal_entries').delete().eq('journal_id', journalId);

      const entryInserts = updates.entries.map((entry, index) => ({
        journal_id: journalId,
        account_id: entry.accountId,
        line_number: index + 1,
        debit_cents: entry.debitCents || 0,
        credit_cents: entry.creditCents || 0,
        base_debit_cents: Math.round((entry.debitCents || 0) * exchangeRate),
        base_credit_cents: Math.round((entry.creditCents || 0) * exchangeRate),
        property_id: entry.propertyId,
        unit_id: entry.unitId,
        tenant_id: entry.tenantId,
        vendor_id: entry.vendorId,
        tax_rate_id: entry.taxRateId,
        tax_amount_cents: entry.taxAmountCents || 0,
        description: entry.description,
      }));

      await supabase.from('gl_journal_entries').insert(entryInserts);
    }

    const { data, error } = await supabase
      .from('gl_journals')
      .update(headerUpdates)
      .eq('id', journalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a draft journal
   */
  async deleteJournal(journalId: string): Promise<void> {
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error('Journal not found');
    }

    if (existing.journal.status !== 'draft') {
      throw new Error('Can only delete draft journals');
    }

    // Entries will be cascade deleted
    const { error } = await supabase.from('gl_journals').delete().eq('id', journalId);

    if (error) throw error;
  },

  // ========================================
  // Journal Posting Operations
  // ========================================

  /**
   * Post a journal entry to the general ledger
   */
  async postJournal(journalId: string, userId: string): Promise<GLJournal> {
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error('Journal not found');
    }

    if (existing.journal.status !== 'draft' && existing.journal.status !== 'pending_approval') {
      throw new Error(`Cannot post journal with status: ${existing.journal.status}`);
    }

    // Validate balance using database function
    const { data: isBalanced, error: balanceError } = await supabase.rpc(
      'validate_journal_balance',
      { p_journal_id: journalId }
    );

    if (balanceError) throw balanceError;
    if (!isBalanced) {
      throw new Error('Journal does not balance');
    }

    // Get the business ID for fiscal period lookup
    const businessId = existing.journal.business_id;
    const journalDate = existing.journal.journal_date;

    // Get fiscal period for the journal date
    const { data: fiscalPeriod, error: periodError } = await supabase.rpc('get_fiscal_period', {
      p_business_id: businessId,
      p_date: journalDate,
    });

    if (periodError) throw periodError;

    // Create ledger entries for each journal line
    const ledgerInserts = existing.entries.map((entry) => ({
      business_id: businessId,
      account_id: entry.account_id,
      journal_id: journalId,
      journal_entry_id: entry.id,
      fiscal_year: fiscalPeriod?.fiscal_year || new Date(journalDate).getFullYear(),
      fiscal_period: fiscalPeriod?.period_number || new Date(journalDate).getMonth() + 1,
      posting_date: journalDate,
      debit_cents: entry.debit_cents,
      credit_cents: entry.credit_cents,
      base_debit_cents: entry.base_debit_cents,
      base_credit_cents: entry.base_credit_cents,
      property_id: entry.property_id,
      unit_id: entry.unit_id,
      tenant_id: entry.tenant_id,
      vendor_id: entry.vendor_id,
      description: entry.description || existing.journal.memo,
    }));

    const { error: ledgerError } = await supabase.from('gl_ledger').insert(ledgerInserts);

    if (ledgerError) throw ledgerError;

    // Update account balances
    for (const entry of existing.entries) {
      const account = await glAccountService.getAccountById(entry.account_id);
      if (!account) continue;

      // Calculate balance change based on normal balance
      let balanceChange = entry.base_debit_cents - entry.base_credit_cents;
      if (account.normal_balance === 'credit') {
        balanceChange = -balanceChange;
      }

      // Update account balance
      const { error: updateError } = await supabase
        .from('gl_accounts')
        .update({
          current_balance_cents: account.current_balance_cents + balanceChange,
          ytd_debit_cents: (account.ytd_debit_cents || 0) + entry.base_debit_cents,
          ytd_credit_cents: (account.ytd_credit_cents || 0) + entry.base_credit_cents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.account_id);

      if (updateError) throw updateError;
    }

    // Update journal status to posted
    const { data: postedJournal, error: postError } = await supabase
      .from('gl_journals')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalId)
      .select()
      .single();

    if (postError) throw postError;

    return postedJournal;
  },

  /**
   * Submit a journal for approval
   */
  async submitForApproval(journalId: string): Promise<GLJournal> {
    const { data, error } = await supabase
      .from('gl_journals')
      .update({
        status: 'pending_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Approve a pending journal
   */
  async approveJournal(journalId: string, userId: string): Promise<GLJournal> {
    const { error } = await supabase
      .from('gl_journals')
      .update({
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalId)
      .eq('status', 'pending_approval')
      .select()
      .single();

    if (error) throw error;

    // Auto-post after approval
    return this.postJournal(journalId, userId);
  },

  /**
   * Void a posted journal
   */
  async voidJournal(
    journalId: string,
    userId: string,
    reason: string
  ): Promise<GLJournal> {
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error('Journal not found');
    }

    if (existing.journal.status !== 'posted') {
      throw new Error('Can only void posted journals');
    }

    // Reverse account balances
    for (const entry of existing.entries) {
      const account = await glAccountService.getAccountById(entry.account_id);
      if (!account) continue;

      // Reverse the balance change
      let balanceChange = entry.base_debit_cents - entry.base_credit_cents;
      if (account.normal_balance === 'credit') {
        balanceChange = -balanceChange;
      }

      await supabase
        .from('gl_accounts')
        .update({
          current_balance_cents: account.current_balance_cents - balanceChange,
          ytd_debit_cents: (account.ytd_debit_cents || 0) - entry.base_debit_cents,
          ytd_credit_cents: (account.ytd_credit_cents || 0) - entry.base_credit_cents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.account_id);
    }

    // Mark ledger entries as void (soft delete by updating description)
    await supabase
      .from('gl_ledger')
      .update({ description: `[VOIDED] ${reason}` })
      .eq('journal_id', journalId);

    // Update journal status
    const { data, error } = await supabase
      .from('gl_journals')
      .update({
        status: 'void',
        voided_at: new Date().toISOString(),
        voided_by: userId,
        void_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a reversing journal entry
   */
  async createReversingJournal(
    journalId: string,
    userId: string,
    reversingDate: string
  ): Promise<GLJournal> {
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error('Journal not found');
    }

    if (existing.journal.status !== 'posted') {
      throw new Error('Can only reverse posted journals');
    }

    // Create reversed entries (swap debits and credits)
    const reversedEntries: JournalEntryInput[] = existing.entries.map((entry) => ({
      accountId: entry.account_id,
      debitCents: entry.credit_cents, // Swap
      creditCents: entry.debit_cents, // Swap
      propertyId: entry.property_id || undefined,
      unitId: entry.unit_id || undefined,
      tenantId: entry.tenant_id || undefined,
      vendorId: entry.vendor_id || undefined,
      description: `Reversal of ${existing.journal.journal_number}: ${entry.description || ''}`,
    }));

    // Create the reversing journal
    const reversingJournal = await this.createJournal(
      existing.journal.business_id,
      userId,
      {
        journalDate: reversingDate,
        journalType: 'reversing',
        sourceType: 'reversal',
        sourceId: journalId,
        transactionCurrency: existing.journal.transaction_currency,
        exchangeRate: existing.journal.exchange_rate,
        memo: `Reversal of ${existing.journal.journal_number}`,
        reference: existing.journal.reference,
        entries: reversedEntries,
        autoPost: true,
      }
    );

    // Mark original as reversed
    await supabase
      .from('gl_journals')
      .update({
        status: 'reversed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', journalId);

    return reversingJournal;
  },

  // ========================================
  // Auto-Posting from Transactions
  // ========================================

  /**
   * Create journal from a rent payment
   */
  async createFromRentPayment(
    businessId: string,
    userId: string,
    payment: {
      id: string;
      paymentDate: string;
      amountCents: number;
      paymentType: 'rent' | 'security_deposit' | 'pet_deposit' | 'late_fee' | 'utility' | 'maintenance' | 'other';
      tenantName?: string;
      unitName?: string;
      propertyId?: string;
      unitId?: string;
      tenantId?: string;
      currency?: string;
    }
  ): Promise<GLJournal> {
    // Check if journal already exists for this payment
    const existing = await this.getJournalBySource(businessId, 'rent_payment', payment.id);
    if (existing) {
      throw new Error('Journal already exists for this payment');
    }

    // Get GL mapping for payment type
    const mapping = getPaymentMapping(payment.paymentType);

    // Get account IDs from account numbers
    const debitAccount = await glAccountService.getAccountByNumber(businessId, mapping.debit);
    const creditAccount = await glAccountService.getAccountByNumber(businessId, mapping.credit);

    if (!debitAccount || !creditAccount) {
      throw new Error(
        `GL accounts not found. Ensure chart of accounts is initialized. Missing: ${!debitAccount ? mapping.debit : ''} ${!creditAccount ? mapping.credit : ''}`
      );
    }

    // Format description
    const description = formatDescription(mapping.descriptionTemplate, {
      tenant: payment.tenantName,
      unit: payment.unitName,
    });

    // Create journal entries
    const entries: JournalEntryInput[] = [
      {
        accountId: debitAccount.id,
        debitCents: payment.amountCents,
        creditCents: 0,
        propertyId: payment.propertyId,
        unitId: payment.unitId,
        tenantId: payment.tenantId,
        description,
      },
      {
        accountId: creditAccount.id,
        debitCents: 0,
        creditCents: payment.amountCents,
        propertyId: payment.propertyId,
        unitId: payment.unitId,
        tenantId: payment.tenantId,
        description,
      },
    ];

    return this.createJournal(businessId, userId, {
      journalDate: payment.paymentDate,
      journalType: 'cash_receipts',
      sourceType: 'rent_payment',
      sourceId: payment.id,
      transactionCurrency: payment.currency,
      memo: description,
      entries,
      autoPost: true,
    });
  },

  /**
   * Create journal from an expense
   */
  async createFromExpense(
    businessId: string,
    userId: string,
    expense: {
      id: string;
      expenseDate: string;
      amountCents: number;
      category: string;
      vendorName?: string;
      propertyName?: string;
      propertyId?: string;
      unitId?: string;
      vendorId?: string;
      currency?: string;
      taxAmountCents?: number;
      taxRateId?: string;
    }
  ): Promise<GLJournal> {
    // Check if journal already exists for this expense
    const existing = await this.getJournalBySource(businessId, 'expense', expense.id);
    if (existing) {
      throw new Error('Journal already exists for this expense');
    }

    // Get GL mapping for expense category
    const mapping = getExpenseMapping(expense.category as any);

    // Get account IDs from account numbers
    const debitAccount = await glAccountService.getAccountByNumber(businessId, mapping.debit);
    const creditAccount = await glAccountService.getAccountByNumber(businessId, mapping.credit);

    if (!debitAccount || !creditAccount) {
      throw new Error(
        `GL accounts not found. Ensure chart of accounts is initialized. Missing: ${!debitAccount ? mapping.debit : ''} ${!creditAccount ? mapping.credit : ''}`
      );
    }

    // Format description
    const description = formatDescription(mapping.descriptionTemplate, {
      vendor: expense.vendorName,
      property: expense.propertyName,
    });

    // Build entries
    const entries: JournalEntryInput[] = [];

    // Main expense entry
    entries.push({
      accountId: debitAccount.id,
      debitCents: expense.amountCents,
      creditCents: 0,
      propertyId: expense.propertyId,
      unitId: expense.unitId,
      vendorId: expense.vendorId,
      description,
    });

    // Tax entry if applicable
    if (expense.taxAmountCents && expense.taxAmountCents > 0) {
      const taxAccount = await glAccountService.getAccountByNumber(
        businessId,
        GL_ACCOUNTS.GST_HST_PAYABLE
      );

      if (taxAccount) {
        entries.push({
          accountId: taxAccount.id,
          debitCents: expense.taxAmountCents,
          creditCents: 0,
          propertyId: expense.propertyId,
          vendorId: expense.vendorId,
          taxRateId: expense.taxRateId,
          taxAmountCents: expense.taxAmountCents,
          description: `Tax on ${description}`,
        });
      }
    }

    // Credit to bank/cash
    const totalDebit = entries.reduce((sum, e) => sum + (e.debitCents || 0), 0);
    entries.push({
      accountId: creditAccount.id,
      debitCents: 0,
      creditCents: totalDebit,
      propertyId: expense.propertyId,
      vendorId: expense.vendorId,
      description,
    });

    return this.createJournal(businessId, userId, {
      journalDate: expense.expenseDate,
      journalType: 'cash_payments',
      sourceType: 'expense',
      sourceId: expense.id,
      transactionCurrency: expense.currency,
      memo: description,
      entries,
      autoPost: true,
    });
  },

  /**
   * Create journal from a special transaction (deposit refund, owner draw, etc.)
   */
  async createFromSpecialTransaction(
    businessId: string,
    userId: string,
    transaction: {
      id: string;
      transactionDate: string;
      amountCents: number;
      transactionType: keyof typeof import('../config/glAccountMappings').SPECIAL_MAPPINGS;
      tenantName?: string;
      unitName?: string;
      propertyId?: string;
      unitId?: string;
      tenantId?: string;
      vendorId?: string;
      currency?: string;
    }
  ): Promise<GLJournal> {
    // Get GL mapping for special transaction type
    const mapping = getSpecialMapping(transaction.transactionType);

    if (!mapping) {
      throw new Error(`Unknown transaction type: ${transaction.transactionType}`);
    }

    // Get account IDs from account numbers
    const debitAccount = await glAccountService.getAccountByNumber(businessId, mapping.debit);
    const creditAccount = await glAccountService.getAccountByNumber(businessId, mapping.credit);

    if (!debitAccount || !creditAccount) {
      throw new Error(
        `GL accounts not found. Ensure chart of accounts is initialized.`
      );
    }

    // Format description
    const description = formatDescription(mapping.descriptionTemplate, {
      tenant: transaction.tenantName,
      unit: transaction.unitName,
    });

    // Create journal entries
    const entries: JournalEntryInput[] = [
      {
        accountId: debitAccount.id,
        debitCents: transaction.amountCents,
        creditCents: 0,
        propertyId: transaction.propertyId,
        unitId: transaction.unitId,
        tenantId: transaction.tenantId,
        vendorId: transaction.vendorId,
        description,
      },
      {
        accountId: creditAccount.id,
        debitCents: 0,
        creditCents: transaction.amountCents,
        propertyId: transaction.propertyId,
        unitId: transaction.unitId,
        tenantId: transaction.tenantId,
        vendorId: transaction.vendorId,
        description,
      },
    ];

    // Determine journal type
    let journalType: JournalType = 'general';
    if (
      transaction.transactionType === 'owner_contribution' ||
      transaction.transactionType.includes('refund')
    ) {
      journalType = 'cash_receipts';
    } else if (
      transaction.transactionType === 'owner_draw' ||
      transaction.transactionType === 'bank_fee'
    ) {
      journalType = 'cash_payments';
    }

    return this.createJournal(businessId, userId, {
      journalDate: transaction.transactionDate,
      journalType,
      sourceType: 'special_transaction',
      sourceId: transaction.id,
      transactionCurrency: transaction.currency,
      memo: description,
      entries,
      autoPost: true,
    });
  },

  // ========================================
  // Reporting Queries
  // ========================================

  /**
   * Get general ledger entries for an account
   */
  async getAccountLedger(
    accountId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<GLLedgerEntry[]> {
    let query = supabase
      .from('gl_ledger')
      .select('*, gl_journals(journal_number, memo)')
      .eq('account_id', accountId)
      .order('posting_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('posting_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('posting_date', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get journal count by status
   */
  async getJournalCountsByStatus(
    businessId: string
  ): Promise<Record<JournalStatus, number>> {
    const { data, error } = await supabase
      .from('gl_journals')
      .select('status')
      .eq('business_id', businessId);

    if (error) throw error;

    const counts: Record<JournalStatus, number> = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      posted: 0,
      void: 0,
      reversed: 0,
    };

    for (const journal of data || []) {
      counts[journal.status as JournalStatus]++;
    }

    return counts;
  },

  /**
   * Get recent journal activity
   */
  async getRecentJournals(
    businessId: string,
    limit: number = 10
  ): Promise<GLJournal[]> {
    const { data, error } = await supabase
      .from('gl_journals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
