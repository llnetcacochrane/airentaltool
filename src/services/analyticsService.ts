/**
 * Analytics Service
 * Privacy-conscious event tracking for understanding user behavior and improving the platform
 *
 * Features:
 * - Event tracking (page views, clicks, form submissions)
 * - User journey tracking
 * - Feature usage analytics
 * - Performance monitoring
 * - Error tracking integration
 *
 * Privacy:
 * - No personally identifiable information (PII) tracked without consent
 * - Respects Do Not Track (DNT) browser setting
 * - Local storage for session tracking
 * - Can be disabled via user preferences
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  page?: string;
}

interface AnalyticsConfig {
  enabled: boolean;
  respectDNT: boolean;
  debug: boolean;
  batchSize: number;
  batchInterval: number;
}

class AnalyticsService {
  private config: AnalyticsConfig = {
    enabled: true,
    respectDNT: true,
    debug: false,
    batchSize: 10,
    batchInterval: 30000, // 30 seconds
  };

  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private batchTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startBatchProcessor();

    // Check Do Not Track
    if (this.config.respectDNT && navigator.doNotTrack === '1') {
      this.config.enabled = false;
      console.log('[Analytics] Do Not Track enabled - analytics disabled');
    }
  }

  /**
   * Initialize analytics with user information
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.userId = userId;

    this.track('user_identified', {
      userId,
      ...traits,
    });

    if (this.config.debug) {
      console.log('[Analytics] User identified:', userId);
    }
  }

  /**
   * Track an event
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      page: window.location.pathname,
    };

    this.eventQueue.push(analyticsEvent);

    if (this.config.debug) {
      console.log('[Analytics] Event tracked:', event, properties);
    }

    // Send immediately if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track a page view
   */
  page(name?: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    const pageData = {
      page_name: name || document.title,
      page_path: window.location.pathname,
      page_url: window.location.href,
      referrer: document.referrer,
      ...properties,
    };

    this.track('page_view', pageData);

    // Send page_view directly to GA4
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageData.page_name,
        page_location: pageData.page_url,
        page_path: pageData.page_path,
      });
    }
  }

  /**
   * Track a click event
   */
  trackClick(element: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.track('element_clicked', {
      element,
      ...properties,
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmit(formName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.track('form_submitted', {
      form_name: formName,
      ...properties,
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName: string, action: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.track('feature_used', {
      feature_name: featureName,
      action,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error | string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    this.track('error_occurred', {
      error_message: errorMessage,
      error_stack: errorStack,
      ...properties,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.track('performance_metric', {
      metric_name: metric,
      metric_value: value,
      ...properties,
    });
  }

  /**
   * Track user journey milestone
   */
  trackMilestone(milestone: string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.track('milestone_reached', {
      milestone,
      ...properties,
    });
  }

  /**
   * Flush event queue immediately
   */
  flush(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.config.debug) {
      console.log('[Analytics] Flushing events:', events);
    }

    // Store locally for now (can be integrated with analytics platform later)
    this.sendEvents(events);
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    localStorage.setItem('analytics_enabled', enabled.toString());

    if (enabled) {
      this.startBatchProcessor();
    } else {
      this.stopBatchProcessor();
      this.eventQueue = [];
    }
  }

  /**
   * Set debug mode
   */
  setDebug(debug: boolean): void {
    this.config.debug = debug;
  }

  /**
   * Check if analytics is enabled
   */
  private isEnabled(): boolean {
    // Check localStorage preference
    const storedPref = localStorage.getItem('analytics_enabled');
    if (storedPref !== null) {
      return storedPref === 'true';
    }

    return this.config.enabled;
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }

    return sessionId;
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip common PII fields
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('ssn') ||
        key.toLowerCase().includes('credit_card') ||
        key.toLowerCase().includes('tax_id')
      ) {
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Send events to analytics backend
   */
  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      // Store in localStorage for debugging (last 100 events)
      const stored = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      const combined = [...stored, ...events].slice(-100);
      localStorage.setItem('analytics_events', JSON.stringify(combined));

      // Send to Google Analytics 4 if available
      if (window.gtag) {
        events.forEach((event) => {
          this.sendToGA4(event);
        });
      }

      if (this.config.debug) {
        console.log('[Analytics] Events processed:', events.length);
      }
    } catch (error) {
      console.error('[Analytics] Failed to send events:', error);
    }
  }

  /**
   * Send event to Google Analytics 4
   */
  private sendToGA4(event: AnalyticsEvent): void {
    if (!window.gtag) return;

    try {
      // Map our event structure to GA4 format
      const eventName = this.normalizeEventName(event.event);
      const eventParams = {
        ...event.properties,
        event_category: event.properties?.category,
        event_label: event.properties?.label,
        value: event.properties?.value,
        session_id: event.sessionId,
        user_id: event.userId,
      };

      // Remove undefined values
      Object.keys(eventParams).forEach(
        (key) => eventParams[key] === undefined && delete eventParams[key]
      );

      window.gtag('event', eventName, eventParams);

      if (this.config.debug) {
        console.log('[Analytics] Sent to GA4:', eventName, eventParams);
      }
    } catch (error) {
      console.error('[Analytics] Failed to send to GA4:', error);
    }
  }

  /**
   * Normalize event names for GA4 (lowercase, underscores)
   */
  private normalizeEventName(eventName: string): string {
    return eventName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.batchInterval);
  }

  /**
   * Stop batch processor
   */
  private stopBatchProcessor(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  /**
   * Get stored events (for debugging/export)
   */
  getStoredEvents(): AnalyticsEvent[] {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored events
   */
  clearStoredEvents(): void {
    localStorage.removeItem('analytics_events');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Convenience exports
export const {
  identify,
  track,
  page,
  trackClick,
  trackFormSubmit,
  trackFeature,
  trackError,
  trackPerformance,
  trackMilestone,
  setEnabled,
  setDebug,
} = analyticsService;
