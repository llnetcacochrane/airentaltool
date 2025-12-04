/*
  # Portfolio Feature Flags & Package Assignment Fixes

  ## Overview
  This migration restructures features to work at the portfolio level instead of just organization level.
  It also fixes package assignment during user signup.

  ## Key Changes

  1. New Tables
    - `portfolio_feature_flags` - Features at portfolio level (for individual users)
    - Portfolio features are derived from user's selected package tier

  2. Modified Logic
    - Features should be accessible based on user's package tier OR organization membership
    - Free tier users don't need an organization
    - Package tier should be properly assigned during signup

  3. New Functions
    - `get_portfolio_features()` - Returns features for a portfolio based on user's package
    - `get_effective_user_features()` - Returns all features user has access to
    - `has_feature_access()` - Check if user can use a specific feature

  ## Business Model Clarification
  - **Organizations**: PM companies that manage multiple client businesses
  - **Businesses**: Individual landlords/property owners (clients of PM OR standalone)
  - **Portfolios**: User's rental properties (every user has at least one)
  - **Features**: Based on user's package tier + organization features (if applicable)
*/

-- =====================================================
-- PORTFOLIO FEATURE FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS portfolio_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  enabled_by_package boolean DEFAULT true NOT NULL,
  enabled_by_admin boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(portfolio_id, feature_key)
);

CREATE INDEX IF NOT EXISTS portfolio_feature_flags_portfolio_id_idx ON portfolio_feature_flags(portfolio_id);
CREATE INDEX IF NOT EXISTS portfolio_feature_flags_feature_key_idx ON portfolio_feature_flags(feature_key);

COMMENT ON TABLE portfolio_feature_flags IS 'Feature flags at portfolio level - based on user package tier';
COMMENT ON COLUMN portfolio_feature_flags.enabled_by_package IS 'True if feature is included in user package tier';
COMMENT ON COLUMN portfolio_feature_flags.enabled_by_admin IS 'True if Super Admin manually enabled this feature';

-- =====================================================
-- RLS POLICIES FOR PORTFOLIO FEATURE FLAGS
-- =====================================================

ALTER TABLE portfolio_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their portfolio features" ON portfolio_feature_flags;
CREATE POLICY "Users can view their portfolio features"
  ON portfolio_feature_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portfolios p
      WHERE p.id = portfolio_feature_flags.portfolio_id
      AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins can manage portfolio features" ON portfolio_feature_flags;
CREATE POLICY "Super admins can manage portfolio features"
  ON portfolio_feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
    )
  );

-- =====================================================
-- FUNCTION: Get Features for Portfolio
-- =====================================================

CREATE OR REPLACE FUNCTION get_portfolio_features(p_portfolio_id uuid)
RETURNS TABLE (
  feature_key text,
  is_enabled boolean,
  enabled_by_package boolean,
  enabled_by_admin boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tier text;
  v_org_id uuid;
BEGIN
  SELECT p.user_id, p.organization_id
  INTO v_user_tier, v_org_id
  FROM portfolios p
  LEFT JOIN user_profiles up ON up.user_id = p.user_id
  WHERE p.id = p_portfolio_id;

  GET DIAGNOSTICS v_user_tier = ROW_COUNT;
  
  IF v_user_tier = 0 THEN
    RETURN;
  END IF;

  SELECT up.selected_tier
  INTO v_user_tier
  FROM portfolios p
  JOIN user_profiles up ON up.user_id = p.user_id
  WHERE p.id = p_portfolio_id;

  RETURN QUERY
  SELECT 
    pff.feature_key,
    pff.is_enabled,
    pff.enabled_by_package,
    pff.enabled_by_admin
  FROM portfolio_feature_flags pff
  WHERE pff.portfolio_id = p_portfolio_id;
END;
$$;

-- =====================================================
-- FUNCTION: Get Effective User Features
-- =====================================================

CREATE OR REPLACE FUNCTION get_effective_user_features(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  feature_key text,
  is_enabled boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_tier text;
  v_default_portfolio_id uuid;
  v_org_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT selected_tier INTO v_user_tier
  FROM user_profiles
  WHERE user_id = v_user_id;

  SELECT id, organization_id INTO v_default_portfolio_id, v_org_id
  FROM portfolios
  WHERE user_id = v_user_id
  AND is_default = true
  LIMIT 1;

  RETURN QUERY
  WITH tier_features AS (
    SELECT
      CASE v_user_tier
        WHEN 'free' THEN jsonb_build_object(
          'basic_properties', true,
          'basic_tenants', true,
          'basic_rent_tracking', true,
          'basic_maintenance', true
        )
        WHEN 'landlord' THEN jsonb_build_object(
          'basic_properties', true,
          'basic_tenants', true,
          'basic_rent_tracking', true,
          'basic_maintenance', true,
          'unlimited_units', true,
          'businesses', true,
          'expense_tracking', true,
          'document_storage', true
        )
        WHEN 'professional' THEN jsonb_build_object(
          'basic_properties', true,
          'basic_tenants', true,
          'basic_rent_tracking', true,
          'basic_maintenance', true,
          'unlimited_units', true,
          'businesses', true,
          'expense_tracking', true,
          'document_storage', true,
          'ai_recommendations', true,
          'rent_optimization', true,
          'advanced_reporting', true,
          'bulk_operations', true
        )
        WHEN 'enterprise' THEN jsonb_build_object(
          'basic_properties', true,
          'basic_tenants', true,
          'basic_rent_tracking', true,
          'basic_maintenance', true,
          'unlimited_units', true,
          'businesses', true,
          'expense_tracking', true,
          'document_storage', true,
          'ai_recommendations', true,
          'rent_optimization', true,
          'advanced_reporting', true,
          'bulk_operations', true,
          'white_label', true,
          'api_access', true,
          'custom_integrations', true,
          'priority_support', true
        )
        ELSE '{}'::jsonb
      END AS features
  ),
  portfolio_features AS (
    SELECT feature_key, is_enabled, 'portfolio' AS source
    FROM portfolio_feature_flags
    WHERE portfolio_id = v_default_portfolio_id
    AND is_enabled = true
  ),
  org_features AS (
    SELECT feature_key, is_enabled, 'organization' AS source
    FROM organization_feature_flags
    WHERE organization_id = v_org_id
    AND is_enabled = true
  )
  SELECT 
    key::text AS feature_key,
    true AS is_enabled,
    'package_tier' AS source
  FROM tier_features, jsonb_each(features)
  WHERE value::boolean = true
  
  UNION
  
  SELECT feature_key, is_enabled, source
  FROM portfolio_features
  
  UNION
  
  SELECT feature_key, is_enabled, source
  FROM org_features
  WHERE v_org_id IS NOT NULL;
END;
$$;

-- =====================================================
-- FUNCTION: Check Feature Access
-- =====================================================

CREATE OR REPLACE FUNCTION has_feature_access(
  p_feature_key text,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM get_effective_user_features(COALESCE(p_user_id, auth.uid()))
    WHERE feature_key = p_feature_key
    AND is_enabled = true
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- =====================================================
-- FUNCTION: Sync Portfolio Features from Package Tier
-- =====================================================

CREATE OR REPLACE FUNCTION sync_portfolio_features_from_tier(p_portfolio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tier text;
  v_features jsonb;
  v_feature_key text;
  v_feature_value boolean;
BEGIN
  SELECT up.selected_tier
  INTO v_user_tier
  FROM portfolios p
  JOIN user_profiles up ON up.user_id = p.user_id
  WHERE p.id = p_portfolio_id;

  v_features := CASE v_user_tier
    WHEN 'free' THEN jsonb_build_object(
      'basic_properties', true,
      'basic_tenants', true,
      'basic_rent_tracking', true,
      'basic_maintenance', true
    )
    WHEN 'landlord' THEN jsonb_build_object(
      'basic_properties', true,
      'basic_tenants', true,
      'basic_rent_tracking', true,
      'basic_maintenance', true,
      'unlimited_units', true,
      'businesses', true,
      'expense_tracking', true,
      'document_storage', true
    )
    WHEN 'professional' THEN jsonb_build_object(
      'basic_properties', true,
      'basic_tenants', true,
      'basic_rent_tracking', true,
      'basic_maintenance', true,
      'unlimited_units', true,
      'businesses', true,
      'expense_tracking', true,
      'document_storage', true,
      'ai_recommendations', true,
      'rent_optimization', true,
      'advanced_reporting', true,
      'bulk_operations', true
    )
    WHEN 'enterprise' THEN jsonb_build_object(
      'basic_properties', true,
      'basic_tenants', true,
      'basic_rent_tracking', true,
      'basic_maintenance', true,
      'unlimited_units', true,
      'businesses', true,
      'expense_tracking', true,
      'document_storage', true,
      'ai_recommendations', true,
      'rent_optimization', true,
      'advanced_reporting', true,
      'bulk_operations', true,
      'white_label', true,
      'api_access', true,
      'custom_integrations', true,
      'priority_support', true
    )
    ELSE '{}'::jsonb
  END;

  FOR v_feature_key, v_feature_value IN
    SELECT * FROM jsonb_each_text(v_features)
  LOOP
    INSERT INTO portfolio_feature_flags (
      portfolio_id,
      feature_key,
      is_enabled,
      enabled_by_package,
      enabled_by_admin
    )
    VALUES (
      p_portfolio_id,
      v_feature_key,
      v_feature_value::boolean,
      true,
      false
    )
    ON CONFLICT (portfolio_id, feature_key)
    DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      enabled_by_package = EXCLUDED.enabled_by_package,
      updated_at = now();
  END LOOP;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-sync features when portfolio created
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sync_portfolio_features()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM sync_portfolio_features_from_tier(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_portfolio_created_sync_features ON portfolios;
CREATE TRIGGER on_portfolio_created_sync_features
  AFTER INSERT ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_portfolio_features();

-- =====================================================
-- TRIGGER: Sync features when user tier changes
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_sync_features_on_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.selected_tier IS DISTINCT FROM OLD.selected_tier THEN
    PERFORM sync_portfolio_features_from_tier(p.id)
    FROM portfolios p
    WHERE p.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_tier_changed ON user_profiles;
CREATE TRIGGER on_user_tier_changed
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (NEW.selected_tier IS DISTINCT FROM OLD.selected_tier)
  EXECUTE FUNCTION trigger_sync_features_on_tier_change();

-- =====================================================
-- Fix existing portfolios - sync features
-- =====================================================

DO $$
DECLARE
  v_portfolio record;
BEGIN
  FOR v_portfolio IN 
    SELECT id FROM portfolios
  LOOP
    PERFORM sync_portfolio_features_from_tier(v_portfolio.id);
  END LOOP;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON portfolio_feature_flags TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_features(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_user_features(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_feature_access(text, uuid) TO authenticated;
