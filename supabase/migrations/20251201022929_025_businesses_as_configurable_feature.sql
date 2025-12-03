/*
  # Businesses as Configurable Feature

  ## Overview
  This migration reconfigures the business model:
  1. **Professional tier**: Changed from 3 businesses to 1 business (single large operation)
  2. **Businesses become optional**: Added as a feature flag
  3. **Multiple businesses**: Available as pay-as-you-go addon
  
  ## Changes
  1. Update Professional tier to max_businesses = 1
  2. Add 'multiple_businesses' feature flag to packages
  3. Create 'Additional Business' addon product for pay-as-you-go
  4. Add helper function to check if businesses feature is enabled
  
  ## Tier Structure
  - **Basic**: 1 business (included)
  - **Professional**: 1 business (designed for single large operation)
  - **Enterprise**: Unlimited businesses
  - **Addon**: Additional businesses available as pay-as-you-go
  
  ## Feature Flags
  - `multiple_businesses`: Whether organization can have multiple businesses
  - This can be enabled via package tier or addon
*/

-- =====================================================
-- STEP 1: Update Professional Tier to Single Business
-- =====================================================

UPDATE package_tiers SET
  max_businesses = 1,
  features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{multiple_businesses}',
    'false'
  )
WHERE tier_slug = 'professional';

COMMENT ON COLUMN package_tiers.max_businesses IS 'Maximum number of separate business entities (for accounting separation)';

-- Update Basic tier feature flag
UPDATE package_tiers SET
  features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{multiple_businesses}',
    'false'
  )
WHERE tier_slug = 'basic';

-- Update Enterprise tier feature flag
UPDATE package_tiers SET
  features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{multiple_businesses}',
    'true'
  )
WHERE tier_slug = 'enterprise';

-- =====================================================
-- STEP 2: Create Additional Business Addon Product
-- =====================================================

INSERT INTO addon_products (
  addon_type,
  display_name,
  description,
  monthly_price_cents,
  is_active
) VALUES (
  'business',
  'Additional Business',
  'Add separate business entities for accounting separation. Perfect for managing multiple LLCs or corporations under one organization.',
  2500,
  true
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: Update Usage Calculation Functions
-- =====================================================

-- Update the get_organization_limits function to properly handle business addons
CREATE OR REPLACE FUNCTION get_organization_limits(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
  base_limits record;
  addon_businesses integer;
  addon_properties integer;
  addon_units integer;
  addon_tenants integer;
  addon_team_members integer;
BEGIN
  -- Get base package limits
  SELECT 
    COALESCE(ops.custom_max_businesses, pt.max_businesses, 1) as max_businesses,
    COALESCE(ops.custom_max_properties, pt.max_properties, 5) as max_properties,
    COALESCE(ops.custom_max_units, pt.max_units, 10) as max_units,
    COALESCE(ops.custom_max_tenants, pt.max_tenants, 10) as max_tenants,
    COALESCE(ops.custom_max_users, pt.max_users, 1) as max_users,
    COALESCE(pt.features, '{}'::jsonb) as features
  INTO base_limits
  FROM organizations o
  LEFT JOIN organization_package_settings ops ON ops.organization_id = o.id
  LEFT JOIN package_tiers pt ON pt.id = ops.package_tier_id
  WHERE o.id = org_id;

  -- Get addon quantities
  SELECT 
    COALESCE(SUM(CASE WHEN ap.addon_type = 'business' AND oap.status = 'active' THEN oap.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ap.addon_type = 'property' AND oap.status = 'active' THEN oap.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ap.addon_type = 'unit' AND oap.status = 'active' THEN oap.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ap.addon_type = 'tenant' AND oap.status = 'active' THEN oap.quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ap.addon_type = 'team_member' AND oap.status = 'active' THEN oap.quantity ELSE 0 END), 0)
  INTO addon_businesses, addon_properties, addon_units, addon_tenants, addon_team_members
  FROM organization_addon_purchases oap
  JOIN addon_products ap ON ap.id = oap.addon_product_id
  WHERE oap.organization_id = org_id;

  -- Build result with base + addons
  result := jsonb_build_object(
    'max_businesses', COALESCE(base_limits.max_businesses, 1) + addon_businesses,
    'max_properties', COALESCE(base_limits.max_properties, 5) + addon_properties,
    'max_units', COALESCE(base_limits.max_units, 10) + addon_units,
    'max_tenants', COALESCE(base_limits.max_tenants, 10) + addon_tenants,
    'max_team_members', COALESCE(base_limits.max_users, 1) + addon_team_members,
    'features', COALESCE(base_limits.features, '{}'::jsonb)
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_organization_limits IS 'Calculate total limits for an organization including base package and addons';

-- =====================================================
-- STEP 4: Helper Function to Check Business Creation
-- =====================================================

CREATE OR REPLACE FUNCTION can_create_additional_business(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_count integer;
  limits jsonb;
  max_allowed integer;
BEGIN
  -- Get current business count
  SELECT COUNT(*) INTO current_count
  FROM businesses
  WHERE organization_id = org_id
    AND is_active = true;

  -- Get limits
  limits := get_organization_limits(org_id);
  max_allowed := (limits->>'max_businesses')::int;

  -- Return true if under limit
  RETURN current_count < max_allowed;
END;
$$;

COMMENT ON FUNCTION can_create_additional_business IS 'Check if organization can create another business entity';

-- =====================================================
-- STEP 5: Enforce Business Limits with Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_business_limits()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  limits jsonb;
  max_allowed integer;
BEGIN
  -- Only check on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Get current count (excluding the one being inserted)
    SELECT COUNT(*) INTO current_count
    FROM businesses
    WHERE organization_id = NEW.organization_id
      AND is_active = true;

    -- Get limits
    limits := get_organization_limits(NEW.organization_id);
    max_allowed := (limits->>'max_businesses')::int;

    -- Check if limit exceeded
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Business limit exceeded. Your plan allows % business(es). Upgrade or purchase additional business addon.', max_allowed
        USING HINT = 'Contact support or visit the Add-ons page to increase your limit';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_business_limits ON businesses;
CREATE TRIGGER trigger_enforce_business_limits
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_business_limits();

COMMENT ON TRIGGER trigger_enforce_business_limits ON businesses IS 'Enforces business count limits based on package and addons';

-- =====================================================
-- STEP 6: Update Usage Summary Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_organization_usage_summary(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  usage_data jsonb;
  limits_data jsonb;
BEGIN
  limits_data := get_organization_limits(org_id);
  
  SELECT jsonb_build_object(
    'businesses', jsonb_build_object(
      'current', (SELECT COUNT(*) FROM businesses WHERE organization_id = org_id AND is_active = true),
      'limit', (limits_data->>'max_businesses')::int,
      'percentage', CASE 
        WHEN (limits_data->>'max_businesses')::int > 0 
        THEN ROUND((SELECT COUNT(*) FROM businesses WHERE organization_id = org_id AND is_active = true)::numeric / (limits_data->>'max_businesses')::int * 100, 0)
        ELSE 0 
      END
    ),
    'properties', jsonb_build_object(
      'current', (SELECT COUNT(*) FROM properties WHERE organization_id = org_id),
      'limit', (limits_data->>'max_properties')::int,
      'percentage', CASE 
        WHEN (limits_data->>'max_properties')::int > 0 
        THEN ROUND((SELECT COUNT(*) FROM properties WHERE organization_id = org_id)::numeric / (limits_data->>'max_properties')::int * 100, 0)
        ELSE 0 
      END
    ),
    'units', jsonb_build_object(
      'current', (SELECT COUNT(*) FROM units WHERE organization_id = org_id AND is_active = true),
      'limit', (limits_data->>'max_units')::int,
      'percentage', CASE 
        WHEN (limits_data->>'max_units')::int > 0 
        THEN ROUND((SELECT COUNT(*) FROM units WHERE organization_id = org_id AND is_active = true)::numeric / (limits_data->>'max_units')::int * 100, 0)
        ELSE 0 
      END
    ),
    'tenants', jsonb_build_object(
      'current', (SELECT COUNT(*) FROM tenants WHERE organization_id = org_id AND is_active = true),
      'limit', (limits_data->>'max_tenants')::int,
      'percentage', CASE 
        WHEN (limits_data->>'max_tenants')::int > 0 
        THEN ROUND((SELECT COUNT(*) FROM tenants WHERE organization_id = org_id AND is_active = true)::numeric / (limits_data->>'max_tenants')::int * 100, 0)
        ELSE 0 
      END
    ),
    'team_members', jsonb_build_object(
      'current', (SELECT COUNT(*) FROM organization_members WHERE organization_id = org_id AND is_active = true),
      'limit', (limits_data->>'max_team_members')::int,
      'percentage', CASE 
        WHEN (limits_data->>'max_team_members')::int > 0 
        THEN ROUND((SELECT COUNT(*) FROM organization_members WHERE organization_id = org_id AND is_active = true)::numeric / (limits_data->>'max_team_members')::int * 100, 0)
        ELSE 0 
      END
    ),
    'features', limits_data->'features'
  ) INTO usage_data;

  RETURN usage_data;
END;
$$;

COMMENT ON FUNCTION get_organization_usage_summary IS 'Get current usage and limits for an organization with usage percentages';

-- =====================================================
-- STEP 7: Update Usage Tracking Trigger
-- =====================================================

-- Trigger to update business count in usage tracking
CREATE OR REPLACE FUNCTION update_business_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO organization_usage_tracking (organization_id, current_businesses, updated_at)
    VALUES (NEW.organization_id, 1, now())
    ON CONFLICT (organization_id) DO UPDATE
    SET current_businesses = organization_usage_tracking.current_businesses + 1,
        updated_at = now();
        
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organization_usage_tracking
    SET current_businesses = GREATEST(current_businesses - 1, 0),
        updated_at = now()
    WHERE organization_id = OLD.organization_id;
        
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    IF NEW.is_active THEN
      UPDATE organization_usage_tracking
      SET current_businesses = current_businesses + 1,
          updated_at = now()
      WHERE organization_id = NEW.organization_id;
    ELSE
      UPDATE organization_usage_tracking
      SET current_businesses = GREATEST(current_businesses - 1, 0),
          updated_at = now()
      WHERE organization_id = NEW.organization_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_business_usage ON businesses;
CREATE TRIGGER trigger_update_business_usage
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_business_usage_count();

COMMENT ON TRIGGER trigger_update_business_usage ON businesses IS 'Updates organization usage tracking when businesses are added or removed';
