import { supabase } from '../lib/supabase';
import { aiService } from './aiService';

export interface ApplicationFormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  included?: boolean; // If false, field is excluded from the application form (default true)
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ApplicationFormSection {
  id: string;
  title: string;
  description?: string;
  included?: boolean; // If false, entire section is excluded from the application form (default true)
  fields: ApplicationFormField[];
}

export interface ApplicationFormSchema {
  sections: ApplicationFormSection[];
}

export type ApplicationType = 'standard' | 'short-term' | 'student' | 'corporate' | 'roommate' | 'co-signer';

export interface ApplicationTemplate {
  id: string;
  business_id: string;
  template_name: string;
  description?: string;
  application_type: ApplicationType;
  form_schema: ApplicationFormSchema;
  require_income_verification: boolean;
  require_employment_verification: boolean;
  require_rental_history: boolean;
  require_references: boolean;
  require_id_verification: boolean;
  require_credit_check_consent: boolean;
  require_background_check_consent: boolean;
  minimum_income_ratio: number;
  custom_questions: ApplicationFormField[];
  terms_and_conditions?: string;
  privacy_policy?: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Default form schema for a standard application
export const DEFAULT_APPLICATION_SCHEMA: ApplicationFormSchema = {
  sections: [
    {
      id: 'personal_info',
      title: 'Personal Information',
      description: 'Please provide your basic contact information',
      fields: [
        { id: 'first_name', type: 'text', label: 'First Name', required: true },
        { id: 'last_name', type: 'text', label: 'Last Name', required: true },
        { id: 'email', type: 'email', label: 'Email Address', required: true },
        { id: 'phone', type: 'tel', label: 'Phone Number', required: true },
        { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
        { id: 'ssn_last_four', type: 'text', label: 'SSN (Last 4 Digits)', required: false, validation: { pattern: '^[0-9]{4}$', message: 'Please enter exactly 4 digits' } },
      ],
    },
    {
      id: 'employment',
      title: 'Employment Information',
      description: 'Tell us about your current employment',
      fields: [
        { id: 'employment_status', type: 'select', label: 'Employment Status', required: true, options: ['Employed Full-Time', 'Employed Part-Time', 'Self-Employed', 'Retired', 'Student', 'Unemployed'] },
        { id: 'employer', type: 'text', label: 'Current Employer', required: false },
        { id: 'job_title', type: 'text', label: 'Job Title', required: false },
        { id: 'employer_phone', type: 'tel', label: 'Employer Phone', required: false },
        { id: 'monthly_income', type: 'number', label: 'Monthly Income ($)', required: true },
        { id: 'employment_length', type: 'number', label: 'Years at Current Job', required: false },
        { id: 'additional_income', type: 'number', label: 'Additional Monthly Income ($)', required: false },
        { id: 'additional_income_source', type: 'text', label: 'Additional Income Source', required: false },
      ],
    },
    {
      id: 'rental_history',
      title: 'Rental History',
      description: 'Please provide your current and previous rental information',
      fields: [
        { id: 'current_address', type: 'textarea', label: 'Current Address', required: true },
        { id: 'current_landlord_name', type: 'text', label: 'Current Landlord Name', required: false },
        { id: 'current_landlord_phone', type: 'tel', label: 'Current Landlord Phone', required: false },
        { id: 'current_rent', type: 'number', label: 'Current Monthly Rent ($)', required: false },
        { id: 'time_at_current_address', type: 'text', label: 'Time at Current Address', required: true },
        { id: 'reason_for_moving', type: 'textarea', label: 'Reason for Moving', required: true },
        { id: 'previous_address', type: 'textarea', label: 'Previous Address (if less than 2 years at current)', required: false },
        { id: 'previous_landlord_name', type: 'text', label: 'Previous Landlord Name', required: false },
        { id: 'previous_landlord_phone', type: 'tel', label: 'Previous Landlord Phone', required: false },
      ],
    },
    {
      id: 'move_in_details',
      title: 'Move-In Details',
      description: 'Tell us about your intended move',
      fields: [
        { id: 'desired_move_in_date', type: 'date', label: 'Desired Move-In Date', required: true },
        { id: 'lease_term', type: 'select', label: 'Preferred Lease Term', required: true, options: ['6 months', '12 months', '18 months', '24 months', 'Month-to-month'] },
        { id: 'num_occupants', type: 'number', label: 'Total Number of Occupants', required: true, validation: { min: 1, max: 20 } },
        { id: 'occupant_names', type: 'textarea', label: 'Names of All Occupants (if more than 1)', required: false },
      ],
    },
    {
      id: 'pets_vehicles',
      title: 'Pets & Vehicles',
      description: 'Information about pets and vehicles',
      fields: [
        { id: 'has_pets', type: 'select', label: 'Do you have pets?', required: true, options: ['No', 'Yes'] },
        { id: 'pet_details', type: 'textarea', label: 'Pet Details (type, breed, weight, age)', required: false },
        { id: 'num_vehicles', type: 'number', label: 'Number of Vehicles', required: false },
        { id: 'vehicle_details', type: 'textarea', label: 'Vehicle Details (make, model, year, license plate)', required: false },
      ],
    },
    {
      id: 'references',
      title: 'References',
      description: 'Please provide personal and professional references',
      fields: [
        { id: 'reference1_name', type: 'text', label: 'Reference 1 Name', required: true },
        { id: 'reference1_phone', type: 'tel', label: 'Reference 1 Phone', required: true },
        { id: 'reference1_relationship', type: 'text', label: 'Reference 1 Relationship', required: true },
        { id: 'reference2_name', type: 'text', label: 'Reference 2 Name', required: false },
        { id: 'reference2_phone', type: 'tel', label: 'Reference 2 Phone', required: false },
        { id: 'reference2_relationship', type: 'text', label: 'Reference 2 Relationship', required: false },
      ],
    },
    {
      id: 'background',
      title: 'Background Questions',
      description: 'Please answer the following questions honestly',
      fields: [
        { id: 'ever_evicted', type: 'select', label: 'Have you ever been evicted?', required: true, options: ['No', 'Yes'] },
        { id: 'eviction_details', type: 'textarea', label: 'If yes, please explain', required: false },
        { id: 'ever_broken_lease', type: 'select', label: 'Have you ever broken a lease?', required: true, options: ['No', 'Yes'] },
        { id: 'broken_lease_details', type: 'textarea', label: 'If yes, please explain', required: false },
        { id: 'felony_conviction', type: 'select', label: 'Have you ever been convicted of a felony?', required: true, options: ['No', 'Yes'] },
        { id: 'felony_details', type: 'textarea', label: 'If yes, please explain', required: false },
        { id: 'bankruptcy', type: 'select', label: 'Have you ever filed for bankruptcy?', required: true, options: ['No', 'Yes'] },
        { id: 'bankruptcy_details', type: 'textarea', label: 'If yes, please explain', required: false },
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
      id: 'additional_info',
      title: 'Additional Information',
      description: 'Anything else you would like us to know',
      fields: [
        { id: 'additional_comments', type: 'textarea', label: 'Additional Comments or Information', required: false },
      ],
    },
  ],
};

class ApplicationTemplateService {
  // ============================================================================
  // TEMPLATE CRUD OPERATIONS
  // ============================================================================

  async createTemplate(template: Partial<ApplicationTemplate>): Promise<ApplicationTemplate> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('application_templates')
      .insert([{
        ...template,
        form_schema: template.form_schema || DEFAULT_APPLICATION_SCHEMA,
        created_by: user?.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(id: string, updates: Partial<ApplicationTemplate>): Promise<ApplicationTemplate> {
    const { data, error } = await supabase
      .from('application_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getTemplates(filters?: {
    business_id?: string;
    is_active?: boolean;
    application_type?: ApplicationType;
  }): Promise<ApplicationTemplate[]> {
    try {
      let query = supabase
        .from('application_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.application_type) {
        query = query.eq('application_type', filters.application_type);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('application_templates query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching application templates:', error);
      return [];
    }
  }

  async getTemplate(id: string): Promise<ApplicationTemplate | null> {
    const { data, error } = await supabase
      .from('application_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }
    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('application_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async setDefaultTemplate(id: string, businessId: string): Promise<void> {
    // First, unset any existing default for this business
    await supabase
      .from('application_templates')
      .update({ is_default: false })
      .eq('business_id', businessId);

    // Set the new default
    const { error } = await supabase
      .from('application_templates')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }

  async duplicateTemplate(id: string, newName?: string): Promise<ApplicationTemplate> {
    const original = await this.getTemplate(id);
    if (!original) throw new Error('Template not found');

    const duplicate: Partial<ApplicationTemplate> = {
      business_id: original.business_id,
      template_name: newName || `${original.template_name} (Copy)`,
      description: original.description,
      application_type: original.application_type,
      form_schema: original.form_schema,
      require_income_verification: original.require_income_verification,
      require_employment_verification: original.require_employment_verification,
      require_rental_history: original.require_rental_history,
      require_references: original.require_references,
      require_id_verification: original.require_id_verification,
      require_credit_check_consent: original.require_credit_check_consent,
      require_background_check_consent: original.require_background_check_consent,
      minimum_income_ratio: original.minimum_income_ratio,
      custom_questions: original.custom_questions,
      terms_and_conditions: original.terms_and_conditions,
      privacy_policy: original.privacy_policy,
      is_active: true,
      is_default: false,
    };

    return this.createTemplate(duplicate);
  }

  // ============================================================================
  // UNIT/PROPERTY TEMPLATE ASSIGNMENT
  // ============================================================================

  async getUnitDefaultTemplate(unitId: string): Promise<ApplicationTemplate | null> {
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('default_application_template_id')
      .eq('id', unitId)
      .single();

    if (unitError || !unit?.default_application_template_id) return null;

    return this.getTemplate(unit.default_application_template_id);
  }

  async setUnitDefaultTemplate(unitId: string, templateId: string | null): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({ default_application_template_id: templateId })
      .eq('id', unitId);

    if (error) throw error;
  }

  async getPropertyDefaultTemplate(propertyId: string): Promise<ApplicationTemplate | null> {
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('default_application_template_id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property?.default_application_template_id) return null;

    return this.getTemplate(property.default_application_template_id);
  }

  async setPropertyDefaultTemplate(propertyId: string, templateId: string | null): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ default_application_template_id: templateId })
      .eq('id', propertyId);

    if (error) throw error;
  }

  // ============================================================================
  // AI-POWERED TEMPLATE GENERATION
  // ============================================================================

  /**
   * Generate a customized application template using AI
   */
  async generateTemplateWithAI(options: {
    businessId: string;
    applicationType: ApplicationType;
    propertyType?: string; // PropertyType value (e.g., 'single_family', 'multi_family', 'condo', 'townhouse')
    targetTenants?: string; // e.g., 'families', 'students', 'professionals', 'seniors'
    specialRequirements?: string; // Any specific requirements
    existingTemplateId?: string; // Base template to modify
  }): Promise<{
    template: Partial<ApplicationTemplate>;
    aiSuggestions: string;
  }> {
    const systemPrompt = `You are an expert property manager and rental application specialist. Your task is to generate or customize rental application templates based on the property and tenant requirements. Focus on creating comprehensive yet user-friendly applications that gather all necessary information while complying with fair housing laws.`;

    const baseSchema = options.existingTemplateId
      ? (await this.getTemplate(options.existingTemplateId))?.form_schema
      : DEFAULT_APPLICATION_SCHEMA;

    const userPrompt = `Generate a customized rental application template with the following requirements:

Application Type: ${options.applicationType}
Property Type: ${options.propertyType || 'General residential'}
Target Tenants: ${options.targetTenants || 'General applicants'}
Special Requirements: ${options.specialRequirements || 'None specified'}

Base Schema:
${JSON.stringify(baseSchema, null, 2)}

Please provide:
1. A suggested template name
2. A brief description
3. Recommended verification requirements (income, employment, rental history, references, ID, credit check, background check)
4. Recommended minimum income ratio
5. Any custom questions specific to this property/tenant type
6. Terms and conditions text
7. Any modifications to the form schema sections/fields

Return your response in this JSON format:
{
  "template_name": "string",
  "description": "string",
  "require_income_verification": boolean,
  "require_employment_verification": boolean,
  "require_rental_history": boolean,
  "require_references": boolean,
  "require_id_verification": boolean,
  "require_credit_check_consent": boolean,
  "require_background_check_consent": boolean,
  "minimum_income_ratio": number,
  "custom_questions": [
    { "id": "string", "type": "text|select|textarea", "label": "string", "required": boolean, "options": ["optional array for select type"] }
  ],
  "terms_and_conditions": "string",
  "form_schema_modifications": {
    "add_fields": [{ "section_id": "string", "field": {...} }],
    "remove_fields": ["field_id1", "field_id2"],
    "modify_fields": [{ "field_id": "string", "changes": {...} }]
  },
  "suggestions": "string - any additional suggestions or notes"
}`;

    try {
      const response = await aiService.generateForFeature('document_generation', {
        prompt: userPrompt,
        systemPrompt,
        max_tokens: 2000,
        temperature: 0.7,
      });

      // Parse the AI response
      const parsed = JSON.parse(response.text);

      // Apply schema modifications if any
      let modifiedSchema = JSON.parse(JSON.stringify(baseSchema)) as ApplicationFormSchema;

      if (parsed.form_schema_modifications) {
        // Add fields
        if (parsed.form_schema_modifications.add_fields) {
          for (const addition of parsed.form_schema_modifications.add_fields) {
            const section = modifiedSchema.sections.find(s => s.id === addition.section_id);
            if (section) {
              section.fields.push(addition.field);
            }
          }
        }

        // Remove fields
        if (parsed.form_schema_modifications.remove_fields) {
          for (const section of modifiedSchema.sections) {
            section.fields = section.fields.filter(f =>
              !parsed.form_schema_modifications.remove_fields.includes(f.id)
            );
          }
        }

        // Modify fields
        if (parsed.form_schema_modifications.modify_fields) {
          for (const modification of parsed.form_schema_modifications.modify_fields) {
            for (const section of modifiedSchema.sections) {
              const fieldIndex = section.fields.findIndex(f => f.id === modification.field_id);
              if (fieldIndex !== -1) {
                section.fields[fieldIndex] = { ...section.fields[fieldIndex], ...modification.changes };
              }
            }
          }
        }
      }

      const template: Partial<ApplicationTemplate> = {
        business_id: options.businessId,
        template_name: parsed.template_name,
        description: parsed.description,
        application_type: options.applicationType,
        form_schema: modifiedSchema,
        require_income_verification: parsed.require_income_verification ?? true,
        require_employment_verification: parsed.require_employment_verification ?? true,
        require_rental_history: parsed.require_rental_history ?? true,
        require_references: parsed.require_references ?? true,
        require_id_verification: parsed.require_id_verification ?? false,
        require_credit_check_consent: parsed.require_credit_check_consent ?? true,
        require_background_check_consent: parsed.require_background_check_consent ?? true,
        minimum_income_ratio: parsed.minimum_income_ratio ?? 3.0,
        custom_questions: parsed.custom_questions || [],
        terms_and_conditions: parsed.terms_and_conditions,
        is_active: true,
        is_default: false,
      };

      return {
        template,
        aiSuggestions: parsed.suggestions || '',
      };
    } catch (error) {
      console.error('AI template generation failed:', error);
      throw new Error('Failed to generate template with AI. Please try again or create manually.');
    }
  }

  /**
   * Generate custom questions using AI based on property details
   */
  async generateCustomQuestions(options: {
    propertyType: string;
    propertyFeatures?: string[];
    targetTenants?: string;
    existingQuestions?: ApplicationFormField[];
  }): Promise<ApplicationFormField[]> {
    const systemPrompt = `You are a property management expert. Generate relevant custom questions for a rental application based on the property details provided.`;

    const userPrompt = `Generate 3-5 custom questions for a rental application with these details:

Property Type: ${options.propertyType}
Property Features: ${options.propertyFeatures?.join(', ') || 'Standard'}
Target Tenants: ${options.targetTenants || 'General'}
Existing Custom Questions: ${JSON.stringify(options.existingQuestions || [])}

Return questions in this JSON format:
[
  { "id": "unique_id", "type": "text|select|textarea|checkbox", "label": "Question text", "required": true|false, "options": ["only for select type"] }
]

Focus on questions that would help assess tenant fit for this specific property. Avoid duplicating existing questions.`;

    try {
      const response = await aiService.generateForFeature('document_generation', {
        prompt: userPrompt,
        systemPrompt,
        max_tokens: 500,
        temperature: 0.7,
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Failed to generate custom questions:', error);
      return [];
    }
  }

  /**
   * Get AI suggestions for improving an existing template
   */
  async getTemplateImprovementSuggestions(templateId: string): Promise<string[]> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const systemPrompt = `You are a rental application expert. Analyze the given application template and provide specific suggestions for improvement.`;

    const userPrompt = `Analyze this rental application template and provide 3-5 specific suggestions for improvement:

Template Name: ${template.template_name}
Application Type: ${template.application_type}
Form Schema: ${JSON.stringify(template.form_schema, null, 2)}
Requirements:
- Income Verification: ${template.require_income_verification}
- Employment Verification: ${template.require_employment_verification}
- Rental History: ${template.require_rental_history}
- References: ${template.require_references}
- ID Verification: ${template.require_id_verification}
- Credit Check: ${template.require_credit_check_consent}
- Background Check: ${template.require_background_check_consent}

Return suggestions as a JSON array of strings:
["suggestion 1", "suggestion 2", ...]`;

    try {
      const response = await aiService.generateForFeature('document_generation', {
        prompt: userPrompt,
        systemPrompt,
        max_tokens: 500,
        temperature: 0.6,
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Failed to get improvement suggestions:', error);
      return ['Unable to generate suggestions at this time.'];
    }
  }
}

export const applicationTemplateService = new ApplicationTemplateService();
