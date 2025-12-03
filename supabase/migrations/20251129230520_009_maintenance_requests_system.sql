/*
  # Maintenance Requests System

  1. New Tables
    - `maintenance_requests`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `property_id` (uuid, foreign key)
      - `tenant_id` (uuid, foreign key)
      - `title` (text) - Brief description
      - `description` (text) - Detailed description
      - `category` (text) - Type of maintenance
      - `priority` (text) - emergency, high, medium, low
      - `status` (text) - submitted, acknowledged, in_progress, completed, cancelled
      - `images` (jsonb) - Array of image URLs
      - `submitted_at` (timestamptz)
      - `acknowledged_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `assigned_to` (text) - Vendor/person assigned
      - `estimated_cost` (numeric)
      - `actual_cost` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `maintenance_vendors`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `specialty` (text)
      - `rating` (numeric)
      - `total_jobs` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies for organization members to manage requests
    - Policies for tenants to view/create their own requests
*/

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'submitted',
  images jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  assigned_to text,
  estimated_cost numeric,
  actual_cost numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_vendors table
CREATE TABLE IF NOT EXISTS maintenance_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  specialty text NOT NULL,
  rating numeric DEFAULT 0,
  total_jobs integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_vendors ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_requests
CREATE POLICY "Organization members can view maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can delete maintenance requests"
  ON maintenance_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_requests.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

-- Policies for maintenance_vendors
CREATE POLICY "Organization members can view vendors"
  ON maintenance_vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can create vendors"
  ON maintenance_vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can update vendors"
  ON maintenance_vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

CREATE POLICY "Organization members can delete vendors"
  ON maintenance_vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = maintenance_vendors.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_organization ON maintenance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_organization ON maintenance_vendors(organization_id);
