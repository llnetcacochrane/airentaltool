/*
  # Rental Application System

  1. New Tables
    - `rental_application_forms` - Customizable application forms
    - `rental_listings` - Active rental listings for vacant units
    - `rental_applications` - Individual applications from prospects
    - `application_documents` - Uploaded documents

  2. Security
    - Enable RLS on all tables
    - Landlords can manage their listings/applications
    - Public can view active listings and submit applications

  3. Functions
    - generate_listing_code() - Creates unique listing codes
    - calculate_application_score() - AI scoring logic
    - convert_application_to_tenant() - Converts approved applicant
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'closed', 'draft');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('id', 'proof_of_income', 'reference_letter', 'credit_report', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create rental_application_forms table FIRST
CREATE TABLE IF NOT EXISTS rental_application_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  -- Form structure (JSON with questions)
  form_schema jsonb NOT NULL DEFAULT '{
    "sections": [
      {
        "title": "Personal Information",
        "fields": [
          {"id": "first_name", "label": "First Name", "type": "text", "required": true},
          {"id": "last_name", "label": "Last Name", "type": "text", "required": true},
          {"id": "email", "label": "Email", "type": "email", "required": true},
          {"id": "phone", "label": "Phone", "type": "tel", "required": true},
          {"id": "date_of_birth", "label": "Date of Birth", "type": "date", "required": true}
        ]
      },
      {
        "title": "Employment Information",
        "fields": [
          {"id": "employer", "label": "Current Employer", "type": "text", "required": true},
          {"id": "job_title", "label": "Job Title", "type": "text", "required": true},
          {"id": "monthly_income", "label": "Monthly Income", "type": "number", "required": true},
          {"id": "employment_length", "label": "Years at Current Job", "type": "number", "required": true}
        ]
      },
      {
        "title": "Rental History",
        "fields": [
          {"id": "current_address", "label": "Current Address", "type": "textarea", "required": true},
          {"id": "current_landlord", "label": "Current Landlord Name", "type": "text", "required": false},
          {"id": "current_landlord_phone", "label": "Landlord Phone", "type": "tel", "required": false},
          {"id": "move_in_date", "label": "Desired Move-In Date", "type": "date", "required": true}
        ]
      },
      {
        "title": "Additional Information",
        "fields": [
          {"id": "pets", "label": "Do you have pets?", "type": "select", "options": ["No", "Yes - Dog", "Yes - Cat", "Yes - Other"], "required": true},
          {"id": "occupants", "label": "Number of Occupants", "type": "number", "required": true},
          {"id": "references", "label": "Personal References (Name, Phone)", "type": "textarea", "required": false}
        ]
      }
    ]
  }'::jsonb,
  
  -- Template
  is_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rental_listings table
CREATE TABLE IF NOT EXISTS rental_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  
  -- Listing details
  listing_code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  monthly_rent_cents integer NOT NULL,
  security_deposit_cents integer,
  available_date date,
  lease_term_months integer,
  
  -- Features and amenities (JSON array)
  amenities jsonb DEFAULT '[]'::jsonb,
  pet_policy text,
  parking_included boolean DEFAULT false,
  utilities_included text[],
  
  -- Application settings
  application_form_id uuid REFERENCES rental_application_forms(id),
  accept_applications boolean DEFAULT true,
  max_applications integer,
  application_fee_cents integer DEFAULT 0,
  
  -- Status
  status listing_status DEFAULT 'active',
  closes_at timestamptz,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rental_applications table
CREATE TABLE IF NOT EXISTS rental_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES rental_listings(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  
  -- Applicant info (from form)
  applicant_email text NOT NULL,
  applicant_first_name text NOT NULL,
  applicant_last_name text NOT NULL,
  applicant_phone text,
  
  -- Application data (JSON with all responses)
  responses jsonb NOT NULL,
  
  -- Screening
  credit_score integer,
  background_check_status text,
  income_verified boolean DEFAULT false,
  
  -- Scoring
  ai_score integer,
  landlord_rating integer,
  landlord_notes text,
  
  -- Status
  status application_status DEFAULT 'submitted',
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  
  -- Conversion
  converted_to_tenant_id uuid REFERENCES tenants(id),
  converted_at timestamptz,
  
  -- Audit
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create application_documents table
CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  
  document_type document_type NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  
  uploaded_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rental_listings_org ON rental_listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_listings_unit ON rental_listings(unit_id);
CREATE INDEX IF NOT EXISTS idx_rental_listings_code ON rental_listings(listing_code);
CREATE INDEX IF NOT EXISTS idx_rental_listings_status ON rental_listings(status);

CREATE INDEX IF NOT EXISTS idx_rental_applications_listing ON rental_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_org ON rental_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_status ON rental_applications(status);
CREATE INDEX IF NOT EXISTS idx_rental_applications_email ON rental_applications(applicant_email);

CREATE INDEX IF NOT EXISTS idx_application_docs_application ON application_documents(application_id);

-- Enable RLS
ALTER TABLE rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_application_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_listings

CREATE POLICY "Anyone can view active listings"
  ON rental_listings FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND accept_applications = true);

CREATE POLICY "Landlords can view organization listings"
  ON rental_listings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Landlords can create listings"
  ON rental_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Landlords can update listings"
  ON rental_listings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for rental_application_forms

CREATE POLICY "Landlords can view organization forms"
  ON rental_application_forms FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Landlords can create forms"
  ON rental_application_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Landlords can update forms"
  ON rental_application_forms FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for rental_applications

CREATE POLICY "Anyone can submit applications"
  ON rental_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    listing_id IN (
      SELECT id FROM rental_listings
      WHERE status = 'active' AND accept_applications = true
    )
  );

CREATE POLICY "Landlords can view organization applications"
  ON rental_applications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Landlords can update applications"
  ON rental_applications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for application_documents

CREATE POLICY "Applicants can upload documents"
  ON application_documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "View application documents"
  ON application_documents FOR SELECT
  TO authenticated
  USING (
    application_id IN (
      SELECT ra.id FROM rental_applications ra
      WHERE ra.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Function to generate unique listing code
CREATE OR REPLACE FUNCTION generate_listing_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'APPLY-';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := 'APPLY-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM rental_listings WHERE listing_code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to calculate AI score for application
CREATE OR REPLACE FUNCTION calculate_application_score(p_application_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record rental_applications;
  score integer := 0;
  monthly_rent integer;
  monthly_income numeric;
  income_ratio numeric;
BEGIN
  SELECT * INTO app_record FROM rental_applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  SELECT monthly_rent_cents INTO monthly_rent
  FROM rental_listings
  WHERE id = app_record.listing_id;
  
  monthly_income := (app_record.responses->>'monthly_income')::numeric;
  
  IF monthly_income IS NOT NULL AND monthly_rent > 0 THEN
    income_ratio := monthly_income / (monthly_rent / 100.0);
    IF income_ratio >= 3 THEN
      score := score + 40;
    ELSIF income_ratio >= 2.5 THEN
      score := score + 30;
    ELSIF income_ratio >= 2 THEN
      score := score + 20;
    ELSE
      score := score + 10;
    END IF;
  END IF;
  
  IF app_record.credit_score IS NOT NULL THEN
    IF app_record.credit_score >= 750 THEN
      score := score + 30;
    ELSIF app_record.credit_score >= 700 THEN
      score := score + 25;
    ELSIF app_record.credit_score >= 650 THEN
      score := score + 15;
    ELSIF app_record.credit_score >= 600 THEN
      score := score + 5;
    END IF;
  END IF;
  
  IF (app_record.responses->>'employment_length')::numeric >= 2 THEN
    score := score + 15;
  ELSIF (app_record.responses->>'employment_length')::numeric >= 1 THEN
    score := score + 10;
  ELSE
    score := score + 5;
  END IF;
  
  IF app_record.responses->>'references' IS NOT NULL 
     AND length(app_record.responses->>'references') > 10 THEN
    score := score + 15;
  END IF;
  
  RETURN LEAST(score, 100);
END;
$$;

-- Function to convert application to tenant
CREATE OR REPLACE FUNCTION convert_application_to_tenant(
  p_application_id uuid,
  p_lease_start_date date,
  p_lease_end_date date,
  p_monthly_rent_cents integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record rental_applications;
  new_tenant_id uuid;
  user_id uuid;
BEGIN
  SELECT * INTO app_record FROM rental_applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF app_record.status != 'approved' THEN
    RAISE EXCEPTION 'Application must be approved first';
  END IF;
  
  user_id := auth.uid();
  
  INSERT INTO tenants (
    organization_id,
    unit_id,
    first_name,
    last_name,
    email,
    phone,
    employer,
    monthly_income_cents,
    tenant_type,
    lease_start_date,
    lease_end_date,
    monthly_rent_cents,
    status,
    created_by
  ) VALUES (
    app_record.organization_id,
    app_record.unit_id,
    app_record.applicant_first_name,
    app_record.applicant_last_name,
    app_record.applicant_email,
    app_record.applicant_phone,
    app_record.responses->>'employer',
    ((app_record.responses->>'monthly_income')::numeric * 100)::integer,
    'primary',
    p_lease_start_date,
    p_lease_end_date,
    p_monthly_rent_cents,
    'active',
    user_id
  ) RETURNING id INTO new_tenant_id;
  
  UPDATE rental_applications
  SET 
    converted_to_tenant_id = new_tenant_id,
    converted_at = now(),
    updated_at = now()
  WHERE id = p_application_id;
  
  UPDATE units
  SET occupancy_status = 'occupied'
  WHERE id = app_record.unit_id;
  
  UPDATE rental_applications
  SET 
    status = 'rejected',
    rejected_at = now(),
    rejection_reason = 'Unit filled by another applicant'
  WHERE listing_id = app_record.listing_id
    AND id != p_application_id
    AND status NOT IN ('rejected', 'withdrawn');
  
  UPDATE rental_listings
  SET 
    status = 'closed',
    accept_applications = false
  WHERE id = app_record.listing_id;
  
  RETURN new_tenant_id;
END;
$$;

-- Add updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER rental_listings_updated_at
    BEFORE UPDATE ON rental_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER rental_application_forms_updated_at
    BEFORE UPDATE ON rental_application_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER rental_applications_updated_at
    BEFORE UPDATE ON rental_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN null; END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_listing_code() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_application_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_application_to_tenant(uuid, date, date, integer) TO authenticated;
