import { supabase } from '../lib/supabase';
import { Organization, OrganizationMember, User, AuthSession } from '../types';

export interface ExtendedRegistrationData {
  phone: string;
  businessName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export const authService = {
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tierSlug: string = 'free',
    extendedData?: ExtendedRegistrationData
  ) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    const userId = authData.user.id;

    // Build profile update with all collected data
    const profileUpdate: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      selected_tier: tierSlug,
    };

    // Add extended data if provided
    if (extendedData) {
      profileUpdate.phone = extendedData.phone;
      profileUpdate.address_line1 = extendedData.addressLine1;
      profileUpdate.address_line2 = extendedData.addressLine2 || null;
      profileUpdate.city = extendedData.city;
      profileUpdate.state_province = extendedData.stateProvince;
      profileUpdate.postal_code = extendedData.postalCode;
      profileUpdate.country = extendedData.country;
      // Store business name for business/organization naming
      profileUpdate.organization_name = extendedData.businessName;
    }

    // Update user profile - wait for it to complete
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Failed to update user profile:', profileError);
      // Don't throw - continue to try creating org/business
    }

    // Create organization for the user
    const businessName = extendedData?.businessName || `${firstName} ${lastName}`;
    const orgSlug = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          owner_id: userId,
          name: businessName,
          slug: orgSlug,
          currency: 'CAD',
          timezone: 'America/Toronto',
          account_tier: tierSlug,
          subscription_status: 'trial',
        })
        .select()
        .maybeSingle();

      if (orgError) {
        console.error('Failed to create organization:', orgError);
      } else if (org) {
        // Add user as organization member (owner)
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: userId,
            role: 'owner',
            is_active: true,
            joined_at: new Date().toISOString(),
          });

        if (memberError) {
          console.error('Failed to add organization member:', memberError);
        }

        // Assign package to organization
        try {
          await supabase.rpc('assign_package_to_organization', {
            p_org_id: org.id,
            p_tier_slug: tierSlug
          });
        } catch (pkgError) {
          console.error('Failed to assign package:', pkgError);
        }

        // Create the default business
        const { error: bizError } = await supabase
          .from('businesses')
          .insert({
            organization_id: org.id,
            owner_user_id: userId,
            business_name: businessName,
            email: email,
            phone: extendedData?.phone || null,
            address_line1: extendedData?.addressLine1 || null,
            address_line2: extendedData?.addressLine2 || null,
            city: extendedData?.city || null,
            state: extendedData?.stateProvince || null,
            postal_code: extendedData?.postalCode || null,
            country: extendedData?.country || 'CA',
            currency: 'CAD',
            timezone: 'America/Toronto',
            is_default: true,
            is_active: true,
            created_by: userId,
          });

        if (bizError) {
          console.error('Failed to create default business:', bizError);
        }
      }
    } catch (err) {
      console.error('Error during organization/business creation:', err);
      // Don't throw - user is still created, they can set up org later
    }

    return authData.user;
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async createOrganization(name: string, slug: string, companyName?: string, tierSlug: string = 'basic') {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        owner_id: user.id,
        name,
        slug,
        company_name: companyName,
        currency: 'CAD',
        timezone: 'America/Toronto',
        account_tier: tierSlug,
        subscription_status: 'trial',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Organization creation error:', error);
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    if (!data) {
      throw new Error('Organization created but no data returned');
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: data.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Member insertion error:', memberError);
      throw new Error(`Failed to add member: ${memberError.message}`);
    }

    const { error: packageError } = await supabase.rpc('assign_package_to_organization', {
      p_org_id: data.id,
      p_tier_slug: tierSlug
    });

    if (packageError) {
      console.error('Package assignment error:', packageError);
    }

    return data;
  },

  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase.rpc('get_my_organizations');

    if (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }

    return (data as any[]) || [];
  },

  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as any;
  },

  async checkSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('super_admins')
      .select('is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  async getMemberRole(organizationId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.role || null;
  },

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },

  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Alias for updateProfile for backward compatibility
  async updateUserProfile(profileId: string, updates: Partial<User>) {
    // Find the user_id from profile id first
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (!profile) {
      throw new Error('Profile not found');
    }

    return this.updateProfile(profile.user_id, updates);
  },
};
