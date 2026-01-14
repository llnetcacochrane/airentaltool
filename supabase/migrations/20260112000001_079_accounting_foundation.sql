/*
  # ERP Accounting System Foundation

  ## Overview
  This migration adds comprehensive accounting/ERP capabilities:
  - Multi-currency support with exchange rates
  - Chart of accounts with double-entry bookkeeping
  - General ledger and journal entries
  - Vendor management with 1099/T5018 tracking
  - Fiscal period management
  - Budget tracking
  - Accountant role and granular permissions
  - Export history tracking

  ## Key Features
  - Multi-currency from day one (CAD, USD, GBP, AUD, EUR, etc.)
  - Configurable fiscal year per business
  - Configurable accounting method (cash/accrual)
  - Tax jurisdiction support (CA, US, UK, AU)
  - Property/unit dimension tracking on all transactions
  - QuickBooks export support

  ## Hierarchy
  Business → GL Accounts → Journals → Journal Entries → GL Ledger
  Business → Vendors → Expenses/Payments
  Business → Budgets → Budget Items
*/

-- =====================================================
-- STEP 1: Currency Support
-- =====================================================

-- Supported currencies (ISO 4217)
CREATE TABLE IF NOT EXISTS currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('CAD', 'Canadian Dollar', '$', 2),
  ('USD', 'US Dollar', '$', 2),
  ('GBP', 'British Pound', '£', 2),
  ('EUR', 'Euro', '€', 2),
  ('AUD', 'Australian Dollar', '$', 2),
  ('NZD', 'New Zealand Dollar', '$', 2),
  ('CHF', 'Swiss Franc', 'CHF', 2),
  ('JPY', 'Japanese Yen', '¥', 0),
  ('CNY', 'Chinese Yuan', '¥', 2),
  ('INR', 'Indian Rupee', '₹', 2),
  ('MXN', 'Mexican Peso', '$', 2),
  ('BRL', 'Brazilian Real', 'R$', 2)
ON CONFLICT (code) DO NOTHING;

-- Exchange rates (historical for audit trail)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL REFERENCES currencies(code),
  to_currency text NOT NULL REFERENCES currencies(code),
  rate numeric(18,8) NOT NULL,
  effective_date date NOT NULL,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'bank')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(effective_date DESC);

-- =====================================================
-- STEP 2: Tax Configuration
-- =====================================================

-- Tax rates by jurisdiction
CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,

  -- Jurisdiction info
  jurisdiction text NOT NULL,
  region_code text,
  tax_name text NOT NULL,
  tax_code text NOT NULL,

  -- Rate (stored as basis points: 1300 = 13.00%)
  rate_basis_points integer NOT NULL,

  -- Component breakdown for combined taxes (e.g., GST+PST)
  component_rates jsonb,

  -- Settings
  is_recoverable boolean DEFAULT false,
  is_compound boolean DEFAULT false,
  is_active boolean DEFAULT true,

  -- Effective dates
  effective_from date,
  effective_to date,

  -- Metadata
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_rates_business ON tax_rates(business_id);
CREATE INDEX idx_tax_rates_jurisdiction ON tax_rates(jurisdiction, region_code);

-- Insert default tax rates for supported jurisdictions
INSERT INTO tax_rates (business_id, jurisdiction, region_code, tax_name, tax_code, rate_basis_points, component_rates, is_recoverable) VALUES
  -- Canada - Federal + Provincial
  (NULL, 'CA', 'ON', 'HST', 'HST-ON', 1300, '[{"name": "HST", "rate": 1300}]', true),
  (NULL, 'CA', 'BC', 'GST+PST', 'GST-PST-BC', 1200, '[{"name": "GST", "rate": 500}, {"name": "PST", "rate": 700}]', true),
  (NULL, 'CA', 'AB', 'GST', 'GST-AB', 500, '[{"name": "GST", "rate": 500}]', true),
  (NULL, 'CA', 'QC', 'GST+QST', 'GST-QST-QC', 1497, '[{"name": "GST", "rate": 500}, {"name": "QST", "rate": 997}]', true),
  (NULL, 'CA', 'MB', 'GST+PST', 'GST-PST-MB', 1200, '[{"name": "GST", "rate": 500}, {"name": "PST", "rate": 700}]', true),
  (NULL, 'CA', 'SK', 'GST+PST', 'GST-PST-SK', 1100, '[{"name": "GST", "rate": 500}, {"name": "PST", "rate": 600}]', true),
  (NULL, 'CA', 'NS', 'HST', 'HST-NS', 1500, '[{"name": "HST", "rate": 1500}]', true),
  (NULL, 'CA', 'NB', 'HST', 'HST-NB', 1500, '[{"name": "HST", "rate": 1500}]', true),
  (NULL, 'CA', 'NL', 'HST', 'HST-NL', 1500, '[{"name": "HST", "rate": 1500}]', true),
  (NULL, 'CA', 'PE', 'HST', 'HST-PE', 1500, '[{"name": "HST", "rate": 1500}]', true),
  -- US - No federal sales tax, states vary (placeholder rates)
  (NULL, 'US', 'CA', 'Sales Tax', 'ST-CA', 725, NULL, false),
  (NULL, 'US', 'NY', 'Sales Tax', 'ST-NY', 800, NULL, false),
  (NULL, 'US', 'TX', 'Sales Tax', 'ST-TX', 625, NULL, false),
  (NULL, 'US', 'FL', 'Sales Tax', 'ST-FL', 600, NULL, false),
  -- UK
  (NULL, 'UK', NULL, 'VAT Standard', 'VAT-STD', 2000, NULL, true),
  (NULL, 'UK', NULL, 'VAT Reduced', 'VAT-RED', 500, NULL, true),
  (NULL, 'UK', NULL, 'VAT Zero', 'VAT-ZERO', 0, NULL, true),
  -- Australia
  (NULL, 'AU', NULL, 'GST', 'GST-AU', 1000, NULL, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: Business Accounting Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS business_accounting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,

  -- Currency settings
  base_currency text NOT NULL DEFAULT 'CAD' REFERENCES currencies(code),
  display_currency_symbol boolean DEFAULT true,

  -- Fiscal year configuration
  fiscal_year_start_month integer DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  fiscal_year_start_day integer DEFAULT 1 CHECK (fiscal_year_start_day BETWEEN 1 AND 28),

  -- Accounting method
  accounting_method text DEFAULT 'accrual' CHECK (accounting_method IN ('cash', 'accrual')),

  -- Tax settings
  tax_jurisdiction text DEFAULT 'CA' CHECK (tax_jurisdiction IN ('CA', 'US', 'UK', 'AU', 'NZ', 'OTHER')),
  tax_region_code text,
  default_tax_rate_id uuid REFERENCES tax_rates(id),

  -- Auto-posting preferences
  auto_post_rent_payments boolean DEFAULT true,
  auto_post_expenses boolean DEFAULT true,
  auto_post_security_deposits boolean DEFAULT true,

  -- Approval workflow
  require_journal_approval boolean DEFAULT false,
  approval_threshold_cents bigint DEFAULT 0,

  -- Number sequences
  next_journal_number integer DEFAULT 1,
  journal_number_prefix text DEFAULT 'JE-',
  next_vendor_number integer DEFAULT 1,
  vendor_number_prefix text DEFAULT 'V-',

  -- Closing settings
  current_fiscal_year integer,
  last_closed_period integer,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_business_accounting_settings_business ON business_accounting_settings(business_id);

-- =====================================================
-- STEP 4: Chart of Accounts
-- =====================================================

-- GL Account templates for different jurisdictions
CREATE TABLE IF NOT EXISTS gl_account_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  jurisdiction text NOT NULL,
  industry text DEFAULT 'property_management',
  accounts jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_name, jurisdiction)
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS gl_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Account identification
  account_number text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  account_subtype text CHECK (account_subtype IN (
    -- Asset subtypes
    'cash', 'bank', 'accounts_receivable', 'inventory', 'prepaid',
    'fixed_asset', 'accumulated_depreciation', 'other_asset',
    -- Liability subtypes
    'accounts_payable', 'credit_card', 'current_liability',
    'long_term_liability', 'other_liability',
    -- Equity subtypes
    'owner_equity', 'retained_earnings', 'common_stock', 'other_equity',
    -- Revenue subtypes
    'operating_revenue', 'other_revenue',
    -- Expense subtypes
    'cost_of_goods', 'operating_expense', 'payroll_expense',
    'depreciation', 'interest_expense', 'tax_expense', 'other_expense'
  )),

  -- Hierarchy
  parent_account_id uuid REFERENCES gl_accounts(id) ON DELETE SET NULL,
  hierarchy_level integer DEFAULT 0,
  full_account_path text,

  -- Configuration
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  currency_code text REFERENCES currencies(code),
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  is_header_account boolean DEFAULT false,
  is_bank_account boolean DEFAULT false,
  is_control_account boolean DEFAULT false,

  -- Bank account details (if is_bank_account = true)
  bank_name text,
  bank_account_number_masked text,
  bank_routing_number_masked text,

  -- Tax settings
  default_tax_rate_id uuid REFERENCES tax_rates(id),

  -- Current balances (in cents, base currency)
  current_balance_cents bigint DEFAULT 0,
  ytd_debit_cents bigint DEFAULT 0,
  ytd_credit_cents bigint DEFAULT 0,

  -- Description
  description text,
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  UNIQUE(business_id, account_number)
);

CREATE INDEX idx_gl_accounts_business ON gl_accounts(business_id);
CREATE INDEX idx_gl_accounts_type ON gl_accounts(account_type);
CREATE INDEX idx_gl_accounts_parent ON gl_accounts(parent_account_id);
CREATE INDEX idx_gl_accounts_number ON gl_accounts(business_id, account_number);
CREATE INDEX idx_gl_accounts_active ON gl_accounts(business_id, is_active);

-- =====================================================
-- STEP 5: Vendors/Suppliers
-- =====================================================

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Vendor identification
  vendor_code text,
  vendor_name text NOT NULL,
  legal_name text,
  vendor_type text DEFAULT 'contractor' CHECK (vendor_type IN (
    'contractor', 'supplier', 'utility', 'government',
    'professional_service', 'property_management',
    'insurance', 'bank', 'other'
  )),

  -- Contact information
  contact_name text,
  email text,
  phone text,
  fax text,
  website text,

  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'CA',

  -- Tax information
  tax_jurisdiction text,
  tax_id text,
  tax_id_type text CHECK (tax_id_type IN (
    'bn', 'gst', 'ein', 'ssn', 'vat', 'abn', 'other'
  )),

  -- 1099/T5018 tracking
  is_1099_eligible boolean DEFAULT false,
  is_t5018_eligible boolean DEFAULT false,
  form_1099_type text CHECK (form_1099_type IN (
    '1099-MISC', '1099-NEC', '1099-INT', '1099-DIV', NULL
  )),
  w9_on_file boolean DEFAULT false,
  w9_received_date date,

  -- Currency and payment
  currency_code text DEFAULT 'CAD' REFERENCES currencies(code),
  payment_terms text DEFAULT 'net_30' CHECK (payment_terms IN (
    'due_on_receipt', 'net_10', 'net_15', 'net_30',
    'net_45', 'net_60', 'net_90', 'custom'
  )),
  custom_payment_days integer,

  -- Default GL account for expenses
  default_expense_account_id uuid REFERENCES gl_accounts(id),

  -- Banking (for payments)
  bank_name text,
  bank_account_number_encrypted text,
  bank_routing_number_encrypted text,
  accepts_ach boolean DEFAULT false,
  accepts_check boolean DEFAULT true,

  -- Statistics (denormalized for performance)
  total_paid_ytd_cents bigint DEFAULT 0,
  total_paid_all_time_cents bigint DEFAULT 0,
  last_payment_date date,
  open_balance_cents bigint DEFAULT 0,

  -- Status
  is_active boolean DEFAULT true,
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  UNIQUE(business_id, vendor_name)
);

CREATE INDEX idx_vendors_business ON vendors(business_id);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_active ON vendors(business_id, is_active);
CREATE INDEX idx_vendors_1099 ON vendors(business_id, is_1099_eligible) WHERE is_1099_eligible = true;
CREATE INDEX idx_vendors_t5018 ON vendors(business_id, is_t5018_eligible) WHERE is_t5018_eligible = true;

-- Vendor tax form tracking
CREATE TABLE IF NOT EXISTS vendor_tax_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Form details
  tax_year integer NOT NULL,
  form_type text NOT NULL CHECK (form_type IN (
    '1099-MISC', '1099-NEC', '1099-INT', '1099-DIV', 'T5018', 'T4A'
  )),

  -- Amounts (in cents)
  total_payments_cents bigint DEFAULT 0,
  box_amounts jsonb DEFAULT '{}',

  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'generated', 'sent', 'filed', 'corrected'
  )),

  -- Filing info
  generated_at timestamptz,
  sent_at timestamptz,
  filed_at timestamptz,
  filed_by uuid REFERENCES auth.users(id),

  -- Document
  document_url text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(vendor_id, tax_year, form_type)
);

CREATE INDEX idx_vendor_tax_forms_vendor ON vendor_tax_forms(vendor_id);
CREATE INDEX idx_vendor_tax_forms_year ON vendor_tax_forms(business_id, tax_year);

-- =====================================================
-- STEP 6: Journal Entries
-- =====================================================

-- Journal headers
CREATE TABLE IF NOT EXISTS gl_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Journal identification
  journal_number text NOT NULL,
  journal_date date NOT NULL,

  -- Type of entry
  journal_type text NOT NULL CHECK (journal_type IN (
    'general',
    'sales',
    'purchases',
    'cash_receipts',
    'cash_payments',
    'payroll',
    'adjusting',
    'closing',
    'reversing',
    'opening'
  )),

  -- Source reference (for auto-generated entries)
  source_type text CHECK (source_type IN (
    'manual', 'rent_payment', 'expense', 'security_deposit',
    'late_fee', 'refund', 'transfer', 'depreciation',
    'bank_fee', 'interest', 'adjustment', 'import'
  )),
  source_id uuid,
  source_reference text,

  -- Currency
  transaction_currency text NOT NULL REFERENCES currencies(code),
  exchange_rate numeric(18,8) DEFAULT 1,
  exchange_rate_date date,

  -- Status and workflow
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'posted', 'void', 'reversed'
  )),

  -- Totals in transaction currency (cents)
  total_debit_cents bigint DEFAULT 0,
  total_credit_cents bigint DEFAULT 0,

  -- Totals in base currency (cents)
  base_total_debit_cents bigint DEFAULT 0,
  base_total_credit_cents bigint DEFAULT 0,

  -- Details
  memo text,
  reference text,

  -- Reversal tracking
  is_reversed boolean DEFAULT false,
  reversed_by_journal_id uuid REFERENCES gl_journals(id),
  reverses_journal_id uuid REFERENCES gl_journals(id),

  -- Recurring settings
  is_recurring boolean DEFAULT false,
  recurring_pattern text,
  next_occurrence_date date,

  -- Audit trail
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  posted_by uuid REFERENCES auth.users(id),
  posted_at timestamptz,
  voided_by uuid REFERENCES auth.users(id),
  voided_at timestamptz,
  void_reason text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(business_id, journal_number)
);

CREATE INDEX idx_gl_journals_business ON gl_journals(business_id);
CREATE INDEX idx_gl_journals_date ON gl_journals(journal_date);
CREATE INDEX idx_gl_journals_status ON gl_journals(status);
CREATE INDEX idx_gl_journals_type ON gl_journals(journal_type);
CREATE INDEX idx_gl_journals_source ON gl_journals(source_type, source_id);
CREATE INDEX idx_gl_journals_posted ON gl_journals(business_id, posted_at) WHERE status = 'posted';

-- Journal entry lines
CREATE TABLE IF NOT EXISTS gl_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES gl_accounts(id) ON DELETE RESTRICT,

  -- Line number for ordering
  line_number integer NOT NULL,

  -- Amounts in transaction currency (cents)
  debit_cents bigint DEFAULT 0,
  credit_cents bigint DEFAULT 0,

  -- Amounts in base currency (cents)
  base_debit_cents bigint DEFAULT 0,
  base_credit_cents bigint DEFAULT 0,

  -- Dimensions for reporting
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,

  -- Tax
  tax_rate_id uuid REFERENCES tax_rates(id),
  tax_amount_cents bigint DEFAULT 0,
  base_tax_amount_cents bigint DEFAULT 0,

  -- Details
  description text,
  reference text,

  -- Reconciliation
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  reconciliation_id uuid,

  -- Metadata
  created_at timestamptz DEFAULT now(),

  CONSTRAINT check_debit_xor_credit CHECK (
    (debit_cents > 0 AND credit_cents = 0) OR
    (credit_cents > 0 AND debit_cents = 0) OR
    (debit_cents = 0 AND credit_cents = 0)
  )
);

CREATE INDEX idx_gl_journal_entries_journal ON gl_journal_entries(journal_id);
CREATE INDEX idx_gl_journal_entries_account ON gl_journal_entries(account_id);
CREATE INDEX idx_gl_journal_entries_property ON gl_journal_entries(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_gl_journal_entries_unit ON gl_journal_entries(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_gl_journal_entries_vendor ON gl_journal_entries(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_gl_journal_entries_tenant ON gl_journal_entries(tenant_id) WHERE tenant_id IS NOT NULL;

-- =====================================================
-- STEP 7: General Ledger (Posted Transactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS gl_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES gl_accounts(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES gl_journal_entries(id) ON DELETE CASCADE,

  -- Transaction date
  transaction_date date NOT NULL,

  -- Amounts in base currency (cents)
  debit_cents bigint DEFAULT 0,
  credit_cents bigint DEFAULT 0,

  -- Running balance for this account
  running_balance_cents bigint NOT NULL,

  -- Dimensions
  property_id uuid REFERENCES properties(id),
  unit_id uuid REFERENCES units(id),

  -- Fiscal period tracking
  fiscal_year integer NOT NULL,
  fiscal_period integer NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gl_ledger_account_date ON gl_ledger(account_id, transaction_date);
CREATE INDEX idx_gl_ledger_business_fiscal ON gl_ledger(business_id, fiscal_year, fiscal_period);
CREATE INDEX idx_gl_ledger_property ON gl_ledger(property_id) WHERE property_id IS NOT NULL;

-- =====================================================
-- STEP 8: Fiscal Periods
-- =====================================================

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Period identification
  fiscal_year integer NOT NULL,
  period_number integer NOT NULL CHECK (period_number BETWEEN 1 AND 13),
  period_name text NOT NULL,

  -- Dates
  start_date date NOT NULL,
  end_date date NOT NULL,

  -- Status
  status text DEFAULT 'open' CHECK (status IN ('future', 'open', 'closing', 'closed')),
  is_adjusting_period boolean DEFAULT false,

  -- Closing info
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  closing_journal_id uuid REFERENCES gl_journals(id),

  -- Balances at close (for quick reference)
  closing_balances jsonb,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(business_id, fiscal_year, period_number)
);

CREATE INDEX idx_fiscal_periods_business ON fiscal_periods(business_id);
CREATE INDEX idx_fiscal_periods_dates ON fiscal_periods(start_date, end_date);
CREATE INDEX idx_fiscal_periods_status ON fiscal_periods(status);

-- =====================================================
-- STEP 9: Budgets
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Budget identification
  budget_name text NOT NULL,
  budget_code text,
  fiscal_year integer NOT NULL,

  -- Type and scope
  budget_type text DEFAULT 'annual' CHECK (budget_type IN (
    'annual', 'quarterly', 'monthly', 'project', 'property'
  )),
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,

  -- Currency
  currency_code text NOT NULL REFERENCES currencies(code),

  -- Status
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'active', 'closed', 'archived'
  )),

  -- Approval
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),

  -- Notes
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  UNIQUE(business_id, budget_name, fiscal_year)
);

CREATE INDEX idx_budgets_business ON budgets(business_id);
CREATE INDEX idx_budgets_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_property ON budgets(property_id) WHERE property_id IS NOT NULL;

-- Budget line items
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES gl_accounts(id) ON DELETE RESTRICT,

  -- Monthly amounts (in cents)
  period_1_cents bigint DEFAULT 0,
  period_2_cents bigint DEFAULT 0,
  period_3_cents bigint DEFAULT 0,
  period_4_cents bigint DEFAULT 0,
  period_5_cents bigint DEFAULT 0,
  period_6_cents bigint DEFAULT 0,
  period_7_cents bigint DEFAULT 0,
  period_8_cents bigint DEFAULT 0,
  period_9_cents bigint DEFAULT 0,
  period_10_cents bigint DEFAULT 0,
  period_11_cents bigint DEFAULT 0,
  period_12_cents bigint DEFAULT 0,

  -- Annual total (computed, but stored for query performance)
  annual_total_cents bigint GENERATED ALWAYS AS (
    period_1_cents + period_2_cents + period_3_cents + period_4_cents +
    period_5_cents + period_6_cents + period_7_cents + period_8_cents +
    period_9_cents + period_10_cents + period_11_cents + period_12_cents
  ) STORED,

  -- Notes
  notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(budget_id, account_id)
);

CREATE INDEX idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX idx_budget_items_account ON budget_items(account_id);

-- =====================================================
-- STEP 10: Accountant Permissions
-- =====================================================

-- Granular accounting permissions per user per business
CREATE TABLE IF NOT EXISTS accounting_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- View permissions
  can_view_gl boolean DEFAULT true,
  can_view_reports boolean DEFAULT true,
  can_view_budgets boolean DEFAULT true,
  can_view_vendors boolean DEFAULT true,

  -- Create/Edit permissions
  can_create_journals boolean DEFAULT false,
  can_edit_journals boolean DEFAULT false,
  can_manage_accounts boolean DEFAULT false,
  can_manage_vendors boolean DEFAULT false,
  can_manage_budgets boolean DEFAULT false,

  -- Workflow permissions
  can_post_journals boolean DEFAULT false,
  can_approve_journals boolean DEFAULT false,
  can_void_journals boolean DEFAULT false,

  -- Admin permissions
  can_close_periods boolean DEFAULT false,
  can_reopen_periods boolean DEFAULT false,
  can_modify_settings boolean DEFAULT false,

  -- Export permissions
  can_export boolean DEFAULT true,
  can_export_tax_forms boolean DEFAULT false,

  -- Grant info
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_accounting_permissions_user ON accounting_permissions(user_id);
CREATE INDEX idx_accounting_permissions_business ON accounting_permissions(business_id);

-- Accountant assignments (for multi-business access)
CREATE TABLE IF NOT EXISTS accountant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Can be org-wide or business-specific
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,

  -- Assignment details
  role_name text DEFAULT 'accountant',
  access_level text DEFAULT 'standard' CHECK (access_level IN (
    'view_only', 'standard', 'full', 'admin'
  )),

  -- Status
  is_active boolean DEFAULT true,

  -- Assignment info
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,

  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT check_org_or_business CHECK (
    organization_id IS NOT NULL OR business_id IS NOT NULL
  )
);

CREATE INDEX idx_accountant_assignments_user ON accountant_assignments(user_id);
CREATE INDEX idx_accountant_assignments_org ON accountant_assignments(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_accountant_assignments_business ON accountant_assignments(business_id) WHERE business_id IS NOT NULL;

-- =====================================================
-- STEP 11: Export History
-- =====================================================

CREATE TABLE IF NOT EXISTS gl_export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Export details
  export_format text NOT NULL CHECK (export_format IN (
    'quickbooks_iif', 'quickbooks_csv', 'quickbooks_online',
    'sage_csv', 'simply_csv',
    'oracle_xml', 'sap_xml',
    'saft_xml',
    'csv', 'json', 'excel', 'pdf'
  )),

  export_type text NOT NULL CHECK (export_type IN (
    'chart_of_accounts', 'journal_entries', 'general_ledger',
    'trial_balance', 'balance_sheet', 'income_statement',
    'cash_flow', 'budget_report', 'budget_variance',
    'vendor_list', 'vendor_1099', 'vendor_t5018',
    'ar_aging', 'ap_aging', 'full_backup'
  )),

  -- Period covered
  start_date date,
  end_date date,
  fiscal_year integer,

  -- File details
  file_name text NOT NULL,
  file_size_bytes integer,
  record_count integer,

  -- Status
  status text DEFAULT 'completed' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  error_message text,

  -- Storage
  file_url text,
  expires_at timestamptz,

  -- Metadata
  exported_at timestamptz DEFAULT now(),
  exported_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_gl_export_history_business ON gl_export_history(business_id);
CREATE INDEX idx_gl_export_history_date ON gl_export_history(exported_at DESC);
CREATE INDEX idx_gl_export_history_type ON gl_export_history(export_type);

-- =====================================================
-- STEP 12: Default Chart of Accounts Templates
-- =====================================================

-- Canadian Property Management Chart of Accounts
INSERT INTO gl_account_templates (template_name, jurisdiction, industry, accounts) VALUES
('property_management_standard', 'CA', 'property_management', '[
  {"number": "1000", "name": "Assets", "type": "asset", "normal_balance": "debit", "is_header": true},
  {"number": "1010", "name": "Operating Bank Account", "type": "asset", "subtype": "bank", "normal_balance": "debit", "parent": "1000"},
  {"number": "1020", "name": "Security Deposit Bank Account", "type": "asset", "subtype": "bank", "normal_balance": "debit", "parent": "1000"},
  {"number": "1030", "name": "Petty Cash", "type": "asset", "subtype": "cash", "normal_balance": "debit", "parent": "1000"},
  {"number": "1100", "name": "Accounts Receivable", "type": "asset", "subtype": "accounts_receivable", "normal_balance": "debit", "parent": "1000"},
  {"number": "1110", "name": "Rent Receivable", "type": "asset", "subtype": "accounts_receivable", "normal_balance": "debit", "parent": "1100"},
  {"number": "1120", "name": "Other Receivables", "type": "asset", "subtype": "accounts_receivable", "normal_balance": "debit", "parent": "1100"},
  {"number": "1200", "name": "Prepaid Expenses", "type": "asset", "subtype": "prepaid", "normal_balance": "debit", "parent": "1000"},
  {"number": "1210", "name": "Prepaid Insurance", "type": "asset", "subtype": "prepaid", "normal_balance": "debit", "parent": "1200"},
  {"number": "1500", "name": "Fixed Assets", "type": "asset", "subtype": "fixed_asset", "normal_balance": "debit", "parent": "1000", "is_header": true},
  {"number": "1510", "name": "Buildings", "type": "asset", "subtype": "fixed_asset", "normal_balance": "debit", "parent": "1500"},
  {"number": "1520", "name": "Land", "type": "asset", "subtype": "fixed_asset", "normal_balance": "debit", "parent": "1500"},
  {"number": "1530", "name": "Equipment", "type": "asset", "subtype": "fixed_asset", "normal_balance": "debit", "parent": "1500"},
  {"number": "1540", "name": "Vehicles", "type": "asset", "subtype": "fixed_asset", "normal_balance": "debit", "parent": "1500"},
  {"number": "1550", "name": "Accumulated Depreciation - Buildings", "type": "asset", "subtype": "accumulated_depreciation", "normal_balance": "credit", "parent": "1500"},
  {"number": "1560", "name": "Accumulated Depreciation - Equipment", "type": "asset", "subtype": "accumulated_depreciation", "normal_balance": "credit", "parent": "1500"},

  {"number": "2000", "name": "Liabilities", "type": "liability", "normal_balance": "credit", "is_header": true},
  {"number": "2100", "name": "Security Deposits Held", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2000"},
  {"number": "2110", "name": "Tenant Security Deposits", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2100"},
  {"number": "2120", "name": "Pet Deposits", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2100"},
  {"number": "2200", "name": "Accounts Payable", "type": "liability", "subtype": "accounts_payable", "normal_balance": "credit", "parent": "2000"},
  {"number": "2300", "name": "Prepaid Rent", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2000"},
  {"number": "2400", "name": "Taxes Payable", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2000", "is_header": true},
  {"number": "2410", "name": "GST/HST Payable", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2400"},
  {"number": "2420", "name": "PST Payable", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2400"},
  {"number": "2430", "name": "Property Tax Payable", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2400"},
  {"number": "2500", "name": "Accrued Expenses", "type": "liability", "subtype": "current_liability", "normal_balance": "credit", "parent": "2000"},
  {"number": "2600", "name": "Credit Cards Payable", "type": "liability", "subtype": "credit_card", "normal_balance": "credit", "parent": "2000"},
  {"number": "2700", "name": "Long-Term Liabilities", "type": "liability", "subtype": "long_term_liability", "normal_balance": "credit", "parent": "2000", "is_header": true},
  {"number": "2710", "name": "Mortgage Payable", "type": "liability", "subtype": "long_term_liability", "normal_balance": "credit", "parent": "2700"},
  {"number": "2720", "name": "Notes Payable", "type": "liability", "subtype": "long_term_liability", "normal_balance": "credit", "parent": "2700"},

  {"number": "3000", "name": "Equity", "type": "equity", "normal_balance": "credit", "is_header": true},
  {"number": "3100", "name": "Owner Equity", "type": "equity", "subtype": "owner_equity", "normal_balance": "credit", "parent": "3000"},
  {"number": "3200", "name": "Owner Draws", "type": "equity", "subtype": "owner_equity", "normal_balance": "debit", "parent": "3000"},
  {"number": "3300", "name": "Retained Earnings", "type": "equity", "subtype": "retained_earnings", "normal_balance": "credit", "parent": "3000"},
  {"number": "3400", "name": "Current Year Earnings", "type": "equity", "subtype": "retained_earnings", "normal_balance": "credit", "parent": "3000"},

  {"number": "4000", "name": "Revenue", "type": "revenue", "normal_balance": "credit", "is_header": true},
  {"number": "4010", "name": "Rental Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4020", "name": "Late Fee Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4030", "name": "Parking Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4040", "name": "Laundry Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4050", "name": "Pet Fee Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4060", "name": "Storage Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4070", "name": "Application Fee Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4080", "name": "NSF Fee Income", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4090", "name": "Utility Reimbursement", "type": "revenue", "subtype": "operating_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4100", "name": "Deposit Forfeitures", "type": "revenue", "subtype": "other_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4500", "name": "Other Income", "type": "revenue", "subtype": "other_revenue", "normal_balance": "credit", "parent": "4000"},
  {"number": "4510", "name": "Interest Income", "type": "revenue", "subtype": "other_revenue", "normal_balance": "credit", "parent": "4500"},
  {"number": "4520", "name": "Miscellaneous Income", "type": "revenue", "subtype": "other_revenue", "normal_balance": "credit", "parent": "4500"},

  {"number": "5000", "name": "Expenses", "type": "expense", "normal_balance": "debit", "is_header": true},
  {"number": "5100", "name": "Repairs & Maintenance", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5110", "name": "General Repairs", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5120", "name": "Plumbing", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5130", "name": "Electrical", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5140", "name": "HVAC", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5150", "name": "Appliance Repair", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5160", "name": "Painting", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5170", "name": "Flooring", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5180", "name": "Roofing", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},
  {"number": "5190", "name": "Pest Control", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5100"},

  {"number": "5200", "name": "Utilities", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5210", "name": "Electricity", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5200"},
  {"number": "5220", "name": "Gas", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5200"},
  {"number": "5230", "name": "Water & Sewer", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5200"},
  {"number": "5240", "name": "Trash Removal", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5200"},
  {"number": "5250", "name": "Internet/Cable", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5200"},

  {"number": "5300", "name": "Property Insurance", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5400", "name": "Property Taxes", "type": "expense", "subtype": "tax_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5500", "name": "Mortgage Interest", "type": "expense", "subtype": "interest_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5600", "name": "Management Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},

  {"number": "5700", "name": "Professional Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5710", "name": "Legal Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5700"},
  {"number": "5720", "name": "Accounting Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5700"},
  {"number": "5730", "name": "Consulting Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5700"},

  {"number": "5800", "name": "Advertising & Marketing", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5810", "name": "Online Advertising", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5800"},
  {"number": "5820", "name": "Print Advertising", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5800"},
  {"number": "5830", "name": "Signage", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5800"},

  {"number": "5900", "name": "Administrative Expenses", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5910", "name": "Office Supplies", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5900"},
  {"number": "5920", "name": "Postage & Shipping", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5900"},
  {"number": "5930", "name": "Bank Fees", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5900"},
  {"number": "5940", "name": "Software & Subscriptions", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5900"},
  {"number": "5950", "name": "Telephone", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5900"},

  {"number": "5960", "name": "Landscaping & Grounds", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5970", "name": "Snow Removal", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5980", "name": "Cleaning & Janitorial", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "5990", "name": "Security", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},

  {"number": "6000", "name": "Depreciation Expense", "type": "expense", "subtype": "depreciation", "normal_balance": "debit", "parent": "5000"},
  {"number": "6010", "name": "Depreciation - Buildings", "type": "expense", "subtype": "depreciation", "normal_balance": "debit", "parent": "6000"},
  {"number": "6020", "name": "Depreciation - Equipment", "type": "expense", "subtype": "depreciation", "normal_balance": "debit", "parent": "6000"},

  {"number": "6100", "name": "Bad Debt Expense", "type": "expense", "subtype": "operating_expense", "normal_balance": "debit", "parent": "5000"},
  {"number": "6200", "name": "Miscellaneous Expense", "type": "expense", "subtype": "other_expense", "normal_balance": "debit", "parent": "5000"}
]'::jsonb)
ON CONFLICT (template_name, jurisdiction) DO UPDATE SET accounts = EXCLUDED.accounts;

-- =====================================================
-- STEP 13: Helper Functions
-- =====================================================

-- Function to get next journal number
CREATE OR REPLACE FUNCTION get_next_journal_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next_num integer;
  v_year text;
BEGIN
  -- Get settings
  SELECT journal_number_prefix, next_journal_number
  INTO v_prefix, v_next_num
  FROM business_accounting_settings
  WHERE business_id = p_business_id;

  -- Default if no settings
  IF v_prefix IS NULL THEN
    v_prefix := 'JE-';
    v_next_num := 1;
  END IF;

  v_year := to_char(now(), 'YYYY');

  -- Update the counter
  UPDATE business_accounting_settings
  SET next_journal_number = next_journal_number + 1,
      updated_at = now()
  WHERE business_id = p_business_id;

  RETURN v_prefix || v_year || '-' || lpad(v_next_num::text, 6, '0');
END;
$$;

-- Function to get exchange rate for a date
CREATE OR REPLACE FUNCTION get_exchange_rate(
  p_from_currency text,
  p_to_currency text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  -- Same currency = 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;

  -- Get the most recent rate on or before the date
  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  -- If not found, try inverse
  IF v_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;

  -- Default to 1 if no rate found
  RETURN COALESCE(v_rate, 1.0);
END;
$$;

-- Function to calculate fiscal period for a date
CREATE OR REPLACE FUNCTION get_fiscal_period(
  p_business_id uuid,
  p_date date
)
RETURNS TABLE(fiscal_year integer, fiscal_period integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy_start_month integer;
  v_fy_start_day integer;
  v_year integer;
  v_period integer;
  v_fy_start_date date;
BEGIN
  -- Get fiscal year settings
  SELECT fiscal_year_start_month, fiscal_year_start_day
  INTO v_fy_start_month, v_fy_start_day
  FROM business_accounting_settings
  WHERE business_id = p_business_id;

  -- Default to calendar year
  v_fy_start_month := COALESCE(v_fy_start_month, 1);
  v_fy_start_day := COALESCE(v_fy_start_day, 1);

  -- Calculate fiscal year start for the given date
  v_year := EXTRACT(YEAR FROM p_date);
  v_fy_start_date := make_date(v_year, v_fy_start_month, v_fy_start_day);

  -- Adjust if date is before fiscal year start
  IF p_date < v_fy_start_date THEN
    v_year := v_year - 1;
    v_fy_start_date := make_date(v_year, v_fy_start_month, v_fy_start_day);
  END IF;

  -- Calculate period (1-12)
  v_period := EXTRACT(MONTH FROM age(p_date, v_fy_start_date)) + 1;

  fiscal_year := v_year;
  fiscal_period := v_period;
  RETURN NEXT;
END;
$$;

-- Function to initialize chart of accounts for a business
CREATE OR REPLACE FUNCTION initialize_chart_of_accounts(
  p_business_id uuid,
  p_template_name text DEFAULT 'property_management_standard',
  p_jurisdiction text DEFAULT 'CA'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accounts jsonb;
  v_account jsonb;
  v_parent_id uuid;
  v_count integer := 0;
BEGIN
  -- Get template
  SELECT accounts INTO v_accounts
  FROM gl_account_templates
  WHERE template_name = p_template_name
    AND jurisdiction = p_jurisdiction;

  IF v_accounts IS NULL THEN
    RAISE EXCEPTION 'Template not found: % / %', p_template_name, p_jurisdiction;
  END IF;

  -- Insert accounts
  FOR v_account IN SELECT * FROM jsonb_array_elements(v_accounts)
  LOOP
    -- Find parent if specified
    v_parent_id := NULL;
    IF v_account->>'parent' IS NOT NULL THEN
      SELECT id INTO v_parent_id
      FROM gl_accounts
      WHERE business_id = p_business_id
        AND account_number = v_account->>'parent';
    END IF;

    INSERT INTO gl_accounts (
      business_id,
      account_number,
      account_name,
      account_type,
      account_subtype,
      parent_account_id,
      normal_balance,
      is_header_account,
      is_system
    ) VALUES (
      p_business_id,
      v_account->>'number',
      v_account->>'name',
      v_account->>'type',
      v_account->>'subtype',
      v_parent_id,
      v_account->>'normal_balance',
      COALESCE((v_account->>'is_header')::boolean, false),
      true
    )
    ON CONFLICT (business_id, account_number) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function to validate journal balance
CREATE OR REPLACE FUNCTION validate_journal_balance(p_journal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_debits bigint;
  v_total_credits bigint;
BEGIN
  SELECT
    COALESCE(SUM(debit_cents), 0),
    COALESCE(SUM(credit_cents), 0)
  INTO v_total_debits, v_total_credits
  FROM gl_journal_entries
  WHERE journal_id = p_journal_id;

  RETURN v_total_debits = v_total_credits;
END;
$$;

-- =====================================================
-- STEP 14: Add vendor_id to expenses table
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
    CREATE INDEX idx_expenses_vendor ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- Summary
-- =====================================================
/*
  Tables Created:
  ✅ currencies - Multi-currency support
  ✅ exchange_rates - Historical exchange rates
  ✅ tax_rates - Tax configuration by jurisdiction
  ✅ business_accounting_settings - Per-business accounting config
  ✅ gl_account_templates - Default chart of accounts templates
  ✅ gl_accounts - Chart of accounts
  ✅ vendors - Vendor/supplier management
  ✅ vendor_tax_forms - 1099/T5018 tracking
  ✅ gl_journals - Journal headers
  ✅ gl_journal_entries - Journal entry lines
  ✅ gl_ledger - Posted general ledger
  ✅ fiscal_periods - Fiscal period management
  ✅ budgets - Budget headers
  ✅ budget_items - Budget line items
  ✅ accounting_permissions - Granular permissions
  ✅ accountant_assignments - Multi-business accountant access
  ✅ gl_export_history - Export audit trail

  Functions Created:
  ✅ get_next_journal_number() - Auto-generate journal numbers
  ✅ get_exchange_rate() - Get exchange rate for date
  ✅ get_fiscal_period() - Calculate fiscal period
  ✅ initialize_chart_of_accounts() - Set up default accounts
  ✅ validate_journal_balance() - Ensure debits = credits

  Modifications:
  ✅ Added vendor_id to expenses table

  Default Data:
  ✅ 12 currencies (CAD, USD, GBP, EUR, AUD, etc.)
  ✅ Tax rates for CA (all provinces), US (major states), UK, AU
  ✅ Property management chart of accounts template (80+ accounts)
*/
