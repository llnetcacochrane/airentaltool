/*
  # Update RLS Policies for User-Based and Org-Based Access
  
  ## Problem
  - Current RLS policies require organization membership
  - Free tier users don't have organizations
  - Need policies that work with EITHER user_id OR organization_id
  
  ## Solution
  - Update policies to check: owned by user (via portfolio) OR in user's organization
  - Free tier: portfolio.user_id based access
  - Paid tiers: organization_id based access (optional)
  
  ## Access Hierarchy
  - Properties -> portfolios -> user_id
  - Properties -> organization_id
  - Tenants -> user_id OR organization_id
*/

-- PROPERTIES: Access via portfolio user_id OR organization membership
DROP POLICY IF EXISTS "Users can view organization properties" ON properties;
DROP POLICY IF EXISTS "Users can insert organization properties" ON properties;
DROP POLICY IF EXISTS "Users can update organization properties" ON properties;
DROP POLICY IF EXISTS "Users can delete organization properties" ON properties;

CREATE POLICY "Users can view their properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can insert their properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
    OR (
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Users can update their properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their properties"
  ON properties FOR DELETE
  TO authenticated
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR is_super_admin()
  );

-- UNITS: Access based on property ownership
DROP POLICY IF EXISTS "Users can view organization units" ON units;
DROP POLICY IF EXISTS "Users can insert organization units" ON units;
DROP POLICY IF EXISTS "Users can update organization units" ON units;
DROP POLICY IF EXISTS "Users can delete organization units" ON units;

CREATE POLICY "Users can view their units"
  ON units FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
        OR organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = auth.uid()
        )
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can insert their units"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties 
      WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
        OR organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
  );

CREATE POLICY "Users can update their units"
  ON units FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
        OR organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their units"
  ON units FOR DELETE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties 
      WHERE portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid())
        OR organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = auth.uid() AND role = 'owner'
        )
    )
    OR is_super_admin()
  );

-- TENANTS: User-based or org-based access
DROP POLICY IF EXISTS "Users can view organization tenants" ON tenants;
DROP POLICY IF EXISTS "Users can insert organization tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update organization tenants" ON tenants;
DROP POLICY IF EXISTS "Users can delete organization tenants" ON tenants;

CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can insert their tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR is_super_admin()
  );

-- PORTFOLIOS: Direct user ownership or org membership
DROP POLICY IF EXISTS "Users can view their portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can insert portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their portfolios" ON portfolios;

CREATE POLICY "Users can view their portfolios"
  ON portfolios FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can insert their portfolios"
  ON portfolios FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their portfolios"
  ON portfolios FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR is_super_admin()
  );

CREATE POLICY "Users can delete their portfolios"
  ON portfolios FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR is_super_admin()
  );

COMMENT ON POLICY "Users can view their properties" ON properties IS 'Allow users to view properties in their portfolios OR through organization membership. Free tier uses portfolio, paid tiers can use organization.';
COMMENT ON POLICY "Users can view their tenants" ON tenants IS 'Allow users to view tenants they own directly OR through organization membership. Supports both free tier (user_id) and paid tiers (organization_id).';
COMMENT ON POLICY "Users can view their portfolios" ON portfolios IS 'Allow users to view portfolios they own directly OR through organization membership. Free tier users have personal portfolios without organizations.';
