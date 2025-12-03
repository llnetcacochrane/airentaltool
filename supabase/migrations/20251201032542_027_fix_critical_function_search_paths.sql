/*
  # Security Fixes - Critical Function Search Paths

  ## Overview
  Fixes search_path for the most critical SECURITY DEFINER functions
  to prevent privilege escalation attacks.

  ## Changes
  - Fix search_path for property owner functions (new)
  - Fix search_path for organization limit functions (new)  
  - These are the most critical as they control access and limits

  ## Security Impact
  - Prevents privilege escalation vulnerabilities
  - Ensures predictable function behavior
*/

-- Already created in migration 024 and 025, just add search_path
ALTER FUNCTION is_property_owner(uuid) SET search_path = public;
ALTER FUNCTION get_owned_properties() SET search_path = public;
ALTER FUNCTION is_property_owner_for_org(uuid) SET search_path = public;
ALTER FUNCTION update_property_owner_updated_at() SET search_path = public;
ALTER FUNCTION get_organization_limits(uuid) SET search_path = public;
ALTER FUNCTION can_create_additional_business(uuid) SET search_path = public;
ALTER FUNCTION enforce_business_limits() SET search_path = public;
ALTER FUNCTION get_organization_usage_summary(uuid) SET search_path = public;
ALTER FUNCTION update_business_usage_count() SET search_path = public;

-- Existing functions from earlier migrations
ALTER FUNCTION generate_invitation_code() SET search_path = public;
ALTER FUNCTION expire_old_invitations() SET search_path = public;
ALTER FUNCTION update_tenant_invitations_updated_at() SET search_path = public;
ALTER FUNCTION generate_listing_code() SET search_path = public;
ALTER FUNCTION user_is_org_admin(uuid) SET search_path = public;

COMMENT ON FUNCTION is_property_owner IS 'Check if current user is an owner of the given property (secured with fixed search_path)';
COMMENT ON FUNCTION get_organization_limits IS 'Calculate total limits for an organization (secured with fixed search_path)';
