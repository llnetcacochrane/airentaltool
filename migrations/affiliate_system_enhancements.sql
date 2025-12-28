-- Affiliate System Enhancements
-- Additional safety constraints and atomic operations
-- Created: 2025-12-28

-- ============================================
-- 1. Add unique constraint on (referral_id, billing_month)
-- ============================================
-- Prevents duplicate commissions for the same referral in the same billing period

CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_referral_month_unique
ON affiliate_commissions(referral_id, billing_month);

-- ============================================
-- 2. Update org-based process_affiliate_commission with FOR UPDATE
-- ============================================
-- Add row locking for consistency with the referral-based version

CREATE OR REPLACE FUNCTION process_affiliate_commission(
  p_organization_id uuid,
  p_payment_amount_cents integer,
  p_billing_month date
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
  v_billing_month_text text;
BEGIN
  -- Convert billing_month to text format
  v_billing_month_text := to_char(p_billing_month, 'YYYY-MM');

  -- Find the referral for this organization
  SELECT * INTO v_referral
  FROM affiliate_referrals
  WHERE referred_organization_id = p_organization_id
  AND converted = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get affiliate with row lock to prevent race conditions
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
      WHERE referral_id = v_referral.id
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
    WHERE referral_id = v_referral.id
    AND billing_month = v_billing_month_text
  ) THEN
    RETURN NULL;
  END IF;

  -- Calculate commission
  v_commission_amount := (p_payment_amount_cents * v_settings.commission_percentage) / 10000;

  -- Create commission record
  INSERT INTO affiliate_commissions (
    affiliate_id,
    referral_id,
    billing_month,
    subscription_amount_cents,
    commission_percentage,
    commission_amount_cents,
    status
  ) VALUES (
    v_affiliate.id,
    v_referral.id,
    v_billing_month_text,
    p_payment_amount_cents,
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
-- 3. Create atomic complete_affiliate_payout function
-- ============================================
-- Handles the entire payout completion in a single transaction

CREATE OR REPLACE FUNCTION complete_affiliate_payout(
  p_payout_id uuid,
  p_transaction_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout affiliate_payouts%ROWTYPE;
  v_affiliate affiliates%ROWTYPE;
  v_result json;
BEGIN
  -- Get and lock payout
  SELECT * INTO v_payout
  FROM affiliate_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;

  IF v_payout.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Payout cannot be completed - invalid status: %', v_payout.status;
  END IF;

  -- Get and lock affiliate
  SELECT * INTO v_affiliate
  FROM affiliates
  WHERE id = v_payout.affiliate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;

  -- Update payout status
  UPDATE affiliate_payouts
  SET
    status = 'completed',
    transaction_id = p_transaction_id,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payout_id;

  -- Update all linked commissions to paid
  UPDATE affiliate_commissions
  SET
    status = 'paid',
    updated_at = now()
  WHERE payout_id = p_payout_id;

  -- Update affiliate totals atomically
  UPDATE affiliates
  SET
    total_commission_paid_cents = total_commission_paid_cents + v_payout.amount_cents,
    pending_commission_cents = GREATEST(0, pending_commission_cents - v_payout.amount_cents),
    updated_at = now()
  WHERE id = v_payout.affiliate_id;

  -- Return updated payout
  SELECT json_build_object(
    'id', p.id,
    'affiliate_id', p.affiliate_id,
    'amount_cents', p.amount_cents,
    'status', p.status,
    'transaction_id', p.transaction_id,
    'processed_at', p.processed_at,
    'payout_method', p.payout_method
  ) INTO v_result
  FROM affiliate_payouts p
  WHERE p.id = p_payout_id;

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. Create fail_affiliate_payout function
-- ============================================
-- Handles payout failure atomically

CREATE OR REPLACE FUNCTION fail_affiliate_payout(
  p_payout_id uuid,
  p_failure_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout affiliate_payouts%ROWTYPE;
  v_result json;
BEGIN
  -- Get and lock payout
  SELECT * INTO v_payout
  FROM affiliate_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;

  IF v_payout.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Payout cannot be failed - invalid status: %', v_payout.status;
  END IF;

  -- Update payout status
  UPDATE affiliate_payouts
  SET
    status = 'failed',
    failure_reason = p_failure_reason,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payout_id;

  -- Revert commissions back to earned status
  UPDATE affiliate_commissions
  SET
    status = 'earned',
    payout_id = NULL,
    updated_at = now()
  WHERE payout_id = p_payout_id;

  -- Return updated payout
  SELECT json_build_object(
    'id', p.id,
    'affiliate_id', p.affiliate_id,
    'amount_cents', p.amount_cents,
    'status', p.status,
    'failure_reason', p.failure_reason,
    'processed_at', p.processed_at
  ) INTO v_result
  FROM affiliate_payouts p
  WHERE p.id = p_payout_id;

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. Create cancel_affiliate_payout function
-- ============================================

CREATE OR REPLACE FUNCTION cancel_affiliate_payout(p_payout_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout affiliate_payouts%ROWTYPE;
  v_result json;
BEGIN
  -- Get and lock payout
  SELECT * INTO v_payout
  FROM affiliate_payouts
  WHERE id = p_payout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;

  IF v_payout.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Payout cannot be cancelled - invalid status: %', v_payout.status;
  END IF;

  -- Update payout status
  UPDATE affiliate_payouts
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_payout_id;

  -- Revert commissions back to earned status
  UPDATE affiliate_commissions
  SET
    status = 'earned',
    payout_id = NULL,
    updated_at = now()
  WHERE payout_id = p_payout_id;

  -- Return updated payout
  SELECT json_build_object(
    'id', p.id,
    'affiliate_id', p.affiliate_id,
    'amount_cents', p.amount_cents,
    'status', p.status
  ) INTO v_result
  FROM affiliate_payouts p
  WHERE p.id = p_payout_id;

  RETURN v_result;
END;
$$;

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION process_affiliate_commission(uuid, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_affiliate_payout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION fail_affiliate_payout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_affiliate_payout(uuid) TO authenticated;
