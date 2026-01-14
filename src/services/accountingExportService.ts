import { supabase } from '../lib/supabase';
import { GLAccount, GLExportHistory } from '../types';
import { glAccountService } from './glAccountService';
import { journalService } from './journalService';
import { vendorService } from './vendorService';

export type ExportFormat = 'quickbooks_iif' | 'quickbooks_csv' | 'sage_csv' | 'generic_csv';
export type ExportType = 'chart_of_accounts' | 'journal_entries' | 'vendors' | 'trial_balance';

export interface ExportOptions {
  format: ExportFormat;
  exportType: ExportType;
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  includeHeaders?: boolean;
}

export interface ExportResult {
  content: string;
  fileName: string;
  mimeType: string;
  recordCount: number;
}

export const accountingExportService = {
  // ========================================
  // Main Export Functions
  // ========================================

  /**
   * Export data in the specified format
   */
  async exportData(
    businessId: string,
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let result: ExportResult;

    switch (options.format) {
      case 'quickbooks_iif':
        result = await this.exportToQuickBooksIIF(businessId, options);
        break;
      case 'quickbooks_csv':
        result = await this.exportToQuickBooksCSV(businessId, options);
        break;
      case 'sage_csv':
        result = await this.exportToSageCSV(businessId, options);
        break;
      case 'generic_csv':
      default:
        result = await this.exportToGenericCSV(businessId, options);
        break;
    }

    // Log export history
    await this.logExport(businessId, userId, options, result);

    return result;
  },

  // ========================================
  // QuickBooks IIF Export
  // ========================================

  /**
   * Export to QuickBooks IIF format (Desktop)
   */
  async exportToQuickBooksIIF(
    businessId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let content = '';
    let recordCount = 0;

    switch (options.exportType) {
      case 'chart_of_accounts':
        const coaResult = await this.generateIIFChartOfAccounts(businessId);
        content = coaResult.content;
        recordCount = coaResult.count;
        break;

      case 'journal_entries':
        const jeResult = await this.generateIIFJournalEntries(
          businessId,
          options.startDate,
          options.endDate
        );
        content = jeResult.content;
        recordCount = jeResult.count;
        break;

      case 'vendors':
        const vendorResult = await this.generateIIFVendors(businessId);
        content = vendorResult.content;
        recordCount = vendorResult.count;
        break;

      default:
        throw new Error(`Export type ${options.exportType} not supported for IIF format`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${options.exportType}_${timestamp}.iif`;

    return {
      content,
      fileName,
      mimeType: 'text/plain',
      recordCount,
    };
  },

  /**
   * Generate IIF chart of accounts
   */
  async generateIIFChartOfAccounts(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
    });

    const lines: string[] = [];

    // Header line
    lines.push('!ACCNT\tNAME\tACCNTTYPE\tDESC\tACCNUM');

    // Map account types to QuickBooks types
    const typeMap: Record<string, string> = {
      asset: 'BANK',
      liability: 'OCLIAB',
      equity: 'EQUITY',
      revenue: 'INC',
      expense: 'EXP',
    };

    for (const account of accounts) {
      const qbType = typeMap[account.account_type] || 'EXP';

      // Escape tab characters in values
      const name = account.account_name.replace(/\t/g, ' ');
      const desc = (account.description || '').replace(/\t/g, ' ');

      lines.push(
        `ACCNT\t${name}\t${qbType}\t${desc}\t${account.account_number}`
      );
    }

    return {
      content: lines.join('\r\n'),
      count: accounts.length,
    };
  },

  /**
   * Generate IIF journal entries
   */
  async generateIIFJournalEntries(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ content: string; count: number }> {
    const journals = await journalService.getJournals(businessId, {
      status: 'posted',
      startDate,
      endDate,
    });

    const accounts = await glAccountService.getAccounts(businessId);
    const accountMap = new Map<string, GLAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    const lines: string[] = [];

    // Header lines
    lines.push(
      '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO'
    );
    lines.push(
      '!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO'
    );
    lines.push('!ENDTRNS');

    for (const journal of journals) {
      const journalData = await journalService.getJournalById(journal.id);
      if (!journalData) continue;

      const { entries } = journalData;
      const date = new Date(journal.journal_date).toLocaleDateString('en-US');
      const trnsType = 'GENERAL JOURNAL';
      const docNum = journal.journal_number;
      const memo = (journal.memo || '').replace(/\t/g, ' ').replace(/\n/g, ' ');

      // First line is TRNS (first entry)
      const firstEntry = entries[0];
      if (!firstEntry) continue;

      const firstAccount = accountMap.get(firstEntry.account_id);
      const firstAmount =
        firstEntry.debit_cents > 0
          ? firstEntry.debit_cents / 100
          : -(firstEntry.credit_cents / 100);

      lines.push(
        `TRNS\t${trnsType}\t${date}\t${firstAccount?.account_name || ''}\t\t${firstAmount.toFixed(2)}\t${docNum}\t${memo}`
      );

      // Remaining lines are SPL
      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry) continue;

        const account = accountMap.get(entry.account_id);
        const amount =
          entry.debit_cents > 0
            ? entry.debit_cents / 100
            : -(entry.credit_cents / 100);

        lines.push(
          `SPL\t${trnsType}\t${date}\t${account?.account_name || ''}\t\t${amount.toFixed(2)}\t${docNum}\t${memo}`
        );
      }

      lines.push('ENDTRNS');
    }

    return {
      content: lines.join('\r\n'),
      count: journals.length,
    };
  },

  /**
   * Generate IIF vendors
   */
  async generateIIFVendors(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const vendors = await vendorService.getVendors(businessId, { isActive: true });

    const lines: string[] = [];

    // Header line
    lines.push(
      '!VEND\tNAME\tCOMPANYNAME\tADDR1\tADDR2\tCITY\tSTATE\tZIP\tCOUNTRY\tPHONE1\tEMAIL'
    );

    for (const vendor of vendors) {
      const name = vendor.vendor_name.replace(/\t/g, ' ');
      const company = (vendor.legal_name || vendor.vendor_name).replace(/\t/g, ' ');
      const addr1 = (vendor.address_line1 || '').replace(/\t/g, ' ');
      const addr2 = (vendor.address_line2 || '').replace(/\t/g, ' ');
      const city = (vendor.city || '').replace(/\t/g, ' ');
      const state = vendor.state_province || '';
      const zip = vendor.postal_code || '';
      const country = vendor.country || '';
      const phone = vendor.phone || '';
      const email = vendor.email || '';

      lines.push(
        `VEND\t${name}\t${company}\t${addr1}\t${addr2}\t${city}\t${state}\t${zip}\t${country}\t${phone}\t${email}`
      );
    }

    return {
      content: lines.join('\r\n'),
      count: vendors.length,
    };
  },

  // ========================================
  // QuickBooks CSV Export (Online)
  // ========================================

  /**
   * Export to QuickBooks Online CSV format
   */
  async exportToQuickBooksCSV(
    businessId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let content = '';
    let recordCount = 0;

    switch (options.exportType) {
      case 'chart_of_accounts':
        const coaResult = await this.generateQBOChartOfAccountsCSV(businessId);
        content = coaResult.content;
        recordCount = coaResult.count;
        break;

      case 'journal_entries':
        const jeResult = await this.generateQBOJournalEntriesCSV(
          businessId,
          options.startDate,
          options.endDate
        );
        content = jeResult.content;
        recordCount = jeResult.count;
        break;

      default:
        throw new Error(
          `Export type ${options.exportType} not supported for QuickBooks CSV format`
        );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `qbo_${options.exportType}_${timestamp}.csv`;

    return {
      content,
      fileName,
      mimeType: 'text/csv',
      recordCount,
    };
  },

  /**
   * Generate QBO chart of accounts CSV
   */
  async generateQBOChartOfAccountsCSV(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
    });

    const lines: string[] = [];

    // Header
    lines.push('Account Type,Detail Type,Name,Description,Balance');

    // Map to QBO account types
    const typeMap: Record<string, { type: string; detail: string }> = {
      asset: { type: 'Bank', detail: 'Cash on hand' },
      liability: { type: 'Other Current Liabilities', detail: 'Other Current Liabilities' },
      equity: { type: 'Equity', detail: 'Retained Earnings' },
      revenue: { type: 'Income', detail: 'Service/Fee Income' },
      expense: { type: 'Expenses', detail: 'Other Miscellaneous Service Cost' },
    };

    for (const account of accounts) {
      const mapping = typeMap[account.account_type] || typeMap.expense || { type: 'Expenses', detail: 'Other Miscellaneous Service Cost' };

      const name = this.escapeCSV(account.account_name);
      const desc = this.escapeCSV(account.description || '');
      const balance = (account.current_balance_cents / 100).toFixed(2);

      lines.push(`${mapping.type},${mapping.detail},${name},${desc},${balance}`);
    }

    return {
      content: lines.join('\r\n'),
      count: accounts.length,
    };
  },

  /**
   * Generate QBO journal entries CSV
   */
  async generateQBOJournalEntriesCSV(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ content: string; count: number }> {
    const journals = await journalService.getJournals(businessId, {
      status: 'posted',
      startDate,
      endDate,
    });

    const accounts = await glAccountService.getAccounts(businessId);
    const accountMap = new Map<string, GLAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    const lines: string[] = [];

    // Header
    lines.push('Journal No,Journal Date,Currency,Account,Debits,Credits,Description,Name,Memo');

    for (const journal of journals) {
      const journalData = await journalService.getJournalById(journal.id);
      if (!journalData) continue;

      const { entries } = journalData;
      const date = journal.journal_date;
      const currency = journal.transaction_currency;
      const memo = this.escapeCSV(journal.memo || '');

      for (const entry of entries) {
        const account = accountMap.get(entry.account_id);
        const debit = entry.debit_cents > 0 ? (entry.debit_cents / 100).toFixed(2) : '';
        const credit = entry.credit_cents > 0 ? (entry.credit_cents / 100).toFixed(2) : '';
        const desc = this.escapeCSV(entry.description || '');

        lines.push(
          `${journal.journal_number},${date},${currency},${this.escapeCSV(account?.account_name || '')},${debit},${credit},${desc},,${memo}`
        );
      }
    }

    return {
      content: lines.join('\r\n'),
      count: journals.length,
    };
  },

  // ========================================
  // Sage CSV Export
  // ========================================

  /**
   * Export to Sage/Simply CSV format
   */
  async exportToSageCSV(
    businessId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let content = '';
    let recordCount = 0;

    switch (options.exportType) {
      case 'chart_of_accounts':
        const coaResult = await this.generateSageChartOfAccountsCSV(businessId);
        content = coaResult.content;
        recordCount = coaResult.count;
        break;

      case 'journal_entries':
        const jeResult = await this.generateSageJournalEntriesCSV(
          businessId,
          options.startDate,
          options.endDate
        );
        content = jeResult.content;
        recordCount = jeResult.count;
        break;

      default:
        throw new Error(
          `Export type ${options.exportType} not supported for Sage CSV format`
        );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `sage_${options.exportType}_${timestamp}.csv`;

    return {
      content,
      fileName,
      mimeType: 'text/csv',
      recordCount,
    };
  },

  /**
   * Generate Sage chart of accounts CSV
   */
  async generateSageChartOfAccountsCSV(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
    });

    const lines: string[] = [];

    // Sage header format
    lines.push('Account Number,Account Description,Account Type,Current Balance');

    // Map to Sage account type codes
    const typeMap: Record<string, string> = {
      asset: 'A',
      liability: 'L',
      equity: 'E',
      revenue: 'R',
      expense: 'X',
    };

    for (const account of accounts) {
      const typeCode = typeMap[account.account_type] || 'X';
      const name = this.escapeCSV(account.account_name);
      const balance = (account.current_balance_cents / 100).toFixed(2);

      lines.push(`${account.account_number},${name},${typeCode},${balance}`);
    }

    return {
      content: lines.join('\r\n'),
      count: accounts.length,
    };
  },

  /**
   * Generate Sage journal entries CSV
   */
  async generateSageJournalEntriesCSV(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ content: string; count: number }> {
    const journals = await journalService.getJournals(businessId, {
      status: 'posted',
      startDate,
      endDate,
    });

    const accounts = await glAccountService.getAccounts(businessId);
    const accountMap = new Map<string, GLAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    const lines: string[] = [];

    // Sage journal entry header
    lines.push('Date,Source,Comment,Account Number,Debit,Credit');

    for (const journal of journals) {
      const journalData = await journalService.getJournalById(journal.id);
      if (!journalData) continue;

      const { entries } = journalData;
      const date = journal.journal_date;
      const source = journal.journal_number;
      const comment = this.escapeCSV(journal.memo || '');

      for (const entry of entries) {
        const account = accountMap.get(entry.account_id);
        const debit = entry.debit_cents > 0 ? (entry.debit_cents / 100).toFixed(2) : '';
        const credit = entry.credit_cents > 0 ? (entry.credit_cents / 100).toFixed(2) : '';

        lines.push(
          `${date},${source},${comment},${account?.account_number || ''},${debit},${credit}`
        );
      }
    }

    return {
      content: lines.join('\r\n'),
      count: journals.length,
    };
  },

  // ========================================
  // Generic CSV Export
  // ========================================

  /**
   * Export to generic CSV format
   */
  async exportToGenericCSV(
    businessId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let content = '';
    let recordCount = 0;

    switch (options.exportType) {
      case 'chart_of_accounts':
        const coaResult = await this.generateGenericChartOfAccountsCSV(businessId);
        content = coaResult.content;
        recordCount = coaResult.count;
        break;

      case 'journal_entries':
        const jeResult = await this.generateGenericJournalEntriesCSV(
          businessId,
          options.startDate,
          options.endDate
        );
        content = jeResult.content;
        recordCount = jeResult.count;
        break;

      case 'vendors':
        const vendorResult = await this.generateGenericVendorsCSV(businessId);
        content = vendorResult.content;
        recordCount = vendorResult.count;
        break;

      case 'trial_balance':
        const tbResult = await this.generateGenericTrialBalanceCSV(
          businessId,
          options.endDate || new Date().toISOString().slice(0, 10)
        );
        content = tbResult.content;
        recordCount = tbResult.count;
        break;

      default:
        throw new Error(`Export type ${options.exportType} not supported`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${options.exportType}_${timestamp}.csv`;

    return {
      content,
      fileName,
      mimeType: 'text/csv',
      recordCount,
    };
  },

  /**
   * Generate generic chart of accounts CSV
   */
  async generateGenericChartOfAccountsCSV(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const accounts = await glAccountService.getAccounts(businessId, {
      isActive: true,
    });

    const lines: string[] = [];

    lines.push(
      'Account Number,Account Name,Account Type,Account Subtype,Normal Balance,Current Balance,Is Bank Account,Is Header,Description'
    );

    for (const account of accounts) {
      const balance = (account.current_balance_cents / 100).toFixed(2);

      lines.push(
        [
          account.account_number,
          this.escapeCSV(account.account_name),
          account.account_type,
          account.account_subtype || '',
          account.normal_balance,
          balance,
          account.is_bank_account ? 'Yes' : 'No',
          account.is_header_account ? 'Yes' : 'No',
          this.escapeCSV(account.description || ''),
        ].join(',')
      );
    }

    return {
      content: lines.join('\r\n'),
      count: accounts.length,
    };
  },

  /**
   * Generate generic journal entries CSV
   */
  async generateGenericJournalEntriesCSV(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ content: string; count: number }> {
    const journals = await journalService.getJournals(businessId, {
      status: 'posted',
      startDate,
      endDate,
    });

    const accounts = await glAccountService.getAccounts(businessId);
    const accountMap = new Map<string, GLAccount>();
    for (const account of accounts) {
      accountMap.set(account.id, account);
    }

    const lines: string[] = [];

    lines.push(
      'Journal Number,Date,Type,Account Number,Account Name,Debit,Credit,Currency,Exchange Rate,Memo,Reference'
    );

    for (const journal of journals) {
      const journalData = await journalService.getJournalById(journal.id);
      if (!journalData) continue;

      const { entries } = journalData;

      for (const entry of entries) {
        const account = accountMap.get(entry.account_id);
        const debit = entry.debit_cents > 0 ? (entry.debit_cents / 100).toFixed(2) : '';
        const credit = entry.credit_cents > 0 ? (entry.credit_cents / 100).toFixed(2) : '';

        lines.push(
          [
            journal.journal_number,
            journal.journal_date,
            journal.journal_type,
            account?.account_number || '',
            this.escapeCSV(account?.account_name || ''),
            debit,
            credit,
            journal.transaction_currency,
            journal.exchange_rate.toString(),
            this.escapeCSV(journal.memo || ''),
            this.escapeCSV(journal.reference || ''),
          ].join(',')
        );
      }
    }

    return {
      content: lines.join('\r\n'),
      count: journals.length,
    };
  },

  /**
   * Generate generic vendors CSV
   */
  async generateGenericVendorsCSV(
    businessId: string
  ): Promise<{ content: string; count: number }> {
    const vendors = await vendorService.getVendors(businessId);

    const lines: string[] = [];

    lines.push(
      'Vendor Code,Vendor Name,Legal Name,Type,Contact,Email,Phone,Address,City,State/Province,Postal Code,Country,Currency,1099 Eligible,T5018 Eligible,Tax ID,YTD Payments,Active'
    );

    for (const vendor of vendors) {
      const ytdPayments = (vendor.total_paid_ytd_cents / 100).toFixed(2);

      lines.push(
        [
          vendor.vendor_code || '',
          this.escapeCSV(vendor.vendor_name),
          this.escapeCSV(vendor.legal_name || ''),
          vendor.vendor_type,
          this.escapeCSV(vendor.contact_name || ''),
          vendor.email || '',
          vendor.phone || '',
          this.escapeCSV(vendor.address_line1 || ''),
          this.escapeCSV(vendor.city || ''),
          vendor.state_province || '',
          vendor.postal_code || '',
          vendor.country || '',
          vendor.currency_code,
          vendor.is_1099_eligible ? 'Yes' : 'No',
          vendor.is_t5018_eligible ? 'Yes' : 'No',
          vendor.tax_id ? '***' + vendor.tax_id.slice(-4) : '',
          ytdPayments,
          vendor.is_active ? 'Yes' : 'No',
        ].join(',')
      );
    }

    return {
      content: lines.join('\r\n'),
      count: vendors.length,
    };
  },

  /**
   * Generate generic trial balance CSV
   */
  async generateGenericTrialBalanceCSV(
    businessId: string,
    asOfDate: string
  ): Promise<{ content: string; count: number }> {
    const { financialReportingService } = await import('./financialReportingService');

    const trialBalance = await financialReportingService.generateTrialBalance(
      businessId,
      asOfDate,
      { includeZeroBalances: false }
    );

    const lines: string[] = [];

    lines.push('Account Number,Account Name,Account Type,Debit,Credit');

    const rows = trialBalance.rows || trialBalance.accounts || [];
    for (const row of rows) {
      const debitCents = row.debit_cents ?? row.debit_balance_cents ?? 0;
      const creditCents = row.credit_cents ?? row.credit_balance_cents ?? 0;
      const debit = debitCents > 0 ? (debitCents / 100).toFixed(2) : '';
      const credit = creditCents > 0 ? (creditCents / 100).toFixed(2) : '';

      lines.push(
        [
          row.account_number,
          this.escapeCSV(row.account_name),
          row.account_type,
          debit,
          credit,
        ].join(',')
      );
    }

    // Add totals row
    lines.push(
      [
        '',
        'TOTALS',
        '',
        (trialBalance.total_debits_cents / 100).toFixed(2),
        (trialBalance.total_credits_cents / 100).toFixed(2),
      ].join(',')
    );

    return {
      content: lines.join('\r\n'),
      count: rows.length,
    };
  },

  // ========================================
  // Export History & Utilities
  // ========================================

  /**
   * Log export to history
   */
  async logExport(
    businessId: string,
    userId: string,
    options: ExportOptions,
    result: ExportResult
  ): Promise<void> {
    await supabase.from('gl_export_history').insert({
      business_id: businessId,
      export_format: options.format,
      export_type: options.exportType,
      start_date: options.startDate,
      end_date: options.endDate,
      file_name: result.fileName,
      file_size_bytes: result.content.length,
      record_count: result.recordCount,
      status: 'completed',
      exported_by: userId,
    });
  },

  /**
   * Get export history
   */
  async getExportHistory(
    businessId: string,
    limit: number = 50
  ): Promise<GLExportHistory[]> {
    const { data, error } = await supabase
      .from('gl_export_history')
      .select('*')
      .eq('business_id', businessId)
      .order('exported_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Escape a value for CSV
   */
  escapeCSV(value: string): string {
    if (!value) return '';

    // If contains comma, newline, or quote, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  },

  /**
   * Download helper - triggers browser download
   */
  downloadFile(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
