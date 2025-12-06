import { createContext, useContext, ReactNode } from 'react';
import { Business } from '../types';
import { useAuth } from './AuthContext';
import { BusinessWithStats } from '../services/businessService';

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

/**
 * BusinessProvider now wraps the AuthContext business functionality
 * for backward compatibility. The AuthContext is the source of truth.
 */
export function BusinessProvider({ children }: { children: ReactNode }) {
  const {
    currentBusiness,
    businesses,
    isLoading,
    switchBusiness,
    refreshBusinesses
  } = useAuth();

  const setCurrentBusiness = (business: Business) => {
    switchBusiness(business.id);
  };

  const value: BusinessContextType = {
    currentBusiness,
    businesses,
    loading: isLoading,
    error: null,
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
    // Fallback to AuthContext if not wrapped in BusinessProvider
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}

// Export alias for backward compatibility during migration
export { useBusiness as usePortfolio };
