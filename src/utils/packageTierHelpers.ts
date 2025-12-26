/**
 * Package Tier Helper Functions
 *
 * Determines user type and registration flow based on package tier
 */

export interface PackageTierLimits {
  tier_slug: string;
  tier_name: string;
  max_businesses: number;
  max_properties: number;
  max_units: number;
}

export enum UserType {
  TYPE_1_SINGLE_LANDLORD = 'type1', // Single landlord, single business
  TYPE_2_MULTI_PROPERTY = 'type2',   // Landlord with multiple properties
  TYPE_3_PROPERTY_MANAGER = 'type3', // Property management company
}

/**
 * Determines the user type based on package tier limits
 */
export function getUserType(tier: PackageTierLimits): UserType {
  // Type 3: Property manager - multiple businesses allowed
  if (tier.max_businesses > 1) {
    return UserType.TYPE_3_PROPERTY_MANAGER;
  }

  // Type 1: Single landlord, single business - basic tiers
  if (tier.max_businesses === 1 && tier.max_properties <= 10) {
    return UserType.TYPE_1_SINGLE_LANDLORD;
  }

  // Type 2: Multi-property landlord - professional tiers
  // This includes professional tier (max_businesses=0) and single business with many properties
  return UserType.TYPE_2_MULTI_PROPERTY;
}

/**
 * Gets the registration route based on user type
 */
export function getRegistrationRoute(userType: UserType): string {
  switch (userType) {
    case UserType.TYPE_1_SINGLE_LANDLORD:
      return '/register/single-landlord';
    case UserType.TYPE_2_MULTI_PROPERTY:
      return '/register/multi-property';
    case UserType.TYPE_3_PROPERTY_MANAGER:
      return '/register/property-manager';
    default:
      return '/register';
  }
}

/**
 * Determines if a tier allows multiple businesses
 */
export function allowsMultipleBusinesses(tier: PackageTierLimits): boolean {
  return tier.max_businesses > 1 || tier.max_businesses === 999999;
}

/**
 * Determines if a tier is a property management tier
 */
export function isManagementTier(tierSlug: string): boolean {
  return tierSlug.startsWith('management_');
}

/**
 * Gets user-friendly description of tier capabilities
 */
export function getTierCapabilityDescription(tier: PackageTierLimits): string {
  const userType = getUserType(tier);

  switch (userType) {
    case UserType.TYPE_1_SINGLE_LANDLORD:
      return 'Perfect for individual landlords managing a single property';
    case UserType.TYPE_2_MULTI_PROPERTY:
      return 'Ideal for landlords with multiple properties and units';
    case UserType.TYPE_3_PROPERTY_MANAGER:
      return 'Designed for property management companies managing multiple clients';
    default:
      return '';
  }
}

/**
 * Checks if user should see business setup wizard
 */
export function shouldShowBusinessWizard(tier: PackageTierLimits): boolean {
  const userType = getUserType(tier);
  return userType === UserType.TYPE_2_MULTI_PROPERTY || userType === UserType.TYPE_3_PROPERTY_MANAGER;
}

/**
 * Checks if user needs partnership/co-owner features
 */
export function supportsPartnershipFeatures(tier: PackageTierLimits): boolean {
  const userType = getUserType(tier);
  return userType === UserType.TYPE_2_MULTI_PROPERTY || userType === UserType.TYPE_3_PROPERTY_MANAGER;
}
