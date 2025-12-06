import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface TenantPortalData {
  tenant_id: string;
  tenant_first_name: string;
  tenant_last_name: string;
  tenant_email: string;
  tenant_phone: string | null;
  unit_id: string;
  unit_number: string;
  unit_name: string; // Combined property + unit for display
  property_id: string;
  property_name: string;
  property_address: string;
  organization_id: string;
  organization_name: string;
  lease_id: string | null; // Reference to active lease if exists
  lease_start_date: string | null;
  lease_end_date: string | null;
  monthly_rent_cents: number | null;
  security_deposit_paid_cents: number;
  status: string;
}

interface TenantContextType {
  isTenantUser: boolean;
  tenantData: TenantPortalData | null;
  isLoading: boolean;
  error: string | null;
  refreshTenantData: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUser, isAuthenticated } = useAuth();
  const [isTenantUser, setIsTenantUser] = useState(false);
  const [tenantData, setTenantData] = useState<TenantPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenantData = async () => {
    if (!supabaseUser) {
      setIsTenantUser(false);
      setTenantData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if this user is linked to a tenant record
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          unit_id,
          lease_start_date,
          lease_end_date,
          monthly_rent_cents,
          security_deposit_paid_cents,
          status,
          has_portal_access,
          units:unit_id (
            id,
            unit_number,
            property_id,
            properties:property_id (
              id,
              name,
              address_line1,
              city,
              state,
              postal_code,
              organization_id,
              organizations:organization_id (
                id,
                name
              )
            )
          )
        `)
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)
        .eq('has_portal_access', true)
        .maybeSingle();

      if (tenantError) {
        console.error('Error fetching tenant data:', tenantError);
        setError('Failed to load tenant data');
        setIsTenantUser(false);
        setTenantData(null);
        return;
      }

      if (tenant && tenant.units) {
        const unit = tenant.units as any;
        const property = unit.properties as any;
        const organization = property?.organizations as any;

        // Build unit display name
        const unitName = property?.name
          ? `${property.name} - Unit ${unit.unit_number}`
          : `Unit ${unit.unit_number}`;

        setIsTenantUser(true);
        setTenantData({
          tenant_id: tenant.id,
          tenant_first_name: tenant.first_name,
          tenant_last_name: tenant.last_name,
          tenant_email: tenant.email,
          tenant_phone: tenant.phone,
          unit_id: unit.id,
          unit_number: unit.unit_number,
          unit_name: unitName,
          property_id: property?.id || '',
          property_name: property?.name || '',
          property_address: property ? `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}` : '',
          organization_id: organization?.id || '',
          organization_name: organization?.name || '',
          lease_id: tenant.id, // Using tenant_id as lease reference for now
          lease_start_date: tenant.lease_start_date,
          lease_end_date: tenant.lease_end_date,
          monthly_rent_cents: tenant.monthly_rent_cents,
          security_deposit_paid_cents: tenant.security_deposit_paid_cents,
          status: tenant.status,
        });
      } else {
        setIsTenantUser(false);
        setTenantData(null);
      }
    } catch (err) {
      console.error('Error in loadTenantData:', err);
      setError('An unexpected error occurred');
      setIsTenantUser(false);
      setTenantData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTenantData();
    } else {
      setIsTenantUser(false);
      setTenantData(null);
      setIsLoading(false);
    }
  }, [supabaseUser?.id, isAuthenticated]);

  const refreshTenantData = async () => {
    await loadTenantData();
  };

  return (
    <TenantContext.Provider
      value={{
        isTenantUser,
        tenantData,
        isLoading,
        error,
        refreshTenantData,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
