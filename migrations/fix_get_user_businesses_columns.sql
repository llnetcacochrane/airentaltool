-- Fix get_user_businesses to return all business columns
-- This ensures all business data is available when loading in Settings

-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_businesses(uuid);

-- Recreate with all columns
CREATE OR REPLACE FUNCTION get_user_businesses(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  business_name text,
  legal_name text,
  business_type text,
  tax_id text,
  registration_number text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  currency text,
  timezone text,
  notes text,
  is_default boolean,
  is_active boolean,
  is_owned boolean,
  property_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    b.id,
    b.organization_id,
    b.business_name,
    b.legal_name,
    b.business_type,
    b.tax_id,
    b.registration_number,
    b.email,
    b.phone,
    b.website,
    b.address_line1,
    b.address_line2,
    b.city,
    b.state,
    b.postal_code,
    b.country,
    b.currency,
    b.timezone,
    b.notes,
    b.is_default,
    b.is_active,
    (b.owner_user_id = p_user_id) as is_owned,
    (SELECT COUNT(*) FROM properties p WHERE p.business_id = b.id AND p.is_active IS true) as property_count,
    b.created_at
  FROM businesses b
  WHERE b.owner_user_id = p_user_id
    AND b.is_active IS true
  ORDER BY b.is_default DESC, b.business_name;
END;
$$;
