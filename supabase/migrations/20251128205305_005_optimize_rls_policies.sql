/*
  # Optimize RLS Policies - Auth Function Performance

  1. Purpose
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - Prevents re-evaluation of auth functions for each row
    - Dramatically improves query performance at scale

  2. Changes
    - Drop and recreate all RLS policies with optimized auth function calls
    - Use SELECT subquery pattern for all auth.uid() calls
*/

-- Drop existing policies and recreate with optimized auth calls

-- Users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Organizations table
DROP POLICY IF EXISTS "Organizations readable by members" ON organizations;
DROP POLICY IF EXISTS "Organizations can be updated by owner" ON organizations;
DROP POLICY IF EXISTS "Organizations can be inserted by authenticated users" ON organizations;

CREATE POLICY "Organizations readable by members"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Organizations can be updated by owner"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Organizations can be inserted by authenticated users"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- Organization members table
DROP POLICY IF EXISTS "Organization members readable by org members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be managed by admins" ON organization_members;
DROP POLICY IF EXISTS "Organization members can be updated by admins" ON organization_members;

CREATE POLICY "Organization members readable by org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Organization members can be managed by admins"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "Organization members can be updated by admins"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Property types table
DROP POLICY IF EXISTS "Property types readable by org members" ON property_types;
DROP POLICY IF EXISTS "Property types can be managed by property managers and admins" ON property_types;

CREATE POLICY "Property types readable by org members"
  ON property_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Property types can be managed by property managers and admins"
  ON property_types FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Properties table
DROP POLICY IF EXISTS "Properties readable by org members" ON properties;
DROP POLICY IF EXISTS "Properties can be managed by property managers and admins" ON properties;
DROP POLICY IF EXISTS "Properties can be updated by property managers and admins" ON properties;

CREATE POLICY "Properties readable by org members"
  ON properties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Properties can be managed by property managers and admins"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

CREATE POLICY "Properties can be updated by property managers and admins"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Property units table
DROP POLICY IF EXISTS "Property units readable by org members" ON property_units;
DROP POLICY IF EXISTS "Property units can be managed by property managers and admins" ON property_units;

CREATE POLICY "Property units readable by org members"
  ON property_units FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid()) AND is_active = true
      )
    )
  );

CREATE POLICY "Property units can be managed by property managers and admins"
  ON property_units FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  );

-- Tenants table
DROP POLICY IF EXISTS "Tenants readable by org members" ON tenants;
DROP POLICY IF EXISTS "Tenants can be managed by property managers and admins" ON tenants;
DROP POLICY IF EXISTS "Tenants can be updated by property managers and admins" ON tenants;

CREATE POLICY "Tenants readable by org members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Tenants can be managed by property managers and admins"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

CREATE POLICY "Tenants can be updated by property managers and admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Leases table
DROP POLICY IF EXISTS "Leases readable by org members" ON leases;
DROP POLICY IF EXISTS "Leases can be managed by property managers and admins" ON leases;
DROP POLICY IF EXISTS "Leases can be updated by property managers and admins" ON leases;

CREATE POLICY "Leases readable by org members"
  ON leases FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Leases can be managed by property managers and admins"
  ON leases FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

CREATE POLICY "Leases can be updated by property managers and admins"
  ON leases FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'property_manager')
      AND is_active = true
    )
  );

-- Lease documents table
DROP POLICY IF EXISTS "Lease documents readable by org members" ON lease_documents;
DROP POLICY IF EXISTS "Lease documents can be managed by property managers and admins" ON lease_documents;

CREATE POLICY "Lease documents readable by org members"
  ON lease_documents FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid()) AND is_active = true
      )
    )
  );

CREATE POLICY "Lease documents can be managed by property managers and admins"
  ON lease_documents FOR ALL
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  );

-- Payment schedules table
DROP POLICY IF EXISTS "Payment schedules readable by org members" ON payment_schedules;
DROP POLICY IF EXISTS "Payment schedules can be managed by accounting and admins" ON payment_schedules;

CREATE POLICY "Payment schedules readable by org members"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid()) AND is_active = true
      )
    )
  );

CREATE POLICY "Payment schedules can be managed by accounting and admins"
  ON payment_schedules FOR ALL
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'accounting')
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'accounting')
        AND is_active = true
      )
    )
  );

-- Payments table
DROP POLICY IF EXISTS "Payments readable by org members" ON payments;
DROP POLICY IF EXISTS "Payments can be recorded by accounting and admins" ON payments;
DROP POLICY IF EXISTS "Payments can be updated by accounting and admins" ON payments;

CREATE POLICY "Payments readable by org members"
  ON payments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Payments can be recorded by accounting and admins"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

CREATE POLICY "Payments can be updated by accounting and admins"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Payment methods table
DROP POLICY IF EXISTS "Payment methods readable by org members" ON payment_methods;
DROP POLICY IF EXISTS "Payment methods can be managed by accounting and admins" ON payment_methods;

CREATE POLICY "Payment methods readable by org members"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Payment methods can be managed by accounting and admins"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Payment gateways table
DROP POLICY IF EXISTS "Payment gateways readable by admins" ON payment_gateways;
DROP POLICY IF EXISTS "Payment gateways can be managed by admins and owners" ON payment_gateways;

CREATE POLICY "Payment gateways readable by admins"
  ON payment_gateways FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "Payment gateways can be managed by admins and owners"
  ON payment_gateways FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Payment transactions table
DROP POLICY IF EXISTS "Payment transactions readable by admins and accounting" ON payment_transactions;

CREATE POLICY "Payment transactions readable by admins and accounting"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Security deposits table
DROP POLICY IF EXISTS "Security deposits readable by org members" ON security_deposits;
DROP POLICY IF EXISTS "Security deposits can be managed by admins and property manager" ON security_deposits;

CREATE POLICY "Security deposits readable by org members"
  ON security_deposits FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid()) AND is_active = true
      )
    )
  );

CREATE POLICY "Security deposits can be managed by admins and property manager"
  ON security_deposits FOR ALL
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  )
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = (select auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
        AND is_active = true
      )
    )
  );

-- Deposit deductions table
DROP POLICY IF EXISTS "Deposit deductions readable by org members" ON deposit_deductions;
DROP POLICY IF EXISTS "Deposit deductions can be managed by admins and property manage" ON deposit_deductions;

CREATE POLICY "Deposit deductions readable by org members"
  ON deposit_deductions FOR SELECT
  TO authenticated
  USING (
    security_deposit_id IN (
      SELECT id FROM security_deposits
      WHERE lease_id IN (
        SELECT id FROM leases
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = (select auth.uid()) AND is_active = true
        )
      )
    )
  );

CREATE POLICY "Deposit deductions can be managed by admins and property manage"
  ON deposit_deductions FOR ALL
  TO authenticated
  USING (
    security_deposit_id IN (
      SELECT id FROM security_deposits
      WHERE lease_id IN (
        SELECT id FROM leases
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = (select auth.uid())
          AND role IN ('owner', 'admin', 'property_manager')
          AND is_active = true
        )
      )
    )
  )
  WITH CHECK (
    security_deposit_id IN (
      SELECT id FROM security_deposits
      WHERE lease_id IN (
        SELECT id FROM leases
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = (select auth.uid())
          AND role IN ('owner', 'admin', 'property_manager')
          AND is_active = true
        )
      )
    )
  );

-- Expenses table
DROP POLICY IF EXISTS "Expenses readable by org members" ON expenses;
DROP POLICY IF EXISTS "Expenses can be managed by admins and accounting" ON expenses;
DROP POLICY IF EXISTS "Expenses can be updated by admins and accounting" ON expenses;

CREATE POLICY "Expenses readable by org members"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Expenses can be managed by admins and accounting"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

CREATE POLICY "Expenses can be updated by admins and accounting"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin', 'accounting')
      AND is_active = true
    )
  );

-- Audit logs table
DROP POLICY IF EXISTS "Audit logs readable by admins and owners" ON audit_logs;

CREATE POLICY "Audit logs readable by admins and owners"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Super admins table
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;
DROP POLICY IF EXISTS "Super admins can manage super admins" ON super_admins;

CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage super admins"
  ON super_admins FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Organization subscriptions table
DROP POLICY IF EXISTS "Organization owners can view own subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON organization_subscriptions;

CREATE POLICY "Organization owners can view own subscription"
  ON organization_subscriptions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage all subscriptions"
  ON organization_subscriptions FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Platform settings table
DROP POLICY IF EXISTS "Public settings readable by all" ON platform_settings;
DROP POLICY IF EXISTS "Super admins can manage platform settings" ON platform_settings;

CREATE POLICY "Public settings readable by all"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (is_public = true OR (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true));

CREATE POLICY "Super admins can manage platform settings"
  ON platform_settings FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- System notifications table
DROP POLICY IF EXISTS "Active notifications readable by all" ON system_notifications;
DROP POLICY IF EXISTS "Super admins can manage system notifications" ON system_notifications;

CREATE POLICY "Active notifications readable by all"
  ON system_notifications FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND display_from <= now() 
    AND (display_until IS NULL OR display_until >= now())
    OR (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage system notifications"
  ON system_notifications FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Organization usage table
DROP POLICY IF EXISTS "Organization owners can view own usage" ON organization_usage;
DROP POLICY IF EXISTS "Super admins can manage all usage data" ON organization_usage;

CREATE POLICY "Organization owners can view own usage"
  ON organization_usage FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage all usage data"
  ON organization_usage FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  )
  WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );