-- Migration: Update super admin user analytics to show clients only
-- Clients are users who own at least one business
-- Also includes business_users (users assigned to each business) for expanded view

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_analytics_for_admin();

-- Create updated function that only returns clients (business owners)
CREATE OR REPLACE FUNCTION get_user_analytics_for_admin()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  is_super_admin BOOLEAN,
  business_count BIGINT,
  total_properties BIGINT,
  total_units BIGINT,
  active_listings BIGINT,
  total_applications BIGINT,
  total_listing_views BIGINT,
  businesses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::TEXT AS user_email,
    u.email_confirmed_at,
    u.created_at,
    u.last_sign_in_at,
    EXISTS(SELECT 1 FROM super_admins sa WHERE sa.user_id = u.id AND sa.is_active = true) AS is_super_admin,

    -- Business count
    (SELECT COUNT(*) FROM businesses b WHERE b.owner_user_id = u.id)::BIGINT AS business_count,

    -- Total properties across all businesses
    (SELECT COALESCE(COUNT(*), 0)
     FROM properties p
     JOIN businesses b ON b.id = p.business_id
     WHERE b.owner_user_id = u.id)::BIGINT AS total_properties,

    -- Total units across all properties
    (SELECT COALESCE(COUNT(*), 0)
     FROM units un
     JOIN properties p ON p.id = un.property_id
     JOIN businesses b ON b.id = p.business_id
     WHERE b.owner_user_id = u.id)::BIGINT AS total_units,

    -- Active listings
    (SELECT COALESCE(COUNT(*), 0)
     FROM listings l
     JOIN businesses b ON b.id = l.business_id
     WHERE b.owner_user_id = u.id AND l.status = 'active')::BIGINT AS active_listings,

    -- Total applications received
    (SELECT COALESCE(COUNT(*), 0)
     FROM rental_applications ra
     JOIN businesses b ON b.id = ra.business_id
     WHERE b.owner_user_id = u.id)::BIGINT AS total_applications,

    -- Total listing views
    (SELECT COALESCE(COUNT(*), 0)
     FROM listing_views lv
     JOIN listings l ON l.id = lv.listing_id
     JOIN businesses b ON b.id = l.business_id
     WHERE b.owner_user_id = u.id)::BIGINT AS total_listing_views,

    -- Businesses with details including business_users
    (SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'name', b.business_name,
        'public_page_enabled', b.public_page_enabled,
        'public_page_slug', b.public_page_slug,
        'property_count', (SELECT COUNT(*) FROM properties p WHERE p.business_id = b.id),
        'unit_count', (SELECT COUNT(*) FROM units un JOIN properties p ON p.id = un.property_id WHERE p.business_id = b.id),
        'active_listing_count', (SELECT COUNT(*) FROM listings l WHERE l.business_id = b.id AND l.status = 'active'),
        'listings', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', l.id,
              'title', l.title,
              'slug', l.slug,
              'status', l.status,
              'view_count', (SELECT COUNT(*) FROM listing_views lv WHERE lv.listing_id = l.id),
              'application_count', (SELECT COUNT(*) FROM rental_applications ra WHERE ra.public_listing_id = l.id)
            )
          ), '[]'::jsonb)
          FROM listings l
          WHERE l.business_id = b.id
        ),
        'users', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', bu.id,
              'email', bu.email,
              'first_name', bu.first_name,
              'last_name', bu.last_name,
              'phone', bu.phone,
              'role', bu.role,
              'status', bu.status,
              'auth_user_id', bu.auth_user_id,
              'created_at', bu.created_at,
              'is_active', bu.is_active
            )
          ), '[]'::jsonb)
          FROM business_users bu
          WHERE bu.business_id = b.id
        )
      )
    ), '[]'::jsonb)
    FROM businesses b
    WHERE b.owner_user_id = u.id) AS businesses

  FROM auth.users u
  -- Only return users who own at least one business (clients)
  WHERE EXISTS (
    SELECT 1 FROM businesses b WHERE b.owner_user_id = u.id
  )
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (super admins will be checked at application level)
GRANT EXECUTE ON FUNCTION get_user_analytics_for_admin() TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
