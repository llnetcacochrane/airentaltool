/*
  # Landlord-Tenant Agreement System with AI & Digital Signatures

  1. New Tables
    - agreement_templates: Reusable agreement templates created with AI
    - lease_agreements: Issued agreements linked to specific leases/tenants
    - agreement_signatures: Digital signature records
    - agreement_audit_log: Track all changes and status updates

  2. Features
    - AI-assisted agreement creation
    - Multiple template versions
    - Digital signature workflow
    - PDF generation support
    - Audit trail

  3. Security
    - Enable RLS on all tables
    - Landlords can manage their own templates
    - Tenants can view/sign their assigned agreements
    - Audit logs are read-only
*/

-- Agreement Templates (reusable templates created by landlords)
CREATE TABLE IF NOT EXISTS agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,

  -- Template Info
  template_name text NOT NULL,
  description text,
  agreement_type text NOT NULL DEFAULT 'lease', -- lease, sublease, month-to-month, short-term

  -- Agreement Content
  agreement_title text NOT NULL,
  content jsonb NOT NULL, -- Structured agreement data
  generated_text text, -- AI-generated full text

  -- Terms
  default_lease_term_months integer,
  default_rent_amount decimal(10,2),
  default_security_deposit decimal(10,2),
  payment_frequency text DEFAULT 'monthly', -- daily, weekly, bi-weekly, monthly

  -- Policies
  pet_policy text,
  house_rules text,
  cancellation_policy text,
  damage_policy text,
  refund_policy text,

  -- Additional Terms
  utilities_included text[],
  amenities text[],
  parking_details text,
  max_occupants integer,

  -- AI Generation
  ai_prompt_used text,
  ai_model_used text,
  ai_generated_at timestamptz,

  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  version integer DEFAULT 1,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lease Agreements (issued to specific tenants)
CREATE TABLE IF NOT EXISTS lease_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  template_id uuid REFERENCES agreement_templates(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE,

  -- Parties
  landlord_name text NOT NULL,
  landlord_email text NOT NULL,
  landlord_phone text,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL,
  tenant_phone text,

  -- Agreement Details
  agreement_title text NOT NULL,
  agreement_type text NOT NULL DEFAULT 'lease',
  content jsonb NOT NULL, -- Full agreement content
  generated_text text NOT NULL, -- Final agreement text

  -- Terms
  start_date date NOT NULL,
  end_date date NOT NULL,
  rent_amount decimal(10,2) NOT NULL,
  security_deposit decimal(10,2) NOT NULL DEFAULT 0,
  payment_frequency text NOT NULL DEFAULT 'monthly',
  payment_due_day integer DEFAULT 1,
  late_fee_amount decimal(10,2),
  late_fee_grace_days integer DEFAULT 5,

  -- Property Details
  property_address text NOT NULL,
  property_description text,

  -- Status & Workflow
  status text NOT NULL DEFAULT 'draft', -- draft, sent, viewed, signed, executed, terminated, expired
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  executed_at timestamptz,
  terminated_at timestamptz,

  -- Digital Signature
  requires_signature boolean DEFAULT true,
  signature_deadline timestamptz,
  landlord_signed boolean DEFAULT false,
  landlord_signed_at timestamptz,
  tenant_signed boolean DEFAULT false,
  tenant_signed_at timestamptz,

  -- Documents
  pdf_url text,
  signed_pdf_url text,

  -- Notifications
  reminder_sent_at timestamptz,
  reminder_count integer DEFAULT 0,

  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agreement Signatures (digital signature records)
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  agreement_id uuid NOT NULL REFERENCES lease_agreements(id) ON DELETE CASCADE,

  -- Signer Info
  signer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_type text NOT NULL, -- landlord, tenant, guarantor, witness
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signer_ip text,

  -- Signature Data
  signature_data text, -- Base64 encoded signature image or typed name
  signature_method text NOT NULL DEFAULT 'digital', -- digital, typed, esign_service

  -- Verification
  signed_at timestamptz NOT NULL DEFAULT now(),
  consent_text text NOT NULL,
  consent_agreed boolean NOT NULL DEFAULT true,

  -- Audit
  user_agent text,
  device_info jsonb,

  created_at timestamptz DEFAULT now()
);

-- Agreement Audit Log (track all changes)
CREATE TABLE IF NOT EXISTS agreement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  agreement_id uuid REFERENCES lease_agreements(id) ON DELETE CASCADE,
  template_id uuid REFERENCES agreement_templates(id) ON DELETE CASCADE,

  -- Action
  action_type text NOT NULL, -- created, updated, sent, viewed, signed, executed, terminated, downloaded
  action_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_by_name text,
  action_by_email text,

  -- Details
  old_status text,
  new_status text,
  changes jsonb,
  notes text,

  -- Context
  ip_address text,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agreement_templates_created_by ON agreement_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_business_id ON agreement_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_portfolio_id ON agreement_templates(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_agreement_templates_active ON agreement_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_lease_agreements_tenant_id ON lease_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_lease_id ON lease_agreements(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_unit_id ON lease_agreements(unit_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_property_id ON lease_agreements(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_business_id ON lease_agreements(business_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_portfolio_id ON lease_agreements(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_status ON lease_agreements(status);
CREATE INDEX IF NOT EXISTS idx_lease_agreements_created_by ON lease_agreements(created_by);

CREATE INDEX IF NOT EXISTS idx_agreement_signatures_agreement_id ON agreement_signatures(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_signatures_signer_id ON agreement_signatures(signer_id);

CREATE INDEX IF NOT EXISTS idx_agreement_audit_log_agreement_id ON agreement_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_log_template_id ON agreement_audit_log(template_id);

-- Enable Row Level Security
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Agreement Templates

-- Landlords can view their own templates
CREATE POLICY "Users can view own agreement templates"
  ON agreement_templates FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Landlords can create templates
CREATE POLICY "Users can create agreement templates"
  ON agreement_templates FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Landlords can update their own templates
CREATE POLICY "Users can update own agreement templates"
  ON agreement_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Landlords can delete their own templates
CREATE POLICY "Users can delete own agreement templates"
  ON agreement_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies: Lease Agreements

-- Landlords can view agreements they created
CREATE POLICY "Landlords can view own agreements"
  ON lease_agreements FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Tenants can view their assigned agreements
CREATE POLICY "Tenants can view assigned agreements"
  ON lease_agreements FOR SELECT
  TO authenticated
  USING (
    tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Landlords can create agreements
CREATE POLICY "Landlords can create agreements"
  ON lease_agreements FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Landlords can update their agreements (before fully executed)
CREATE POLICY "Landlords can update own agreements"
  ON lease_agreements FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Tenants can update agreement status (for viewing/signing)
CREATE POLICY "Tenants can update agreement status for signing"
  ON lease_agreements FOR UPDATE
  TO authenticated
  USING (
    tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status IN ('sent', 'viewed')
  )
  WITH CHECK (
    tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies: Agreement Signatures

-- Users can view signatures on their agreements
CREATE POLICY "Users can view agreement signatures"
  ON agreement_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lease_agreements la
      WHERE la.id = agreement_signatures.agreement_id
      AND (
        la.created_by = auth.uid()
        OR la.tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Users can create signatures
CREATE POLICY "Users can create signatures"
  ON agreement_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    signer_id = auth.uid()
    OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policies: Audit Log (read-only for relevant users)

CREATE POLICY "Users can view relevant audit logs"
  ON agreement_audit_log FOR SELECT
  TO authenticated
  USING (
    action_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lease_agreements la
      WHERE la.id = agreement_audit_log.agreement_id
      AND (
        la.created_by = auth.uid()
        OR la.tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- Functions

-- Generate agreement from template
CREATE OR REPLACE FUNCTION generate_agreement_from_template(
  p_template_id uuid,
  p_tenant_id uuid,
  p_lease_id uuid,
  p_custom_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement_id uuid;
  v_template record;
  v_tenant record;
  v_lease record;
  v_unit record;
  v_property record;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM agreement_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Get tenant
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Get lease
  SELECT * INTO v_lease FROM leases WHERE id = p_lease_id;

  -- Get unit
  SELECT * INTO v_unit FROM units WHERE id = v_tenant.unit_id;

  -- Get property
  SELECT * INTO v_property FROM properties WHERE id = v_unit.property_id;

  -- Create agreement
  INSERT INTO lease_agreements (
    template_id,
    lease_id,
    tenant_id,
    unit_id,
    property_id,
    business_id,
    portfolio_id,
    landlord_name,
    landlord_email,
    tenant_name,
    tenant_email,
    agreement_title,
    agreement_type,
    content,
    generated_text,
    start_date,
    end_date,
    rent_amount,
    security_deposit,
    payment_frequency,
    property_address,
    property_description,
    created_by
  )
  VALUES (
    p_template_id,
    p_lease_id,
    p_tenant_id,
    v_unit.id,
    v_property.id,
    v_property.business_id,
    v_property.portfolio_id,
    COALESCE((p_custom_data->>'landlord_name')::text, v_property.owner_name),
    COALESCE((p_custom_data->>'landlord_email')::text, (SELECT email FROM auth.users WHERE id = v_template.created_by)),
    v_tenant.first_name || ' ' || v_tenant.last_name,
    v_tenant.email,
    v_template.agreement_title,
    v_template.agreement_type,
    jsonb_build_object(
      'template_content', v_template.content,
      'custom_data', p_custom_data,
      'tenant_data', to_jsonb(v_tenant),
      'property_data', to_jsonb(v_property),
      'unit_data', to_jsonb(v_unit)
    ),
    v_template.generated_text,
    COALESCE((p_custom_data->>'start_date')::date, v_lease.start_date, CURRENT_DATE),
    COALESCE((p_custom_data->>'end_date')::date, v_lease.end_date, CURRENT_DATE + interval '1 year'),
    COALESCE((p_custom_data->>'rent_amount')::decimal, v_lease.rent_amount, v_template.default_rent_amount),
    COALESCE((p_custom_data->>'security_deposit')::decimal, v_lease.security_deposit, v_template.default_security_deposit),
    COALESCE((p_custom_data->>'payment_frequency')::text, v_template.payment_frequency, 'monthly'),
    v_property.address || ', ' || v_property.city || ', ' || v_property.state || ' ' || v_property.zip_code,
    v_property.description,
    v_template.created_by
  )
  RETURNING id INTO v_agreement_id;

  -- Log creation
  INSERT INTO agreement_audit_log (
    agreement_id,
    template_id,
    action_type,
    action_by,
    new_status,
    notes
  )
  VALUES (
    v_agreement_id,
    p_template_id,
    'created',
    auth.uid(),
    'draft',
    'Agreement generated from template'
  );

  RETURN v_agreement_id;
END;
$$;

-- Send agreement to tenant
CREATE OR REPLACE FUNCTION send_agreement_to_tenant(p_agreement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement record;
BEGIN
  -- Get agreement
  SELECT * INTO v_agreement FROM lease_agreements WHERE id = p_agreement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF v_agreement.created_by != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update status
  UPDATE lease_agreements
  SET
    status = 'sent',
    sent_at = now(),
    signature_deadline = now() + interval '7 days',
    updated_at = now()
  WHERE id = p_agreement_id;

  -- Log action
  INSERT INTO agreement_audit_log (
    agreement_id,
    action_type,
    action_by,
    old_status,
    new_status,
    notes
  )
  VALUES (
    p_agreement_id,
    'sent',
    auth.uid(),
    v_agreement.status,
    'sent',
    'Agreement sent to tenant for signature'
  );

  RETURN true;
END;
$$;

-- Sign agreement (tenant or landlord)
CREATE OR REPLACE FUNCTION sign_agreement(
  p_agreement_id uuid,
  p_signer_type text,
  p_signature_data text,
  p_signature_method text DEFAULT 'digital'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement record;
  v_user_email text;
  v_user_name text;
BEGIN
  -- Get agreement
  SELECT * INTO v_agreement FROM lease_agreements WHERE id = p_agreement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  -- Get user info
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Verify authorization
  IF p_signer_type = 'landlord' AND v_agreement.created_by != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to sign as landlord';
  END IF;

  IF p_signer_type = 'tenant' AND v_agreement.tenant_email != v_user_email THEN
    RAISE EXCEPTION 'Not authorized to sign as tenant';
  END IF;

  -- Create signature record
  INSERT INTO agreement_signatures (
    agreement_id,
    signer_id,
    signer_type,
    signer_name,
    signer_email,
    signature_data,
    signature_method,
    consent_text,
    signed_at
  )
  VALUES (
    p_agreement_id,
    auth.uid(),
    p_signer_type,
    CASE
      WHEN p_signer_type = 'landlord' THEN v_agreement.landlord_name
      ELSE v_agreement.tenant_name
    END,
    v_user_email,
    p_signature_data,
    p_signature_method,
    'I agree to the terms and conditions of this agreement and acknowledge that my electronic signature is legally binding.',
    now()
  );

  -- Update agreement
  IF p_signer_type = 'landlord' THEN
    UPDATE lease_agreements
    SET
      landlord_signed = true,
      landlord_signed_at = now(),
      updated_at = now()
    WHERE id = p_agreement_id;
  ELSE
    UPDATE lease_agreements
    SET
      tenant_signed = true,
      tenant_signed_at = now(),
      signed_at = now(),
      status = CASE
        WHEN landlord_signed THEN 'executed'
        ELSE 'signed'
      END,
      executed_at = CASE
        WHEN landlord_signed THEN now()
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = p_agreement_id;
  END IF;

  -- Log action
  INSERT INTO agreement_audit_log (
    agreement_id,
    action_type,
    action_by,
    old_status,
    new_status,
    notes
  )
  VALUES (
    p_agreement_id,
    'signed',
    auth.uid(),
    v_agreement.status,
    CASE
      WHEN p_signer_type = 'tenant' AND v_agreement.landlord_signed THEN 'executed'
      ELSE 'signed'
    END,
    p_signer_type || ' signed the agreement'
  );

  RETURN true;
END;
$$;

-- Mark agreement as viewed by tenant
CREATE OR REPLACE FUNCTION mark_agreement_viewed(p_agreement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement record;
  v_user_email text;
BEGIN
  SELECT * INTO v_agreement FROM lease_agreements WHERE id = p_agreement_id;
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF v_agreement.tenant_email != v_user_email THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE lease_agreements
  SET
    status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
    viewed_at = COALESCE(viewed_at, now()),
    updated_at = now()
  WHERE id = p_agreement_id;

  INSERT INTO agreement_audit_log (
    agreement_id,
    action_type,
    action_by,
    notes
  )
  VALUES (
    p_agreement_id,
    'viewed',
    auth.uid(),
    'Tenant viewed the agreement'
  );

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_agreement_from_template(uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION send_agreement_to_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION sign_agreement(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_agreement_viewed(uuid) TO authenticated;
