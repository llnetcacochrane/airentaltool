import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Portfolio, portfolioService } from '../services/portfolioService';
import { useAuth } from './AuthContext';

interface PortfolioContextType {
  currentPortfolio: Portfolio | null;
  portfolios: Portfolio[];
  loading: boolean;
  error: string | null;
  setCurrentPortfolio: (portfolio: Portfolio) => void;
  refreshPortfolios: () => Promise<void>;
  needsOrganization: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { supabaseUser, currentOrganization } = useAuth();
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOrganization, setNeedsOrganization] = useState(false);

  const loadPortfolios = async () => {
    if (!supabaseUser) {
      setCurrentPortfolio(null);
      setPortfolios([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [defaultPortfolio, allPortfolios, needsOrg] = await Promise.all([
        portfolioService.getUserDefaultPortfolio(),
        portfolioService.getUserPortfolios(),
        portfolioService.userNeedsOrganization(),
      ]);

      setPortfolios(allPortfolios);
      setNeedsOrganization(needsOrg);

      if (defaultPortfolio) {
        setCurrentPortfolio(defaultPortfolio);
      } else if (allPortfolios.length > 0) {
        setCurrentPortfolio(allPortfolios[0]);
      }
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, [supabaseUser?.id, currentOrganization?.id]);

  const refreshPortfolios = async () => {
    await loadPortfolios();
  };

  const value: PortfolioContextType = {
    currentPortfolio,
    portfolios,
    loading,
    error,
    setCurrentPortfolio,
    refreshPortfolios,
    needsOrganization,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
