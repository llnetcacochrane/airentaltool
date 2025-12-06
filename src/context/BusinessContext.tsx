import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Business } from '../types';
import { businessService, BusinessWithStats } from '../services/businessService';
import { useAuth } from './AuthContext';

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: BusinessWithStats[];
  loading: boolean;
  error: string | null;
  setCurrentBusiness: (business: Business) => void;
  refreshBusinesses: () => Promise<void>;
  hasMultipleBusinesses: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { supabaseUser, currentOrganization } = useAuth();
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = async () => {
    if (!supabaseUser) {
      setCurrentBusinessState(null);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [defaultBusiness, allBusinesses] = await Promise.all([
        businessService.getUserDefaultBusiness(),
        businessService.getUserBusinesses(),
      ]);

      setBusinesses(allBusinesses);

      // Restore previously selected business from localStorage if valid
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      if (savedBusinessId) {
        const savedBusiness = allBusinesses.find(b => b.id === savedBusinessId);
        if (savedBusiness) {
          setCurrentBusinessState(savedBusiness as Business);
          return;
        }
      }

      // Otherwise use default or first business
      if (defaultBusiness) {
        setCurrentBusinessState(defaultBusiness);
        localStorage.setItem('currentBusinessId', defaultBusiness.id);
      } else if (allBusinesses.length > 0) {
        const firstBusiness = allBusinesses[0] as Business;
        setCurrentBusinessState(firstBusiness);
        localStorage.setItem('currentBusinessId', firstBusiness.id);
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [supabaseUser?.id, currentOrganization?.id]);

  const setCurrentBusiness = (business: Business) => {
    setCurrentBusinessState(business);
    localStorage.setItem('currentBusinessId', business.id);
  };

  const refreshBusinesses = async () => {
    await loadBusinesses();
  };

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    loading,
    error,
    setCurrentBusiness,
    refreshBusinesses,
    hasMultipleBusinesses: businesses.length > 1,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}

// Export alias for backward compatibility during migration
export { useBusiness as usePortfolio };
