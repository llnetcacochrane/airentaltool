import { supabase } from '../lib/supabase';
import { TenantInvitation, InvitationDetails } from '../types';

export const tenantInvitationService = {
  async createInvitation(
    organizationId: string,
    propertyId: string,
    unitId: string,
    tenantInfo: {
      email?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<TenantInvitation> {
    const user = (await supabase.auth.getUser()).data.user;

    // Generate invitation code
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_invitation_code');

    if (codeError) throw codeError;

    const { data, error } = await supabase
      .from('tenant_invitations')
      .insert({
        organization_id: organizationId,
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
    // Using a free QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invitationUrl)}`;
  },
};
