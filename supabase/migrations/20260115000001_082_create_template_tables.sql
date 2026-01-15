-- Migration: Create application_templates and ensure agreement_templates tables exist
-- This ensures default templates can be created for new businesses

-- ============================================================================
-- 1. Create application_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  application_type TEXT DEFAULT 'standard' CHECK (application_type IN ('standard', 'short-term', 'student', 'corporate', 'roommate', 'co-signer')),
  form_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  require_income_verification BOOLEAN DEFAULT true,
  require_employment_verification BOOLEAN DEFAULT true,
  require_rental_history BOOLEAN DEFAULT true,
  require_references BOOLEAN DEFAULT true,
  require_id_verification BOOLEAN DEFAULT false,
  require_credit_check_consent BOOLEAN DEFAULT true,
  require_background_check_consent BOOLEAN DEFAULT true,
  minimum_income_ratio NUMERIC(4,2) DEFAULT 3.0,
  custom_questions JSONB DEFAULT '[]'::jsonb,
  terms_and_conditions TEXT,
  privacy_policy TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for application_templates
CREATE INDEX IF NOT EXISTS idx_application_templates_business ON application_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_application_templates_active ON application_templates(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_application_templates_default ON application_templates(business_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_application_templates_type ON application_templates(application_type);

-- ============================================================================
-- 2. Create agreement_templates table (if not exists from sql-scripts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  agreement_type TEXT DEFAULT 'lease' CHECK (agreement_type IN ('lease', 'sublease', 'month-to-month', 'short-term')),
  agreement_title TEXT NOT NULL,
  template_content TEXT NOT NULL,
  default_lease_term_months INTEGER DEFAULT 12,
  default_rent_amount INTEGER,
  default_security_deposit INTEGER,
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
-- 3. Enable RLS on both tables
-- ============================================================================
ALTER TABLE application_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for application_templates
-- ============================================================================

-- Business owners can manage their application templates
DROP POLICY IF EXISTS "Business owners can manage application templates" ON application_templates;
CREATE POLICY "Business owners can manage application templates"
ON application_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = application_templates.business_id
  AND b.owner_user_id = auth.uid()
));

-- Business users can view and use templates for their business
DROP POLICY IF EXISTS "Business users can view application templates" ON application_templates;
CREATE POLICY "Business users can view application templates"
ON application_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM business_users bu
  WHERE bu.business_id = application_templates.business_id
  AND bu.auth_user_id = auth.uid()
  AND bu.is_active = true
));

-- Super admins have full access
DROP POLICY IF EXISTS "Super admins full access to application_templates" ON application_templates;
CREATE POLICY "Super admins full access to application_templates"
ON application_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM super_admins
  WHERE super_admins.user_id = auth.uid()
  AND super_admins.is_active = true
));

-- ============================================================================
-- 5. RLS Policies for agreement_templates
-- ============================================================================

-- Business owners can manage their agreement templates
DROP POLICY IF EXISTS "Business owners can manage agreement templates" ON agreement_templates;
CREATE POLICY "Business owners can manage agreement templates"
ON agreement_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = agreement_templates.business_id
  AND b.owner_user_id = auth.uid()
));

-- Business users can view and use templates for their business
DROP POLICY IF EXISTS "Business users can view agreement templates" ON agreement_templates;
CREATE POLICY "Business users can view agreement templates"
ON agreement_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM business_users bu
  WHERE bu.business_id = agreement_templates.business_id
  AND bu.auth_user_id = auth.uid()
  AND bu.is_active = true
));

-- Super admins have full access
DROP POLICY IF EXISTS "Super admins full access to agreement_templates" ON agreement_templates;
CREATE POLICY "Super admins full access to agreement_templates"
ON agreement_templates FOR ALL
USING (EXISTS (
  SELECT 1 FROM super_admins
  WHERE super_admins.user_id = auth.uid()
  AND super_admins.is_active = true
));

-- ============================================================================
-- 6. Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_application_templates_updated_at ON application_templates;
CREATE TRIGGER update_application_templates_updated_at
  BEFORE UPDATE ON application_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agreement_templates_updated_at ON agreement_templates;
CREATE TRIGGER update_agreement_templates_updated_at
  BEFORE UPDATE ON agreement_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'Template tables migration completed successfully!' as status;
