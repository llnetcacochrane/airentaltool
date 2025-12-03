export type UserRole = 'owner' | 'admin' | 'property_manager' | 'accounting' | 'viewer';
export type AccountTier = 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'apartment_building'
  | 'condo'
  | 'townhouse'
  | 'commercial'
  | 'mixed_use'
  | 'other';

export type OccupancyStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved';

export type TenantType = 'primary' | 'co_tenant' | 'occupant' | 'guarantor';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type TenantStatus =
  | 'prospect'
  | 'applicant'
  | 'active'
  | 'notice_given'
  | 'moved_out'
  | 'evicted';

export type LeaseType = 'fixed_term' | 'month_to_month' | 'year_to_year';

export type LeaseStatus =
  | 'draft'
  | 'pending_signature'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type PaymentType =
  | 'rent'
  | 'security_deposit'
  | 'pet_deposit'
  | 'late_fee'
  | 'utility'
  | 'maintenance'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'e_transfer'
  | 'other';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'late' | 'failed' | 'refunded';

export type ExpenseCategory =
  | 'maintenance'
  | 'repair'
  | 'utility'
  | 'insurance'
  | 'property_tax'
  | 'hoa_fee'
  | 'mortgage'
  | 'advertising'
  | 'legal'
  | 'accounting'
  | 'management_fee'
  | 'cleaning'
  | 'landscaping'
  | 'snow_removal'
  | 'supplies'
  | 'other';

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'pest_control'
  | 'landscaping'
  | 'cleaning'
  | 'security'
  | 'other';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

export type MaintenanceStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'cancelled';

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  currency: string;
  timezone: string;
  account_tier: AccountTier;
  subscription_status: SubscriptionStatus;
  is_admin_org?: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  organization_id: string;
  business_name: string;
  legal_name?: string;
  business_type?: string;
  tax_id?: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Property {
  id: string;
  organization_id: string;
  business_id: string;
  name: string;
  property_type: PropertyType;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  year_built?: number;
  square_feet?: number;
  lot_size?: string;
  bedrooms?: number;
  bathrooms?: number;
  purchase_price_cents?: number;
  purchase_date?: string;
  current_value_cents?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Unit {
  id: string;
  organization_id: string;
  property_id: string;
  unit_number: string;
  unit_name?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  floor_number?: number;
  monthly_rent_cents: number;
  security_deposit_cents: number;
  utilities_included?: {
    water?: boolean;
    electricity?: boolean;
    gas?: boolean;
    internet?: boolean;
    cable?: boolean;
    trash?: boolean;
    heating?: boolean;
    cooling?: boolean;
  };
  amenities?: string[];
  occupancy_status: OccupancyStatus;
  available_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Tenant {
  id: string;
  organization_id: string;
  unit_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employer?: string;
  employer_phone?: string;
  monthly_income_cents?: number;
  tenant_type: TenantType;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent_cents?: number;
  security_deposit_paid_cents: number;
  move_in_date?: string;
  move_out_date?: string;
  has_portal_access: boolean;
  portal_invite_sent_at?: string;
  portal_last_login_at?: string;
  status: TenantStatus;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface UnitTenantAccess {
  id: string;
  unit_id: string;
  tenant_id: string;
  access_level: 'full' | 'view_only' | 'payment_only';
  is_active: boolean;
  granted_at: string;
  granted_by?: string;
  revoked_at?: string;
}

export interface Lease {
  id: string;
  organization_id: string;
  unit_id: string;
  lease_type: LeaseType;
  start_date: string;
  end_date?: string;
  notice_period_days: number;
  monthly_rent_cents: number;
  security_deposit_cents: number;
  pet_deposit_cents: number;
  rent_due_day: number;
  late_fee_cents: number;
  late_fee_grace_days: number;
  status: LeaseStatus;
  document_url?: string;
  signed_date?: string;
  auto_renew: boolean;
  renewed_to_lease_id?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  unit_id: string;
  tenant_id?: string;
  lease_id?: string;
  amount_cents: number;
  payment_type: PaymentType;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  due_date: string;
  payment_date?: string;
  status: PaymentStatus;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PaymentSchedule {
  id: string;
  lease_id: string;
  payment_date: string;
  due_amount: number;
  paid_amount?: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentGateway {
  id: string;
  organization_id: string;
  gateway_name: string;
  api_key: string;
  api_secret?: string;
  is_active: boolean;
  is_test_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  business_id?: string;
  property_id?: string;
  unit_id?: string;
  amount_cents: number;
  category: ExpenseCategory;
  vendor_name?: string;
  vendor_contact?: string;
  expense_date: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  status: 'pending' | 'paid' | 'reimbursed' | 'cancelled';
  description: string;
  notes?: string;
  receipt_url?: string;
  is_tax_deductible: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id?: string;
  tenant_id?: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to?: string;
  assigned_at?: string;
  requested_date: string;
  scheduled_date?: string;
  completed_date?: string;
  entry_allowed: boolean;
  entry_notes?: string;
  estimated_cost_cents?: number;
  actual_cost_cents?: number;
  photos?: string[];
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AuthSession {
  user_id: string;
  email: string;
  current_organization_id?: string;
  current_organization?: Organization;
  organizations: Organization[];
  member_info?: OrganizationMember;
  user_profile?: User;
}

export interface TenantInvitation {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string;
  tenant_id?: string;
  invitation_code: string;
  tenant_email?: string;
  tenant_first_name?: string;
  tenant_last_name?: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationDetails {
  invitation_id: string;
  organization_id: string;
  organization_name: string;
  property_id: string;
  property_name: string;
  property_address: string;
  unit_id: string;
  unit_number: string;
  tenant_email?: string;
  tenant_first_name?: string;
  tenant_last_name?: string;
  status: InvitationStatus;
  expires_at: string;
}

export type ListingStatus = 'active' | 'closed' | 'draft';
export type ApplicationStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'withdrawn';
export type DocumentType = 'id' | 'proof_of_income' | 'reference_letter' | 'credit_report' | 'other';

export interface RentalApplicationForm {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  form_schema: {
    sections: Array<{
      title: string;
      fields: Array<{
        id: string;
        label: string;
        type: string;
        required: boolean;
        options?: string[];
      }>;
    }>;
  };
  is_template: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalListing {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string;
  listing_code: string;
  title: string;
  description?: string;
  monthly_rent_cents: number;
  security_deposit_cents?: number;
  available_date?: string;
  lease_term_months?: number;
  amenities: string[];
  pet_policy?: string;
  parking_included: boolean;
  utilities_included?: string[];
  application_form_id?: string;
  accept_applications: boolean;
  max_applications?: number;
  application_fee_cents: number;
  status: ListingStatus;
  closes_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalApplication {
  id: string;
  listing_id: string;
  organization_id: string;
  property_id: string;
  unit_id: string;
  applicant_email: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_phone?: string;
  responses: Record<string, any>;
  credit_score?: number;
  background_check_status?: string;
  income_verified: boolean;
  ai_score?: number;
  landlord_rating?: number;
  landlord_notes?: string;
  status: ApplicationStatus;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  converted_to_tenant_id?: string;
  converted_at?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: DocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}
