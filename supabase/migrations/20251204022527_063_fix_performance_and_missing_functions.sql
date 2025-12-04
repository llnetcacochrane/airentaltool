/*
  # Fix Performance Issues and Missing Functions

  1. Add Missing Functions
    - user_has_completed_onboarding
    
  2. Fix RLS Policies
    - Optimize leases table RLS (causing timeouts)
    - Optimize rent_payments table RLS (causing timeouts)
    
  3. Add Missing Indexes
    - Add indexes to speed up common queries

  4. Notes
    - The leases->tenants relationship issue will be handled in app code
    - RLS policies simplified to avoid recursive checks
*/

-- Add missing user_has_completed_onboarding function
CREATE OR REPLACE FUNCTION user_has_completed_onboarding()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_profile boolean;
  v_has_portfolio boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has a profile
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE user_id = v_user_id
  ) INTO v_has_profile;

  -- Check if user has at least one portfolio
  SELECT EXISTS(
    SELECT 1 FROM portfolios 
    WHERE user_id = v_user_id
  ) INTO v_has_portfolio;

  RETURN v_has_profile AND v_has_portfolio;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_completed_onboarding() TO authenticated;

-- Optimize leases table RLS policies by removing recursive checks
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leases in their portfolio" ON leases;
DROP POLICY IF EXISTS "Users can create leases in their portfolio" ON leases;
DROP POLICY IF EXISTS "Users can update leases in their portfolio" ON leases;
DROP POLICY IF EXISTS "Users can delete leases in their portfolio" ON leases;

-- Create simpler, faster policies
CREATE POLICY "Users can view leases in their portfolio"
  ON leases FOR SELECT
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leases in their portfolio"
  ON leases FOR INSERT
  TO authenticated
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leases in their portfolio"
  ON leases FOR UPDATE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leases in their portfolio"
  ON leases FOR DELETE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Optimize rent_payments RLS policies
DROP POLICY IF EXISTS "Users can view rent payments in their portfolio" ON rent_payments;
DROP POLICY IF EXISTS "Users can create rent payments in their portfolio" ON rent_payments;
DROP POLICY IF EXISTS "Users can update rent payments in their portfolio" ON rent_payments;
DROP POLICY IF EXISTS "Users can delete rent payments in their portfolio" ON rent_payments;

CREATE POLICY "Users can view rent payments in their portfolio"
  ON rent_payments FOR SELECT
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rent payments in their portfolio"
  ON rent_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rent payments in their portfolio"
  ON rent_payments FOR UPDATE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rent payments in their portfolio"
  ON rent_payments FOR DELETE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_leases_portfolio_id_status ON leases(portfolio_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_portfolio_id_end_date ON leases(portfolio_id, end_date);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_portfolio_id_date ON rent_payments(portfolio_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON rent_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_payment_date ON payment_schedules(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_is_paid ON payment_schedules(is_paid);
CREATE INDEX IF NOT EXISTS idx_expenses_portfolio_id_date ON expenses(portfolio_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_portfolio_id_status ON maintenance_requests(portfolio_id, status);

-- Add index on portfolios for faster user lookups
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- Analyze tables to update statistics
ANALYZE leases;
ANALYZE rent_payments;
ANALYZE payment_schedules;
ANALYZE expenses;
ANALYZE maintenance_requests;
ANALYZE portfolios;
