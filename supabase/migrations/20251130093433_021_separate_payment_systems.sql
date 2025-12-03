/*
  # Separate Payment Systems

  ## Overview
  Two distinct payment systems:
  1. **Tenant Rent Payments** - Organizations collect rent from tenants (their own payment provider)
  2. **Subscription Payments** - Super admin collects subscription fees from organizations

  ## Payment Flow
  - Rent Payments: Tenant → Organization (org's payment provider)
  - Subscription Payments: Organization → Super Admin (platform payment provider)
*/

-- Rename existing payments table to rent_payments
ALTER TABLE IF EXISTS payments RENAME TO rent_payments;

-- Add payment provider config to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS payment_provider_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS payment_provider_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS payment_provider_enabled boolean DEFAULT false;

COMMENT ON COLUMN organizations.payment_provider_type IS 'Type of payment provider: stripe, paypal, square, manual, etc.';
COMMENT ON COLUMN organizations.payment_provider_config IS 'Encrypted payment provider credentials and configuration';
COMMENT ON COLUMN organizations.payment_provider_enabled IS 'Whether online payment collection is enabled';

-- Create subscription payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  package_tier_id uuid REFERENCES package_tiers(id) ON DELETE SET NULL,
  
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  
  due_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,
  
  CONSTRAINT valid_subscription_amount CHECK (amount_cents >= 0),
  CONSTRAINT valid_subscription_status CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_organization ON subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_due_date ON subscription_payments(due_date);

-- RLS for rent_payments (tenant rent collection)
DROP POLICY IF EXISTS "Organization members can view payments" ON rent_payments;
DROP POLICY IF EXISTS "Organization members can insert payments" ON rent_payments;
DROP POLICY IF EXISTS "Organization members can update payments" ON rent_payments;
DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON rent_payments;

CREATE POLICY "Tenants can view their own rent payments"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN tenants ON tenants.unit_id = leases.unit_id
      WHERE leases.id = lease_id
        AND tenants.user_id = auth.uid()
        AND tenants.is_active = true
    )
  );

CREATE POLICY "Organization members can view rent payments"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN units ON units.id = leases.unit_id
      JOIN properties ON properties.id = units.property_id
      WHERE leases.id = lease_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );

CREATE POLICY "Organization members can create rent payments"
  ON rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leases
      JOIN units ON units.id = leases.unit_id
      JOIN properties ON properties.id = units.property_id
      WHERE leases.id = lease_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );

CREATE POLICY "Organization members can update rent payments"
  ON rent_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN units ON units.id = leases.unit_id
      JOIN properties ON properties.id = units.property_id
      WHERE leases.id = lease_id
        AND (check_organization_membership(properties.organization_id) OR is_super_admin())
    )
  );

-- RLS for subscription_payments (platform billing)
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all subscription payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Organizations can view their own subscription payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_id
        AND (organizations.owner_id = auth.uid() OR check_organization_membership(organization_id))
    )
  );

CREATE POLICY "Super admins can create subscription payments"
  ON subscription_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update subscription payments"
  ON subscription_payments FOR UPDATE
  TO authenticated
  USING (is_super_admin());
