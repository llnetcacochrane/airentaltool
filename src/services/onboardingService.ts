import { supabase } from '../lib/supabase';
import { OnboardingState } from '../types';

export const onboardingService = {
  /**
   * Get the current user's onboarding state
   * Creates a new record if one doesn't exist
   */
  async getOnboardingState(): Promise<OnboardingState | null> {
    // Use the RPC function that creates if not exists
    const { data, error } = await supabase.rpc('get_or_create_onboarding_state');

    if (error) {
      console.error('Failed to get onboarding state:', error);
      return null;
    }

    return data;
  },

  /**
   * Update the onboarding state using RPC function (handles RLS properly)
   */
  async updateOnboardingState(updates: {
    has_added_property?: boolean;
    has_added_unit?: boolean;
    onboarding_dismissed?: boolean;
    post_onboarding_dismissed?: boolean;
    first_property_id?: string;
    first_unit_id?: string;
  }): Promise<OnboardingState | null> {
    const { data, error } = await supabase.rpc('update_user_onboarding_state', {
      p_has_added_property: updates.has_added_property ?? null,
      p_has_added_unit: updates.has_added_unit ?? null,
      p_onboarding_dismissed: updates.onboarding_dismissed ?? null,
      p_post_onboarding_dismissed: updates.post_onboarding_dismissed ?? null,
      p_first_property_id: updates.first_property_id ?? null,
      p_first_unit_id: updates.first_unit_id ?? null,
    });

    if (error) {
      console.error('Failed to update onboarding state:', error);
      throw error;
    }

    return data;
  },

  /**
   * Mark that the user has added their first property
   */
  async markPropertyAdded(propertyId?: string): Promise<void> {
    await this.updateOnboardingState({
      has_added_property: true,
      first_property_id: propertyId,
    });
  },

  /**
   * Mark that the user has added their first unit
   */
  async markUnitAdded(unitId?: string): Promise<void> {
    await this.updateOnboardingState({
      has_added_unit: true,
      first_unit_id: unitId,
    });
  },

  /**
   * Dismiss the onboarding checklist
   */
  async dismissOnboarding(): Promise<void> {
    await this.updateOnboardingState({
      onboarding_dismissed: true,
    });
  },

  /**
   * Dismiss the post-onboarding guide
   */
  async dismissPostOnboarding(): Promise<void> {
    await this.updateOnboardingState({
      post_onboarding_dismissed: true,
    });
  },

  /**
   * Check if onboarding is complete (both steps done)
   */
  async isOnboardingComplete(): Promise<boolean> {
    const state = await this.getOnboardingState();
    return state?.has_added_property === true && state?.has_added_unit === true;
  },

  /**
   * Check if the user should see the onboarding checklist
   * Returns false if dismissed or if both steps are complete
   */
  async shouldShowOnboarding(): Promise<boolean> {
    const state = await this.getOnboardingState();
    if (!state) return true; // Show onboarding for new users

    // Don't show if dismissed
    if (state.onboarding_dismissed) return false;

    // Don't show if both steps complete (will show post-onboarding instead)
    if (state.has_added_property && state.has_added_unit) return false;

    return true;
  },

  /**
   * Check if the user should see the post-onboarding guide
   */
  async shouldShowPostOnboarding(): Promise<boolean> {
    const state = await this.getOnboardingState();
    if (!state) return false;

    // Only show if onboarding complete and not dismissed
    return (
      state.has_added_property === true &&
      state.has_added_unit === true &&
      state.post_onboarding_dismissed !== true
    );
  },

  /**
   * Sync onboarding state with actual data
   * Called to auto-complete steps for users who already have properties/units
   */
  async syncWithActualData(): Promise<OnboardingState | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    // Check if user has any properties
    const { count: propertyCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('is_active', true);

    // Check if user has any units
    const { count: unitCount } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('is_active', true);

    const hasProperty = (propertyCount || 0) > 0;
    const hasUnit = (unitCount || 0) > 0;

    const currentState = await this.getOnboardingState();

    // Update if there's any mismatch between state and actual data
    if (
      currentState &&
      (currentState.has_added_property !== hasProperty ||
        currentState.has_added_unit !== hasUnit)
    ) {
      // Sync state to match actual data (handles both additions and deletions)
      return await this.updateOnboardingState({
        has_added_property: hasProperty,
        has_added_unit: hasUnit,
      });
    }

    return currentState;
  },
};
