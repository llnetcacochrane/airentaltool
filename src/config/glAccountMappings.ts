/**
 * GL Account Mappings for Auto-Posting
 *
 * This configuration defines how transactions automatically create journal entries.
 * Each mapping specifies the debit and credit accounts for different transaction types.
 *
 * Account Number Ranges:
 * - 1000-1999: Assets
 * - 2000-2999: Liabilities
 * - 3000-3999: Equity
 * - 4000-4999: Revenue
 * - 5000-6999: Expenses
 */

import { ExpenseCategory, PaymentType } from '../types';

// ========================================
// Account Number Constants
// ========================================

export const GL_ACCOUNTS = {
  // Assets (1000-1999)
  OPERATING_BANK: '1010',
  SECURITY_DEPOSIT_BANK: '1020',
  PETTY_CASH: '1030',
  ACCOUNTS_RECEIVABLE: '1100',
  RENT_RECEIVABLE: '1110',
  OTHER_RECEIVABLES: '1120',
  PREPAID_EXPENSES: '1200',
  PREPAID_INSURANCE: '1210',

  // Liabilities (2000-2999)
  SECURITY_DEPOSITS_HELD: '2100',
  TENANT_SECURITY_DEPOSITS: '2110',
  PET_DEPOSITS: '2120',
  ACCOUNTS_PAYABLE: '2200',
  PREPAID_RENT: '2300',
  GST_HST_PAYABLE: '2410',
  PST_PAYABLE: '2420',
  PROPERTY_TAX_PAYABLE: '2430',
  ACCRUED_EXPENSES: '2500',
  CREDIT_CARDS_PAYABLE: '2600',
  MORTGAGE_PAYABLE: '2710',

  // Equity (3000-3999)
  OWNER_EQUITY: '3100',
  OWNER_DRAWS: '3200',
  RETAINED_EARNINGS: '3300',
  CURRENT_YEAR_EARNINGS: '3400',

  // Revenue (4000-4999)
  RENTAL_INCOME: '4010',
  LATE_FEE_INCOME: '4020',
  PARKING_INCOME: '4030',
  LAUNDRY_INCOME: '4040',
  PET_FEE_INCOME: '4050',
  STORAGE_INCOME: '4060',
  APPLICATION_FEE_INCOME: '4070',
  NSF_FEE_INCOME: '4080',
  UTILITY_REIMBURSEMENT: '4090',
  DEPOSIT_FORFEITURES: '4100',
  INTEREST_INCOME: '4510',
  MISC_INCOME: '4520',

  // Expenses (5000-6999)
  REPAIRS_MAINTENANCE: '5100',
  GENERAL_REPAIRS: '5110',
  PLUMBING: '5120',
  ELECTRICAL: '5130',
  HVAC: '5140',
  APPLIANCE_REPAIR: '5150',
  PAINTING: '5160',
  FLOORING: '5170',
  ROOFING: '5180',
  PEST_CONTROL: '5190',
  UTILITIES: '5200',
  ELECTRICITY: '5210',
  GAS: '5220',
  WATER_SEWER: '5230',
  TRASH_REMOVAL: '5240',
  INTERNET_CABLE: '5250',
  PROPERTY_INSURANCE: '5300',
  PROPERTY_TAXES: '5400',
  MORTGAGE_INTEREST: '5500',
  MANAGEMENT_FEES: '5600',
  LEGAL_FEES: '5710',
  ACCOUNTING_FEES: '5720',
  CONSULTING_FEES: '5730',
  ONLINE_ADVERTISING: '5810',
  PRINT_ADVERTISING: '5820',
  SIGNAGE: '5830',
  OFFICE_SUPPLIES: '5910',
  POSTAGE_SHIPPING: '5920',
  BANK_FEES: '5930',
  SOFTWARE_SUBSCRIPTIONS: '5940',
  TELEPHONE: '5950',
  LANDSCAPING: '5960',
  SNOW_REMOVAL: '5970',
  CLEANING_JANITORIAL: '5980',
  SECURITY: '5990',
  DEPRECIATION_BUILDINGS: '6010',
  DEPRECIATION_EQUIPMENT: '6020',
  BAD_DEBT: '6100',
  MISC_EXPENSE: '6200',
} as const;

// ========================================
// Payment Type Mappings
// ========================================

export interface GLMapping {
  debit: string;
  credit: string;
  descriptionTemplate: string;
}

/**
 * Mappings for rent payments and other tenant payments
 */
export const PAYMENT_TYPE_MAPPINGS: Record<PaymentType, GLMapping> = {
  rent: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.RENTAL_INCOME,
    descriptionTemplate: 'Rent payment - {tenant} - {unit}',
  },
  security_deposit: {
    debit: GL_ACCOUNTS.SECURITY_DEPOSIT_BANK,
    credit: GL_ACCOUNTS.TENANT_SECURITY_DEPOSITS,
    descriptionTemplate: 'Security deposit received - {tenant} - {unit}',
  },
  pet_deposit: {
    debit: GL_ACCOUNTS.SECURITY_DEPOSIT_BANK,
    credit: GL_ACCOUNTS.PET_DEPOSITS,
    descriptionTemplate: 'Pet deposit received - {tenant} - {unit}',
  },
  late_fee: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.LATE_FEE_INCOME,
    descriptionTemplate: 'Late fee payment - {tenant} - {unit}',
  },
  utility: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.UTILITY_REIMBURSEMENT,
    descriptionTemplate: 'Utility reimbursement - {tenant} - {unit}',
  },
  maintenance: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.MISC_INCOME,
    descriptionTemplate: 'Maintenance charge payment - {tenant} - {unit}',
  },
  other: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.MISC_INCOME,
    descriptionTemplate: 'Other payment - {tenant} - {unit}',
  },
};

// ========================================
// Expense Category Mappings
// ========================================

/**
 * Mappings for expenses by category
 */
export const EXPENSE_CATEGORY_MAPPINGS: Record<ExpenseCategory, GLMapping> = {
  maintenance: {
    debit: GL_ACCOUNTS.REPAIRS_MAINTENANCE,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Maintenance expense - {vendor} - {property}',
  },
  repair: {
    debit: GL_ACCOUNTS.GENERAL_REPAIRS,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Repair expense - {vendor} - {property}',
  },
  utility: {
    debit: GL_ACCOUNTS.UTILITIES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Utility expense - {vendor} - {property}',
  },
  insurance: {
    debit: GL_ACCOUNTS.PROPERTY_INSURANCE,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Insurance expense - {vendor} - {property}',
  },
  property_tax: {
    debit: GL_ACCOUNTS.PROPERTY_TAXES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Property tax payment - {property}',
  },
  hoa_fee: {
    debit: GL_ACCOUNTS.MANAGEMENT_FEES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'HOA fee - {property}',
  },
  mortgage: {
    debit: GL_ACCOUNTS.MORTGAGE_INTEREST,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Mortgage payment - {property}',
  },
  advertising: {
    debit: GL_ACCOUNTS.ONLINE_ADVERTISING,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Advertising expense - {vendor}',
  },
  legal: {
    debit: GL_ACCOUNTS.LEGAL_FEES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Legal expense - {vendor}',
  },
  accounting: {
    debit: GL_ACCOUNTS.ACCOUNTING_FEES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Accounting expense - {vendor}',
  },
  management_fee: {
    debit: GL_ACCOUNTS.MANAGEMENT_FEES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Management fee - {vendor}',
  },
  cleaning: {
    debit: GL_ACCOUNTS.CLEANING_JANITORIAL,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Cleaning expense - {vendor} - {property}',
  },
  landscaping: {
    debit: GL_ACCOUNTS.LANDSCAPING,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Landscaping expense - {vendor} - {property}',
  },
  snow_removal: {
    debit: GL_ACCOUNTS.SNOW_REMOVAL,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Snow removal expense - {vendor} - {property}',
  },
  supplies: {
    debit: GL_ACCOUNTS.OFFICE_SUPPLIES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Supplies expense - {vendor}',
  },
  other: {
    debit: GL_ACCOUNTS.MISC_EXPENSE,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Other expense - {vendor}',
  },
};

// ========================================
// Special Transaction Mappings
// ========================================

/**
 * Mappings for special transactions
 */
export const SPECIAL_MAPPINGS = {
  // Security deposit refund
  security_deposit_refund: {
    debit: GL_ACCOUNTS.TENANT_SECURITY_DEPOSITS,
    credit: GL_ACCOUNTS.SECURITY_DEPOSIT_BANK,
    descriptionTemplate: 'Security deposit refund - {tenant} - {unit}',
  },

  // Security deposit forfeiture (tenant damage)
  security_deposit_forfeiture: {
    debit: GL_ACCOUNTS.TENANT_SECURITY_DEPOSITS,
    credit: GL_ACCOUNTS.DEPOSIT_FORFEITURES,
    descriptionTemplate: 'Security deposit forfeiture - {tenant} - {unit}',
  },

  // Security deposit deduction for damages
  security_deposit_damage_deduction: {
    debit: GL_ACCOUNTS.TENANT_SECURITY_DEPOSITS,
    credit: GL_ACCOUNTS.REPAIRS_MAINTENANCE,
    descriptionTemplate: 'Damage deduction from deposit - {tenant} - {unit}',
  },

  // NSF/Bounced check fee
  nsf_fee: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.NSF_FEE_INCOME,
    descriptionTemplate: 'NSF fee - {tenant}',
  },

  // Bank fee expense
  bank_fee: {
    debit: GL_ACCOUNTS.BANK_FEES,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Bank fee',
  },

  // Transfer between bank accounts
  bank_transfer: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.SECURITY_DEPOSIT_BANK,
    descriptionTemplate: 'Bank transfer',
  },

  // Owner draw
  owner_draw: {
    debit: GL_ACCOUNTS.OWNER_DRAWS,
    credit: GL_ACCOUNTS.OPERATING_BANK,
    descriptionTemplate: 'Owner draw',
  },

  // Owner contribution
  owner_contribution: {
    debit: GL_ACCOUNTS.OPERATING_BANK,
    credit: GL_ACCOUNTS.OWNER_EQUITY,
    descriptionTemplate: 'Owner contribution',
  },
};

// ========================================
// Utility Functions
// ========================================

/**
 * Get GL mapping for a payment type
 */
export function getPaymentMapping(paymentType: PaymentType): GLMapping {
  return PAYMENT_TYPE_MAPPINGS[paymentType] || PAYMENT_TYPE_MAPPINGS.other;
}

/**
 * Get GL mapping for an expense category
 */
export function getExpenseMapping(category: ExpenseCategory): GLMapping {
  return EXPENSE_CATEGORY_MAPPINGS[category] || EXPENSE_CATEGORY_MAPPINGS.other;
}

/**
 * Get GL mapping for a special transaction type
 */
export function getSpecialMapping(type: keyof typeof SPECIAL_MAPPINGS): GLMapping {
  return SPECIAL_MAPPINGS[type];
}

/**
 * Format description template with actual values
 */
export function formatDescription(
  template: string,
  values: Record<string, string | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    result = result.replace(`{${key}}`, value || '');
  }

  // Clean up any unreplaced placeholders
  result = result.replace(/\{[^}]+\}/g, '').trim();

  // Clean up double spaces
  result = result.replace(/\s+/g, ' ').trim();

  // Clean up trailing dashes
  result = result.replace(/\s*-\s*$/, '').trim();

  return result;
}

/**
 * Get all expense accounts for dropdown selections
 */
export function getExpenseAccountNumbers(): string[] {
  return Object.values(EXPENSE_CATEGORY_MAPPINGS).map((m) => m.debit);
}

/**
 * Get all revenue accounts for dropdown selections
 */
export function getRevenueAccountNumbers(): string[] {
  return Object.values(PAYMENT_TYPE_MAPPINGS).map((m) => m.credit);
}

/**
 * Validate that an account number exists in the standard chart
 */
export function isValidAccountNumber(accountNumber: string): boolean {
  const allAccounts = Object.values(GL_ACCOUNTS);
  return allAccounts.includes(accountNumber as any);
}

/**
 * Get account type from account number
 */
export function getAccountTypeFromNumber(accountNumber: string): string {
  const num = parseInt(accountNumber, 10);

  if (num >= 1000 && num < 2000) return 'asset';
  if (num >= 2000 && num < 3000) return 'liability';
  if (num >= 3000 && num < 4000) return 'equity';
  if (num >= 4000 && num < 5000) return 'revenue';
  if (num >= 5000 && num < 7000) return 'expense';

  return 'unknown';
}
