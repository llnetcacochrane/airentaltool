/*
  # Optimize Remaining RLS Auth Calls

  ## Overview
  Continues optimization of auth.uid() calls in RLS policies for:
  - Payments
  - Tenant invitations
  - Rental listings/applications
  - Addon system
  - Property owners

  ## Performance Impact
  - Completes auth function optimization across all tables
  - Single evaluation per query for all policies
*/

-- =====================================================
-- Payment Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view payments in their organization" ON rent_payments;
CREATE POLICY "Users can view payments in their organization"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rent_payments.organization_id
        AND user_id = (SELECT auth.uid())
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Accounting can manage payments" ON rent_payments;
CREATE POLICY "Accounting can manage payments"
  ON rent_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rent_payments.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'accounting')
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON rent_payments;
CREATE POLICY "Tenants can view their own rent payments"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN tenants ON tenants.unit_id = leases.unit_id
      WHERE leases.id = rent_payments.lease_id
        AND tenants.user_id = (SELECT auth.uid())
        AND tenants.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenants can create payments" ON rent_payments;
CREATE POLICY "Tenants can create payments"
  ON rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.user_id = (SELECT auth.uid())
        AND tenants.organization_id = rent_payments.organization_id
    )
  );

-- =====================================================
-- Tenant Invitation Policies
-- =====================================================

DROP POLICY IF EXISTS "Landlords can view organization invitations" ON tenant_invitations;
CREATE POLICY "Landlords can view organization invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = tenant_invitations.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

DROP POLICY IF EXISTS "Landlords can create invitations" ON tenant_invitations;
CREATE POLICY "Landlords can create invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = tenant_invitations.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

DROP POLICY IF EXISTS "Landlords can update organization invitations" ON tenant_invitations;
CREATE POLICY "Landlords can update organization invitations"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = tenant_invitations.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

-- =====================================================
-- Rental Listings Policies
-- =====================================================

DROP POLICY IF EXISTS "Landlords can view organization listings" ON rental_listings;
CREATE POLICY "Landlords can view organization listings"
  ON rental_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_listings.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Landlords can create listings" ON rental_listings;
CREATE POLICY "Landlords can create listings"
  ON rental_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_listings.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

DROP POLICY IF EXISTS "Landlords can update listings" ON rental_listings;
CREATE POLICY "Landlords can update listings"
  ON rental_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_listings.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

-- =====================================================
-- Rental Application Form Policies
-- =====================================================

DROP POLICY IF EXISTS "Landlords can view organization forms" ON rental_application_forms;
CREATE POLICY "Landlords can view organization forms"
  ON rental_application_forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_application_forms.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Landlords can create forms" ON rental_application_forms;
CREATE POLICY "Landlords can create forms"
  ON rental_application_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_application_forms.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

DROP POLICY IF EXISTS "Landlords can update forms" ON rental_application_forms;
CREATE POLICY "Landlords can update forms"
  ON rental_application_forms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_application_forms.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

-- =====================================================
-- Rental Application Policies
-- =====================================================

DROP POLICY IF EXISTS "Landlords can view organization applications" ON rental_applications;
CREATE POLICY "Landlords can view organization applications"
  ON rental_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_applications.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Landlords can update applications" ON rental_applications;
CREATE POLICY "Landlords can update applications"
  ON rental_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = rental_applications.organization_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin', 'property_manager')
    )
  );

-- =====================================================
-- Application Documents Policies
-- =====================================================

DROP POLICY IF EXISTS "View application documents" ON application_documents;
CREATE POLICY "View application documents"
  ON application_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rental_applications ra
      JOIN organization_members om ON om.organization_id = ra.organization_id
      WHERE ra.id = application_documents.application_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Subscription Payment Policies
-- =====================================================

DROP POLICY IF EXISTS "Organizations can view their own subscription payments" ON subscription_payments;
CREATE POLICY "Organizations can view their own subscription payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = subscription_payments.organization_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Addon System Policies
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage addon products" ON addon_products;
CREATE POLICY "Super admins can manage addon products"
  ON addon_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organization members can view their addon purchases" ON organization_addon_purchases;
CREATE POLICY "Organization members can view their addon purchases"
  ON organization_addon_purchases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organization admins can purchase addons" ON organization_addon_purchases;
CREATE POLICY "Organization admins can purchase addons"
  ON organization_addon_purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization admins can update their addon purchases" ON organization_addon_purchases;
CREATE POLICY "Organization admins can update their addon purchases"
  ON organization_addon_purchases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_addon_purchases.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Organization members can view their usage" ON organization_usage_tracking;
CREATE POLICY "Organization members can view their usage"
  ON organization_usage_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_usage_tracking.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- Property Owner Policies
-- =====================================================

DROP POLICY IF EXISTS "Property managers can view property owners" ON property_owners;
CREATE POLICY "Property managers can view property owners"
  ON property_owners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property managers can create property owners" ON property_owners;
CREATE POLICY "Property managers can create property owners"
  ON property_owners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property managers can update property owners" ON property_owners;
CREATE POLICY "Property managers can update property owners"
  ON property_owners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN property_ownerships po ON po.organization_id = om.organization_id
      WHERE po.owner_id = property_owners.id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org members can view property ownerships" ON property_ownerships;
CREATE POLICY "Org members can view property ownerships"
  ON property_ownerships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM property_owners own
      WHERE own.id = property_ownerships.owner_id
        AND own.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property managers can create ownerships" ON property_ownerships;
CREATE POLICY "Property managers can create ownerships"
  ON property_ownerships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property managers can update ownerships" ON property_ownerships;
CREATE POLICY "Property managers can update ownerships"
  ON property_ownerships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property managers can delete ownerships" ON property_ownerships;
CREATE POLICY "Property managers can delete ownerships"
  ON property_ownerships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = property_ownerships.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin', 'property_manager')
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Users can view payments in their organization" ON rent_payments IS 'Optimized with SELECT auth.uid() for performance';
COMMENT ON POLICY "Property managers can view property owners" ON property_owners IS 'Optimized with SELECT auth.uid() for performance';
