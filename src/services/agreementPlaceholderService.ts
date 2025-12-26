/**
 * Agreement Placeholder Service
 *
 * Handles placeholder variables in agreement templates.
 * Placeholders use the format {{PLACEHOLDER_NAME}} and are replaced
 * with actual values when generating an agreement from a template.
 */

export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
  category: 'landlord' | 'tenant' | 'property' | 'lease' | 'dates';
  example: string;
}

export interface PlaceholderContext {
  // Landlord/Business
  landlord_name?: string;
  landlord_email?: string;
  landlord_phone?: string;
  business_name?: string;

  // Property
  property_name?: string;
  property_address?: string;
  property_address_line1?: string;
  property_city?: string;
  property_state?: string;
  property_postal_code?: string;
  unit_number?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;

  // Tenant
  tenant_name?: string;
  tenant_first_name?: string;
  tenant_last_name?: string;
  tenant_email?: string;
  tenant_phone?: string;

  // Lease terms
  start_date?: string;
  end_date?: string;
  rent_amount?: number; // in cents
  security_deposit?: number; // in cents
  payment_frequency?: string;
  lease_term_months?: number;
  payment_due_day?: number;
  late_fee_amount?: number;
  late_fee_grace_days?: number;

  // Dates
  current_date?: string;
  signature_deadline?: string;

  // Policies (from template)
  pet_policy?: string;
  house_rules?: string;
  cancellation_policy?: string;
  damage_policy?: string;
  refund_policy?: string;
  parking_details?: string;
  max_occupants?: number;
}

/**
 * All available placeholder definitions
 */
export const PLACEHOLDERS: PlaceholderDefinition[] = [
  // Landlord/Business
  {
    key: 'LANDLORD_NAME',
    label: 'Landlord Name',
    description: 'Full name of the property owner/landlord',
    category: 'landlord',
    example: 'John Smith',
  },
  {
    key: 'LANDLORD_EMAIL',
    label: 'Landlord Email',
    description: 'Email address of the landlord',
    category: 'landlord',
    example: 'landlord@example.com',
  },
  {
    key: 'LANDLORD_PHONE',
    label: 'Landlord Phone',
    description: 'Phone number of the landlord',
    category: 'landlord',
    example: '(555) 123-4567',
  },
  {
    key: 'BUSINESS_NAME',
    label: 'Business Name',
    description: 'Name of the property management business',
    category: 'landlord',
    example: 'ABC Property Management',
  },

  // Tenant
  {
    key: 'TENANT_NAME',
    label: 'Tenant Name',
    description: 'Full name of the tenant',
    category: 'tenant',
    example: 'Jane Doe',
  },
  {
    key: 'TENANT_FIRST_NAME',
    label: 'Tenant First Name',
    description: 'First name of the tenant',
    category: 'tenant',
    example: 'Jane',
  },
  {
    key: 'TENANT_LAST_NAME',
    label: 'Tenant Last Name',
    description: 'Last name of the tenant',
    category: 'tenant',
    example: 'Doe',
  },
  {
    key: 'TENANT_EMAIL',
    label: 'Tenant Email',
    description: 'Email address of the tenant',
    category: 'tenant',
    example: 'tenant@example.com',
  },
  {
    key: 'TENANT_PHONE',
    label: 'Tenant Phone',
    description: 'Phone number of the tenant',
    category: 'tenant',
    example: '(555) 987-6543',
  },

  // Property
  {
    key: 'PROPERTY_NAME',
    label: 'Property Name',
    description: 'Name of the rental property',
    category: 'property',
    example: 'Sunrise Apartments',
  },
  {
    key: 'PROPERTY_ADDRESS',
    label: 'Property Address',
    description: 'Full address of the property',
    category: 'property',
    example: '123 Main St, Apt 4B, Toronto, ON M5V 1A1',
  },
  {
    key: 'UNIT_NUMBER',
    label: 'Unit Number',
    description: 'Unit or apartment number',
    category: 'property',
    example: '4B',
  },
  {
    key: 'BEDROOMS',
    label: 'Bedrooms',
    description: 'Number of bedrooms',
    category: 'property',
    example: '2',
  },
  {
    key: 'BATHROOMS',
    label: 'Bathrooms',
    description: 'Number of bathrooms',
    category: 'property',
    example: '1.5',
  },
  {
    key: 'SQUARE_FEET',
    label: 'Square Feet',
    description: 'Size of the unit in square feet',
    category: 'property',
    example: '850',
  },

  // Lease Terms
  {
    key: 'START_DATE',
    label: 'Lease Start Date',
    description: 'Start date of the lease agreement',
    category: 'lease',
    example: 'January 1, 2025',
  },
  {
    key: 'END_DATE',
    label: 'Lease End Date',
    description: 'End date of the lease agreement',
    category: 'lease',
    example: 'December 31, 2025',
  },
  {
    key: 'RENT_AMOUNT',
    label: 'Rent Amount',
    description: 'Monthly rent amount (formatted with currency)',
    category: 'lease',
    example: '$1,500.00',
  },
  {
    key: 'SECURITY_DEPOSIT',
    label: 'Security Deposit',
    description: 'Security deposit amount (formatted with currency)',
    category: 'lease',
    example: '$1,500.00',
  },
  {
    key: 'PAYMENT_FREQUENCY',
    label: 'Payment Frequency',
    description: 'How often rent is due (monthly, weekly, etc.)',
    category: 'lease',
    example: 'monthly',
  },
  {
    key: 'LEASE_TERM_MONTHS',
    label: 'Lease Term (Months)',
    description: 'Duration of the lease in months',
    category: 'lease',
    example: '12',
  },
  {
    key: 'PAYMENT_DUE_DAY',
    label: 'Payment Due Day',
    description: 'Day of the month rent is due',
    category: 'lease',
    example: '1st',
  },
  {
    key: 'LATE_FEE_AMOUNT',
    label: 'Late Fee Amount',
    description: 'Late payment fee amount',
    category: 'lease',
    example: '$50.00',
  },
  {
    key: 'LATE_FEE_GRACE_DAYS',
    label: 'Late Fee Grace Period',
    description: 'Number of days before late fee applies',
    category: 'lease',
    example: '5',
  },

  // Policies
  {
    key: 'PET_POLICY',
    label: 'Pet Policy',
    description: 'Pet policy for the rental',
    category: 'lease',
    example: 'No pets allowed',
  },
  {
    key: 'HOUSE_RULES',
    label: 'House Rules',
    description: 'House rules and guidelines',
    category: 'lease',
    example: 'Quiet hours 10pm-7am',
  },
  {
    key: 'PARKING_DETAILS',
    label: 'Parking Details',
    description: 'Parking arrangements',
    category: 'property',
    example: 'One assigned parking spot included',
  },
  {
    key: 'MAX_OCCUPANTS',
    label: 'Maximum Occupants',
    description: 'Maximum number of occupants allowed',
    category: 'lease',
    example: '4',
  },

  // Dates
  {
    key: 'CURRENT_DATE',
    label: 'Current Date',
    description: "Today's date when agreement is generated",
    category: 'dates',
    example: 'December 26, 2025',
  },
  {
    key: 'SIGNATURE_DEADLINE',
    label: 'Signature Deadline',
    description: 'Deadline for signing the agreement',
    category: 'dates',
    example: 'January 5, 2025',
  },
];

/**
 * Format a date string to a readable format
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number | undefined): string {
  if (cents === undefined || cents === null) return '';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Format day of month with ordinal suffix
 */
function formatDayWithOrdinal(day: number | undefined): string {
  if (!day) return '';
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0] ?? 'th';
  return day + suffix;
}

export const agreementPlaceholderService = {
  /**
   * Get all available placeholders grouped by category
   */
  getAvailablePlaceholders(): PlaceholderDefinition[] {
    return PLACEHOLDERS;
  },

  /**
   * Get placeholders grouped by category
   */
  getPlaceholdersByCategory(): Record<string, PlaceholderDefinition[]> {
    const grouped: Record<string, PlaceholderDefinition[]> = {};
    for (const placeholder of PLACEHOLDERS) {
      const category = placeholder.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category]!.push(placeholder);
    }
    return grouped;
  },

  /**
   * Get the placeholder syntax for inserting into template
   */
  getPlaceholderSyntax(key: string): string {
    return `{{${key}}}`;
  },

  /**
   * Substitute all placeholders in a template with actual values
   */
  substitutePlaceholders(template: string, context: PlaceholderContext): string {
    let result = template;

    // Build substitution map
    const substitutions: Record<string, string> = {
      // Landlord/Business
      LANDLORD_NAME: context.landlord_name || '',
      LANDLORD_EMAIL: context.landlord_email || '',
      LANDLORD_PHONE: context.landlord_phone || '',
      BUSINESS_NAME: context.business_name || '',

      // Tenant
      TENANT_NAME: context.tenant_name || '',
      TENANT_FIRST_NAME: context.tenant_first_name || '',
      TENANT_LAST_NAME: context.tenant_last_name || '',
      TENANT_EMAIL: context.tenant_email || '',
      TENANT_PHONE: context.tenant_phone || '',

      // Property
      PROPERTY_NAME: context.property_name || '',
      PROPERTY_ADDRESS: context.property_address || '',
      UNIT_NUMBER: context.unit_number || '',
      BEDROOMS: context.bedrooms?.toString() || '',
      BATHROOMS: context.bathrooms?.toString() || '',
      SQUARE_FEET: context.square_feet?.toString() || '',

      // Lease Terms
      START_DATE: formatDate(context.start_date),
      END_DATE: formatDate(context.end_date),
      RENT_AMOUNT: formatCurrency(context.rent_amount),
      SECURITY_DEPOSIT: formatCurrency(context.security_deposit),
      PAYMENT_FREQUENCY: context.payment_frequency || 'monthly',
      LEASE_TERM_MONTHS: context.lease_term_months?.toString() || '',
      PAYMENT_DUE_DAY: formatDayWithOrdinal(context.payment_due_day),
      LATE_FEE_AMOUNT: formatCurrency(context.late_fee_amount),
      LATE_FEE_GRACE_DAYS: context.late_fee_grace_days?.toString() || '',

      // Policies
      PET_POLICY: context.pet_policy || '',
      HOUSE_RULES: context.house_rules || '',
      PARKING_DETAILS: context.parking_details || '',
      MAX_OCCUPANTS: context.max_occupants?.toString() || '',

      // Dates
      CURRENT_DATE: formatDate(context.current_date || new Date().toISOString()),
      SIGNATURE_DEADLINE: formatDate(context.signature_deadline),
    };

    // Replace all placeholders
    for (const [key, value] of Object.entries(substitutions)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  },

  /**
   * Validate that all placeholders in a template are recognized
   * Returns list of unknown placeholders if any
   */
  validateTemplatePlaceholders(template: string): {
    valid: boolean;
    unknownPlaceholders: string[];
    usedPlaceholders: string[];
  } {
    const placeholderRegex = /\{\{([A-Z_]+)\}\}/g;
    const validKeys = new Set(PLACEHOLDERS.map((p) => p.key));
    const unknownPlaceholders: string[] = [];
    const usedPlaceholders: string[] = [];

    let match;
    while ((match = placeholderRegex.exec(template)) !== null) {
      const key = match[1];
      if (!key) continue;
      if (validKeys.has(key)) {
        if (!usedPlaceholders.includes(key)) {
          usedPlaceholders.push(key);
        }
      } else {
        if (!unknownPlaceholders.includes(key)) {
          unknownPlaceholders.push(key);
        }
      }
    }

    return {
      valid: unknownPlaceholders.length === 0,
      unknownPlaceholders,
      usedPlaceholders,
    };
  },

  /**
   * Get a preview of the template with sample data
   */
  getPreviewWithSampleData(template: string): string {
    const sampleContext: PlaceholderContext = {
      landlord_name: 'John Smith',
      landlord_email: 'landlord@example.com',
      landlord_phone: '(555) 123-4567',
      business_name: 'Smith Property Management',
      property_name: 'Maple Grove Apartments',
      property_address: '123 Main Street, Unit 4B, Toronto, ON M5V 1A1',
      unit_number: '4B',
      bedrooms: 2,
      bathrooms: 1,
      square_feet: 850,
      tenant_name: 'Jane Doe',
      tenant_first_name: 'Jane',
      tenant_last_name: 'Doe',
      tenant_email: 'tenant@example.com',
      tenant_phone: '(555) 987-6543',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      rent_amount: 150000, // $1,500.00
      security_deposit: 150000,
      payment_frequency: 'monthly',
      lease_term_months: 12,
      payment_due_day: 1,
      late_fee_amount: 5000, // $50.00
      late_fee_grace_days: 5,
      pet_policy: 'No pets allowed',
      house_rules: 'Quiet hours 10pm-7am. No smoking indoors.',
      parking_details: 'One assigned parking spot included',
      max_occupants: 4,
      current_date: new Date().toISOString(),
      signature_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return this.substitutePlaceholders(template, sampleContext);
  },

  /**
   * Highlight placeholders in template for display
   * Returns HTML with placeholders wrapped in styled spans
   */
  highlightPlaceholders(template: string): string {
    return template.replace(
      /\{\{([A-Z_]+)\}\}/g,
      '<span class="bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm">{{$1}}</span>'
    );
  },

  /**
   * Build a context object from database records
   */
  buildContextFromData(data: {
    business?: any;
    businessOwner?: any;
    property?: any;
    unit?: any;
    tenant?: any;
    application?: any;
    leaseDetails?: {
      start_date: string;
      end_date: string;
      rent_amount: number;
      security_deposit?: number;
      payment_due_day?: number;
    };
    template?: any;
  }): PlaceholderContext {
    const { business, businessOwner, property, unit, tenant, application, leaseDetails, template } =
      data;

    // Build property address
    let propertyAddress = '';
    if (property) {
      const parts = [
        property.address_line1,
        property.address_line2,
        unit?.unit_number ? `Unit ${unit.unit_number}` : null,
        property.city,
        property.state,
        property.postal_code,
      ].filter(Boolean);
      propertyAddress = parts.join(', ');
    }

    // Calculate lease term in months
    let leaseTermMonths: number | undefined;
    if (leaseDetails?.start_date && leaseDetails?.end_date) {
      const start = new Date(leaseDetails.start_date);
      const end = new Date(leaseDetails.end_date);
      leaseTermMonths =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }

    // Get tenant info from either tenant record or application
    const tenantFirstName = tenant?.first_name || application?.applicant_first_name || '';
    const tenantLastName = tenant?.last_name || application?.applicant_last_name || '';
    const tenantEmail = tenant?.email || application?.applicant_email || '';
    const tenantPhone = tenant?.phone || application?.applicant_phone || '';

    return {
      // Landlord/Business
      landlord_name: businessOwner
        ? `${businessOwner.first_name || ''} ${businessOwner.last_name || ''}`.trim()
        : '',
      landlord_email: businessOwner?.email || '',
      landlord_phone: businessOwner?.phone || '',
      business_name: business?.business_name || '',

      // Property
      property_name: property?.name || '',
      property_address: propertyAddress,
      property_address_line1: property?.address_line1 || '',
      property_city: property?.city || '',
      property_state: property?.state || '',
      property_postal_code: property?.postal_code || '',
      unit_number: unit?.unit_number || '',
      bedrooms: unit?.bedrooms,
      bathrooms: unit?.bathrooms,
      square_feet: unit?.square_feet,

      // Tenant
      tenant_name: `${tenantFirstName} ${tenantLastName}`.trim(),
      tenant_first_name: tenantFirstName,
      tenant_last_name: tenantLastName,
      tenant_email: tenantEmail,
      tenant_phone: tenantPhone,

      // Lease terms
      start_date: leaseDetails?.start_date,
      end_date: leaseDetails?.end_date,
      rent_amount: leaseDetails?.rent_amount,
      security_deposit: leaseDetails?.security_deposit || template?.default_security_deposit,
      payment_frequency: template?.payment_frequency || 'monthly',
      lease_term_months: leaseTermMonths || template?.default_lease_term_months,
      payment_due_day: leaseDetails?.payment_due_day || 1,
      late_fee_amount: template?.late_fee_amount,
      late_fee_grace_days: template?.late_fee_grace_days || 5,

      // Policies from template
      pet_policy: template?.pet_policy,
      house_rules: template?.house_rules,
      parking_details: template?.parking_details,
      max_occupants: template?.max_occupants,

      // Dates
      current_date: new Date().toISOString(),
      signature_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};
