import { supabase } from '../lib/supabase';
import {
  applicationTemplateService,
  ApplicationTemplate,
  ApplicationFormSchema,
  DEFAULT_APPLICATION_SCHEMA,
} from './applicationTemplateService';
import { agreementService, AgreementTemplate } from './agreementService';

// ============================================================================
// DEFAULT APPLICATION TEMPLATES
// ============================================================================

// Short-term rental application (vacation, Airbnb-style)
const SHORT_TERM_APPLICATION_SCHEMA: ApplicationFormSchema = {
  sections: [
    {
      id: 'personal_info',
      title: 'Guest Information',
      description: 'Please provide your contact information',
      fields: [
        { id: 'first_name', type: 'text', label: 'First Name', required: true },
        { id: 'last_name', type: 'text', label: 'Last Name', required: true },
        { id: 'email', type: 'email', label: 'Email Address', required: true },
        { id: 'phone', type: 'tel', label: 'Phone Number', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
      ],
    },
    {
      id: 'stay_details',
      title: 'Stay Details',
      description: 'Tell us about your planned stay',
      fields: [
        { id: 'check_in_date', type: 'date', label: 'Check-In Date', required: true },
        { id: 'check_out_date', type: 'date', label: 'Check-Out Date', required: true },
        { id: 'num_guests', type: 'number', label: 'Number of Guests', required: true, validation: { min: 1, max: 20 } },
        { id: 'guest_names', type: 'textarea', label: 'Names of All Guests', required: true },
        { id: 'purpose_of_stay', type: 'select', label: 'Purpose of Stay', required: true, options: ['Vacation', 'Business', 'Family Visit', 'Event/Wedding', 'Other'] },
        { id: 'special_requests', type: 'textarea', label: 'Special Requests or Needs', required: false },
      ],
    },
    {
      id: 'emergency_contact',
      title: 'Emergency Contact',
      description: 'Please provide an emergency contact',
      fields: [
        { id: 'emergency_contact_name', type: 'text', label: 'Emergency Contact Name', required: true },
        { id: 'emergency_contact_phone', type: 'tel', label: 'Emergency Contact Phone', required: true },
        { id: 'emergency_contact_relationship', type: 'text', label: 'Relationship', required: true },
      ],
    },
    {
      id: 'policies',
      title: 'House Rules Acknowledgment',
      description: 'Please confirm you understand the house rules',
      fields: [
        { id: 'no_smoking', type: 'checkbox', label: 'I agree to no smoking on the property', required: true },
        { id: 'no_parties', type: 'checkbox', label: 'I agree to no parties or events without prior approval', required: true },
        { id: 'quiet_hours', type: 'checkbox', label: 'I agree to observe quiet hours (10pm - 8am)', required: true },
        { id: 'pet_policy_acknowledged', type: 'checkbox', label: 'I understand and agree to the pet policy', required: true },
      ],
    },
  ],
};

// Student housing application
const STUDENT_APPLICATION_SCHEMA: ApplicationFormSchema = {
  sections: [
    {
      id: 'personal_info',
      title: 'Student Information',
      description: 'Please provide your basic information',
      fields: [
        { id: 'first_name', type: 'text', label: 'First Name', required: true },
        { id: 'last_name', type: 'text', label: 'Last Name', required: true },
        { id: 'email', type: 'email', label: 'Email Address', required: true },
        { id: 'phone', type: 'tel', label: 'Phone Number', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
        { id: 'student_id', type: 'text', label: 'Student ID Number', required: true },
      ],
    },
    {
      id: 'academic_info',
      title: 'Academic Information',
      description: 'Tell us about your studies',
      fields: [
        { id: 'school_name', type: 'text', label: 'School/University Name', required: true },
        { id: 'enrollment_status', type: 'select', label: 'Enrollment Status', required: true, options: ['Full-Time', 'Part-Time', 'Graduate', 'PhD Candidate'] },
        { id: 'year_of_study', type: 'select', label: 'Year of Study', required: true, options: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+', 'Graduate', 'Post-Graduate'] },
        { id: 'major_field', type: 'text', label: 'Major/Field of Study', required: true },
        { id: 'expected_graduation', type: 'date', label: 'Expected Graduation Date', required: true },
      ],
    },
    {
      id: 'financial_info',
      title: 'Financial Information',
      description: 'How will you pay for rent?',
      fields: [
        { id: 'funding_source', type: 'select', label: 'Primary Funding Source', required: true, options: ['Parents/Family', 'Student Loans', 'Scholarship', 'Part-Time Work', 'Savings', 'Multiple Sources'] },
        { id: 'has_employment', type: 'select', label: 'Do you have employment?', required: true, options: ['No', 'Part-Time', 'Full-Time', 'Work-Study'] },
        { id: 'employer', type: 'text', label: 'Employer (if applicable)', required: false },
        { id: 'monthly_income', type: 'number', label: 'Monthly Income ($)', required: false },
      ],
    },
    {
      id: 'guarantor_info',
      title: 'Guarantor/Co-Signer Information',
      description: 'Parent or guardian who will guarantee the lease',
      fields: [
        { id: 'guarantor_name', type: 'text', label: 'Guarantor Full Name', required: true },
        { id: 'guarantor_relationship', type: 'text', label: 'Relationship to Applicant', required: true },
        { id: 'guarantor_email', type: 'email', label: 'Guarantor Email', required: true },
        { id: 'guarantor_phone', type: 'tel', label: 'Guarantor Phone', required: true },
        { id: 'guarantor_address', type: 'textarea', label: 'Guarantor Address', required: true },
        { id: 'guarantor_employer', type: 'text', label: 'Guarantor Employer', required: true },
        { id: 'guarantor_income', type: 'number', label: 'Guarantor Annual Income ($)', required: true },
      ],
    },
    {
      id: 'move_in_details',
      title: 'Move-In Details',
      description: 'Tell us about your intended move',
      fields: [
        { id: 'desired_move_in_date', type: 'date', label: 'Desired Move-In Date', required: true },
        { id: 'lease_term', type: 'select', label: 'Preferred Lease Term', required: true, options: ['4 months (Semester)', '8 months (Academic Year)', '12 months'] },
        { id: 'num_occupants', type: 'number', label: 'Number of Occupants', required: true, validation: { min: 1, max: 4 } },
      ],
    },
    {
      id: 'emergency_contact',
      title: 'Emergency Contact',
      description: 'Please provide an emergency contact',
      fields: [
        { id: 'emergency_contact_name', type: 'text', label: 'Emergency Contact Name', required: true },
        { id: 'emergency_contact_phone', type: 'tel', label: 'Emergency Contact Phone', required: true },
        { id: 'emergency_contact_relationship', type: 'text', label: 'Relationship', required: true },
      ],
    },
  ],
};

// Corporate/Professional application
const CORPORATE_APPLICATION_SCHEMA: ApplicationFormSchema = {
  sections: [
    {
      id: 'personal_info',
      title: 'Applicant Information',
      description: 'Please provide your contact information',
      fields: [
        { id: 'first_name', type: 'text', label: 'First Name', required: true },
        { id: 'last_name', type: 'text', label: 'Last Name', required: true },
        { id: 'email', type: 'email', label: 'Email Address', required: true },
        { id: 'phone', type: 'tel', label: 'Phone Number', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
      ],
    },
    {
      id: 'company_info',
      title: 'Company/Corporate Information',
      description: 'Details about the sponsoring company',
      fields: [
        { id: 'company_name', type: 'text', label: 'Company Name', required: true },
        { id: 'company_address', type: 'textarea', label: 'Company Address', required: true },
        { id: 'hr_contact_name', type: 'text', label: 'HR/Admin Contact Name', required: true },
        { id: 'hr_contact_email', type: 'email', label: 'HR/Admin Contact Email', required: true },
        { id: 'hr_contact_phone', type: 'tel', label: 'HR/Admin Contact Phone', required: true },
        { id: 'relocation_letter', type: 'checkbox', label: 'Company will provide relocation letter', required: false },
      ],
    },
    {
      id: 'employment',
      title: 'Employment Details',
      description: 'Your position and income information',
      fields: [
        { id: 'job_title', type: 'text', label: 'Job Title', required: true },
        { id: 'department', type: 'text', label: 'Department', required: false },
        { id: 'employment_start_date', type: 'date', label: 'Employment Start Date', required: true },
        { id: 'employment_type', type: 'select', label: 'Employment Type', required: true, options: ['Permanent', 'Contract', 'Temporary Assignment', 'Relocation'] },
        { id: 'annual_salary', type: 'number', label: 'Annual Salary ($)', required: true },
        { id: 'direct_manager_name', type: 'text', label: 'Direct Manager Name', required: false },
        { id: 'direct_manager_phone', type: 'tel', label: 'Direct Manager Phone', required: false },
      ],
    },
    {
      id: 'rental_history',
      title: 'Previous Residence',
      description: 'Your most recent residence',
      fields: [
        { id: 'current_address', type: 'textarea', label: 'Current/Previous Address', required: true },
        { id: 'current_landlord_name', type: 'text', label: 'Landlord/Property Manager Name', required: false },
        { id: 'current_landlord_phone', type: 'tel', label: 'Landlord/Property Manager Phone', required: false },
        { id: 'time_at_address', type: 'text', label: 'Time at This Address', required: true },
        { id: 'reason_for_moving', type: 'textarea', label: 'Reason for Moving', required: true },
      ],
    },
    {
      id: 'move_in_details',
      title: 'Move-In Details',
      description: 'Tell us about your intended move',
      fields: [
        { id: 'desired_move_in_date', type: 'date', label: 'Desired Move-In Date', required: true },
        { id: 'lease_term', type: 'select', label: 'Preferred Lease Term', required: true, options: ['6 months', '12 months', '18 months', '24 months'] },
        { id: 'num_occupants', type: 'number', label: 'Number of Occupants', required: true, validation: { min: 1, max: 10 } },
        { id: 'occupant_names', type: 'textarea', label: 'Names of All Occupants', required: false },
        { id: 'furnished_preference', type: 'select', label: 'Furnished Preference', required: true, options: ['Furnished', 'Unfurnished', 'Either'] },
      ],
    },
    {
      id: 'emergency_contact',
      title: 'Emergency Contact',
      description: 'Please provide an emergency contact',
      fields: [
        { id: 'emergency_contact_name', type: 'text', label: 'Emergency Contact Name', required: true },
        { id: 'emergency_contact_phone', type: 'tel', label: 'Emergency Contact Phone', required: true },
        { id: 'emergency_contact_relationship', type: 'text', label: 'Relationship', required: true },
      ],
    },
  ],
};

// ============================================================================
// DEFAULT AGREEMENT TEMPLATES
// ============================================================================

const STANDARD_LEASE_TEMPLATE = `RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:

LANDLORD:
{{LANDLORD_NAME}}
{{LANDLORD_EMAIL}}
{{LANDLORD_PHONE}}

TENANT:
{{TENANT_NAME}}
{{TENANT_EMAIL}}
{{TENANT_PHONE}}

PROPERTY:
{{PROPERTY_ADDRESS}}
Unit: {{UNIT_NUMBER}}

1. LEASE TERM
This lease shall commence on {{LEASE_START_DATE}} and shall terminate on {{LEASE_END_DATE}}, unless renewed or terminated earlier in accordance with this Agreement.

2. RENT
Monthly Rent: {{MONTHLY_RENT}}
Payment Due: On the {{PAYMENT_DUE_DAY}} day of each month
Payment Method: As agreed with the Landlord

3. SECURITY DEPOSIT
Security Deposit Amount: {{SECURITY_DEPOSIT}}
The security deposit will be held by the Landlord and returned within the time period required by law after the termination of this lease, less any deductions for unpaid rent, damages beyond normal wear and tear, or other amounts owed by the Tenant.

4. LATE FEES
If rent is not received by the {{LATE_FEE_GRACE_DAYS}} day of the month, a late fee of {{LATE_FEE_AMOUNT}} will be charged.

5. UTILITIES
The following utilities are included in the rent: {{UTILITIES_INCLUDED}}
All other utilities are the responsibility of the Tenant.

6. OCCUPANTS
The premises shall be occupied only by the following persons: {{TENANT_NAME}} and any additional approved occupants.
Maximum occupancy: {{MAX_OCCUPANTS}} persons.

7. PETS
{{PET_POLICY}}

8. MAINTENANCE AND REPAIRS
Tenant shall maintain the premises in a clean and sanitary condition and shall not make any alterations without the prior written consent of the Landlord.

9. HOUSE RULES
{{HOUSE_RULES}}

10. TERMINATION
Either party may terminate this Agreement by providing written notice as required by law. Upon termination, Tenant shall return all keys and leave the premises in the same condition as received, except for normal wear and tear.

11. GOVERNING LAW
This Agreement shall be governed by the laws of the applicable jurisdiction.

SIGNATURES

Landlord Signature: _________________________ Date: _____________

Tenant Signature: _________________________ Date: _____________`;

const MONTH_TO_MONTH_TEMPLATE = `MONTH-TO-MONTH RENTAL AGREEMENT

This Month-to-Month Rental Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:

LANDLORD:
{{LANDLORD_NAME}}
{{LANDLORD_EMAIL}}
{{LANDLORD_PHONE}}

TENANT:
{{TENANT_NAME}}
{{TENANT_EMAIL}}
{{TENANT_PHONE}}

PROPERTY:
{{PROPERTY_ADDRESS}}
Unit: {{UNIT_NUMBER}}

1. RENTAL TERM
This is a month-to-month tenancy beginning on {{LEASE_START_DATE}}. Either party may terminate this Agreement by providing 30 days' written notice prior to the end of any rental period.

2. RENT
Monthly Rent: {{MONTHLY_RENT}}
Payment Due: On the {{PAYMENT_DUE_DAY}} day of each month

3. SECURITY DEPOSIT
Security Deposit Amount: {{SECURITY_DEPOSIT}}

4. LATE FEES
Late fee of {{LATE_FEE_AMOUNT}} if rent is not received by the {{LATE_FEE_GRACE_DAYS}} day of the month.

5. UTILITIES
Included: {{UTILITIES_INCLUDED}}
All other utilities are Tenant's responsibility.

6. OCCUPANTS
Maximum occupancy: {{MAX_OCCUPANTS}} persons.

7. PETS
{{PET_POLICY}}

8. HOUSE RULES
{{HOUSE_RULES}}

9. NOTICE TO TERMINATE
Either party must provide at least 30 days' written notice before the end of any monthly period to terminate this Agreement.

10. GENERAL TERMS
All other terms and conditions of a standard residential tenancy shall apply.

SIGNATURES

Landlord Signature: _________________________ Date: _____________

Tenant Signature: _________________________ Date: _____________`;

const SHORT_TERM_RENTAL_TEMPLATE = `SHORT-TERM RENTAL AGREEMENT

This Short-Term Rental Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:

PROPERTY OWNER/HOST:
{{LANDLORD_NAME}}
{{LANDLORD_EMAIL}}
{{LANDLORD_PHONE}}

GUEST:
{{TENANT_NAME}}
{{TENANT_EMAIL}}
{{TENANT_PHONE}}

PROPERTY:
{{PROPERTY_ADDRESS}}
Unit: {{UNIT_NUMBER}}

1. RENTAL PERIOD
Check-In Date: {{LEASE_START_DATE}}
Check-Out Date: {{LEASE_END_DATE}}
Check-In Time: 3:00 PM
Check-Out Time: 11:00 AM

2. RENTAL RATE
Total Rental Amount: {{MONTHLY_RENT}}
Payment is due in full prior to check-in.

3. SECURITY/DAMAGE DEPOSIT
Damage Deposit: {{SECURITY_DEPOSIT}}
The damage deposit will be refunded within 7 days after check-out, less any deductions for damages or additional cleaning required.

4. MAXIMUM OCCUPANCY
Maximum guests allowed: {{MAX_OCCUPANTS}}

5. CANCELLATION POLICY
{{CANCELLATION_POLICY}}

6. HOUSE RULES
{{HOUSE_RULES}}

- No smoking on the premises
- No parties or events without prior approval
- Quiet hours: 10:00 PM - 8:00 AM
- No unregistered guests overnight
- Clean up after yourselves; leave the property in reasonable condition

7. PETS
{{PET_POLICY}}

8. DAMAGES
Guest agrees to report any damages or issues immediately. Guest is responsible for any damages caused during the stay beyond normal wear and tear.

9. REFUND POLICY
{{REFUND_POLICY}}

10. LIABILITY
Guest assumes all risks associated with the rental property. Host is not liable for any injury, loss, or damage to Guest or Guest's belongings.

11. ACCEPTANCE
By signing below, Guest agrees to all terms and conditions of this Agreement.

SIGNATURES

Host Signature: _________________________ Date: _____________

Guest Signature: _________________________ Date: _____________`;

const SUBLEASE_TEMPLATE = `SUBLEASE AGREEMENT

This Sublease Agreement ("Agreement") is entered into on {{AGREEMENT_DATE}}, by and between:

ORIGINAL TENANT (SUBLESSOR):
{{LANDLORD_NAME}}
{{LANDLORD_EMAIL}}
{{LANDLORD_PHONE}}

SUBTENANT (SUBLESSEE):
{{TENANT_NAME}}
{{TENANT_EMAIL}}
{{TENANT_PHONE}}

PROPERTY:
{{PROPERTY_ADDRESS}}
Unit: {{UNIT_NUMBER}}

1. SUBLEASE TERM
This sublease shall commence on {{LEASE_START_DATE}} and shall terminate on {{LEASE_END_DATE}}.

2. RENT
Monthly Rent: {{MONTHLY_RENT}}
Payment Due: On the {{PAYMENT_DUE_DAY}} day of each month
Payment shall be made to the Sublessor.

3. SECURITY DEPOSIT
Security Deposit Amount: {{SECURITY_DEPOSIT}}

4. ORIGINAL LEASE
This sublease is subject to all terms and conditions of the original lease agreement between the Sublessor and the Landlord/Property Owner. The Subtenant agrees to comply with all terms of the original lease.

5. LANDLORD APPROVAL
☐ Landlord approval has been obtained for this sublease
☐ Copy of approval attached

6. UTILITIES
Included: {{UTILITIES_INCLUDED}}

7. OCCUPANTS
Maximum occupancy: {{MAX_OCCUPANTS}} persons.

8. PETS
{{PET_POLICY}}

9. CONDITION OF PREMISES
The Subtenant acknowledges receiving the premises in good condition and agrees to return them in the same condition, except for normal wear and tear.

10. SUBLESSOR RESPONSIBILITIES
The Sublessor remains responsible to the original Landlord for all obligations under the original lease.

11. TERMINATION
This sublease shall automatically terminate on {{LEASE_END_DATE}} without notice.

SIGNATURES

Sublessor Signature: _________________________ Date: _____________

Subtenant Signature: _________________________ Date: _____________`;

// ============================================================================
// DEFAULT TEMPLATES DEFINITIONS
// ============================================================================

interface DefaultApplicationTemplate {
  template_name: string;
  description: string;
  application_type: 'standard' | 'short-term' | 'student' | 'corporate' | 'roommate' | 'co-signer';
  form_schema: ApplicationFormSchema;
  require_income_verification: boolean;
  require_employment_verification: boolean;
  require_rental_history: boolean;
  require_references: boolean;
  require_id_verification: boolean;
  require_credit_check_consent: boolean;
  require_background_check_consent: boolean;
  minimum_income_ratio: number;
  terms_and_conditions: string;
  is_default: boolean;
}

interface DefaultAgreementTemplate {
  template_name: string;
  description: string;
  agreement_type: 'lease' | 'sublease' | 'month-to-month' | 'short-term';
  agreement_title: string;
  template_content: string;
  default_lease_term_months?: number;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  pet_policy: string;
  house_rules: string;
  cancellation_policy?: string;
  refund_policy?: string;
  is_default: boolean;
}

const DEFAULT_TERMS = `By submitting this application, I certify that all information provided is true and complete to the best of my knowledge. I authorize the landlord or property manager to verify any and all information provided, including but not limited to employment, rental history, and credit history. I understand that providing false information may result in denial of my application or termination of any resulting tenancy.`;

const DEFAULT_APPLICATION_TEMPLATES: DefaultApplicationTemplate[] = [
  {
    template_name: 'Standard Rental Application',
    description: 'Comprehensive application for long-term residential rentals. Includes employment verification, rental history, references, and background screening consent.',
    application_type: 'standard',
    form_schema: DEFAULT_APPLICATION_SCHEMA,
    require_income_verification: true,
    require_employment_verification: true,
    require_rental_history: true,
    require_references: true,
    require_id_verification: false,
    require_credit_check_consent: true,
    require_background_check_consent: true,
    minimum_income_ratio: 3.0,
    terms_and_conditions: DEFAULT_TERMS,
    is_default: true,
  },
  {
    template_name: 'Short-Term/Vacation Rental',
    description: 'Streamlined application for vacation rentals, Airbnb-style stays, and short-term guests. Focuses on guest details and house rules acknowledgment.',
    application_type: 'short-term',
    form_schema: SHORT_TERM_APPLICATION_SCHEMA,
    require_income_verification: false,
    require_employment_verification: false,
    require_rental_history: false,
    require_references: false,
    require_id_verification: true,
    require_credit_check_consent: false,
    require_background_check_consent: false,
    minimum_income_ratio: 0,
    terms_and_conditions: 'By submitting this booking request, I agree to abide by all house rules and policies. I understand I am responsible for any damages caused during my stay.',
    is_default: false,
  },
  {
    template_name: 'Student Housing Application',
    description: 'Designed for student rentals near universities and colleges. Includes academic information and guarantor/co-signer section for students without income.',
    application_type: 'student',
    form_schema: STUDENT_APPLICATION_SCHEMA,
    require_income_verification: false,
    require_employment_verification: false,
    require_rental_history: false,
    require_references: false,
    require_id_verification: true,
    require_credit_check_consent: true,
    require_background_check_consent: true,
    minimum_income_ratio: 0,
    terms_and_conditions: DEFAULT_TERMS + ' A guarantor/co-signer may be required to complete a separate application.',
    is_default: false,
  },
  {
    template_name: 'Corporate/Professional Relocation',
    description: 'Application for corporate tenants, professional relocations, and employer-sponsored housing. Includes company verification and HR contact information.',
    application_type: 'corporate',
    form_schema: CORPORATE_APPLICATION_SCHEMA,
    require_income_verification: true,
    require_employment_verification: true,
    require_rental_history: true,
    require_references: false,
    require_id_verification: true,
    require_credit_check_consent: true,
    require_background_check_consent: true,
    minimum_income_ratio: 2.5,
    terms_and_conditions: DEFAULT_TERMS,
    is_default: false,
  },
];

const DEFAULT_AGREEMENT_TEMPLATES: DefaultAgreementTemplate[] = [
  {
    template_name: 'Standard 12-Month Lease',
    description: 'Traditional residential lease agreement for 12-month tenancies. Covers all standard terms including rent, security deposit, maintenance, and house rules.',
    agreement_type: 'lease',
    agreement_title: 'Residential Lease Agreement',
    template_content: STANDARD_LEASE_TEMPLATE,
    default_lease_term_months: 12,
    payment_frequency: 'monthly',
    pet_policy: 'No pets allowed without prior written approval. If pets are approved, a pet deposit may be required.',
    house_rules: 'Tenant agrees to maintain the premises in good condition, dispose of garbage properly, not disturb neighbors, and comply with all applicable laws and regulations.',
    is_default: true,
  },
  {
    template_name: 'Month-to-Month Agreement',
    description: 'Flexible rental agreement that renews monthly. Either party can terminate with 30 days notice. Ideal for tenants needing flexibility.',
    agreement_type: 'month-to-month',
    agreement_title: 'Month-to-Month Rental Agreement',
    template_content: MONTH_TO_MONTH_TEMPLATE,
    default_lease_term_months: 1,
    payment_frequency: 'monthly',
    pet_policy: 'Pets subject to approval. Pet rent may apply.',
    house_rules: 'Standard residential rules apply. Quiet hours 10pm-8am. No illegal activities.',
    is_default: false,
  },
  {
    template_name: 'Short-Term Rental Agreement',
    description: 'Agreement for vacation rentals, furnished short-stays, and temporary housing. Includes check-in/out times and cancellation policy.',
    agreement_type: 'short-term',
    agreement_title: 'Short-Term Rental Agreement',
    template_content: SHORT_TERM_RENTAL_TEMPLATE,
    default_lease_term_months: 0,
    payment_frequency: 'daily',
    pet_policy: 'No pets allowed unless specifically approved in advance. Additional cleaning fee may apply.',
    house_rules: 'No smoking. No parties without approval. Quiet hours 10pm-8am. Leave property as you found it. Report any damages immediately.',
    cancellation_policy: 'Full refund if cancelled 7+ days before check-in. 50% refund if cancelled 3-7 days before. No refund within 3 days of check-in.',
    refund_policy: 'Damage deposit refunded within 7 days of check-out if no damages are found and property is left in acceptable condition.',
    is_default: false,
  },
  {
    template_name: 'Sublease Agreement',
    description: 'Agreement for subleasing a rental unit to a subtenant. Requires original landlord approval. Sublessor remains responsible under original lease.',
    agreement_type: 'sublease',
    agreement_title: 'Sublease Agreement',
    template_content: SUBLEASE_TEMPLATE,
    default_lease_term_months: 6,
    payment_frequency: 'monthly',
    pet_policy: 'Subject to original lease terms. No additional pets without landlord approval.',
    house_rules: 'Subtenant must comply with all terms of the original lease agreement.',
    is_default: false,
  },
];

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export const defaultTemplatesService = {
  /**
   * Create all default templates for a new business
   * Call this after creating a new business
   */
  async createDefaultTemplatesForBusiness(businessId: string, userId: string): Promise<{
    applicationTemplates: ApplicationTemplate[];
    agreementTemplates: AgreementTemplate[];
  }> {
    const applicationTemplates: ApplicationTemplate[] = [];
    const agreementTemplates: AgreementTemplate[] = [];

    // Create default application templates
    for (const template of DEFAULT_APPLICATION_TEMPLATES) {
      try {
        const created = await applicationTemplateService.createTemplate({
          business_id: businessId,
          template_name: template.template_name,
          description: template.description,
          application_type: template.application_type,
          form_schema: template.form_schema,
          require_income_verification: template.require_income_verification,
          require_employment_verification: template.require_employment_verification,
          require_rental_history: template.require_rental_history,
          require_references: template.require_references,
          require_id_verification: template.require_id_verification,
          require_credit_check_consent: template.require_credit_check_consent,
          require_background_check_consent: template.require_background_check_consent,
          minimum_income_ratio: template.minimum_income_ratio,
          terms_and_conditions: template.terms_and_conditions,
          custom_questions: [],
          is_active: true,
          is_default: template.is_default,
          version: 1,
        });
        applicationTemplates.push(created);
      } catch (error) {
        console.error(`Failed to create application template "${template.template_name}":`, error);
      }
    }

    // Create default agreement templates
    for (const template of DEFAULT_AGREEMENT_TEMPLATES) {
      try {
        const { data: user } = await supabase.auth.getUser();

        const created = await agreementService.createTemplate({
          business_id: businessId,
          created_by: userId || user?.user?.id,
          template_name: template.template_name,
          description: template.description,
          agreement_type: template.agreement_type,
          agreement_title: template.agreement_title,
          template_content: template.template_content,
          default_lease_term_months: template.default_lease_term_months,
          payment_frequency: template.payment_frequency,
          pet_policy: template.pet_policy,
          house_rules: template.house_rules,
          cancellation_policy: template.cancellation_policy,
          refund_policy: template.refund_policy,
          is_active: true,
          is_default: template.is_default,
          version: 1,
        });
        agreementTemplates.push(created);
      } catch (error) {
        console.error(`Failed to create agreement template "${template.template_name}":`, error);
      }
    }

    return { applicationTemplates, agreementTemplates };
  },

  /**
   * Check if a business has default templates
   */
  async hasDefaultTemplates(businessId: string): Promise<boolean> {
    const [appTemplates, agrTemplates] = await Promise.all([
      applicationTemplateService.getTemplates({ business_id: businessId }),
      agreementService.getTemplates({ business_id: businessId }),
    ]);

    return appTemplates.length > 0 || agrTemplates.length > 0;
  },

  /**
   * Get default application template definitions (for reference)
   */
  getDefaultApplicationTemplateDefinitions(): DefaultApplicationTemplate[] {
    return DEFAULT_APPLICATION_TEMPLATES;
  },

  /**
   * Get default agreement template definitions (for reference)
   */
  getDefaultAgreementTemplateDefinitions(): DefaultAgreementTemplate[] {
    return DEFAULT_AGREEMENT_TEMPLATES;
  },
};
