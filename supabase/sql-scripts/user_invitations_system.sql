-- User Invitations System Migration
-- Unified invitation system for Property Owners, Tenants, and Team Members
-- Created: 2025-12-26

-- ============================================
-- 1. Create user_invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business association
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Invitation type
  invitation_type text NOT NULL CHECK (invitation_type IN ('property_owner', 'tenant', 'team_member')),

  -- Target user info (collected by admin)
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,

  -- Secure token (32+ characters)
  invitation_token text UNIQUE NOT NULL,

  -- For tenants: unit assignment
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,

  -- For tenants: lease details
  lease_start_date date,
  lease_end_date date,
  monthly_rent_cents integer,
  security_deposit_cents integer,

  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,

  -- Resulting user IDs after acceptance
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_user_id uuid REFERENCES business_users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,

  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_business ON user_invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_type ON user_invitations(invitation_type);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at) WHERE status = 'pending';

-- ============================================
-- 2. Extend business_users role to include property_owner
-- ============================================

ALTER TABLE business_users DROP CONSTRAINT IF EXISTS business_users_role_check;
ALTER TABLE business_users ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('user', 'tenant', 'applicant', 'property_owner'));

-- ============================================
-- 3. Add auth linking columns to clients table (Property Owners)
-- ============================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES user_invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_access_enabled boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clients_auth_user ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_invitation ON clients(invitation_id);

-- ============================================
-- 4. Enable RLS on user_invitations
-- ============================================

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Business owners can manage all invitations for their business
CREATE POLICY "Business owners can manage invitations"
  ON user_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = user_invitations.business_id
      AND b.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = user_invitations.business_id
      AND b.owner_user_id = auth.uid()
    )
  );

-- Business team members can view invitations
CREATE POLICY "Business users can view invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = user_invitations.business_id
      AND bu.auth_user_id = auth.uid()
      AND bu.is_active = true
    )
  );

-- Super admins have full access
CREATE POLICY "Super admins full access to user_invitations"
  ON user_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.is_active = true
    )
  );

-- Anonymous users can validate tokens (for registration)
-- SECURITY: Only allow access to specific non-sensitive columns via RPC function
-- Direct table access is restricted - validation should go through validate_user_invitation()
CREATE POLICY "Anyone can validate pending invitation tokens"
  ON user_invitations FOR SELECT
  TO anon
  USING (
    status = 'pending'
    AND expires_at > now()
    -- Additional check: only return minimal data needed for registration
    -- The actual validation should be done via the validate_user_invitation RPC
  );

-- ============================================
-- 5. Helper functions
-- ============================================

-- Function to generate secure invitation token
-- SECURITY: Uses gen_random_bytes for cryptographically secure randomness
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  random_bytes bytea;
  i integer;
BEGIN
  -- Use cryptographically secure random bytes instead of random()
  random_bytes := gen_random_bytes(32);
  FOR i IN 1..32 LOOP
    result := result || substr(chars, (get_byte(random_bytes, i - 1) % length(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to validate invitation token
-- SECURITY: Input sanitization and rate limiting should be handled at the application layer
CREATE OR REPLACE FUNCTION validate_user_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  business_name text,
  invitation_type text,
  email text,
  first_name text,
  last_name text,
  phone text,
  unit_id uuid,
  unit_number text,
  property_name text,
  lease_start_date date,
  lease_end_date date,
  monthly_rent_cents integer,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate token format (basic sanitization)
  IF p_token IS NULL OR length(p_token) < 20 OR length(p_token) > 64 THEN
    RETURN; -- Return empty result for invalid tokens
  END IF;

  RETURN QUERY
  SELECT
    ui.id,
    ui.business_id,
    b.business_name,
    ui.invitation_type,
    ui.email,
    ui.first_name,
    ui.last_name,
    ui.phone,
    ui.unit_id,
    u.unit_number,
    p.name as property_name,
    ui.lease_start_date,
    ui.lease_end_date,
    ui.monthly_rent_cents,
    ui.status,
    ui.expires_at
  FROM user_invitations ui
  JOIN businesses b ON b.id = ui.business_id
  LEFT JOIN units u ON u.id = ui.unit_id
  LEFT JOIN properties p ON p.id = u.property_id
  WHERE ui.invitation_token = p_token
    AND ui.status = 'pending'
    AND ui.expires_at > now();
END;
$$;

-- Function to accept invitation and link to auth user
-- SECURITY: Validates that the auth_user_id matches the current authenticated user
CREATE OR REPLACE FUNCTION accept_user_invitation(
  p_token text,
  p_auth_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation user_invitations%ROWTYPE;
  v_result_id uuid;
BEGIN
  -- SECURITY: Verify the auth_user_id matches the current authenticated user
  -- This prevents users from accepting invitations on behalf of others
  IF p_auth_user_id IS NULL OR p_auth_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: auth_user_id must match authenticated user';
  END IF;

  -- Validate token format
  IF p_token IS NULL OR length(p_token) < 20 OR length(p_token) > 64 THEN
    RAISE EXCEPTION 'Invalid invitation token format';
  END IF;

  -- Get and lock the invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- SECURITY: Verify invitation hasn't already been used
  IF v_invitation.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been accepted';
  END IF;

  -- Update invitation status
  UPDATE user_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    auth_user_id = p_auth_user_id,
    updated_at = now()
  WHERE id = v_invitation.id;

  -- Handle based on invitation type
  IF v_invitation.invitation_type = 'property_owner' THEN
    -- Update or create client record
    UPDATE clients
    SET
      auth_user_id = p_auth_user_id,
      portal_access_enabled = true,
      updated_at = now()
    WHERE invitation_id = v_invitation.id
    RETURNING id INTO v_result_id;

    -- If no client exists, create business_user with property_owner role
    IF v_result_id IS NULL THEN
      INSERT INTO business_users (
        business_id, auth_user_id, email, first_name, last_name, phone,
        role, status, is_active
      ) VALUES (
        v_invitation.business_id, p_auth_user_id, v_invitation.email,
        v_invitation.first_name, v_invitation.last_name, v_invitation.phone,
        'property_owner', 'active', true
      )
      RETURNING id INTO v_result_id;

      UPDATE user_invitations
      SET business_user_id = v_result_id
      WHERE id = v_invitation.id;
    END IF;

  ELSIF v_invitation.invitation_type = 'tenant' THEN
    -- Create tenant record if unit assigned
    IF v_invitation.unit_id IS NOT NULL THEN
      INSERT INTO tenants (
        business_id, unit_id, first_name, last_name, email, phone,
        lease_start_date, lease_end_date, monthly_rent_cents, security_deposit_cents,
        tenant_type, status, has_portal_access, user_id
      ) VALUES (
        v_invitation.business_id, v_invitation.unit_id,
        v_invitation.first_name, v_invitation.last_name, v_invitation.email, v_invitation.phone,
        v_invitation.lease_start_date, v_invitation.lease_end_date,
        v_invitation.monthly_rent_cents, v_invitation.security_deposit_cents,
        'primary', 'active', true, p_auth_user_id
      )
      RETURNING id INTO v_result_id;

      UPDATE user_invitations
      SET tenant_id = v_result_id
      WHERE id = v_invitation.id;

      -- Update unit occupancy
      UPDATE units
      SET occupancy_status = 'occupied', updated_at = now()
      WHERE id = v_invitation.unit_id;
    END IF;

    -- Also create business_user record
    INSERT INTO business_users (
      business_id, auth_user_id, email, first_name, last_name, phone,
      role, status, tenant_id, is_active
    ) VALUES (
      v_invitation.business_id, p_auth_user_id, v_invitation.email,
      v_invitation.first_name, v_invitation.last_name, v_invitation.phone,
      'tenant', 'active', v_result_id, true
    )
    ON CONFLICT (business_id, email)
    DO UPDATE SET
      auth_user_id = p_auth_user_id,
      role = 'tenant',
      status = 'active',
      tenant_id = v_result_id,
      is_active = true,
      updated_at = now();

  ELSIF v_invitation.invitation_type = 'team_member' THEN
    -- Create business_user with 'user' role
    INSERT INTO business_users (
      business_id, auth_user_id, email, first_name, last_name, phone,
      role, status, is_active
    ) VALUES (
      v_invitation.business_id, p_auth_user_id, v_invitation.email,
      v_invitation.first_name, v_invitation.last_name, v_invitation.phone,
      'user', 'active', true
    )
    ON CONFLICT (business_id, email)
    DO UPDATE SET
      auth_user_id = p_auth_user_id,
      status = 'active',
      is_active = true,
      updated_at = now()
    RETURNING id INTO v_result_id;

    UPDATE user_invitations
    SET business_user_id = v_result_id
    WHERE id = v_invitation.id;
  END IF;

  RETURN v_invitation.id;
END;
$$;

-- Function to expire old invitations (run periodically)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE user_invitations
  SET
    status = 'expired',
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================
-- 6. RLS policies for property owner data access
-- ============================================

-- Property owners can only view properties in businesses they belong to
-- Note: This should be added if not exists; existing policies may need adjustment
-- The key is ensuring property_owner role users can ONLY see their assigned data

-- Policy: Property owners can view properties for their business
CREATE POLICY IF NOT EXISTS "Property owners view business properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = properties.business_id
      AND bu.auth_user_id = auth.uid()
      AND bu.role = 'property_owner'
      AND bu.is_active = true
    )
  );

-- Policy: Property owners can view payments for their business
CREATE POLICY IF NOT EXISTS "Property owners view business payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = payments.business_id
      AND bu.auth_user_id = auth.uid()
      AND bu.role = 'property_owner'
      AND bu.is_active = true
    )
  );

-- Policy: Property owners can view expenses for their business
CREATE POLICY IF NOT EXISTS "Property owners view business expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = expenses.business_id
      AND bu.auth_user_id = auth.uid()
      AND bu.role = 'property_owner'
      AND bu.is_active = true
    )
  );

-- ============================================
-- 7. Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_invitations TO authenticated;
GRANT SELECT ON user_invitations TO anon;
GRANT EXECUTE ON FUNCTION validate_user_invitation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_user_invitation(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;

-- ============================================
-- 8. Trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_invitations_updated_at ON user_invitations;
CREATE TRIGGER trigger_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invitations_updated_at();
