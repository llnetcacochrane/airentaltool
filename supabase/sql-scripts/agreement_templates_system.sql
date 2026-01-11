-- Agreement Templates System Migration
-- Creates tables for reusable agreement templates with placeholder variables
-- Run with: PGPASSWORD='SupaAdmin2024Secure' psql -h 35.182.209.169 -p 5432 -U supabase_admin -d airentaltools -f migrations/agreement_templates_system.sql

-- ============================================================================
-- 1. Create agreement_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  agreement_type TEXT DEFAULT 'lease' CHECK (agreement_type IN ('lease', 'sublease', 'month-to-month', 'short-term')),
  agreement_title TEXT NOT NULL,
  template_content TEXT NOT NULL,  -- Contains placeholder variables like {{TENANT_NAME}}
  default_lease_term_months INTEGER DEFAULT 12,
  default_rent_amount INTEGER,  -- in cents
  default_security_deposit INTEGER,  -- in cents
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly')),
  pet_policy TEXT,
  house_rules TEXT,
  cancellation_policy TEXT,
  damage_policy TEXT,
  refund_policy TEXT,
  utilities_included JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  parking_details TEXT,
  max_occupants INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for agreement_templates
CREATE INDEX IF NOT EXISTS idx_agreement_templates_business ON agreement_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_active ON agreement_templates(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_default ON agreement_templates(business_id, is_default) WHERE is_default = true;

-- ============================================================================
-- 2. Add default_agreement_template_id to units table
-- ============================================================================
ALTER TABLE units ADD COLUMN IF NOT EXISTS default_agreement_template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL;

-- Index for units template lookup
CREATE INDEX IF NOT EXISTS idx_units_agreement_template ON units(default_agreement_template_id) WHERE default_agreement_template_id IS NOT NULL;

-- ============================================================================
-- 3. Create lease_agreements table (issued agreements with populated data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lease_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Landlord info (populated from business owner at issue time)
  landlord_name TEXT NOT NULL,
  landlord_email TEXT NOT NULL,
  landlord_phone TEXT,

  -- Tenant info (populated at issue time)
  tenant_name TEXT NOT NULL,
  tenant_email TEXT NOT NULL,
  tenant_phone TEXT,

  -- Agreement details
  agreement_title TEXT NOT NULL,
  agreement_type TEXT DEFAULT 'lease',
  final_content TEXT NOT NULL,  -- Rendered content with placeholders replaced
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount INTEGER NOT NULL,  -- in cents
  security_deposit INTEGER DEFAULT 0,
  payment_frequency TEXT DEFAULT 'monthly',
  payment_due_day INTEGER DEFAULT 1,
  late_fee_amount INTEGER,
  late_fee_grace_days INTEGER DEFAULT 5,
  property_address TEXT NOT NULL,
  property_description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'executed', 'terminated', 'expired')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  signature_deadline TIMESTAMPTZ,

  -- Signature tracking
  requires_signature BOOLEAN DEFAULT true,
  landlord_signed BOOLEAN DEFAULT false,
  landlord_signed_at TIMESTAMPTZ,
  landlord_signature_data TEXT,
  tenant_signed BOOLEAN DEFAULT false,
  tenant_signed_at TIMESTAMPTZ,
  tenant_signature_data TEXT,

  -- PDF storage
  pdf_url TEXT,
  signed_pdf_url TEXT,

  -- Auto-send settings
  auto_sent_on_approval BOOLEAN DEFAULT false,

  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lease_agreements
CREATE INDEX IF NOT EXISTS idx_lease_agreements_business ON lease_agreements(business_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_tenant ON lease_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_unit ON lease_agreements(unit_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_status ON lease_agreements(status);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_pending ON lease_agreements(business_id, status) WHERE status IN ('sent', 'viewed');

-- ============================================================================
-- 4. Create agreement_signatures table for detailed signature tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES lease_agreements(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('landlord', 'tenant', 'guarantor', 'witness')),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_ip TEXT,
  signature_data TEXT,  -- Base64 encoded signature image or typed name
  signature_method TEXT DEFAULT 'digital' CHECK (signature_method IN ('digital', 'typed', 'esign_service')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_text TEXT NOT NULL DEFAULT 'I agree to the terms and conditions of this agreement.',
  consent_agreed BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for agreement_signatures
CREATE INDEX IF NOT EXISTS idx_agreement_signatures_agreement ON agreement_signatures(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_signatures_signer ON agreement_signatures(signer_email);

-- ============================================================================
-- 5. Create agreement_audit_log table for tracking all changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES lease_agreements(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agreement_templates(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,  -- 'created', 'sent', 'viewed', 'signed', 'updated', 'terminated'
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_by_name TEXT,
  action_by_email TEXT,
  old_status TEXT,
  new_status TEXT,
  changes JSONB,
  notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_agreement_audit_agreement ON agreement_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_template ON agreement_audit_log(template_id);

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Agreement Templates Policies
DROP POLICY IF EXISTS "Business owners can manage agreement templates" ON agreement_templates;
CREATE POLICY "Business owners can manage agreement templates"
ON agreement_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = agreement_templates.business_id
  AND b.owner_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Super admins full access to agreement_templates" ON agreement_templates;
CREATE POLICY "Super admins full access to agreement_templates"
ON agreement_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM super_admins
  WHERE super_admins.user_id = auth.uid()
  AND super_admins.is_active = true
));

-- Lease Agreements Policies
DROP POLICY IF EXISTS "Business owners can manage lease agreements" ON lease_agreements;
CREATE POLICY "Business owners can manage lease agreements"
ON lease_agreements FOR ALL
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = lease_agreements.business_id
  AND b.owner_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Tenants can view their own agreements" ON lease_agreements;
CREATE POLICY "Tenants can view their own agreements"
ON lease_agreements FOR SELECT
USING (tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Super admins full access to lease_agreements" ON lease_agreements;
CREATE POLICY "Super admins full access to lease_agreements"
ON lease_agreements FOR ALL
USING (EXISTS (
  SELECT 1 FROM super_admins
  WHERE super_admins.user_id = auth.uid()
  AND super_admins.is_active = true
));

-- Agreement Signatures Policies
DROP POLICY IF EXISTS "Users can view signatures for their agreements" ON agreement_signatures;
CREATE POLICY "Users can view signatures for their agreements"
ON agreement_signatures FOR SELECT
USING (EXISTS (
  SELECT 1 FROM lease_agreements la
  WHERE la.id = agreement_signatures.agreement_id
  AND (
    la.landlord_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR la.tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = la.business_id
      AND b.owner_user_id = auth.uid()
    )
  )
));

DROP POLICY IF EXISTS "Users can add signatures to their agreements" ON agreement_signatures;
CREATE POLICY "Users can add signatures to their agreements"
ON agreement_signatures FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM lease_agreements la
  WHERE la.id = agreement_signatures.agreement_id
  AND (
    la.landlord_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR la.tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
));

-- Audit Log Policies (read-only for relevant parties)
DROP POLICY IF EXISTS "Users can view audit logs for their agreements" ON agreement_audit_log;
CREATE POLICY "Users can view audit logs for their agreements"
ON agreement_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lease_agreements la
    WHERE la.id = agreement_audit_log.agreement_id
    AND (
      EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.id = la.business_id
        AND b.owner_user_id = auth.uid()
      )
    )
  )
  OR EXISTS (
    SELECT 1 FROM agreement_templates at
    WHERE at.id = agreement_audit_log.template_id
    AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = at.business_id
      AND b.owner_user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 7. Helper Functions
-- ============================================================================

-- Function to mark agreement as viewed
CREATE OR REPLACE FUNCTION mark_agreement_viewed(p_agreement_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lease_agreements
  SET
    status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
    viewed_at = COALESCE(viewed_at, now()),
    updated_at = now()
  WHERE id = p_agreement_id;

  INSERT INTO agreement_audit_log (agreement_id, action_type, old_status, new_status)
  VALUES (p_agreement_id, 'viewed', 'sent', 'viewed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send agreement (update status)
CREATE OR REPLACE FUNCTION send_agreement_to_tenant(p_agreement_id UUID)
RETURNS VOID AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  SELECT status INTO v_old_status FROM lease_agreements WHERE id = p_agreement_id;

  UPDATE lease_agreements
  SET
    status = 'sent',
    sent_at = now(),
    updated_at = now()
  WHERE id = p_agreement_id;

  INSERT INTO agreement_audit_log (agreement_id, action_type, action_by, old_status, new_status)
  VALUES (p_agreement_id, 'sent', auth.uid(), v_old_status, 'sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record signature
CREATE OR REPLACE FUNCTION sign_agreement(
  p_agreement_id UUID,
  p_signer_type TEXT,
  p_signature_data TEXT,
  p_signature_method TEXT DEFAULT 'digital'
)
RETURNS VOID AS $$
DECLARE
  v_agreement lease_agreements%ROWTYPE;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get agreement
  SELECT * INTO v_agreement FROM lease_agreements WHERE id = p_agreement_id;

  -- Get current user info
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Determine signer name based on type
  IF p_signer_type = 'landlord' THEN
    v_user_name := v_agreement.landlord_name;
  ELSE
    v_user_name := v_agreement.tenant_name;
  END IF;

  -- Insert signature record
  INSERT INTO agreement_signatures (
    agreement_id,
    signer_id,
    signer_type,
    signer_name,
    signer_email,
    signature_data,
    signature_method
  ) VALUES (
    p_agreement_id,
    auth.uid(),
    p_signer_type,
    v_user_name,
    v_user_email,
    p_signature_data,
    p_signature_method
  );

  -- Update agreement signature status
  IF p_signer_type = 'landlord' THEN
    UPDATE lease_agreements
    SET
      landlord_signed = true,
      landlord_signed_at = now(),
      landlord_signature_data = p_signature_data,
      updated_at = now()
    WHERE id = p_agreement_id;
  ELSE
    UPDATE lease_agreements
    SET
      tenant_signed = true,
      tenant_signed_at = now(),
      tenant_signature_data = p_signature_data,
      updated_at = now()
    WHERE id = p_agreement_id;
  END IF;

  -- Check if both parties have signed
  SELECT * INTO v_agreement FROM lease_agreements WHERE id = p_agreement_id;

  IF v_agreement.landlord_signed AND v_agreement.tenant_signed THEN
    UPDATE lease_agreements
    SET
      status = 'executed',
      signed_at = now(),
      executed_at = now(),
      updated_at = now()
    WHERE id = p_agreement_id;

    INSERT INTO agreement_audit_log (agreement_id, action_type, action_by, old_status, new_status)
    VALUES (p_agreement_id, 'executed', auth.uid(), v_agreement.status, 'executed');
  ELSE
    INSERT INTO agreement_audit_log (agreement_id, action_type, action_by, notes)
    VALUES (p_agreement_id, 'signed', auth.uid(), p_signer_type || ' signed');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Updated_at Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agreement_templates_updated_at ON agreement_templates;
CREATE TRIGGER update_agreement_templates_updated_at
  BEFORE UPDATE ON agreement_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lease_agreements_updated_at ON lease_agreements;
CREATE TRIGGER update_lease_agreements_updated_at
  BEFORE UPDATE ON lease_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'Agreement templates system migration completed successfully!' as status;
