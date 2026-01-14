export type UserRole = 'owner' | 'admin' | 'property_manager' | 'accounting' | 'viewer';
export type AccountTier = 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

// User onboarding state for tracking setup progress
export interface OnboardingState {
  id: string;
  user_id: string;
  has_added_property: boolean;
  has_added_unit: boolean;
  onboarding_dismissed: boolean;
  post_onboarding_dismissed: boolean;
  first_property_id: string | null;
  first_unit_id: string | null;
  onboarding_completed_at: string | null;
  post_onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'apartment_building'
  | 'condo'
  | 'townhouse'
  | 'commercial'
  | 'mixed_use'
  | 'residential'
  | 'land'
  | 'vacant_land'
  | 'other';

/**
 * Standardized property type options for use across all forms
 * This is the single source of truth for property type display labels
 */
export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'apartment_building', label: 'Apartment Building' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
  { value: 'vacant_land', label: 'Vacant Land' },
  { value: 'other', label: 'Other' },
];

/**
 * Get the display label for a property type
 * Falls back to the raw type value if not found
 */
export const getPropertyTypeLabel = (type: string): string => {
  const option = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === type);
  return option?.label || type;
};

export type OccupancyStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved';

// Public page unit display mode for properties
export type PublicUnitDisplayMode = 'all' | 'vacant' | 'custom';

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
  | 'submitted'
  | 'acknowledged'
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
  user_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  organization_name?: string;
  selected_tier?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  organization_id?: string | null;  // Optional - businesses are now top-level entities
  owner_user_id?: string;  // Direct owner of the business
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
  is_default?: boolean;  // True for user's primary business
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Public page settings (v5.1.0+)
  public_page_enabled?: boolean;
  public_page_slug?: string;
  public_page_title?: string;
  public_page_description?: string;
  public_page_logo_url?: string;
  public_page_header_image_url?: string;
  public_page_contact_email?: string;
  public_page_contact_phone?: string;
  public_page_custom_content?: any;
  // Template cascade (v5.6.0+)
  default_agreement_template_id?: string;
  default_application_template_id?: string;
  // Online applications (v5.7.0+)
  accept_online_applications?: boolean;
}

export interface Property {
  id: string;
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  // Public page settings (v5.6.0+)
  public_page_enabled?: boolean;
  public_page_slug?: string;
  public_unit_display_mode?: PublicUnitDisplayMode;
  default_agreement_template_id?: string;
  default_application_template_id?: string;
  // Online applications (v5.7.0+)
  accept_online_applications?: boolean | null;
}

export interface Unit {
  id: string;
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  // Public page settings (v5.6.0+)
  public_page_enabled?: boolean;
  default_agreement_template_id?: string;
  default_application_template_id?: string;
  // Online applications and visibility (v5.7.0+)
  accept_online_applications?: boolean | null;
  public_page_visibility_override?: 'inherit' | 'always_show' | 'never_show';
}

export type PublicPageVisibilityOverride = 'inherit' | 'always_show' | 'never_show';

export interface Tenant {
  id: string;
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  organization_id?: string | null;  // Optional - businesses are now top-level entities
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
  business_id: string;
  organization_id?: string;
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
  business_id?: string | null;  // Primary business association (preferred)
  organization_id?: string | null;  // Legacy - businesses are now top-level entities
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

// Business User Types (v5.2.0+)
export type BusinessUserRole = 'user' | 'tenant' | 'applicant' | 'property_owner';
export type BusinessUserStatus = 'pending' | 'active' | 'suspended' | 'inactive';

// User Invitation Types (v5.5.0+)
export type InvitationType = 'property_owner' | 'tenant' | 'team_member';
// Note: InvitationStatus is already defined above on line 22

export interface UserInvitation {
  id: string;
  business_id: string;
  invitation_type: InvitationType;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  invitation_token: string;
  unit_id?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent_cents?: number;
  security_deposit_cents?: number;
  status: InvitationStatus;
  expires_at: string;
  accepted_at?: string;
  auth_user_id?: string;
  business_user_id?: string;
  tenant_id?: string;
  client_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  business?: Business;
  unit?: Unit;
}

export interface ValidatedInvitation {
  id: string;
  business_id: string;
  business_name: string;
  invitation_type: InvitationType;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  unit_id?: string;
  unit_number?: string;
  property_name?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent_cents?: number;
  status: InvitationStatus;
  expires_at: string;
}

export interface BusinessUser {
  id: string;
  business_id: string;
  user_id: string;
  auth_user_id?: string; // Links to Supabase auth user
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: BusinessUserRole;
  status: BusinessUserStatus;
  tenant_id?: string; // Links to tenant record when promoted
  notes?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  business?: Business;
  tenant?: Tenant;
}

export interface BusinessUserMessage {
  id: string;
  business_id: string;
  business_user_id: string;
  sender_type: 'user' | 'manager';
  sender_id: string;
  subject?: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  parent_message_id?: string;
  application_id?: string;
  created_at: string;
}

// ============================================
// Affiliate Marketing System Types
// ============================================

export type AffiliateStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type AffiliatePayoutMethod = 'paypal' | 'bank_transfer' | 'check' | 'e_transfer';
export type AffiliateCommissionType = 'one_time' | 'recurring';
export type AffiliateCommissionStatus = 'earned' | 'pending_payout' | 'paid' | 'refunded' | 'cancelled';
export type AffiliatePayoutStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AffiliatePayoutSchedule = 'weekly' | 'biweekly' | 'monthly';

export interface AffiliateSettings {
  id: string;
  commission_type: AffiliateCommissionType;
  commission_percentage: number; // Basis points (2000 = 20%)
  recurring_months: number | null; // NULL = lifetime
  minimum_payout_cents: number;
  payout_schedule: AffiliatePayoutSchedule;
  attribution_window_days: number;
  cookie_duration_days: number;
  program_active: boolean;
  require_approval: boolean;
  allow_self_referral: boolean;
  created_at: string;
  updated_at: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  company_name?: string;
  website_url?: string;
  promotional_methods?: string;
  status: AffiliateStatus;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  suspension_reason?: string;
  payout_method?: AffiliatePayoutMethod;
  payout_email?: string;
  bank_details?: Record<string, unknown>;
  total_clicks: number;
  total_signups: number;
  total_paid_signups: number;
  total_commission_earned_cents: number;
  total_commission_paid_cents: number;
  pending_commission_cents: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id?: string;
  referred_organization_id?: string;
  click_id: string;
  clicked_at: string;
  ip_address?: string;
  user_agent?: string;
  landing_page?: string;
  referrer_url?: string;
  signup_at?: string;
  first_payment_at?: string;
  first_payment_amount_cents?: number;
  converted: boolean;
  attribution_expires_at: string;
  created_at: string;
  // Joined data
  referred_user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  referred_organization?: {
    name: string;
  };
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  subscription_payment_id?: string;
  billing_month: string;
  subscription_amount_cents: number;
  commission_percentage: number;
  commission_amount_cents: number;
  status: AffiliateCommissionStatus;
  payout_id?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  referral?: AffiliateReferral;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount_cents: number;
  commission_count: number;
  period_start: string;
  period_end: string;
  status: AffiliatePayoutStatus;
  payout_method: string;
  transaction_id?: string;
  failure_reason?: string;
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  affiliate?: Affiliate;
}

export interface AffiliateApplication {
  company_name?: string;
  website_url?: string;
  promotional_methods?: string;
  payout_method: AffiliatePayoutMethod;
  payout_email: string;
}

export interface AffiliateStats {
  total_clicks: number;
  total_signups: number;
  total_paid_signups: number;
  conversion_rate: number;
  total_commission_earned_cents: number;
  total_commission_paid_cents: number;
  pending_commission_cents: number;
  this_month_clicks: number;
  this_month_signups: number;
  this_month_commission_cents: number;
}

export interface AffiliateDashboardData {
  affiliate: Affiliate;
  stats: AffiliateStats;
  recent_referrals: AffiliateReferral[];
  recent_commissions: AffiliateCommission[];
  settings: AffiliateSettings;
}

export type AgreementType = 'lease' | 'sublease' | 'month-to-month' | 'short-term';
export type PaymentFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

export interface AgreementTemplate {
  id: string;
  business_id: string;
  template_name: string;
  description?: string;
  agreement_type: AgreementType;
  agreement_title: string;
  template_content: string;
  default_lease_term_months?: number;
  default_rent_amount?: number;
  default_security_deposit?: number;
  payment_frequency: PaymentFrequency;
  pet_policy?: string;
  house_rules?: string;
  cancellation_policy?: string;
  damage_policy?: string;
  refund_policy?: string;
  utilities_included?: string[];
  amenities?: string[];
  parking_details?: string;
  max_occupants?: number;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// ERP Accounting System Types (v5.8.0+)
// ============================================

// Currency Types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  source: 'manual' | 'api' | 'bank';
  created_at: string;
  created_by?: string;
}

// Tax Types
export interface TaxRate {
  id: string;
  business_id?: string;
  jurisdiction: string;
  region_code?: string;
  tax_name: string;
  tax_code: string;
  rate_basis_points: number;
  component_rates?: Array<{ name: string; rate: number }>;
  is_recoverable: boolean;
  is_compound: boolean;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Accounting Settings
export type AccountingMethod = 'cash' | 'accrual';
export type TaxJurisdiction = 'CA' | 'US' | 'UK' | 'AU' | 'NZ' | 'OTHER';

export interface BusinessAccountingSettings {
  id: string;
  business_id: string;
  base_currency: string;
  display_currency_symbol: boolean;
  fiscal_year_start_month: number;
  fiscal_year_start_day: number;
  accounting_method: AccountingMethod;
  tax_jurisdiction: TaxJurisdiction;
  tax_region_code?: string;
  default_tax_rate_id?: string;
  auto_post_rent_payments: boolean;
  auto_post_expenses: boolean;
  auto_post_security_deposits: boolean;
  require_journal_approval: boolean;
  approval_threshold_cents: number;
  next_journal_number: number;
  journal_number_prefix: string;
  next_vendor_number: number;
  vendor_number_prefix: string;
  current_fiscal_year?: number;
  last_closed_period?: number;
  created_at: string;
  updated_at: string;
}

// GL Account Types
export type GLAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type GLAccountSubtype =
  // Asset subtypes
  | 'cash' | 'bank' | 'accounts_receivable' | 'inventory' | 'prepaid'
  | 'fixed_asset' | 'accumulated_depreciation' | 'other_asset'
  // Liability subtypes
  | 'accounts_payable' | 'credit_card' | 'current_liability'
  | 'long_term_liability' | 'other_liability'
  // Equity subtypes
  | 'owner_equity' | 'retained_earnings' | 'common_stock' | 'other_equity'
  // Revenue subtypes
  | 'operating_revenue' | 'other_revenue'
  // Expense subtypes
  | 'cost_of_goods' | 'operating_expense' | 'payroll_expense'
  | 'depreciation' | 'interest_expense' | 'tax_expense' | 'other_expense';

export type NormalBalance = 'debit' | 'credit';

export interface GLAccount {
  id: string;
  business_id: string;
  account_number: string;
  account_name: string;
  account_type: GLAccountType;
  account_subtype?: GLAccountSubtype;
  parent_account_id?: string;
  hierarchy_level: number;
  full_account_path?: string;
  normal_balance: NormalBalance;
  currency_code?: string;
  is_active: boolean;
  is_system: boolean;
  is_header_account: boolean;
  is_bank_account: boolean;
  is_control_account: boolean;
  bank_name?: string;
  bank_account_number_masked?: string;
  bank_routing_number_masked?: string;
  default_tax_rate_id?: string;
  current_balance_cents: number;
  ytd_debit_cents: number;
  ytd_credit_cents: number;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface GLAccountTemplate {
  id: string;
  template_name: string;
  jurisdiction: string;
  industry: string;
  accounts: Array<{
    number: string;
    name: string;
    type: GLAccountType;
    subtype?: GLAccountSubtype;
    normal_balance: NormalBalance;
    parent?: string;
    is_header?: boolean;
  }>;
  is_active: boolean;
  created_at: string;
}

// Vendor Types
export type VendorType =
  | 'contractor' | 'supplier' | 'utility' | 'government'
  | 'professional_service' | 'property_management'
  | 'insurance' | 'bank' | 'other';

export type VendorPaymentTerms =
  | 'due_on_receipt' | 'net_10' | 'net_15' | 'net_30'
  | 'net_45' | 'net_60' | 'net_90' | 'custom';

export type VendorTaxIdType = 'bn' | 'gst' | 'ein' | 'ssn' | 'vat' | 'abn' | 'other';

export type VendorTaxFormType = '1099-MISC' | '1099-NEC' | '1099-INT' | '1099-DIV' | 'T5018' | 'T4A';

export interface Vendor {
  id: string;
  business_id: string;
  vendor_code?: string;
  vendor_name: string;
  legal_name?: string;
  vendor_type: VendorType;
  contact_name?: string;
  email?: string;
  phone?: string;
  fax?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country: string;
  tax_jurisdiction?: string;
  tax_id?: string;
  tax_id_type?: VendorTaxIdType;
  is_1099_eligible: boolean;
  is_t5018_eligible: boolean;
  form_1099_type?: VendorTaxFormType;
  w9_on_file: boolean;
  w9_received_date?: string;
  currency_code: string;
  payment_terms: VendorPaymentTerms;
  custom_payment_days?: number;
  default_expense_account_id?: string;
  bank_name?: string;
  bank_account_number_encrypted?: string;
  bank_routing_number_encrypted?: string;
  accepts_ach: boolean;
  accepts_check: boolean;
  total_paid_ytd_cents: number;
  total_paid_all_time_cents: number;
  last_payment_date?: string;
  open_balance_cents: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type VendorTaxFormStatus = 'pending' | 'generated' | 'sent' | 'filed' | 'corrected';

export interface VendorTaxForm {
  id: string;
  vendor_id: string;
  business_id: string;
  tax_year: number;
  form_type: VendorTaxFormType;
  total_payments_cents: number;
  box_amounts?: Record<string, number>;
  status: VendorTaxFormStatus;
  generated_at?: string;
  sent_at?: string;
  filed_at?: string;
  filed_by?: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
}

// Journal Types
export type JournalType =
  | 'general' | 'sales' | 'purchases' | 'cash_receipts'
  | 'cash_payments' | 'payroll' | 'adjusting'
  | 'closing' | 'reversing' | 'opening';

export type JournalSourceType =
  | 'manual' | 'rent_payment' | 'expense' | 'security_deposit'
  | 'late_fee' | 'refund' | 'transfer' | 'depreciation'
  | 'bank_fee' | 'interest' | 'adjustment' | 'import'
  | 'reversal' | 'special_transaction';

export type JournalStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'void' | 'reversed';

export interface GLJournal {
  id: string;
  business_id: string;
  journal_number: string;
  journal_date: string;
  journal_type: JournalType;
  source_type?: JournalSourceType;
  source_id?: string;
  source_reference?: string;
  transaction_currency: string;
  exchange_rate: number;
  exchange_rate_date?: string;
  status: JournalStatus;
  total_debit_cents: number;
  total_credit_cents: number;
  base_total_debit_cents: number;
  base_total_credit_cents: number;
  memo?: string;
  reference?: string;
  is_reversed: boolean;
  reversed_by_journal_id?: string;
  reverses_journal_id?: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  next_occurrence_date?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  posted_by?: string;
  posted_at?: string;
  voided_by?: string;
  voided_at?: string;
  void_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  entries?: GLJournalEntry[];
}

export interface GLJournalEntry {
  id: string;
  journal_id: string;
  account_id: string;
  line_number: number;
  debit_cents: number;
  credit_cents: number;
  base_debit_cents: number;
  base_credit_cents: number;
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
  vendor_id?: string;
  tax_rate_id?: string;
  tax_amount_cents: number;
  base_tax_amount_cents: number;
  description?: string;
  reference?: string;
  is_reconciled: boolean;
  reconciled_at?: string;
  reconciliation_id?: string;
  created_at: string;
  // Joined data
  account?: GLAccount;
  property?: Property;
  unit?: Unit;
  vendor?: Vendor;
}

// GL Ledger (Posted Transactions)
export interface GLLedgerEntry {
  id: string;
  business_id: string;
  account_id: string;
  journal_id: string;
  journal_entry_id: string;
  transaction_date: string;
  debit_cents: number;
  credit_cents: number;
  running_balance_cents: number;
  property_id?: string;
  unit_id?: string;
  fiscal_year: number;
  fiscal_period: number;
  created_at: string;
}

// Fiscal Period Types
export type FiscalPeriodStatus = 'future' | 'open' | 'closing' | 'closed';

export interface FiscalPeriod {
  id: string;
  business_id: string;
  fiscal_year: number;
  period_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: FiscalPeriodStatus;
  is_adjusting_period: boolean;
  closed_at?: string;
  closed_by?: string;
  closing_journal_id?: string;
  closing_balances?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Budget Types
export type BudgetType = 'annual' | 'quarterly' | 'monthly' | 'project' | 'property';
export type BudgetStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'closed' | 'archived';

export interface Budget {
  id: string;
  business_id: string;
  budget_name: string;
  budget_code?: string;
  fiscal_year: number;
  budget_type: BudgetType;
  property_id?: string;
  currency_code: string;
  status: BudgetStatus;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  account_id: string;
  period_1_cents: number;
  period_2_cents: number;
  period_3_cents: number;
  period_4_cents: number;
  period_5_cents: number;
  period_6_cents: number;
  period_7_cents: number;
  period_8_cents: number;
  period_9_cents: number;
  period_10_cents: number;
  period_11_cents: number;
  period_12_cents: number;
  annual_total_cents: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  account?: GLAccount;
}

// Accounting Permission Types
export interface AccountingPermissions {
  id: string;
  user_id: string;
  business_id: string;
  can_view_gl: boolean;
  can_view_reports: boolean;
  can_view_budgets: boolean;
  can_view_vendors: boolean;
  can_create_journals: boolean;
  can_edit_journals: boolean;
  can_manage_accounts: boolean;
  can_manage_vendors: boolean;
  can_manage_budgets: boolean;
  can_post_journals: boolean;
  can_approve_journals: boolean;
  can_void_journals: boolean;
  can_close_periods: boolean;
  can_reopen_periods: boolean;
  can_modify_settings: boolean;
  can_export: boolean;
  can_export_tax_forms: boolean;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export type AccountantAccessLevel = 'view_only' | 'standard' | 'full' | 'admin';

export interface AccountantAssignment {
  id: string;
  user_id: string;
  organization_id?: string;
  business_id?: string;
  role_name: string;
  access_level: AccountantAccessLevel;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Export Types
export type AccountingExportFormat =
  | 'quickbooks_iif' | 'quickbooks_csv' | 'quickbooks_online'
  | 'sage_csv' | 'simply_csv'
  | 'oracle_xml' | 'sap_xml'
  | 'saft_xml'
  | 'csv' | 'json' | 'excel' | 'pdf';

export type AccountingExportType =
  | 'chart_of_accounts' | 'journal_entries' | 'general_ledger'
  | 'trial_balance' | 'balance_sheet' | 'income_statement'
  | 'cash_flow' | 'budget_report' | 'budget_variance'
  | 'vendor_list' | 'vendor_1099' | 'vendor_t5018'
  | 'ar_aging' | 'ap_aging' | 'full_backup';

export type AccountingExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface GLExportHistory {
  id: string;
  business_id: string;
  export_format: AccountingExportFormat;
  export_type: AccountingExportType;
  start_date?: string;
  end_date?: string;
  fiscal_year?: number;
  file_name: string;
  file_size_bytes?: number;
  record_count?: number;
  status: AccountingExportStatus;
  error_message?: string;
  file_url?: string;
  expires_at?: string;
  exported_at: string;
  exported_by?: string;
}

// Financial Report Types
export interface TrialBalanceAccount {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: GLAccountType;
  debit_balance_cents: number;
  credit_balance_cents: number;
  // Aliases for convenience
  debit_cents?: number;
  credit_cents?: number;
}

export interface TrialBalance {
  as_of_date: string;
  business_id: string;
  currency_code: string;
  accounts: TrialBalanceAccount[];
  rows?: TrialBalanceAccount[]; // Alias for accounts
  total_debits_cents: number;
  total_credits_cents: number;
  is_balanced: boolean;
  property_id?: string;
  property_name?: string;
  generated_at?: string;
}

export interface BalanceSheetSection {
  title: string;
  accounts: Array<{
    account_id: string;
    account_number: string;
    account_name: string;
    balance_cents: number;
    children?: BalanceSheetSection['accounts'];
  }>;
  total_cents: number;
  subsections?: BalanceSheetSection[];
}

export interface BalanceSheet {
  as_of_date: string;
  business_id: string;
  currency_code: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_assets_cents: number;
  total_liabilities_cents: number;
  total_equity_cents: number;
  total_liabilities_and_equity_cents: number;
  total_liabilities_equity_cents?: number; // Alias
  is_balanced: boolean;
  property_id?: string;
  property_name?: string;
  prior_year_assets?: number;
  prior_year_liabilities?: number;
  prior_year_equity?: number;
  generated_at?: string;
}

export interface IncomeStatementSection {
  title: string;
  accounts: Array<{
    account_id: string;
    account_number: string;
    account_name: string;
    amount_cents: number;
    children?: IncomeStatementSection['accounts'];
  }>;
  total_cents: number;
  subsections?: IncomeStatementSection[];
}

export interface IncomeStatement {
  start_date: string;
  end_date: string;
  business_id: string;
  currency_code: string;
  revenue: IncomeStatementSection;
  expenses: IncomeStatementSection;
  operating_expenses?: IncomeStatementSection;
  other_expenses?: IncomeStatementSection;
  total_revenue_cents: number;
  total_expenses_cents: number;
  gross_profit_cents?: number;
  operating_income_cents?: number;
  net_income_cents: number;
  // Optional property-level breakdown
  property_id?: string;
  property_name?: string;
  // Prior period comparisons
  prior_period_revenue?: IncomeStatementSection;
  prior_period_expenses?: IncomeStatementSection;
  prior_year_revenue?: IncomeStatementSection;
  prior_year_expenses?: IncomeStatementSection;
  generated_at?: string;
}

export interface CashFlowStatement {
  start_date: string;
  end_date: string;
  business_id: string;
  currency_code?: string;
  property_id?: string;
  operating_activities: {
    receipts: { items: Array<{ description: string; amount_cents: number }>; total_cents: number };
    payments: { items: Array<{ description: string; amount_cents: number }>; total_cents: number };
    net_cents: number;
  };
  investing_activities: {
    items: Array<{ description: string; amount_cents: number }>;
    total_cents: number;
  };
  financing_activities: {
    items: Array<{ description: string; amount_cents: number }>;
    total_cents: number;
  };
  net_change_cents: number;
  opening_cash_cents: number;
  closing_cash_cents: number;
  // Aliases for backwards compatibility
  beginning_cash_cents?: number;
  ending_cash_cents?: number;
  generated_at?: string;
}

export interface BudgetVarianceReport {
  budget_id: string;
  budget_name: string;
  fiscal_year: number;
  as_of_date: string;
  currency_code: string;
  items: Array<{
    account_id: string;
    account_number: string;
    account_name: string;
    budget_cents: number;
    actual_cents: number;
    variance_cents: number;
    variance_percentage: number;
  }>;
  total_budget_cents: number;
  total_actual_cents: number;
  total_variance_cents: number;
}

// GL Account Mapping for auto-posting
export interface GLAccountMapping {
  source_type: JournalSourceType;
  expense_category?: ExpenseCategory;
  payment_type?: PaymentType;
  debit_account_number: string;
  credit_account_number: string;
  description_template?: string;
}

// Create Journal Request
export interface CreateJournalRequest {
  journal_date: string;
  journal_type: JournalType;
  transaction_currency: string;
  memo?: string;
  reference?: string;
  entries: Array<{
    account_id: string;
    debit_cents: number;
    credit_cents: number;
    property_id?: string;
    unit_id?: string;
    tenant_id?: string;
    vendor_id?: string;
    description?: string;
  }>;
}
