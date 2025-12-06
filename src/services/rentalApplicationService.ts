import { supabase } from '../lib/supabase';
import { RentalListing, RentalApplication, RentalApplicationForm } from '../types';
import { tenantInvitationService } from './tenantInvitationService';
import { aiService } from './aiService';

export const rentalApplicationService = {
  // LISTINGS

  async createListing(organizationId: string, listing: Partial<RentalListing>): Promise<RentalListing> {
    const user = (await supabase.auth.getUser()).data.user;

    // Generate unique listing code
    const { data: code, error: codeError } = await supabase.rpc('generate_listing_code');
    if (codeError) throw codeError;

    const { data, error } = await supabase
      .from('rental_listings')
      .insert({
        ...listing,
        organization_id: organizationId,
        listing_code: code,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getListing(listingCode: string): Promise<RentalListing | null> {
    const { data, error } = await supabase
      .from('rental_listings')
      .select('*')
      .eq('listing_code', listingCode)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getListingsByOrganization(organizationId: string): Promise<RentalListing[]> {
    const { data, error } = await supabase
      .from('rental_listings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getListingsByUnit(unitId: string): Promise<RentalListing[]> {
    const { data, error } = await supabase
      .from('rental_listings')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateListing(id: string, updates: Partial<RentalListing>): Promise<RentalListing> {
    const { data, error } = await supabase
      .from('rental_listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeListing(id: string): Promise<void> {
    const { error } = await supabase
      .from('rental_listings')
      .update({
        status: 'closed',
        accept_applications: false,
      })
      .eq('id', id);

    if (error) throw error;
  },

  // APPLICATIONS

  async submitApplication(
    listingId: string,
    applicationData: {
      applicant_email: string;
      applicant_first_name: string;
      applicant_last_name: string;
      applicant_phone?: string;
      responses: Record<string, any>;
    }
  ): Promise<RentalApplication> {
    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('rental_listings')
      .select('organization_id, property_id, unit_id')
      .eq('id', listingId)
      .single();

    if (listingError) throw listingError;

    const { data, error } = await supabase
      .from('rental_applications')
      .insert({
        listing_id: listingId,
        organization_id: listing.organization_id,
        property_id: listing.property_id,
        unit_id: listing.unit_id,
        ...applicationData,
      })
      .select()
      .single();

    if (error) throw error;

    // Calculate AI score
    await this.calculateScore(data.id);

    return data;
  },

  async getApplication(id: string): Promise<RentalApplication> {
    const { data, error } = await supabase
      .from('rental_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getApplicationsByListing(listingId: string): Promise<RentalApplication[]> {
    const { data, error } = await supabase
      .from('rental_applications')
      .select('*')
      .eq('listing_id', listingId)
      .order('ai_score', { ascending: false, nullsFirst: false })
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getApplicationsByOrganization(organizationId: string): Promise<RentalApplication[]> {
    const { data, error } = await supabase
      .from('rental_applications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateApplication(id: string, updates: Partial<RentalApplication>): Promise<RentalApplication> {
    const { data, error } = await supabase
      .from('rental_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateScore(applicationId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_application_score', { p_application_id: applicationId });

    if (error) throw error;

    // Update the application with the score
    await supabase
      .from('rental_applications')
      .update({ ai_score: data })
      .eq('id', applicationId);

    return data;
  },

  async approveApplication(applicationId: string): Promise<void> {
    const { error } = await supabase
      .from('rental_applications')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) throw error;
  },

  async rejectApplication(applicationId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('rental_applications')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', applicationId);

    if (error) throw error;
  },

  // INTEGRATED CONVERSION - Application → Tenant with Invitation
  async approveAndConvertToTenant(
    applicationId: string,
    leaseDetails: {
      lease_start_date: string;
      lease_end_date: string;
      monthly_rent_cents: number;
    }
  ): Promise<{ tenantId: string; invitationCode: string }> {
    // First, approve the application
    await this.approveApplication(applicationId);

    // Convert to tenant using the database function
    const { data: tenantId, error: convertError } = await supabase
      .rpc('convert_application_to_tenant', {
        p_application_id: applicationId,
        p_lease_start_date: leaseDetails.lease_start_date,
        p_lease_end_date: leaseDetails.lease_end_date,
        p_monthly_rent_cents: leaseDetails.monthly_rent_cents,
      });

    if (convertError) throw convertError;

    // Get application details for invitation
    const application = await this.getApplication(applicationId);

    // Create tenant portal invitation
    const invitation = await tenantInvitationService.createInvitation(
      application.organization_id,
      application.property_id,
      application.unit_id,
      {
        email: application.applicant_email,
        firstName: application.applicant_first_name,
        lastName: application.applicant_last_name,
      }
    );

    return {
      tenantId,
      invitationCode: invitation.invitation_code,
    };
  },

  // APPLICATION FORMS

  async createApplicationForm(
    organizationId: string,
    form: Partial<RentalApplicationForm>
  ): Promise<RentalApplicationForm> {
    const user = (await supabase.auth.getUser()).data.user;

    const { data, error } = await supabase
      .from('rental_application_forms')
      .insert({
        ...form,
        organization_id: organizationId,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getApplicationForms(organizationId: string): Promise<RentalApplicationForm[]> {
    const { data, error } = await supabase
      .from('rental_application_forms')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // UTILITY FUNCTIONS

  getListingUrl(listingCode: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/apply/${listingCode}`;
  },

  getQRCodeUrl(listingCode: string): string {
    const listingUrl = this.getListingUrl(listingCode);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(listingUrl)}`;
  },

  // AI-POWERED APPLICATION ANALYSIS

  /**
   * Anonymize PII before sending to AI services
   * SECURITY: Prevents exposure of personal data to third-party AI providers
   */
  _anonymizeForAI(data: Record<string, any>): Record<string, any> {
    const anonymized = { ...data };
    // Replace emails with placeholder
    if (anonymized.email) anonymized.email = '[EMAIL REDACTED]';
    if (anonymized.applicant_email) anonymized.applicant_email = '[EMAIL REDACTED]';
    // Replace phone numbers
    if (anonymized.phone) anonymized.phone = '[PHONE REDACTED]';
    if (anonymized.applicant_phone) anonymized.applicant_phone = '[PHONE REDACTED]';
    // Replace specific addresses with general area if possible
    if (anonymized.current_address) anonymized.current_address = '[ADDRESS REDACTED]';
    // Replace names with initials
    if (anonymized.applicant_first_name && anonymized.applicant_last_name) {
      anonymized.applicant_name = `${anonymized.applicant_first_name.charAt(0)}. ${anonymized.applicant_last_name.charAt(0)}.`;
    }
    // Keep non-PII data for analysis
    return anonymized;
  },

  async generateApplicationInsights(
    application: RentalApplication,
    organizationId: string
  ): Promise<{
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  }> {
    try {
      const systemPrompt = `You are an expert tenant screening specialist. Analyze rental applications objectively and provide fair, evidence-based assessments. Note: Personal identifying information has been anonymized for privacy.`;

      // SECURITY: Anonymize PII before sending to AI service
      const userPrompt = `Analyze this rental application:

Applicant: [APPLICANT]
Email: [EMAIL REDACTED]
Phone: [PHONE REDACTED]

Employment Information:
- Employer: ${application.responses.employer || 'Not provided'}
- Job Title: ${application.responses.job_title || 'Not provided'}
- Monthly Income: $${application.responses.monthly_income || 'Not provided'}
- Employment Length: ${application.responses.employment_length || 'Not provided'} years

Rental History:
- Current Address: [ADDRESS REDACTED]
- Current Landlord: ${application.responses.current_landlord ? '[LANDLORD NAME PROVIDED]' : 'Not provided'}
- Move-in Date: ${application.responses.move_in_date || 'Not provided'}
- Reason for Moving: ${application.responses.move_reason || 'Not provided'}

Additional Information:
- Pets: ${application.responses.pets || 'None'}
- Number of Occupants: ${application.responses.occupants || 'Not provided'}
- References: ${application.responses.references ? '[REFERENCES PROVIDED]' : 'None provided'}

AI Score: ${application.ai_score || 'Not calculated'}/100

Provide your analysis in this exact JSON format:
{
  "summary": "<1-2 sentence overview of the applicant>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "concerns": ["<concern 1>", "<concern 2>", ...],
  "recommendation": "<approve|review|reject> - <brief explanation>"
}`;

      const response = await aiService.generateCompletion({
        featureName: 'application_screening',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 500,
        temperature: 0.5,
      });

      const parsed = JSON.parse(response.content);
      return {
        summary: parsed.summary,
        strengths: parsed.strengths || [],
        concerns: parsed.concerns || [],
        recommendation: parsed.recommendation,
      };
    } catch (error) {
      console.error('Failed to generate AI application insights:', error);
      return {
        summary: 'Unable to generate AI analysis at this time.',
        strengths: [],
        concerns: [],
        recommendation: 'Manual review required',
      };
    }
  },

  async compareApplications(
    applications: RentalApplication[],
    organizationId: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a tenant screening expert. Compare multiple rental applications and provide clear, objective recommendations. Note: Personal identifying information has been anonymized for privacy.`;

      // SECURITY: Anonymize PII - only send non-identifying data to AI
      const applicantSummaries = applications.map((app, index) => `
Applicant ${index + 1}: [APPLICANT ${index + 1}]
- AI Score: ${app.ai_score || 'N/A'}/100
- Monthly Income: $${app.responses.monthly_income || 'N/A'}
- Employment: ${app.responses.employer || 'N/A'} (${app.responses.employment_length || 'N/A'} years)
- Current Landlord: ${app.responses.current_landlord ? '[PROVIDED]' : 'Not provided'}
`).join('\n');

      const userPrompt = `Compare these ${applications.length} rental applications:

${applicantSummaries}

Provide a brief comparison (2-3 paragraphs) that:
1. Ranks the applicants from strongest to weakest
2. Highlights key differentiators
3. Recommends who to prioritize and why`;

      const response = await aiService.generateCompletion({
        featureName: 'application_comparison',
        organizationId,
        systemPrompt,
        userPrompt,
        maxTokens: 400,
        temperature: 0.6,
      });

      return response.content;
    } catch (error) {
      console.error('Failed to compare applications:', error);
      return 'Unable to generate comparison at this time.';
    }
  },
};
