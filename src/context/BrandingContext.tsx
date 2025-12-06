import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { brandingService, EffectiveBranding } from '../services/brandingService';

interface BrandingContextType {
  branding: EffectiveBranding;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { currentBusiness } = useAuth();
  const [branding, setBranding] = useState<EffectiveBranding>({
    application_name: 'AI Rental Tools',
    logo_url: '/AiRentalTools-logo1t.svg',
    favicon_url: null,
    primary_color: '#2563eb',
    support_email: null,
    support_phone: null,
    white_label_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadBranding = async () => {
    if (!currentBusiness?.id) {
      const systemBranding = await brandingService.getSystemBranding();
      setBranding({
        application_name: systemBranding.application_name,
        logo_url: systemBranding.logo_url || '/AiRentalTools-logo1t.svg',
        favicon_url: systemBranding.favicon_url,
        primary_color: systemBranding.primary_color,
        support_email: systemBranding.support_email,
        support_phone: systemBranding.support_phone,
        white_label_enabled: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      const effectiveBranding = await brandingService.getEffectiveBranding(currentBusiness.id);
      setBranding(effectiveBranding);
    } catch (error) {
      console.error('Failed to load branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranding();
  }, [currentBusiness?.id]);

  const refreshBranding = async () => {
    setIsLoading(true);
    await loadBranding();
  };

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
