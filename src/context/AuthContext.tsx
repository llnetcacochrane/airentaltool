import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { propertyOwnerService } from '../services/propertyOwnerService';
import { Organization, OrganizationMember, User, UserRole } from '../types';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  userProfile: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentMember: OrganizationMember | null;
  currentRole: UserRole | null;
  isSuperAdmin: boolean;
  isPropertyOwner: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, tierSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, slug: string, companyName?: string, tierSlug?: string) => Promise<Organization>;
  hasPermission: (permission: string | string[]) => boolean;
  canManageProperties: () => boolean;
  canManagePayments: () => boolean;
  canViewReports: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPropertyOwner, setIsPropertyOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

          const orgsRaw = await authService.getOrganizations();

          // Clean organization data by removing membership fields
          const orgs = (orgsRaw || []).map((org: any) => {
            const { my_role, my_member_id, ...cleanOrg } = org;
            return cleanOrg as Organization;
          });

          setOrganizations(orgs);

          if (orgsRaw && orgsRaw.length > 0) {
            const savedOrgId = localStorage.getItem('currentOrganizationId');
            const defaultOrgRaw = savedOrgId
              ? orgsRaw.find((o) => o.id === savedOrgId) || orgsRaw[0]
              : orgsRaw[0];

            if (defaultOrgRaw) {
              // Extract membership data
              const role = (defaultOrgRaw as any).my_role;
              const memberId = (defaultOrgRaw as any).my_member_id;

              // Create clean organization object
              const { my_role, my_member_id, ...cleanOrg } = defaultOrgRaw as any;
              setCurrentOrganization(cleanOrg as Organization);

              console.log('Auth Init - Setting organization:', cleanOrg);
              console.log('Auth Init - Role:', role, 'Member ID:', memberId);

              if (role && memberId) {
                setCurrentMember({
                  id: memberId,
                  organization_id: cleanOrg.id,
                  user_id: user.id,
                  role: role,
                  is_active: true,
                  created_at: cleanOrg.created_at,
                } as OrganizationMember);
              }
            }
          }
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
          const orgsRaw = await authService.getOrganizations();

          // Clean organization data by removing membership fields
          const orgs = (orgsRaw || []).map((org: any) => {
            const { my_role, my_member_id, ...cleanOrg } = org;
            return cleanOrg as Organization;
          });

          setOrganizations(orgs);

          if (orgsRaw && orgsRaw.length > 0) {
            const savedOrgId = localStorage.getItem('currentOrganizationId');
            const defaultOrgRaw = savedOrgId
              ? orgsRaw.find((o) => o.id === savedOrgId) || orgsRaw[0]
              : orgsRaw[0];

            if (defaultOrgRaw) {
              // Extract membership data
              const role = (defaultOrgRaw as any).my_role;
              const memberId = (defaultOrgRaw as any).my_member_id;

              // Create clean organization object
              const { my_role, my_member_id, ...cleanOrg } = defaultOrgRaw as any;
              setCurrentOrganization(cleanOrg as Organization);

              if (role && memberId) {
                setCurrentMember({
                  id: memberId,
                  organization_id: cleanOrg.id,
                  user_id: session.user.id,
                  role: role,
                  is_active: true,
                  created_at: cleanOrg.created_at,
                } as OrganizationMember);
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUserProfile(null);
          setIsSuperAdmin(false);
          setIsPropertyOwner(false);
          setOrganizations([]);
          setCurrentOrganization(null);
          setCurrentMember(null);
          localStorage.removeItem('currentOrganizationId');
        }
      })();
    });

    return () => unsubscribe.data?.subscription?.unsubscribe?.();
  }, []);

  const login = async (email: string, password: string) => {
    await authService.login(email, password);
  };

  const register = async (email: string, password: string, firstName: string, lastName: string, tierSlug?: string) => {
    await authService.register(email, password, firstName, lastName, tierSlug);
  };

  const logout = async () => {
    await authService.logout();
    setSupabaseUser(null);
    setUserProfile(null);
    setIsSuperAdmin(false);
    setIsPropertyOwner(false);
    setOrganizations([]);
    setCurrentOrganization(null);
    setCurrentMember(null);
    localStorage.removeItem('currentOrganizationId');
  };

  const switchOrganization = async (organizationId: string) => {
    // Re-fetch to get membership data
    const orgsRaw = await authService.getOrganizations();
    const orgRaw = orgsRaw.find((o: any) => o.id === organizationId);

    if (orgRaw) {
      // Extract membership data
      const role = (orgRaw as any).my_role;
      const memberId = (orgRaw as any).my_member_id;

      // Create clean organization object
      const { my_role, my_member_id, ...cleanOrg } = orgRaw as any;
      setCurrentOrganization(cleanOrg as Organization);
      localStorage.setItem('currentOrganizationId', organizationId);

      if (supabaseUser && role && memberId) {
        setCurrentMember({
          id: memberId,
          organization_id: cleanOrg.id,
          user_id: supabaseUser.id,
          role: role,
          is_active: true,
          created_at: cleanOrg.created_at,
        } as OrganizationMember);
      }
    }
  };

  const createOrganization = async (name: string, slug: string, companyName?: string, tierSlug?: string) => {
    const newOrg = await authService.createOrganization(name, slug, companyName, tierSlug);
    if (newOrg) {
      setOrganizations([...organizations, newOrg]);
      await switchOrganization(newOrg.id);
    }
    return newOrg;
  };

  const hasPermission = (permission: string | string[]): boolean => {
    if (isPropertyOwner) {
      return permission === 'view_reports' || (Array.isArray(permission) && permission.includes('view_reports'));
    }

    if (!currentMember) return false;

    const permissions: Record<UserRole, string[]> = {
      owner: ['all'],
      admin: ['manage_team', 'manage_properties', 'manage_payments', 'view_reports', 'manage_settings'],
      property_manager: ['manage_properties', 'view_reports'],
      accounting: ['manage_payments', 'view_reports'],
      viewer: ['view_reports'],
    };

    const userPermissions = permissions[currentMember.role] || [];

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

  const currentRole = currentMember?.role || null;

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        userProfile,
        organizations,
        currentOrganization,
        currentMember,
        currentRole,
        isSuperAdmin,
        isPropertyOwner,
        isLoading,
        isAuthenticated: !!supabaseUser,
        login,
        register,
        logout,
        switchOrganization,
        createOrganization,
        hasPermission,
        canManageProperties,
        canManagePayments,
        canViewReports,
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
