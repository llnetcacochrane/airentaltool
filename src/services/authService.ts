import { supabase } from '../lib/supabase';
import { User } from '../types';
import { defaultTemplatesService } from './defaultTemplatesService';

export interface ExtendedRegistrationData {
  phone: string;
  businessName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  // Type 2 registration fields
  organizationName?: string;
  hasPartners?: boolean;
  partners?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    ownershipPercent: number;
  }>;
  // Type 3 (Property Manager) registration fields
  managementCompany?: boolean;
  setupFirstClient?: boolean;
  clientBusiness?: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  };
  businessOwners?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    ownershipPercent: number;
    grantFullAccess: boolean;
  }>;
}

export const authService = {
  /**
   * Register a new user
   *
   * Flow:
   * 1. Create auth user via Supabase Auth
   * 2. Create Organization FIRST (user profile trigger creates user_profiles entry)
   * 3. Add user as organization member (owner role)
   * 4. Update user profile with registration data
   * 5. For landlords, auto-create business using organization info
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tierSlug: string = 'free',
    extendedData?: ExtendedRegistrationData
  ) {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registration failed');

    const userId = authData.user.id;

    // Determine organization name (Type 2 may have separate org name)
    const organizationName = extendedData?.organizationName ||
                            extendedData?.businessName ||
                            `${firstName} ${lastName}`;
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Step 2: Create organization FIRST
    let organizationId: string | null = null;
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          owner_id: userId,
          name: organizationName,
          slug: `${slug}-${userId.substring(0, 8)}`,
          company_name: organizationName,
          email: email,
          phone: extendedData?.phone || null,
          address: extendedData?.addressLine1 || null,
          city: extendedData?.city || null,
          state_province: extendedData?.stateProvince || null,
          postal_code: extendedData?.postalCode || null,
          country: extendedData?.country || 'CA',
          currency: 'CAD',
          timezone: 'America/Toronto',
          account_tier: tierSlug,
        })
        .select('id')
        .single();

      if (orgError) {
        console.error('Failed to create organization:', orgError);
      } else {
        organizationId = orgData.id;
      }
    } catch (err) {
      console.error('Error during organization creation:', err);
    }

    // Step 3: Add user as organization member (owner role)
    if (organizationId) {
      try {
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            user_id: userId,
            role: 'owner',
            is_active: true,
            joined_at: new Date().toISOString(),
          });

        if (memberError) {
          console.error('Failed to add user as organization member:', memberError);
        }
      } catch (err) {
        console.error('Error adding organization member:', err);
      }
    }

    // Step 4: Upsert user profile with all collected data
    // Using upsert to handle race condition with database trigger
    const profileData: Record<string, any> = {
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      selected_tier: tierSlug,
    };

    if (extendedData) {
      profileData.phone = extendedData.phone;
      profileData.address_line1 = extendedData.addressLine1;
      profileData.address_line2 = extendedData.addressLine2 || null;
      profileData.city = extendedData.city;
      profileData.state_province = extendedData.stateProvince;
      profileData.postal_code = extendedData.postalCode;
      profileData.country = extendedData.country;
      profileData.organization_name = organizationName;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'user_id' });

    if (profileError) {
      console.error('Failed to upsert user profile:', profileError);
    }

    // Step 5: Auto-create business(es) based on registration type
    if (organizationId) {
      // For Property Managers (Type 3): Create management company as their business
      // They will add client businesses separately via the dashboard
      if (extendedData?.managementCompany) {
        // Create the management company business
        try {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .insert({
              organization_id: organizationId,
              owner_user_id: userId,
              business_name: organizationName,
              business_type: 'management_company',
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
              is_active: true,
              is_default: true,
              created_by: userId,
            })
            .select()
            .single();

          if (businessError) {
            console.error('Failed to create management company business:', businessError);
          } else if (businessData) {
            // Create default templates for the new business (non-blocking)
            defaultTemplatesService.createDefaultTemplatesForBusiness(businessData.id, userId)
              .catch(err => console.error('Failed to create default templates:', err));
          }
        } catch (err) {
          console.error('Error creating management company business:', err);
        }

        // If first client business was configured, create it too
        if (extendedData?.setupFirstClient && extendedData?.clientBusiness) {
          try {
            const { data: clientData, error: clientError } = await supabase
              .from('businesses')
              .insert({
                organization_id: organizationId,
                owner_user_id: userId,
                business_name: extendedData.clientBusiness.name,
                business_type: 'client_property',
                email: email,
                phone: extendedData?.phone || null,
                address_line1: extendedData.clientBusiness.addressLine1 || null,
                address_line2: extendedData.clientBusiness.addressLine2 || null,
                city: extendedData.clientBusiness.city || null,
                state: extendedData.clientBusiness.stateProvince || null,
                postal_code: extendedData.clientBusiness.postalCode || null,
                country: extendedData.clientBusiness.country || 'CA',
                currency: 'CAD',
                timezone: 'America/Toronto',
                is_active: true,
                is_default: false,
                created_by: userId,
              })
              .select()
              .single();

            if (clientError) {
              console.error('Failed to create client business:', clientError);
            } else if (clientData) {
              // Create default templates for the client business (non-blocking)
              defaultTemplatesService.createDefaultTemplatesForBusiness(clientData.id, userId)
                .catch(err => console.error('Failed to create default templates for client:', err));
            }
          } catch (err) {
            console.error('Error creating client business:', err);
          }
        }
      } else {
        // For Landlords (Type 1 & 2): Create their business using org/business info
        // This is the typical single landlord or multi-property landlord flow
        const businessName = extendedData?.businessName || organizationName;

        try {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .insert({
              organization_id: organizationId,
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
              is_active: true,
              is_default: true,
              created_by: userId,
            })
            .select()
            .single();

          if (businessError) {
            console.error('Failed to create default business:', businessError);
          } else if (businessData) {
            // Create default templates for the new business (non-blocking)
            defaultTemplatesService.createDefaultTemplatesForBusiness(businessData.id, userId)
              .catch(err => console.error('Failed to create default templates:', err));
          }
        } catch (err) {
          console.error('Error creating default business:', err);
        }
      }
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
