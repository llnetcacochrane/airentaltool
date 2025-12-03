/*
  # RentTrack - Initial Multi-Tenant Schema

  1. Core Tables
    - `organizations` - Top-level tenant entities (landlords, companies, property managers)
    - `organization_members` - Team members with roles
    - `users` - Extended user data
  
  2. Property Management
    - `properties` - Individual rental units/spaces
    - `property_types` - Property classification (home, apartment, room, storage, RV, camping)
    - `property_units` - Sub-units within properties (apartments in buildings, rooms in homes)
  
  3. Tenant Management
    - `tenants` - Individual tenant profiles
    - `leases` - Rental agreements between landlord and tenant
    - `lease_documents` - Stored rental agreement documents
  
  4. Financial Tracking
    - `payment_schedules` - Expected payment schedule entries
    - `payments` - Recorded tenant payments
    - `payment_methods` - Stored payment method preferences
    - `expenses` - Landlord expenses
    - `security_deposits` - Deposit tracking and deductions
  
  5. Payment Processing
    - `payment_gateways` - Payment provider configurations
    - `payment_transactions` - All payment attempts and completions
  
  6. Security & Audit
    - `audit_logs` - Complete transaction history
  
  7. Security
    - Enable RLS on all tables
    - Create policies for organization isolation
    - Create policies for role-based access
*/

-- Organizations table (multi-tenant root)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  company_name text,
  email text,
  phone text,
  address text,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'CA',
  currency text DEFAULT 'CAD',
  timezone text DEFAULT 'America/Toronto',
  account_tier text DEFAULT 'professional', -- solo, professional, enterprise
  subscription_status text DEFAULT 'active', -- active, trial, suspended, cancelled
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization members with roles
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- owner, admin, property_manager, accounting, viewer
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Extended user profile
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar_url text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Property types (classification system)
CREATE TABLE IF NOT EXISTS property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, -- House, Apartment, Room, Storage Unit, RV Space, Camping Site, etc.
  description text,
  category text DEFAULT 'residential', -- residential, commercial, recreational, storage
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Properties (main rental properties)
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_type_id uuid NOT NULL REFERENCES property_types(id),
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'CA',
  latitude numeric,
  longitude numeric,
  total_units integer DEFAULT 1,
  bedrooms numeric,
  bathrooms numeric,
  square_feet integer,
  year_built integer,
  status text DEFAULT 'active', -- active, maintenance, unlisted
  images jsonb DEFAULT '[]',
  amenities jsonb DEFAULT '[]',
  documents jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Property units (sub-units within properties)
CREATE TABLE IF NOT EXISTS property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number text,
  description text,
  status text DEFAULT 'available', -- available, occupied, maintenance
  bedrooms numeric,
  bathrooms numeric,
  square_feet integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, unit_number)
);

-- Tenants (individual tenant profiles)
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  identification_type text, -- driver_license, passport, national_id
  identification_number text,
  address text,
  city text,
  state_province text,
  postal_code text,
  country text,
  emergency_contact_name text,
  emergency_contact_phone text,
  employment_info jsonb DEFAULT '{}',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Leases (rental agreements)
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id),
  property_unit_id uuid REFERENCES property_units(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  lease_type text DEFAULT 'residential', -- residential, commercial, recreational, storage
  start_date date NOT NULL,
  end_date date NOT NULL,
  renewal_type text DEFAULT 'manual', -- manual, auto_renew
  monthly_rent numeric NOT NULL,
  payment_frequency text DEFAULT 'monthly', -- daily, weekly, bi-weekly, monthly, quarterly, annually
  payment_due_day integer DEFAULT 1,
  late_fee_type text DEFAULT 'percentage', -- fixed, percentage, tiered
  late_fee_amount numeric,
  late_fee_percentage numeric,
  grace_period_days integer DEFAULT 3,
  utilities_included jsonb DEFAULT '[]', -- electricity, water, gas, internet, etc.
  pet_policy jsonb DEFAULT '{}',
  custom_terms text,
  status text DEFAULT 'active', -- draft, active, expired, terminated
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lease documents (stored rental agreements)
CREATE TABLE IF NOT EXISTS lease_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  document_type text DEFAULT 'agreement', -- agreement, amendment, addendum
  file_path text,
  file_size integer,
  version integer DEFAULT 1,
  signature_status text DEFAULT 'unsigned', -- unsigned, tenant_signed, landlord_signed, both_signed
  tenant_signed_at timestamptz,
  landlord_signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment schedules (expected payments)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  due_amount numeric NOT NULL,
  payment_type text DEFAULT 'rent', -- rent, utilities, maintenance, fee
  description text,
  is_paid boolean DEFAULT false,
  paid_amount numeric DEFAULT 0,
  paid_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Actual payments received
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES payment_schedules(id),
  amount numeric NOT NULL,
  payment_method text NOT NULL, -- credit_card, bank_transfer, check, interac, paypal, manual
  payment_gateway text, -- stripe, paypal, interac, none
  gateway_transaction_id text,
  payment_date date NOT NULL,
  received_date date,
  payment_status text DEFAULT 'pending', -- pending, completed, failed, refunded
  allocated_to jsonb DEFAULT '{}', -- allocation across different payment types
  receipt_file_path text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment methods (stored preferences and tokens)
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  method_type text NOT NULL, -- credit_card, bank_account, interac, paypal
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  gateway_customer_id text,
  gateway_payment_method_id text,
  last_four_digits text,
  card_brand text,
  expiry_date text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment gateways (configuration)
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gateway_name text NOT NULL, -- stripe, paypal, interac
  is_enabled boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, gateway_name)
);

-- Payment transactions (all transaction attempts)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id),
  gateway_name text NOT NULL,
  transaction_type text NOT NULL, -- charge, refund, payout, webhook
  amount numeric NOT NULL,
  currency text DEFAULT 'CAD',
  status text NOT NULL, -- pending, completed, failed, cancelled
  gateway_response jsonb DEFAULT '{}',
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Security deposits
CREATE TABLE IF NOT EXISTS security_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  deposit_amount numeric NOT NULL,
  received_date date NOT NULL,
  payment_method text,
  account_holder text,
  account_notes text,
  return_status text DEFAULT 'held', -- held, returned, partially_deducted, full_deducted
  return_date date,
  return_amount numeric,
  return_payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Security deposit deductions
CREATE TABLE IF NOT EXISTS deposit_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_deposit_id uuid NOT NULL REFERENCES security_deposits(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL, -- damage, cleaning, unpaid_rent, utilities, other
  amount numeric NOT NULL,
  deduction_date date NOT NULL,
  receipt_file_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expenses (landlord costs)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id),
  lease_id uuid REFERENCES leases(id),
  category text NOT NULL, -- maintenance, repairs, utilities, insurance, taxes, cleaning, advertising, other
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  paid_date date,
  payment_method text,
  status text DEFAULT 'recorded', -- recorded, paid, pending
  receipt_file_path text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audit logs (complete transaction history)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL, -- payment, lease, tenant, property, expense, etc.
  entity_id text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_property_units_property_id ON property_units(property_id);
CREATE INDEX idx_tenants_organization_id ON tenants(organization_id);
CREATE INDEX idx_leases_organization_id ON leases(organization_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_payment_schedules_lease_id ON payment_schedules(lease_id);
CREATE INDEX idx_payment_schedules_payment_date ON payment_schedules(payment_date);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_security_deposits_lease_id ON security_deposits(lease_id);
CREATE INDEX idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;