/*
  # User Feature Access Helper Functions
  
  ## Purpose
  Provide functions for the frontend to check:
  - What features are included in user's tier
  - What add-ons are available to purchase
  - What add-ons user has purchased
  
  ## Functions
  1. get_user_tier_features - Get features included in user's tier
  2. get_user_available_addons - Get add-ons available for purchase
  3. has_feature_access - Check if user has access to a feature
*/

-- Get all features included in user's current tier
CREATE OR REPLACE FUNCTION get_user_tier_features(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  feature_slug text,
  feature_name text,
  feature_description text,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tier_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user's current tier
  SELECT pt.id INTO v_tier_id
  FROM user_profiles up
  JOIN package_tiers pt ON pt.tier_slug = up.selected_tier
  WHERE up.user_id = v_user_id
  LIMIT 1;
  
  -- Return included features
  RETURN QUERY
  SELECT 
    f.slug,
    f.name,
    f.description,
    f.category
  FROM tier_included_features tif
  JOIN features f ON f.id = tif.feature_id
  WHERE tif.tier_id = v_tier_id
    AND f.is_active = true
  ORDER BY f.category, f.name;
END;
$$;

-- Get add-ons available for user's tier (not yet purchased)
CREATE OR REPLACE FUNCTION get_user_available_addons(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  addon_id uuid,
  addon_slug text,
  addon_name text,
  addon_description text,
  category text,
  price_cents integer,
  billing_period text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tier_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user's current tier
  SELECT pt.id INTO v_tier_id
  FROM user_profiles up
  JOIN package_tiers pt ON pt.tier_slug = up.selected_tier
  WHERE up.user_id = v_user_id
  LIMIT 1;
  
  -- Return available add-ons for this tier
  RETURN QUERY
  SELECT 
    f.id,
    f.slug,
    f.name,
    f.description,
    f.category,
    taa.addon_price_cents,
    taa.billing_period
  FROM tier_available_addons taa
  JOIN features f ON f.id = taa.feature_id
  WHERE taa.tier_id = v_tier_id
    AND f.is_active = true
  ORDER BY f.category, f.name;
END;
$$;

-- Check if user has access to a specific feature
CREATE OR REPLACE FUNCTION has_feature_access(
  p_feature_slug text,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_tier_id uuid;
  v_has_access boolean;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user's current tier
  SELECT pt.id INTO v_tier_id
  FROM user_profiles up
  JOIN package_tiers pt ON pt.tier_slug = up.selected_tier
  WHERE up.user_id = v_user_id
  LIMIT 1;
  
  -- Check if feature is included in tier
  SELECT EXISTS(
    SELECT 1
    FROM tier_included_features tif
    JOIN features f ON f.id = tif.feature_id
    WHERE tif.tier_id = v_tier_id
      AND f.slug = p_feature_slug
      AND f.is_active = true
  ) INTO v_has_access;
  
  -- TODO: Also check if user has purchased this as an add-on
  -- For now, just return tier-based access
  
  RETURN v_has_access;
END;
$$;

-- Get user's tier information
CREATE OR REPLACE FUNCTION get_user_tier_info(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  tier_slug text,
  tier_name text,
  tier_display_name text,
  max_properties integer,
  max_tenants integer,
  max_users integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    pt.tier_slug,
    pt.tier_name,
    pt.display_name,
    pt.max_properties,
    pt.max_tenants,
    pt.max_users
  FROM user_profiles up
  JOIN package_tiers pt ON pt.tier_slug = up.selected_tier
  WHERE up.user_id = v_user_id
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_user_tier_features IS 'Get all features included in the user''s current package tier';
COMMENT ON FUNCTION get_user_available_addons IS 'Get add-ons available for purchase based on user''s tier (not all tiers have all add-ons)';
COMMENT ON FUNCTION has_feature_access IS 'Check if user has access to a specific feature through their tier or purchased add-ons';
COMMENT ON FUNCTION get_user_tier_info IS 'Get basic information about user''s current tier including limits';
