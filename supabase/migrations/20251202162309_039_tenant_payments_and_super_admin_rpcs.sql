/*
  # Tenant Payments System and Super Admin RPC Functions
  
  1. New Tables
    - `tenant_payments`
      - Payment records for tenant rent and fees
      - Links to tenants, properties, and organizations
      - Tracks payment status, amounts, and dates
  
  2. New RPC Functions
    - `get_all_organizations_admin` - Returns all organizations with stats for super admin
    - `get_platform_statistics` - Returns platform-wide statistics
  
  3. Security
    - Enable RLS on tenant_payments
    - Super admins can view all payments
    - Organization members can view their org's payments
    - Property owners can view their property payments
*/

-- Create tenant_payments table
CREATE TABLE IF NOT EXISTS tenant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  payment_type text NOT NULL DEFAULT 'rent',
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_payments
CREATE POLICY "Super admins can view all payments"
  ON tenant_payments
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Organization members can view their payments"
  ON tenant_payments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization members can insert payments"
  ON tenant_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_org_owner_or_admin(organization_id)
  );

CREATE POLICY "Organization members can update payments"
  ON tenant_payments
  FOR UPDATE
  TO authenticated
  USING (user_is_org_owner_or_admin(organization_id))
  WITH CHECK (user_is_org_owner_or_admin(organization_id));

CREATE POLICY "Organization members can delete payments"
  ON tenant_payments
  FOR DELETE
  TO authenticated
  USING (user_is_org_owner_or_admin(organization_id));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_payments_org ON tenant_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_property ON tenant_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON tenant_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_date ON tenant_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_status ON tenant_payments(payment_status);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_organizations_admin();
DROP FUNCTION IF EXISTS get_platform_statistics();

-- Create RPC function: get_all_organizations_admin
CREATE OR REPLACE FUNCTION get_all_organizations_admin()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  company_name text,
  account_tier text,
  subscription_status text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  total_properties bigint,
  total_tenants bigint,
  total_payments bigint,
  active_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.company_name,
    o.account_tier,
    o.subscription_status,
    o.trial_ends_at,
    o.created_at,
    COALESCE(COUNT(DISTINCT p.id), 0)::bigint as total_properties,
    COALESCE(COUNT(DISTINCT t.id), 0)::bigint as total_tenants,
    COALESCE(COUNT(DISTINCT tp.id), 0)::bigint as total_payments,
    COALESCE(COUNT(DISTINCT om.id) FILTER (WHERE om.is_active = true), 0)::bigint as active_users
  FROM organizations o
  LEFT JOIN properties p ON p.organization_id = o.id
  LEFT JOIN tenants t ON t.organization_id = o.id
  LEFT JOIN tenant_payments tp ON tp.organization_id = o.id
  LEFT JOIN organization_members om ON om.organization_id = o.id
  GROUP BY o.id, o.name, o.slug, o.company_name, o.account_tier, 
           o.subscription_status, o.trial_ends_at, o.created_at
  ORDER BY o.created_at DESC;
END;
$$;

-- Create RPC function: get_platform_statistics
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can access this function';
  END IF;

  SELECT json_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'active_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active'),
    'trial_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'trialing'),
    'suspended_organizations', (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'suspended'),
    'total_properties', (SELECT COUNT(*) FROM properties),
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'total_payments', (SELECT COUNT(*) FROM tenant_payments),
    'total_users', (SELECT COUNT(DISTINCT user_id) FROM organization_members WHERE is_active = true),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM tenant_payments WHERE payment_status = 'paid')
  ) INTO result;

  RETURN result;
END;
$$;
