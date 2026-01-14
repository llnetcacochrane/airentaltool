/*
  # RLS Policies for Accounting System

  This migration adds Row Level Security policies for all accounting tables.

  ## Access Patterns:
  1. Business owners/admins: Full access to their business data
  2. Accountants: Access based on accounting_permissions table
  3. Property managers: Limited read access to relevant financial data
  4. Regular members: View-only access to basic data
*/

-- =====================================================
-- STEP 1: Currencies & Exchange Rates (Public Read)
-- =====================================================

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view currencies"
  ON currencies FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can manage currencies
CREATE POLICY "Super admins can manage currencies"
  ON currencies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage exchange rates"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- STEP 2: Tax Rates
-- =====================================================

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can view system tax rates (business_id IS NULL)
CREATE POLICY "Anyone can view system tax rates"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (business_id IS NULL);

-- Users can view their business tax rates
CREATE POLICY "Users can view business tax rates"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL AND
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
    )
  );

-- Admins can manage business tax rates
CREATE POLICY "Admins can manage business tax rates"
  ON tax_rates FOR ALL
  TO authenticated
  USING (
    business_id IS NOT NULL AND
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  )
  WITH CHECK (
    business_id IS NOT NULL AND
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 3: Business Accounting Settings
-- =====================================================

ALTER TABLE business_accounting_settings ENABLE ROW LEVEL SECURITY;

-- Users can view settings for their businesses
CREATE POLICY "Users can view accounting settings"
  ON business_accounting_settings FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

-- Only admins/owners can modify settings
CREATE POLICY "Admins can manage accounting settings"
  ON business_accounting_settings FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accounting_permissions ap
        WHERE ap.user_id = auth.uid()
        AND ap.business_id = business_accounting_settings.business_id
        AND ap.can_modify_settings = true
      )
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 4: GL Account Templates (Public Read)
-- =====================================================

ALTER TABLE gl_account_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view account templates"
  ON gl_account_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage account templates"
  ON gl_account_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- STEP 5: GL Accounts (Chart of Accounts)
-- =====================================================

ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view accounts for their businesses
CREATE POLICY "Users can view GL accounts"
  ON gl_accounts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

-- Admins and accountants with permission can manage accounts
CREATE POLICY "Authorized users can manage GL accounts"
  ON gl_accounts FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = gl_accounts.business_id
      AND ap.can_manage_accounts = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = gl_accounts.business_id
      AND ap.can_manage_accounts = true
    )
  );

-- =====================================================
-- STEP 6: Vendors
-- =====================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Users can view vendors for their businesses
CREATE POLICY "Users can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

-- Admins and accountants with permission can manage vendors
CREATE POLICY "Authorized users can manage vendors"
  ON vendors FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = vendors.business_id
      AND ap.can_manage_vendors = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = vendors.business_id
      AND ap.can_manage_vendors = true
    )
  );

-- =====================================================
-- STEP 7: Vendor Tax Forms
-- =====================================================

ALTER TABLE vendor_tax_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor tax forms"
  ON vendor_tax_forms FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accounting_permissions ap
        WHERE ap.user_id = auth.uid()
        AND ap.business_id = b.id
        AND ap.can_export_tax_forms = true
      )
    )
  );

CREATE POLICY "Authorized users can manage vendor tax forms"
  ON vendor_tax_forms FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 8: GL Journals
-- =====================================================

ALTER TABLE gl_journals ENABLE ROW LEVEL SECURITY;

-- Users can view journals for their businesses
CREATE POLICY "Users can view GL journals"
  ON gl_journals FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

-- Users with create permission can insert draft journals
CREATE POLICY "Authorized users can create journals"
  ON gl_journals FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = gl_journals.business_id
      AND ap.can_create_journals = true
    )
  );

-- Users can update their own draft journals or with edit permission
CREATE POLICY "Authorized users can update journals"
  ON gl_journals FOR UPDATE
  TO authenticated
  USING (
    -- Can only update drafts or pending approval
    status IN ('draft', 'pending_approval')
    AND (
      -- Creator can edit their own drafts
      created_by = auth.uid()
      OR
      -- Admins/owners can edit any
      business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.is_active = true
        )
      )
      OR EXISTS (
        SELECT 1 FROM accounting_permissions ap
        WHERE ap.user_id = auth.uid()
        AND ap.business_id = gl_journals.business_id
        AND ap.can_edit_journals = true
      )
    )
  );

-- Delete only for drafts by admins
CREATE POLICY "Admins can delete draft journals"
  ON gl_journals FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 9: GL Journal Entries
-- =====================================================

ALTER TABLE gl_journal_entries ENABLE ROW LEVEL SECURITY;

-- View through journal access
CREATE POLICY "Users can view journal entries through journal access"
  ON gl_journal_entries FOR SELECT
  TO authenticated
  USING (
    journal_id IN (
      SELECT id FROM gl_journals
      WHERE business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
        )
        OR EXISTS (
          SELECT 1 FROM accountant_assignments aa
          WHERE aa.user_id = auth.uid()
          AND aa.is_active = true
          AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
        )
      )
    )
  );

-- Insert/Update/Delete follows journal permissions
CREATE POLICY "Users can manage journal entries through journal access"
  ON gl_journal_entries FOR ALL
  TO authenticated
  USING (
    journal_id IN (
      SELECT id FROM gl_journals
      WHERE status IN ('draft', 'pending_approval')
      AND business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'accounting')
          AND om.is_active = true
        )
      )
    )
  )
  WITH CHECK (
    journal_id IN (
      SELECT id FROM gl_journals
      WHERE status IN ('draft', 'pending_approval')
      AND business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'accounting')
          AND om.is_active = true
        )
      )
    )
  );

-- =====================================================
-- STEP 10: GL Ledger (Read-Only for users)
-- =====================================================

ALTER TABLE gl_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ledger entries"
  ON gl_ledger FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

-- Only system can insert/update/delete ledger entries (via functions)
CREATE POLICY "System can manage ledger entries"
  ON gl_ledger FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- =====================================================
-- STEP 11: Fiscal Periods
-- =====================================================

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fiscal periods"
  ON fiscal_periods FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

CREATE POLICY "Authorized users can manage fiscal periods"
  ON fiscal_periods FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = fiscal_periods.business_id
      AND ap.can_close_periods = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 12: Budgets
-- =====================================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

CREATE POLICY "Authorized users can manage budgets"
  ON budgets FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = budgets.business_id
      AND ap.can_manage_budgets = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = budgets.business_id
      AND ap.can_manage_budgets = true
    )
  );

-- =====================================================
-- STEP 13: Budget Items
-- =====================================================

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget items through budget access"
  ON budget_items FOR SELECT
  TO authenticated
  USING (
    budget_id IN (
      SELECT id FROM budgets
      WHERE business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
        )
        OR EXISTS (
          SELECT 1 FROM accountant_assignments aa
          WHERE aa.user_id = auth.uid()
          AND aa.is_active = true
          AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
        )
      )
    )
  );

CREATE POLICY "Authorized users can manage budget items"
  ON budget_items FOR ALL
  TO authenticated
  USING (
    budget_id IN (
      SELECT id FROM budgets
      WHERE business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'accounting')
          AND om.is_active = true
        )
      )
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM budgets
      WHERE business_id IN (
        SELECT b.id FROM businesses b
        WHERE b.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = b.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'accounting')
          AND om.is_active = true
        )
      )
    )
  );

-- =====================================================
-- STEP 14: Accounting Permissions
-- =====================================================

ALTER TABLE accounting_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON accounting_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all permissions for their businesses
CREATE POLICY "Admins can view business permissions"
  ON accounting_permissions FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- Only admins can manage permissions
CREATE POLICY "Admins can manage accounting permissions"
  ON accounting_permissions FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 15: Accountant Assignments
-- =====================================================

ALTER TABLE accountant_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
  ON accountant_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view/manage assignments for their orgs/businesses
CREATE POLICY "Admins can view assignments"
  ON accountant_assignments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON accountant_assignments FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.is_active = true
      )
    )
  );

-- =====================================================
-- STEP 16: GL Export History
-- =====================================================

ALTER TABLE gl_export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view export history"
  ON gl_export_history FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM accountant_assignments aa
        WHERE aa.user_id = auth.uid()
        AND aa.is_active = true
        AND (aa.business_id = b.id OR aa.organization_id = b.organization_id)
      )
    )
  );

CREATE POLICY "Authorized users can create exports"
  ON gl_export_history FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM businesses b
      WHERE b.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = b.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'accounting')
        AND om.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM accounting_permissions ap
      WHERE ap.user_id = auth.uid()
      AND ap.business_id = gl_export_history.business_id
      AND ap.can_export = true
    )
  );

-- =====================================================
-- Summary
-- =====================================================
/*
  RLS Policies Created:
  ✅ currencies - Public read, super admin write
  ✅ exchange_rates - Public read, super admin write
  ✅ tax_rates - System rates public, business rates restricted
  ✅ business_accounting_settings - Business member access
  ✅ gl_account_templates - Public read
  ✅ gl_accounts - Business member + accountant access
  ✅ vendors - Business member + accountant access
  ✅ vendor_tax_forms - Restricted to accounting roles
  ✅ gl_journals - Draft/edit permissions controlled
  ✅ gl_journal_entries - Through journal access
  ✅ gl_ledger - Read-only for users
  ✅ fiscal_periods - Admin/close period permission
  ✅ budgets - Business member + accountant access
  ✅ budget_items - Through budget access
  ✅ accounting_permissions - Admin managed
  ✅ accountant_assignments - Admin managed
  ✅ gl_export_history - Export permission controlled

  Access Levels:
  - Owner/Admin: Full access
  - Accounting role: Financial operations
  - Accountant (assigned): Based on permissions
  - Property Manager: View access
  - Regular Member: View access
*/
