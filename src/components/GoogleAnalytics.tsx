import { useEffect, useState } from 'react';
import { systemConfigService } from '../services/systemConfigService';

/**
 * Google Analytics 4 component
 * Dynamically loads GA4 based on system configuration
 * Allows white-label deployments to use their own tracking ID
 */
export function GoogleAnalytics() {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    loadAnalyticsConfig();
  }, []);

  const loadAnalyticsConfig = async () => {
    try {
      const [gaId, enabled] = await Promise.all([
        systemConfigService.getGATrackingId(),
        systemConfigService.isAnalyticsEnabled(),
      ]);

      setTrackingId(gaId);
      setIsEnabled(enabled);

      // Only initialize if both enabled and tracking ID exists
      if (enabled && gaId && gaId.trim() !== '') {
        initializeGA(gaId);
      }
    } catch (error) {
      console.error('Failed to load analytics config:', error);
    }
  };

  const initializeGA = (gaId: string) => {
    // Check if already loaded
    if (window.gtag) {
      console.log('[GA] Already initialized');
      return;
    }

    // Create script elements
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gtagScript);

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      send_page_view: false, // We'll send page views manually via analyticsService
      cookie_flags: 'SameSite=None;Secure',
    });

    console.log('[GA] Initialized with ID:', gaId);
  };

  // This component doesn't render anything
  return null;
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
