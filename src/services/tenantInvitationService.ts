import { supabase } from '../lib/supabase';
import { TenantInvitation, InvitationDetails } from '../types';
import { generateSecureInvitationCode } from '../utils/crypto';

export const tenantInvitationService = {
  /**
   * Create a tenant invitation
   * @param businessId - Business ID (preferred) or organization_id for backward compatibility
   */
  async createInvitation(
    businessId: string | null | undefined,
    propertyId: string,
    unitId: string,
    tenantInfo: {
      email?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<TenantInvitation> {
    const user = (await supabase.auth.getUser()).data.user;

    // SECURITY: Generate cryptographically secure invitation code
    // Using client-side secure generation instead of database function
    // for better randomness (Web Crypto API)
    let codeData: string;
    try {
      // Try database function first (for consistency)
      const { data, error: codeError } = await supabase
        .rpc('generate_invitation_code');

      if (codeError) {
        // Fallback to client-side secure generation
        codeData = generateSecureInvitationCode(12);
      } else {
        codeData = data;
      }
    } catch {
      // Fallback to client-side secure generation
      codeData = generateSecureInvitationCode(12);
    }

    const { data, error } = await supabase
      .from('tenant_invitations')
      .insert({
        business_id: businessId || null, // Primary association
        organization_id: businessId || null, // Keep for backward compatibility
        property_id: propertyId,
        unit_id: unitId,
        invitation_code: codeData,
        tenant_email: tenantInfo.email,
        tenant_first_name: tenantInfo.firstName,
        tenant_last_name: tenantInfo.lastName,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getInvitation(id: string): Promise<TenantInvitation> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getInvitationsByOrganization(organizationId: string): Promise<TenantInvitation[]> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getInvitationsByUnit(unitId: string): Promise<TenantInvitation[]> {
    const { data, error } = await supabase
      .from('tenant_invitations')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async validateInvitationCode(code: string): Promise<InvitationDetails | null> {
    const { data, error } = await supabase
      .rpc('validate_invitation_code', { code });

    if (error) throw error;

    if (!data || data.length === 0) return null;

    return data[0];
  },

  async acceptInvitation(invitationId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_invitations')
      .update({
        tenant_id: tenantId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (error) throw error;
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'cancelled',
      })
      .eq('id', invitationId);

    if (error) throw error;
  },

  async resendInvitation(invitationId: string): Promise<TenantInvitation> {
    // Reset expiration to 30 days from now
    const { data, error } = await supabase
      .from('tenant_invitations')
      .update({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getInvitationUrl(code: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/tenant-signup?code=${code}`;
  },

  getQRCodeUrl(code: string): string {
    const invitationUrl = this.getInvitationUrl(code);
    // TODO: SECURITY - Replace external QR service with local generation
    // Consider using 'qrcode' npm package for local generation to avoid
    // sending invitation URLs to third-party services
    // Example: import QRCode from 'qrcode'; QRCode.toDataURL(invitationUrl)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invitationUrl)}`;
  },
};
