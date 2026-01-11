-- Affiliate Marketing System Migration
-- Complete affiliate program with configurable settings, tracking, and payouts
-- Created: 2025-12-26

-- ============================================
-- 1. Create affiliate_settings table (Global Configuration)
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Commission Configuration
  commission_type text NOT NULL DEFAULT 'recurring' CHECK (commission_type IN ('one_time', 'recurring')),
  commission_percentage integer NOT NULL DEFAULT 2000, -- 20% = 2000 basis points (divide by 10000)
  recurring_months integer DEFAULT NULL, -- NULL = lifetime, or limit to X months

  -- Payout Configuration
  minimum_payout_cents integer NOT NULL DEFAULT 5000, -- $50 minimum
  payout_schedule text DEFAULT 'monthly' CHECK (payout_schedule IN ('weekly', 'biweekly', 'monthly')),

  -- Attribution Configuration
  attribution_window_days integer NOT NULL DEFAULT 30,

  -- Cookie Settings
  cookie_duration_days integer NOT NULL DEFAULT 30,

  -- General Settings
  program_active boolean DEFAULT true,
  require_approval boolean DEFAULT true,
  allow_self_referral boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO affiliate_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM affiliate_settings);

-- ============================================
-- 2. Create affiliates table
-- ============================================

CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Affiliate Info
  referral_code text NOT NULL UNIQUE,
  company_name text,
  website_url text,
  promotional_methods text, -- How they plan to promote

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  suspension_reason text,

  -- Payout Info
  payout_method text CHECK (payout_method IN ('paypal', 'bank_transfer', 'check', 'e_transfer')),
  payout_email text, -- PayPal/e-transfer email
  bank_details jsonb, -- Encrypted bank info for bank transfers

  -- Stats (denormalized for performance)
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_paid_signups integer DEFAULT 0,
  total_commission_earned_cents integer DEFAULT 0,
  total_commission_paid_cents integer DEFAULT 0,
  pending_commission_cents integer DEFAULT 0,

  -- Metadata
  notes text, -- Admin notes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT affiliates_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

-- ============================================
-- 3. Create affiliate_referrals table (Click & Signup Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Referral tracking
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,

  -- Click tracking
  click_id text NOT NULL UNIQUE, -- For deduplication
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  landing_page text,
  referrer_url text,

  -- Conversion tracking
  signup_at timestamptz,
  first_payment_at timestamptz,
  first_payment_amount_cents integer,
  converted boolean DEFAULT false, -- true when first payment is made

  -- Attribution
  attribution_expires_at timestamptz NOT NULL,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_org ON affiliate_referrals(referred_organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_click ON affiliate_referrals(click_id);
CREATE INDEX IF NOT EXISTS idx_referrals_converted ON affiliate_referrals(converted) WHERE converted = true;

-- ============================================
-- 4. Create affiliate_payouts table (must be before commissions for FK)
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Payout details
  amount_cents integer NOT NULL,
  commission_count integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Processing
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method text NOT NULL,
  transaction_id text,
  failure_reason text,

  -- Admin tracking
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested ON affiliate_payouts(requested_at);

-- ============================================
-- 5. Create affiliate_commissions table
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES affiliate_referrals(id) ON DELETE CASCADE,

  -- Commission details
  subscription_payment_id uuid, -- Link to subscription_payments if applicable
  billing_month date NOT NULL,
  subscription_amount_cents integer NOT NULL,
  commission_percentage integer NOT NULL, -- Basis points at time of earning
  commission_amount_cents integer NOT NULL,

  -- Status
  status text NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'pending_payout', 'paid', 'refunded', 'cancelled')),

  -- Payout reference
  payout_id uuid REFERENCES affiliate_payouts(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referral ON affiliate_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_month ON affiliate_commissions(billing_month);
CREATE INDEX IF NOT EXISTS idx_commissions_payout ON affiliate_commissions(payout_id);

-- ============================================
-- 6. Enable RLS on all tables
-- ============================================

ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS Policies for affiliate_settings
-- ============================================

-- Anyone can read settings (needed for public program info)
CREATE POLICY "Anyone can read affiliate settings"
  ON affiliate_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify settings
CREATE POLICY "Super admins manage affiliate settings"
  ON affiliate_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- 8. RLS Policies for affiliates
-- ============================================

-- Affiliates can view their own record
CREATE POLICY "Affiliates view own record"
  ON affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Affiliates can insert their own application
CREATE POLICY "Users can apply to be affiliate"
  ON affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Affiliates can update their own profile (limited fields via service)
CREATE POLICY "Affiliates update own record"
  ON affiliates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins have full access
CREATE POLICY "Super admins manage affiliates"
  ON affiliates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- 9. RLS Policies for affiliate_referrals
-- ============================================

-- Affiliates can view their own referrals
CREATE POLICY "Affiliates view own referrals"
  ON affiliate_referrals FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- System can insert referrals (via service with elevated privileges)
CREATE POLICY "System insert referrals"
  ON affiliate_referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Super admins have full access
CREATE POLICY "Super admins manage referrals"
  ON affiliate_referrals FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- 10. RLS Policies for affiliate_commissions
-- ============================================

-- Affiliates can view their own commissions
CREATE POLICY "Affiliates view own commissions"
  ON affiliate_commissions FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Super admins have full access
CREATE POLICY "Super admins manage commissions"
  ON affiliate_commissions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- 11. RLS Policies for affiliate_payouts
-- ============================================

-- Affiliates can view their own payouts
CREATE POLICY "Affiliates view own payouts"
  ON affiliate_payouts FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Affiliates can request payouts
CREATE POLICY "Affiliates request payouts"
  ON affiliate_payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid() AND status = 'approved')
  );

-- Super admins have full access
CREATE POLICY "Super admins manage payouts"
  ON affiliate_payouts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- 12. Helper Functions
-- ============================================

-- Generate secure referral code (8 chars, alphanumeric, no ambiguous chars)
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  random_bytes bytea;
  i integer;
BEGIN
  -- Use cryptographically secure random bytes
  random_bytes := gen_random_bytes(8);
  FOR i IN 1..8 LOOP
    result := result || substr(chars, (get_byte(random_bytes, i - 1) % length(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Generate unique click ID
CREATE OR REPLACE FUNCTION generate_click_id()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Validate affiliate code and return affiliate info
CREATE OR REPLACE FUNCTION validate_affiliate_code(p_code text)
RETURNS TABLE (
  affiliate_id uuid,
  user_id uuid,
  status text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as affiliate_id,
    a.user_id,
    a.status,
    (a.status = 'approved') as is_valid
  FROM affiliates a
  WHERE a.referral_code = upper(p_code);
END;
$$;

-- Track affiliate click
CREATE OR REPLACE FUNCTION track_affiliate_click(
  p_referral_code text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_landing_page text DEFAULT NULL,
  p_referrer_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate affiliates%ROWTYPE;
  v_settings affiliate_settings%ROWTYPE;
  v_click_id text;
BEGIN
  -- Get affiliate
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE referral_code = upper(p_referral_code)
    AND status = 'approved';

  IF v_affiliate.id IS NULL THEN
    RETURN NULL; -- Invalid or inactive affiliate
  END IF;

  -- Get settings for attribution window
  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;

  -- Generate click ID
  v_click_id := generate_click_id();

  -- Insert referral record
  INSERT INTO affiliate_referrals (
    affiliate_id, click_id, ip_address, user_agent, landing_page, referrer_url,
    attribution_expires_at
  ) VALUES (
    v_affiliate.id, v_click_id, p_ip_address, p_user_agent, p_landing_page, p_referrer_url,
    now() + (v_settings.attribution_window_days || ' days')::interval
  );

  -- Update affiliate click count
  UPDATE affiliates
  SET total_clicks = total_clicks + 1, updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN v_click_id;
END;
$$;

-- Track signup from referral
CREATE OR REPLACE FUNCTION track_affiliate_signup(
  p_click_id text,
  p_user_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral affiliate_referrals%ROWTYPE;
  v_affiliate affiliates%ROWTYPE;
BEGIN
  -- Get referral record
  SELECT * INTO v_referral
  FROM affiliate_referrals
  WHERE click_id = p_click_id
    AND attribution_expires_at > now()
    AND referred_user_id IS NULL; -- Not already used

  IF v_referral.id IS NULL THEN
    RETURN false;
  END IF;

  -- Get affiliate to check for self-referral
  SELECT * INTO v_affiliate FROM affiliates WHERE id = v_referral.affiliate_id;

  -- Check for self-referral
  IF v_affiliate.user_id = p_user_id THEN
    RETURN false; -- Self-referral not allowed
  END IF;

  -- Update referral record
  UPDATE affiliate_referrals
  SET
    referred_user_id = p_user_id,
    referred_organization_id = p_organization_id,
    signup_at = now()
  WHERE id = v_referral.id;

  -- Update affiliate signup count
  UPDATE affiliates
  SET total_signups = total_signups + 1, updated_at = now()
  WHERE id = v_referral.affiliate_id;

  RETURN true;
END;
$$;

-- Process commission for a payment (called by trigger or manually)
CREATE OR REPLACE FUNCTION process_affiliate_commission(
  p_organization_id uuid,
  p_payment_amount_cents integer,
  p_billing_month date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings affiliate_settings%ROWTYPE;
  v_referral affiliate_referrals%ROWTYPE;
  v_commission_cents integer;
  v_commission_id uuid;
  v_billing_month date;
BEGIN
  -- Get settings
  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;

  -- Check if program is active
  IF NOT v_settings.program_active THEN
    RETURN NULL;
  END IF;

  -- Get referral for this organization
  SELECT * INTO v_referral
  FROM affiliate_referrals
  WHERE referred_organization_id = p_organization_id
    AND signup_at IS NOT NULL;

  IF v_referral.id IS NULL THEN
    RETURN NULL; -- No referral found
  END IF;

  -- Check if this is first payment (mark as converted)
  IF NOT v_referral.converted THEN
    UPDATE affiliate_referrals
    SET
      converted = true,
      first_payment_at = now(),
      first_payment_amount_cents = p_payment_amount_cents
    WHERE id = v_referral.id;

    -- Update affiliate paid signups count
    UPDATE affiliates
    SET total_paid_signups = total_paid_signups + 1, updated_at = now()
    WHERE id = v_referral.affiliate_id;
  END IF;

  -- For one-time commissions, only pay on first payment
  IF v_settings.commission_type = 'one_time' AND v_referral.converted THEN
    RETURN NULL;
  END IF;

  -- Check recurring months limit
  IF v_settings.recurring_months IS NOT NULL THEN
    -- Count existing commissions for this referral
    IF (SELECT COUNT(*) FROM affiliate_commissions WHERE referral_id = v_referral.id) >= v_settings.recurring_months THEN
      RETURN NULL; -- Reached maximum recurring months
    END IF;
  END IF;

  -- Calculate commission
  v_commission_cents := (p_payment_amount_cents * v_settings.commission_percentage) / 10000;

  -- Set billing month
  v_billing_month := COALESCE(p_billing_month, date_trunc('month', now())::date);

  -- Create commission record
  INSERT INTO affiliate_commissions (
    affiliate_id, referral_id, billing_month,
    subscription_amount_cents, commission_percentage, commission_amount_cents,
    status
  ) VALUES (
    v_referral.affiliate_id, v_referral.id, v_billing_month,
    p_payment_amount_cents, v_settings.commission_percentage, v_commission_cents,
    'earned'
  )
  RETURNING id INTO v_commission_id;

  -- Update affiliate stats
  UPDATE affiliates
  SET
    total_commission_earned_cents = total_commission_earned_cents + v_commission_cents,
    pending_commission_cents = pending_commission_cents + v_commission_cents,
    updated_at = now()
  WHERE id = v_referral.affiliate_id;

  RETURN v_commission_id;
END;
$$;

-- Request payout
CREATE OR REPLACE FUNCTION request_affiliate_payout(p_affiliate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate affiliates%ROWTYPE;
  v_settings affiliate_settings%ROWTYPE;
  v_pending_amount integer;
  v_commission_count integer;
  v_payout_id uuid;
  v_period_start date;
  v_period_end date;
BEGIN
  -- Verify affiliate ownership
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = p_affiliate_id
    AND user_id = auth.uid()
    AND status = 'approved';

  IF v_affiliate.id IS NULL THEN
    RAISE EXCEPTION 'Invalid affiliate or not approved';
  END IF;

  -- Get settings
  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;

  -- Check minimum payout
  IF v_affiliate.pending_commission_cents < v_settings.minimum_payout_cents THEN
    RAISE EXCEPTION 'Below minimum payout threshold of %', v_settings.minimum_payout_cents / 100;
  END IF;

  -- Get pending commissions
  SELECT
    COALESCE(SUM(commission_amount_cents), 0),
    COUNT(*),
    MIN(billing_month),
    MAX(billing_month)
  INTO v_pending_amount, v_commission_count, v_period_start, v_period_end
  FROM affiliate_commissions
  WHERE affiliate_id = p_affiliate_id
    AND status = 'earned';

  IF v_commission_count = 0 THEN
    RAISE EXCEPTION 'No pending commissions to pay out';
  END IF;

  -- Check payout method is set
  IF v_affiliate.payout_method IS NULL OR v_affiliate.payout_email IS NULL THEN
    RAISE EXCEPTION 'Payout method not configured';
  END IF;

  -- Create payout request
  INSERT INTO affiliate_payouts (
    affiliate_id, amount_cents, commission_count,
    period_start, period_end, payout_method, status
  ) VALUES (
    p_affiliate_id, v_pending_amount, v_commission_count,
    v_period_start, v_period_end, v_affiliate.payout_method, 'pending'
  )
  RETURNING id INTO v_payout_id;

  -- Update commissions to pending_payout
  UPDATE affiliate_commissions
  SET status = 'pending_payout', payout_id = v_payout_id, updated_at = now()
  WHERE affiliate_id = p_affiliate_id AND status = 'earned';

  RETURN v_payout_id;
END;
$$;

-- ============================================
-- 13. Trigger for subscription payments
-- ============================================

CREATE OR REPLACE FUNCTION trigger_affiliate_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process paid subscription payments
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    PERFORM process_affiliate_commission(
      NEW.organization_id,
      NEW.amount_cents,
      NEW.billing_period_start::date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if subscription_payments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_payments') THEN
    DROP TRIGGER IF EXISTS trigger_affiliate_commission_on_payment ON subscription_payments;
    CREATE TRIGGER trigger_affiliate_commission_on_payment
      AFTER INSERT OR UPDATE ON subscription_payments
      FOR EACH ROW EXECUTE FUNCTION trigger_affiliate_commission();
  END IF;
END $$;

-- ============================================
-- 14. Update timestamp triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_affiliate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_affiliates_updated_at ON affiliates;
CREATE TRIGGER trigger_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_updated_at();

DROP TRIGGER IF EXISTS trigger_affiliate_settings_updated_at ON affiliate_settings;
CREATE TRIGGER trigger_affiliate_settings_updated_at
  BEFORE UPDATE ON affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_updated_at();

DROP TRIGGER IF EXISTS trigger_affiliate_commissions_updated_at ON affiliate_commissions;
CREATE TRIGGER trigger_affiliate_commissions_updated_at
  BEFORE UPDATE ON affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_updated_at();

DROP TRIGGER IF EXISTS trigger_affiliate_payouts_updated_at ON affiliate_payouts;
CREATE TRIGGER trigger_affiliate_payouts_updated_at
  BEFORE UPDATE ON affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_updated_at();

-- ============================================
-- 15. Grant permissions
-- ============================================

GRANT SELECT ON affiliate_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON affiliates TO authenticated;
GRANT SELECT, INSERT ON affiliate_referrals TO authenticated;
GRANT SELECT ON affiliate_commissions TO authenticated;
GRANT SELECT, INSERT ON affiliate_payouts TO authenticated;

GRANT EXECUTE ON FUNCTION generate_affiliate_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_click_id() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_affiliate_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_affiliate_click(text, text, text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_affiliate_signup(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_affiliate_commission(uuid, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION request_affiliate_payout(uuid) TO authenticated;
