-- Migration: Fix rental_applications RLS policies
-- Adds super admin access and ensures applicants can view their own applications

-- ============================================================================
-- 1. Add super admin full access policy
-- ============================================================================
DROP POLICY IF EXISTS "Super admins full access to rental_applications" ON rental_applications;
CREATE POLICY "Super admins full access to rental_applications"
ON rental_applications FOR ALL
USING (EXISTS (
  SELECT 1 FROM super_admins
  WHERE super_admins.user_id = auth.uid()
  AND super_admins.is_active = true
));

-- ============================================================================
-- 2. Recreate applicant viewing policy to be more robust
-- ============================================================================
DROP POLICY IF EXISTS "Applicants can view own applications" ON rental_applications;
CREATE POLICY "Applicants can view own applications"
ON rental_applications FOR SELECT
USING (
  applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);

-- ============================================================================
-- 3. Fix get_business_users_with_stats function to count by business_id
-- ============================================================================
CREATE OR REPLACE FUNCTION get_business_users_with_stats(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  auth_user_id UUID,
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  phone VARCHAR,
  role VARCHAR,
  status VARCHAR,
  tenant_id UUID,
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  unread_messages BIGINT,
  applications_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bu.id,
    bu.business_id,
    bu.auth_user_id,
    bu.email::VARCHAR,
    bu.first_name::VARCHAR,
    bu.last_name::VARCHAR,
    bu.phone::VARCHAR,
    bu.role::VARCHAR,
    bu.status::VARCHAR,
    bu.tenant_id,
    bu.notes,
    bu.last_login_at,
    bu.created_at,
    bu.updated_at,
    (SELECT COUNT(*) FROM business_user_messages m
     WHERE m.business_user_id = bu.id AND m.is_read = false AND m.sender_type = 'user') as unread_messages,
    (SELECT COUNT(*) FROM rental_applications ra
     WHERE ra.applicant_email = bu.email
     AND (ra.business_id = p_business_id
          OR ra.organization_id IN (SELECT b.organization_id FROM businesses b WHERE b.id = p_business_id AND b.organization_id IS NOT NULL))) as applications_count
  FROM business_users bu
  WHERE bu.business_id = p_business_id
  AND bu.is_active = true
  ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'Rental applications policies fixed!' as status;
