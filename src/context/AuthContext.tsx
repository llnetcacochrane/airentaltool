import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authService, ExtendedRegistrationData } from '../services/authService';
import { businessService, BusinessWithStats } from '../services/businessService';
import { propertyOwnerService } from '../services/propertyOwnerService';
import { packageTierService, PackageTier } from '../services/packageTierService';
import { User, UserRole, Business } from '../types';

export type ClientType = 'landlord' | 'property_manager';
export type PackageType = 'single_company' | 'management_company';

/**
 * SECURITY: Session timeout configuration
 * Automatically log out users after inactivity to prevent session hijacking
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const SESSION_WARNING_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  userProfile: User | null;
  // Business-centric architecture - NO organizations
  businesses: BusinessWithStats[];
  currentBusiness: Business | null;
  // Role is now tied to business ownership
  currentRole: UserRole | null;
  isSuperAdmin: boolean;
  isPropertyOwner: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Package/Client type info
  packageTier: PackageTier | null;
  packageType: PackageType | null;
  clientType: ClientType;
  isLandlord: boolean;
  isPropertyManager: boolean;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, tierSlug?: string, extendedData?: ExtendedRegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
  hasPermission: (permission: string | string[]) => boolean;
  canManageProperties: () => boolean;
  canManagePayments: () => boolean;
  canViewReports: () => boolean;
  canManageClients: () => boolean;
  canManageBusinesses: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPropertyOwner, setIsPropertyOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [packageTier, setPackageTier] = useState<PackageTier | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // SECURITY: Session timeout - track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // SECURITY: Set up activity listeners and timeout check
  useEffect(() => {
    if (!supabaseUser) return;

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for session timeout periodically
    const timeoutCheck = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      if (inactiveTime >= SESSION_TIMEOUT_MS) {
        // SECURITY: Auto-logout after inactivity
        console.warn('Session timeout due to inactivity');
        authService.logout();
      } else if (inactiveTime >= SESSION_TIMEOUT_MS - SESSION_WARNING_MS) {
        // TODO: Show warning toast to user about impending timeout
        // Consider adding a modal with "Stay logged in" option
      }
    }, 60000); // Check every minute

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(timeoutCheck);
    };
  }, [supabaseUser, lastActivity, updateActivity]);

  // Load businesses for user
  const loadBusinesses = useCallback(async () => {
    try {
      const userBusinesses = await businessService.getUserBusinesses();
      setBusinesses(userBusinesses);

      // Set current business from localStorage or default
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      let business: Business | null = null;

      if (savedBusinessId) {
        business = userBusinesses.find(b => b.id === savedBusinessId) || null;
      }

      if (!business && userBusinesses.length > 0) {
        // Find default business or use first one
        business = userBusinesses.find(b => b.is_default) || userBusinesses[0];
      }

      if (business) {
        setCurrentBusiness(business);
        localStorage.setItem('currentBusinessId', business.id);
      }

      return business;
    } catch (error) {
      console.error('Error loading businesses:', error);
      return null;
    }
  }, []);

  // Load package tier for user
  const loadPackageTier = useCallback(async (userId: string) => {
    try {
      const { tier } = await packageTierService.getEffectivePackageSettingsForUser(userId);
      setPackageTier(tier);
    } catch (error) {
      console.error('Error loading package tier:', error);
      // Try to get from user profile as fallback
      try {
        const profile = await authService.getUserProfile(userId);
        if (profile?.selected_tier) {
          const tier = await packageTierService.getTierBySlug(profile.selected_tier);
          setPackageTier(tier);
        }
      } catch {
        // Package tier loading is non-critical
      }
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        setSupabaseUser(user || null);

        if (user) {
          const profile = await authService.getUserProfile(user.id);
          setUserProfile(profile);

          const superAdmin = await authService.checkSuperAdmin(user.id);
          setIsSuperAdmin(superAdmin);

          const propertyOwner = await propertyOwnerService.isPropertyOwner();
          setIsPropertyOwner(propertyOwner);

          // Load businesses (replaces organization loading)
          await loadBusinesses();

          // Load package tier
          await loadPackageTier(user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const unsubscribe = authService.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          setSupabaseUser(session.user);
          const profile = await authService.getUserProfile(session.user.id);
          setUserProfile(profile);
          const superAdmin = await authService.checkSuperAdmin(session.user.id);
          setIsSuperAdmin(superAdmin);
          const propertyOwner = await propertyOwnerService.isPropertyOwner();
          setIsPropertyOwner(propertyOwner);

          // Load businesses
          await loadBusinesses();

          // Load package tier
          await loadPackageTier(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUserProfile(null);
          setIsSuperAdmin(false);
          setIsPropertyOwner(false);
          setBusinesses([]);
          setCurrentBusiness(null);
          setPackageTier(null);
          localStorage.removeItem('currentBusinessId');
        }
      })();
    });

    return () => unsubscribe.data?.subscription?.unsubscribe?.();
  }, [loadBusinesses, loadPackageTier]);

  const login = async (email: string, password: string) => {
    await authService.login(email, password);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string, tierSlug?: string, extendedData?: ExtendedRegistrationData) => {
    await authService.register(email, password, firstName, lastName, tierSlug, extendedData);
  };

  const logout = async () => {
    await authService.logout();
    setSupabaseUser(null);
    setUserProfile(null);
    setIsSuperAdmin(false);
    setIsPropertyOwner(false);
    setBusinesses([]);
    setCurrentBusiness(null);
    setPackageTier(null);
    localStorage.removeItem('currentBusinessId');
  };

  const switchBusiness = async (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      localStorage.setItem('currentBusinessId', businessId);
    }
  };

  const refreshBusinesses = async () => {
    await loadBusinesses();
  };

  const hasPermission = (permission: string | string[]): boolean => {
    // Property owners have limited permissions
    if (isPropertyOwner) {
      return permission === 'view_reports' || (Array.isArray(permission) && permission.includes('view_reports'));
    }

    // Business owners have all permissions on their businesses
    if (currentBusiness) {
      return true; // Owner of business has all permissions
    }

    // Define permission sets (for future team member support)
    const permissions: Record<UserRole, string[]> = {
      owner: ['all'],
      admin: ['manage_team', 'manage_properties', 'manage_payments', 'view_reports', 'manage_settings'],
      property_manager: ['manage_properties', 'view_reports'],
      accounting: ['manage_payments', 'view_reports'],
      viewer: ['view_reports'],
    };

    // Default to owner permissions for business owners
    const userPermissions = permissions.owner;

    if (userPermissions.includes('all')) return true;

    const permArray = Array.isArray(permission) ? permission : [permission];
    return permArray.some((p) => userPermissions.includes(p));
  };

  const canManageProperties = () => {
    return hasPermission('manage_properties');
  };

  const canManagePayments = () => {
    return hasPermission('manage_payments');
  };

  const canViewReports = () => {
    return hasPermission('view_reports');
  };

  // Derived package type values
  const packageType: PackageType | null = packageTier?.package_type as PackageType || null;
  const clientType: ClientType = packageType === 'management_company' ? 'property_manager' : 'landlord';
  const isLandlord = clientType === 'landlord';
  const isPropertyManager = clientType === 'property_manager';

  // Property Manager specific permissions
  const canManageClients = () => {
    // Only property managers can manage clients (property owners)
    if (!isPropertyManager) return false;
    return hasPermission(['manage_properties', 'all']);
  };

  const canManageBusinesses = () => {
    // All authenticated users can manage their businesses
    return hasPermission(['manage_properties', 'all']);
  };

  // Current role - business owners are always 'owner'
  const currentRole: UserRole = currentBusiness ? 'owner' : 'viewer';

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        userProfile,
        businesses,
        currentBusiness,
        currentRole,
        isSuperAdmin,
        isPropertyOwner,
        isLoading,
        isAuthenticated: !!supabaseUser,
        // Package/Client type info
        packageTier,
        packageType,
        clientType,
        isLandlord,
        isPropertyManager,
        // Actions
        login,
        register,
        logout,
        switchBusiness,
        refreshBusinesses,
        hasPermission,
        canManageProperties,
        canManagePayments,
        canViewReports,
        canManageClients,
        canManageBusinesses,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
