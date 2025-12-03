/*
  # Fix Organization Loading for Users
  
  1. Changes
    - Create helper function to get user's organizations that bypasses RLS issues
    - Returns complete organization data for authenticated users
    
  2. Security
    - Only returns organizations where user is an active member
    - Uses SECURITY DEFINER to bypass RLS for reliable loading
*/

CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  slug text,
  company_name text,
  email text,
  phone text,
  address text,
  city text,
  state_province text,
  postal_code text,
  country text,
  currency text,
  timezone text,
  account_tier text,
  subscription_status text,
  created_at timestamptz,
  updated_at timestamptz,
  subscription_ends_at timestamptz,
  stripe_customer_id text,
  last_payment_at timestamptz,
  is_admin_org boolean,
  payment_provider_type text,
  payment_provider_config jsonb,
  payment_provider_enabled boolean,
  my_role text,
  my_member_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id uuid;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.owner_id,
    o.name,
    o.slug,
    o.company_name,
    o.email,
    o.phone,
    o.address,
    o.city,
    o.state_province,
    o.postal_code,
    o.country,
    o.currency,
    o.timezone,
    o.account_tier,
    o.subscription_status,
    o.created_at,
    o.updated_at,
    o.subscription_ends_at,
    o.stripe_customer_id,
    o.last_payment_at,
    o.is_admin_org,
    o.payment_provider_type,
    o.payment_provider_config,
    o.payment_provider_enabled,
    om.role as my_role,
    om.id as my_member_id
  FROM organizations o
  INNER JOIN organization_members om ON om.organization_id = o.id
  WHERE om.user_id = calling_user_id
    AND om.is_active = true
  ORDER BY o.created_at DESC;
END;
$$;