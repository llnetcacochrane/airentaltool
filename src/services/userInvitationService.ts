/**
 * User Invitation Service
 *
 * Unified invitation system for Property Owners, Tenants, and Team Members.
 * Handles creating invitations, sending emails, validating tokens, and completing registration.
 */

import { supabase } from '../lib/supabase';
import { UserInvitation, ValidatedInvitation, InvitationType } from '../types';
import { emailService } from './emailService';

// Generate a secure random token using crypto API
function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';

  // Use crypto.getRandomValues for cryptographically secure randomness
  // This is required for security-sensitive tokens
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Node.js environment with Web Crypto API
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // SECURITY: Throw error instead of falling back to insecure Math.random()
    throw new Error('Cryptographically secure random number generator not available');
  }

  return result;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize string input to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 255); // Limit length
}

export interface CreateInvitationData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  // For tenant invitations
  unit_id?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent_cents?: number;
  security_deposit_cents?: number;
}

export interface InvitationWithBusiness extends UserInvitation {
  business_name?: string;
  unit_number?: string;
  property_name?: string;
}

class UserInvitationService {
  /**
   * Create a new invitation and optionally send email
   */
  async createInvitation(
    businessId: string,
    invitationType: InvitationType,
    data: CreateInvitationData,
    sendEmail: boolean = true
  ): Promise<UserInvitation> {
    // Input validation
    if (!businessId || typeof businessId !== 'string') {
      throw new Error('Invalid business ID');
    }

    if (!data.email || !isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }

    if (!data.first_name || data.first_name.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!data.last_name || data.last_name.trim().length === 0) {
      throw new Error('Last name is required');
    }

    // Validate invitation type
    const validTypes: InvitationType[] = ['property_owner', 'tenant', 'team_member'];
    if (!validTypes.includes(invitationType)) {
      throw new Error('Invalid invitation type');
    }

    // Generate secure token
    const invitationToken = generateSecureToken(32);

    // Calculate expiry date (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser();

    // Sanitize inputs to prevent XSS
    const invitationData = {
      business_id: businessId,
      invitation_type: invitationType,
      email: data.email.toLowerCase().trim(),
      first_name: sanitizeInput(data.first_name),
      last_name: sanitizeInput(data.last_name),
      phone: data.phone ? sanitizeInput(data.phone) : null,
      invitation_token: invitationToken,
      unit_id: data.unit_id || null,
      lease_start_date: data.lease_start_date || null,
      lease_end_date: data.lease_end_date || null,
      monthly_rent_cents: data.monthly_rent_cents || null,
      security_deposit_cents: data.security_deposit_cents || null,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_by: user?.id || null,
    };

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert([invitationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    // Send invitation email if requested
    if (sendEmail) {
      try {
        await this.sendInvitationEmail(invitation);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return invitation;
  }

  /**
   * Validate an invitation token
   */
  async validateInvitationToken(token: string): Promise<ValidatedInvitation | null> {
    // Basic token validation before hitting the database
    if (!token || typeof token !== 'string' || token.length < 20 || token.length > 64) {
      console.warn('Invalid token format');
      return null;
    }

    // Only allow alphanumeric characters in token
    if (!/^[A-Za-z0-9]+$/.test(token)) {
      console.warn('Token contains invalid characters');
      return null;
    }

    const { data, error } = await supabase
      .rpc('validate_user_invitation', { p_token: token });

    if (error) {
      console.error('Error validating invitation:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // RPC returns an array, get the first result
    return data[0] as ValidatedInvitation;
  }

  /**
   * Accept an invitation after user creates their auth account
   */
  async acceptInvitation(token: string, authUserId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('accept_user_invitation', {
        p_token: token,
        p_auth_user_id: authUserId
      });

    if (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }

    return data;
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId: string): Promise<void> {
    // Get the invitation
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*, businesses(business_name)')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      throw new Error('Invitation not found or already accepted');
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Send email
    await this.sendInvitationEmail(invitation);
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_invitations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to cancel invitation: ${error.message}`);
    }
  }

  /**
   * Get all invitations for a business
   */
  async getBusinessInvitations(
    businessId: string,
    options?: {
      type?: InvitationType;
      status?: string;
    }
  ): Promise<InvitationWithBusiness[]> {
    let query = supabase
      .from('user_invitations')
      .select(`
        *,
        businesses(business_name),
        units(unit_number, properties(name))
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('invitation_type', options.type);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    // Transform the data to flatten joined fields
    return (data || []).map(inv => ({
      ...inv,
      business_name: inv.businesses?.business_name,
      unit_number: inv.units?.unit_number,
      property_name: inv.units?.properties?.name,
    }));
  }

  /**
   * Get a single invitation by ID
   */
  async getInvitation(invitationId: string): Promise<InvitationWithBusiness | null> {
    const { data, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        businesses(business_name),
        units(unit_number, properties(name))
      `)
      .eq('id', invitationId)
      .single();

    if (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }

    return {
      ...data,
      business_name: data.businesses?.business_name,
      unit_number: data.units?.unit_number,
      property_name: data.units?.properties?.name,
    };
  }

  /**
   * Check if an email already has a pending invitation for a business
   */
  async hasPendingInvitation(businessId: string, email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('business_id', businessId)
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) {
      console.error('Error checking pending invitation:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Get the invitation URL for a token
   */
  getInvitationUrl(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/complete-registration?token=${token}`;
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(invitation: any): Promise<void> {
    // Get business name if not already loaded
    let businessName = invitation.businesses?.business_name || invitation.business_name;
    if (!businessName) {
      const { data: business } = await supabase
        .from('businesses')
        .select('business_name')
        .eq('id', invitation.business_id)
        .single();
      businessName = business?.business_name || 'the business';
    }

    // Get inviter name
    let inviterName = 'The team';
    if (invitation.created_by) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', invitation.created_by)
        .single();
      if (profile) {
        inviterName = `${profile.first_name} ${profile.last_name}`.trim() || inviterName;
      }
    }

    const signupUrl = this.getInvitationUrl(invitation.invitation_token);

    // Determine email type and content based on invitation type
    const emailData = {
      name: `${invitation.first_name} ${invitation.last_name}`.trim(),
      inviterName,
      businessName,
      invitationCode: invitation.invitation_token,
      signupUrl,
      invitationType: invitation.invitation_type,
      // For tenant invitations
      unitNumber: invitation.unit_number || invitation.units?.unit_number,
      propertyName: invitation.property_name || invitation.units?.properties?.name,
      leaseStartDate: invitation.lease_start_date,
      monthlyRent: invitation.monthly_rent_cents
        ? (invitation.monthly_rent_cents / 100).toFixed(2)
        : undefined,
    };

    await emailService.sendInvitationEmail(invitation.email, emailData);
  }

  /**
   * Update invitation with client_id (for property owner invitations)
   */
  async linkInvitationToClient(invitationId: string, clientId: string): Promise<void> {
    const { error } = await supabase
      .from('user_invitations')
      .update({ client_id: clientId })
      .eq('id', invitationId);

    if (error) {
      console.error('Error linking invitation to client:', error);
      throw new Error(`Failed to link invitation: ${error.message}`);
    }
  }

  /**
   * Extend invitation expiry
   */
  async extendInvitation(invitationId: string, additionalDays: number = 30): Promise<void> {
    const { data: invitation, error: fetchError } = await supabase
      .from('user_invitations')
      .select('expires_at')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      throw new Error('Invitation not found');
    }

    const newExpiry = new Date(invitation.expires_at);
    newExpiry.setDate(newExpiry.getDate() + additionalDays);

    const { error } = await supabase
      .from('user_invitations')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      throw new Error(`Failed to extend invitation: ${error.message}`);
    }
  }
}

export const userInvitationService = new UserInvitationService();
