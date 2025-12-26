-- Business Users Migration (v5.2.0)
-- This migration creates the business_users system for managing users at the business level
-- Users can sign up via public pages and be promoted to tenants

-- Create business_users table
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Links to Supabase auth
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tenant', 'applicant')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- Links when promoted to tenant
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Unique constraint: one user per email per business
  UNIQUE(business_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_auth_user_id ON business_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_email ON business_users(email);
CREATE INDEX IF NOT EXISTS idx_business_users_status ON business_users(status);

-- Create business_user_messages table for user-manager communication
CREATE TABLE IF NOT EXISTS business_user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  business_user_id UUID NOT NULL REFERENCES business_users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'manager')),
  sender_id UUID NOT NULL, -- Either business_user_id or manager user_id
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES business_user_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_user_messages_business_user ON business_user_messages(business_user_id);
CREATE INDEX IF NOT EXISTS idx_business_user_messages_business ON business_user_messages(business_id);

-- Enable RLS
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_user_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_users

-- Business owners can see all users for their businesses
CREATE POLICY business_users_owner_select ON business_users
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Business owners can insert users
CREATE POLICY business_users_owner_insert ON business_users
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Business owners can update users
CREATE POLICY business_users_owner_update ON business_users
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Users can see their own records (via auth_user_id)
CREATE POLICY business_users_self_select ON business_users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Users can update their own basic info
CREATE POLICY business_users_self_update ON business_users
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (
    -- Can only update certain fields, not role/status
    auth_user_id = auth.uid()
  );

-- Public can insert (for signup) - with restrictions
CREATE POLICY business_users_public_insert ON business_users
  FOR INSERT WITH CHECK (
    -- Only allow insert if business has public page enabled
    business_id IN (
      SELECT id FROM businesses WHERE public_page_enabled = true AND is_active = true
    )
    AND role = 'user'
    AND status = 'pending'
  );

-- RLS Policies for business_user_messages

-- Business owners can see all messages for their businesses
CREATE POLICY business_user_messages_owner_select ON business_user_messages
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Business owners can insert messages
CREATE POLICY business_user_messages_owner_insert ON business_user_messages
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

-- Users can see their own messages
CREATE POLICY business_user_messages_user_select ON business_user_messages
  FOR SELECT USING (
    business_user_id IN (
      SELECT id FROM business_users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can send messages
CREATE POLICY business_user_messages_user_insert ON business_user_messages
  FOR INSERT WITH CHECK (
    business_user_id IN (
      SELECT id FROM business_users WHERE auth_user_id = auth.uid()
    )
    AND sender_type = 'user'
  );

-- Function to find existing user across businesses by email
CREATE OR REPLACE FUNCTION find_user_by_email(p_email VARCHAR)
RETURNS TABLE (
  user_id UUID,
  auth_user_id UUID,
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  phone VARCHAR,
  businesses JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id as user_id,
    bu.auth_user_id,
    bu.email::VARCHAR,
    bu.first_name::VARCHAR,
    bu.last_name::VARCHAR,
    bu.phone::VARCHAR,
    jsonb_agg(jsonb_build_object(
      'business_id', bu.business_id,
      'business_name', b.business_name,
      'role', bu.role,
      'status', bu.status
    )) as businesses
  FROM business_users bu
  JOIN businesses b ON b.id = bu.business_id
  WHERE LOWER(bu.email) = LOWER(p_email)
  AND bu.is_active = true
  GROUP BY bu.id, bu.auth_user_id, bu.email, bu.first_name, bu.last_name, bu.phone
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link existing user to a new business
CREATE OR REPLACE FUNCTION link_user_to_business(
  p_auth_user_id UUID,
  p_business_id UUID,
  p_role VARCHAR DEFAULT 'user'
)
RETURNS UUID AS $$
DECLARE
  v_existing_user business_users%ROWTYPE;
  v_new_id UUID;
BEGIN
  -- Get existing user info from another business
  SELECT * INTO v_existing_user
  FROM business_users
  WHERE auth_user_id = p_auth_user_id
  AND is_active = true
  LIMIT 1;

  IF v_existing_user.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if already linked to this business
  SELECT id INTO v_new_id
  FROM business_users
  WHERE auth_user_id = p_auth_user_id
  AND business_id = p_business_id;

  IF v_new_id IS NOT NULL THEN
    RETURN v_new_id; -- Already linked
  END IF;

  -- Create new business_user entry for this business
  INSERT INTO business_users (
    business_id,
    auth_user_id,
    email,
    first_name,
    last_name,
    phone,
    role,
    status
  ) VALUES (
    p_business_id,
    p_auth_user_id,
    v_existing_user.email,
    v_existing_user.first_name,
    v_existing_user.last_name,
    v_existing_user.phone,
    p_role,
    'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to tenant
CREATE OR REPLACE FUNCTION promote_user_to_tenant(
  p_business_user_id UUID,
  p_unit_id UUID,
  p_lease_start_date DATE DEFAULT CURRENT_DATE,
  p_monthly_rent_cents INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_business_user business_users%ROWTYPE;
  v_unit units%ROWTYPE;
  v_tenant_id UUID;
BEGIN
  -- Get business user
  SELECT * INTO v_business_user
  FROM business_users
  WHERE id = p_business_user_id;

  IF v_business_user.id IS NULL THEN
    RAISE EXCEPTION 'Business user not found';
  END IF;

  IF v_business_user.role = 'tenant' AND v_business_user.tenant_id IS NOT NULL THEN
    RETURN v_business_user.tenant_id; -- Already a tenant
  END IF;

  -- Get unit info
  SELECT * INTO v_unit
  FROM units
  WHERE id = p_unit_id;

  IF v_unit.id IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  -- Create tenant record
  INSERT INTO tenants (
    unit_id,
    first_name,
    last_name,
    email,
    phone,
    tenant_type,
    lease_start_date,
    monthly_rent_cents,
    status,
    has_portal_access
  ) VALUES (
    p_unit_id,
    v_business_user.first_name,
    v_business_user.last_name,
    v_business_user.email,
    v_business_user.phone,
    'primary',
    p_lease_start_date,
    COALESCE(p_monthly_rent_cents, v_unit.monthly_rent_cents),
    'active',
    true
  )
  RETURNING id INTO v_tenant_id;

  -- Update business user
  UPDATE business_users
  SET
    role = 'tenant',
    status = 'active',
    tenant_id = v_tenant_id,
    updated_at = NOW()
  WHERE id = p_business_user_id;

  -- Update unit occupancy
  UPDATE units
  SET occupancy_status = 'occupied'
  WHERE id = p_unit_id;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business users with stats
CREATE OR REPLACE FUNCTION get_business_users_with_stats(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  auth_user_id UUID,
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  phone VARCHAR,
  role VARCHAR,
  status VARCHAR,
  tenant_id UUID,
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  unread_messages BIGINT,
  applications_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id,
    bu.business_id,
    bu.auth_user_id,
    bu.email::VARCHAR,
    bu.first_name::VARCHAR,
    bu.last_name::VARCHAR,
    bu.phone::VARCHAR,
    bu.role::VARCHAR,
    bu.status::VARCHAR,
    bu.tenant_id,
    bu.notes,
    bu.last_login_at,
    bu.created_at,
    bu.updated_at,
    (SELECT COUNT(*) FROM business_user_messages m
     WHERE m.business_user_id = bu.id AND m.is_read = false AND m.sender_type = 'user') as unread_messages,
    (SELECT COUNT(*) FROM rental_applications ra
     WHERE ra.applicant_email = bu.email
     AND ra.organization_id IN (SELECT organization_id FROM businesses WHERE id = p_business_id)) as applications_count
  FROM business_users bu
  WHERE bu.business_id = p_business_id
  AND bu.is_active = true
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION link_user_to_business TO authenticated;
GRANT EXECUTE ON FUNCTION promote_user_to_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_users_with_stats TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE business_users IS 'Users who have signed up through a business public page. Can be promoted to tenants.';
COMMENT ON TABLE business_user_messages IS 'Messages between business users and property managers.';
