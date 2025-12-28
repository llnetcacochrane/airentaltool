-- Affiliate System Fixes
-- Addresses race conditions and adds missing constraints
-- Created: 2025-12-28

-- ============================================
-- 1. Add unique constraint on referred_organization_id
-- ============================================
-- Ensures an organization can only be referred by one affiliate

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_org_unique
ON affiliate_referrals(referred_organization_id)
WHERE referred_organization_id IS NOT NULL;

-- ============================================
-- 2. Update request_affiliate_payout to prevent race conditions
-- ============================================
-- Drop and recreate with race condition protection

CREATE OR REPLACE FUNCTION request_affiliate_payout(p_affiliate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate affiliates%ROWTYPE;
  v_settings affiliate_settings%ROWTYPE;
  v_payout_id uuid;
  v_total_amount integer := 0;
BEGIN
  -- Lock the affiliate row to prevent concurrent payout requests
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = p_affiliate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;

  -- Get settings
  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;

  -- Check for existing pending payout (race condition protection)
  IF EXISTS (
    SELECT 1 FROM affiliate_payouts
    WHERE affiliate_id = p_affiliate_id
    AND status IN ('pending', 'approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'A payout request is already pending';
  END IF;

  -- Check minimum payout threshold
  IF v_affiliate.pending_commission_cents < v_settings.minimum_payout_cents THEN
    RAISE EXCEPTION 'Balance below minimum payout threshold';
  END IF;

  -- Calculate total from earned commissions
  SELECT COALESCE(SUM(commission_amount_cents), 0) INTO v_total_amount
  FROM affiliate_commissions
  WHERE affiliate_id = p_affiliate_id
  AND status = 'earned';

  IF v_total_amount <= 0 THEN
    RAISE EXCEPTION 'No commissions available for payout';
  END IF;

  -- Create payout request
  INSERT INTO affiliate_payouts (
    affiliate_id,
    amount_cents,
    payout_method,
    status,
    requested_at,
    period_start,
    period_end
  ) VALUES (
    p_affiliate_id,
    v_total_amount,
    v_affiliate.payout_method,
    'pending',
    now(),
    (SELECT MIN(created_at) FROM affiliate_commissions WHERE affiliate_id = p_affiliate_id AND status = 'earned'),
    now()
  ) RETURNING id INTO v_payout_id;

  -- Update commission statuses to pending_payout and link to payout
  UPDATE affiliate_commissions
  SET status = 'pending_payout', payout_id = v_payout_id, updated_at = now()
  WHERE affiliate_id = p_affiliate_id
  AND status = 'earned';

  RETURN v_payout_id;
END;
$$;

-- ============================================
-- 3. Add check for existing pending payout in process_affiliate_commission
-- ============================================
-- This ensures commissions aren't added to an in-progress payout

CREATE OR REPLACE FUNCTION process_affiliate_commission(
  p_referral_id uuid,
  p_subscription_payment_id uuid,
  p_subscription_amount_cents integer,
  p_billing_month text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral affiliate_referrals%ROWTYPE;
  v_affiliate affiliates%ROWTYPE;
  v_settings affiliate_settings%ROWTYPE;
  v_commission_amount integer;
  v_commission_id uuid;
  v_months_since_signup integer;
BEGIN
  -- Get referral
  SELECT * INTO v_referral FROM affiliate_referrals WHERE id = p_referral_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Must be converted to earn commission
  IF NOT v_referral.converted THEN
    RETURN NULL;
  END IF;

  -- Get affiliate (with lock to prevent race conditions)
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = v_referral.affiliate_id
  FOR UPDATE;

  IF NOT FOUND OR v_affiliate.status != 'approved' THEN
    RETURN NULL;
  END IF;

  -- Get settings
  SELECT * INTO v_settings FROM affiliate_settings LIMIT 1;

  -- For one-time commissions, check if already paid
  IF v_settings.commission_type = 'one_time' THEN
    IF EXISTS (
      SELECT 1 FROM affiliate_commissions
      WHERE referral_id = p_referral_id
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- For recurring commissions, check if within the recurring period
  IF v_settings.commission_type = 'recurring' AND v_settings.recurring_months IS NOT NULL THEN
    v_months_since_signup := EXTRACT(MONTH FROM age(now(), v_referral.signup_at))::integer +
                             (EXTRACT(YEAR FROM age(now(), v_referral.signup_at))::integer * 12);
    IF v_months_since_signup >= v_settings.recurring_months THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Check for duplicate commission for this billing month
  IF EXISTS (
    SELECT 1 FROM affiliate_commissions
    WHERE referral_id = p_referral_id
    AND billing_month = p_billing_month
  ) THEN
    RETURN NULL;
  END IF;

  -- Calculate commission
  v_commission_amount := (p_subscription_amount_cents * v_settings.commission_percentage) / 10000;

  -- Create commission record
  INSERT INTO affiliate_commissions (
    affiliate_id,
    referral_id,
    subscription_payment_id,
    billing_month,
    subscription_amount_cents,
    commission_percentage,
    commission_amount_cents,
    status
  ) VALUES (
    v_affiliate.id,
    p_referral_id,
    p_subscription_payment_id,
    p_billing_month,
    p_subscription_amount_cents,
    v_settings.commission_percentage,
    v_commission_amount,
    'earned'
  ) RETURNING id INTO v_commission_id;

  -- Update affiliate stats
  UPDATE affiliates
  SET
    total_commission_earned_cents = total_commission_earned_cents + v_commission_amount,
    pending_commission_cents = pending_commission_cents + v_commission_amount,
    updated_at = now()
  WHERE id = v_affiliate.id;

  RETURN v_commission_id;
END;
$$;

-- ============================================
-- 4. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION request_affiliate_payout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_affiliate_commission(uuid, uuid, integer, text) TO authenticated;
