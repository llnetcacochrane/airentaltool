/*
  # Tenant Invitation System

  1. New Tables
    - `tenant_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `property_id` (uuid, foreign key)
      - `unit_id` (uuid, foreign key)
      - `tenant_id` (uuid, foreign key, nullable - filled after signup)
      - `invitation_code` (text, unique - 8 character code)
      - `tenant_email` (text)
      - `tenant_first_name` (text)
      - `tenant_last_name` (text)
      - `status` (text - pending, accepted, expired, cancelled)
      - `expires_at` (timestamptz)
      - `accepted_at` (timestamptz, nullable)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tenant_invitations` table
    - Landlords can create/view invitations for their properties
    - Public users can view invitations by code (for validation during signup)
    - System auto-expires invitations after 30 days

  3. Functions
    - `generate_invitation_code()` - Generates unique 8-character code
    - `validate_invitation_code()` - Validates code and returns invitation details

  4. Indexes
    - Index on invitation_code for fast lookup
    - Index on tenant_id for tracking accepted invitations
*/

-- Create invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tenant_invitations table
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Invitation details
  invitation_code text UNIQUE NOT NULL,
  tenant_email text,
  tenant_first_name text,
  tenant_last_name text,
  
  -- Status tracking
  status invitation_status DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  
  -- Audit fields
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_code ON tenant_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_unit ON tenant_invitations(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON tenant_invitations(status);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_org ON tenant_invitations(organization_id);

-- Enable RLS
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Landlords can view all invitations for their organization
CREATE POLICY "Landlords can view organization invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Landlords can create invitations for their properties
CREATE POLICY "Landlords can create invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Landlords can update their organization's invitations
CREATE POLICY "Landlords can update organization invitations"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Public users can validate invitation codes (needed for signup)
CREATE POLICY "Anyone can validate invitation codes"
  ON tenant_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing chars
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM tenant_invitations WHERE invitation_code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to validate invitation code and get details
CREATE OR REPLACE FUNCTION validate_invitation_code(code text)
RETURNS TABLE (
  invitation_id uuid,
  organization_id uuid,
  organization_name text,
  property_id uuid,
  property_name text,
  property_address text,
  unit_id uuid,
  unit_number text,
  tenant_email text,
  tenant_first_name text,
  tenant_last_name text,
  status invitation_status,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.organization_id,
    o.name,
    ti.property_id,
    p.name,
    p.address_line1,
    ti.unit_id,
    u.unit_number,
    ti.tenant_email,
    ti.tenant_first_name,
    ti.tenant_last_name,
    ti.status,
    ti.expires_at
  FROM tenant_invitations ti
  JOIN organizations o ON ti.organization_id = o.id
  JOIN properties p ON ti.property_id = p.id
  JOIN units u ON ti.unit_id = u.id
  WHERE 
    ti.invitation_code = code
    AND ti.status = 'pending'
    AND ti.expires_at > now();
END;
$$;

-- Function to expire old invitations (can be run periodically)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tenant_invitations
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status = 'pending'
    AND expires_at <= now();
END;
$$;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_invitations_updated_at
  BEFORE UPDATE ON tenant_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_invitations_updated_at();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_invitation_code() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_invitation_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION expire_old_invitations() TO authenticated;
