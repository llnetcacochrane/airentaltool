-- Migration: Make organization_id nullable on rental_applications
-- The new business-centric architecture uses business_id instead of organization_id
-- Many users don't have organizations, so this needs to be nullable

-- Make organization_id nullable on rental_applications
ALTER TABLE rental_applications
  ALTER COLUMN organization_id DROP NOT NULL;

-- Also update the RLS policy to work with business_id
DROP POLICY IF EXISTS "Landlords can view organization applications" ON rental_applications;

CREATE POLICY "Landlords can view applications"
  ON rental_applications FOR SELECT
  TO authenticated
  USING (
    -- Check via organization membership (legacy)
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = rental_applications.organization_id
        AND organization_members.user_id = auth.uid()
    ))
    -- OR check via business ownership
    OR (business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = rental_applications.business_id
        AND businesses.owner_user_id = auth.uid()
    ))
    -- OR check via business user membership
    OR (business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = rental_applications.business_id
        AND business_users.user_id = auth.uid()
        AND business_users.is_active = true
    ))
  );

-- Update the landlords update policy too
DROP POLICY IF EXISTS "Landlords can update applications" ON rental_applications;

CREATE POLICY "Landlords can update applications"
  ON rental_applications FOR UPDATE
  TO authenticated
  USING (
    -- Check via organization membership (legacy)
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = rental_applications.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin', 'property_manager')
    ))
    -- OR check via business ownership
    OR (business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = rental_applications.business_id
        AND businesses.owner_user_id = auth.uid()
    ))
    -- OR check via business user with appropriate role
    OR (business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = rental_applications.business_id
        AND business_users.user_id = auth.uid()
        AND business_users.is_active = true
        AND business_users.role IN ('owner', 'admin', 'property_manager')
    ))
  );

COMMENT ON COLUMN rental_applications.organization_id IS 'Legacy organization reference. Nullable for business-centric architecture.';
