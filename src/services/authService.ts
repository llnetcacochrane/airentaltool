import { supabase } from '../lib/supabase';
import { User } from '../types';

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
  /**
   * Register a new user
   * Creates: User (auth) -> User Profile -> Business
   * NO organization is created - Business is the top-level entity
   */
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
      // Store business name for business naming (note: field still called organization_name in DB)
      profileUpdate.organization_name = extendedData.businessName;
    }

    // Update user profile - wait for it to complete
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdate)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Failed to update user profile:', profileError);
      // Don't throw - continue to try creating business
    }

    // Create the default business directly - NO ORGANIZATION
    const businessName = extendedData?.businessName || `${firstName} ${lastName}`;

    try {
      const { error: bizError } = await supabase
        .from('businesses')
        .insert({
          organization_id: null,  // No organization - business is top-level
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
    } catch (err) {
      console.error('Error during business creation:', err);
      // Don't throw - user is still created, they can set up business later
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
