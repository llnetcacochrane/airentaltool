/*
  # Row Level Security Policies for Multi-Tenancy

  1. Organization Policies
    - Only organization members can view their organization
    - Only owners can modify organization settings
  
  2. Member Policies
    - Only organization members can view member list
    - Only admins/owners can manage members
  
  3. User Policies
    - Users can view their own profile
    - Users can update their own profile
  
  4. Property and Unit Policies
    - Only organization members can access properties
    - Different permissions based on role
  
  5. Tenant Policies
    - Landlords can view tenants in their organization
    - Tenants can view their own profile (future enhancement)
  
  6. Lease Policies
    - Only organization members can view leases
    - Tenants can view their own leases (future)
  
  7. Financial Policies
    - Only organization members with appropriate roles can view
    - Complete isolation between organizations
  
  8. Audit Log Policies
    - Only organization admins/owners can view
*/

-- Organizations: Members can read, only owners can update
CREATE POLICY "Organizations readable by members"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = organizations.id
    )
    OR auth.uid() = owner_id
  );

CREATE POLICY "Organizations can be updated by owner"
  ON organizations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organizations can be inserted by authenticated users"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Organization Members: Members can read own org, admins can manage
CREATE POLICY "Organization members readable by org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Organization members can be managed by admins"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Organization members can be updated by admins"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin')
      )
    )
  );

-- Users: Users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Property Types: Organization members can read, admins can manage
CREATE POLICY "Property types readable by org members"
  ON property_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Property types can be managed by property managers and admins"
  ON property_types FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

-- Properties: Organization members can read, property managers/admins can manage
CREATE POLICY "Properties readable by org members"
  ON properties FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Properties can be managed by property managers and admins"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

CREATE POLICY "Properties can be updated by property managers and admins"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

-- Property Units: Same as properties
CREATE POLICY "Property units readable by org members"
  ON property_units FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
        OR auth.uid() = owner_id
      )
    )
  );

CREATE POLICY "Property units can be managed by property managers and admins"
  ON property_units FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (
          SELECT user_id FROM organization_members 
          WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
        )
      )
    )
  );

-- Tenants: Organization members can read, property managers/admins can manage
CREATE POLICY "Tenants readable by org members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Tenants can be managed by property managers and admins"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

CREATE POLICY "Tenants can be updated by property managers and admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

-- Leases: Organization members can read, accounting/admins can manage
CREATE POLICY "Leases readable by org members"
  ON leases FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Leases can be managed by property managers and admins"
  ON leases FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

CREATE POLICY "Leases can be updated by property managers and admins"
  ON leases FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
      )
    )
  );

-- Lease Documents: Same access as leases
CREATE POLICY "Lease documents readable by org members"
  ON lease_documents FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
        OR auth.uid() = owner_id
      )
    )
  );

CREATE POLICY "Lease documents can be managed by property managers and admins"
  ON lease_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (
          SELECT user_id FROM organization_members 
          WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
        )
      )
    )
  );

-- Payment Schedules: Organization members can read, accounting/admins can manage
CREATE POLICY "Payment schedules readable by org members"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
        OR auth.uid() = owner_id
      )
    )
  );

CREATE POLICY "Payment schedules can be managed by accounting and admins"
  ON payment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (
          SELECT user_id FROM organization_members 
          WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
        )
      )
    )
  );

-- Payments: Organization members can read, accounting/admins can manage
CREATE POLICY "Payments readable by org members"
  ON payments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Payments can be recorded by accounting and admins"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

CREATE POLICY "Payments can be updated by accounting and admins"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

-- Payment Methods: Org members can read, accounting/admins can manage
CREATE POLICY "Payment methods readable by org members"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Payment methods can be managed by accounting and admins"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

-- Payment Gateways: Only admins and owners can manage
CREATE POLICY "Payment gateways readable by admins"
  ON payment_gateways FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Payment gateways can be managed by admins and owners"
  ON payment_gateways FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin')
      )
    )
  );

-- Payment Transactions: Only admins and accounting can read
CREATE POLICY "Payment transactions readable by admins and accounting"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

-- Security Deposits: Org members can read, admins/property managers can manage
CREATE POLICY "Security deposits readable by org members"
  ON security_deposits FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
        OR auth.uid() = owner_id
      )
    )
  );

CREATE POLICY "Security deposits can be managed by admins and property managers"
  ON security_deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases WHERE 
      organization_id IN (
        SELECT id FROM organizations WHERE 
        auth.uid() IN (
          SELECT user_id FROM organization_members 
          WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
        )
      )
    )
  );

-- Deposit Deductions: Same as security deposits
CREATE POLICY "Deposit deductions readable by org members"
  ON deposit_deductions FOR SELECT
  TO authenticated
  USING (
    security_deposit_id IN (
      SELECT id FROM security_deposits WHERE 
      lease_id IN (
        SELECT id FROM leases WHERE 
        organization_id IN (
          SELECT id FROM organizations WHERE 
          auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
          OR auth.uid() = owner_id
        )
      )
    )
  );

CREATE POLICY "Deposit deductions can be managed by admins and property managers"
  ON deposit_deductions FOR INSERT
  TO authenticated
  WITH CHECK (
    security_deposit_id IN (
      SELECT id FROM security_deposits WHERE 
      lease_id IN (
        SELECT id FROM leases WHERE 
        organization_id IN (
          SELECT id FROM organizations WHERE 
          auth.uid() IN (
            SELECT user_id FROM organization_members 
            WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'property_manager')
          )
        )
      )
    )
  );

-- Expenses: Org members can read, admins/accounting can manage
CREATE POLICY "Expenses readable by org members"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = organizations.id)
      OR auth.uid() = owner_id
    )
  );

CREATE POLICY "Expenses can be managed by admins and accounting"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

CREATE POLICY "Expenses can be updated by admins and accounting"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin', 'accounting')
      )
    )
  );

-- Audit Logs: Only admins and owners can read
CREATE POLICY "Audit logs readable by admins and owners"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE 
      auth.uid() IN (
        SELECT user_id FROM organization_members 
        WHERE organization_id = organizations.id AND role IN ('owner', 'admin')
      )
    )
  );