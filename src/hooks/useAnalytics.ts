import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';

/**
 * Hook for tracking page views automatically
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    analyticsService.page();
  }, [location.pathname]);
}

/**
 * Hook for tracking events
 */
export function useAnalytics() {
  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    analyticsService.track(event, properties);
  }, []);

  const trackClick = useCallback((element: string, properties?: Record<string, any>) => {
    analyticsService.trackClick(element, properties);
  }, []);

  const trackFormSubmit = useCallback((formName: string, properties?: Record<string, any>) => {
    analyticsService.trackFormSubmit(formName, properties);
  }, []);

  const trackFeature = useCallback(
    (featureName: string, action: string, properties?: Record<string, any>) => {
      analyticsService.trackFeature(featureName, action, properties);
    },
    []
  );

  const trackError = useCallback((error: Error | string, properties?: Record<string, any>) => {
    analyticsService.trackError(error, properties);
  }, []);

  const trackPerformance = useCallback((metric: string, value: number, properties?: Record<string, any>) => {
    analyticsService.trackPerformance(metric, value, properties);
  }, []);

  const trackMilestone = useCallback((milestone: string, properties?: Record<string, any>) => {
    analyticsService.trackMilestone(milestone, properties);
  }, []);

  return {
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackFeature,
    trackError,
    trackPerformance,
    trackMilestone,
  };
}

/**
 * Hook for tracking form analytics
 */
export function useFormAnalytics(formName: string) {
  const { trackFormSubmit, trackEvent } = useAnalytics();

  const trackFormStart = useCallback(() => {
    trackEvent('form_started', { form_name: formName });
  }, [formName, trackEvent]);

  const trackFormField = useCallback(
    (fieldName: string, action: 'focus' | 'blur' | 'change') => {
      trackEvent('form_field_interaction', {
        form_name: formName,
        field_name: fieldName,
        action,
      });
    },
    [formName, trackEvent]
  );

  const trackFormValidation = useCallback(
    (isValid: boolean, errors?: string[]) => {
      trackEvent('form_validation', {
        form_name: formName,
        is_valid: isValid,
        error_count: errors?.length || 0,
      });
    },
    [formName, trackEvent]
  );

  const trackFormSuccess = useCallback(
    (properties?: Record<string, any>) => {
      trackFormSubmit(formName, { ...properties, success: true });
    },
    [formName, trackFormSubmit]
  );

  const trackFormError = useCallback(
    (error: string, properties?: Record<string, any>) => {
      trackFormSubmit(formName, { ...properties, success: false, error });
    },
    [formName, trackFormSubmit]
  );

  return {
    trackFormStart,
    trackFormField,
    trackFormValidation,
    trackFormSuccess,
    trackFormError,
  };
}

/**
 * Hook for tracking feature usage
 */
export function useFeatureTracking(featureName: string) {
  const { trackFeature } = useAnalytics();

  useEffect(() => {
    // Track feature view
    trackFeature(featureName, 'viewed');
  }, [featureName, trackFeature]);

  const trackAction = useCallback(
    (action: string, properties?: Record<string, any>) => {
      trackFeature(featureName, action, properties);
    },
    [featureName, trackFeature]
  );

  return { trackAction };
}

/**
 * Hook for tracking button clicks
 */
export function useButtonTracking() {
  const { trackClick } = useAnalytics();

  const trackButtonClick = useCallback(
    (buttonName: string, properties?: Record<string, any>) => {
      trackClick(buttonName, properties);
    },
    [trackClick]
  );

  return { trackButtonClick };
}

/**
 * Hook for tracking errors in components
 */
export function useErrorTracking() {
  const { trackError } = useAnalytics();

  useEffect(() => {
    // Track unhandled errors
    const handleError = (event: ErrorEvent) => {
      trackError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(event.reason, {
        type: 'unhandled_promise_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return { trackError };
}

/**
 * Hook for tracking performance metrics
 */
export function usePerformanceTracking(metricName: string) {
  const { trackPerformance } = useAnalytics();

  const trackLoadTime = useCallback(
    (startTime: number) => {
      const loadTime = Date.now() - startTime;
      trackPerformance(`${metricName}_load_time`, loadTime);
    },
    [metricName, trackPerformance]
  );

  const trackOperationTime = useCallback(
    (operationName: string, duration: number) => {
      trackPerformance(`${metricName}_${operationName}`, duration);
    },
    [metricName, trackPerformance]
  );

  return {
    trackLoadTime,
    trackOperationTime,
  };
}

/**
 * Hook for tracking user journey milestones
 */
export function useMilestoneTracking() {
  const { trackMilestone } = useAnalytics();

  const trackCompletedMilestone = useCallback(
    (milestone: string, properties?: Record<string, any>) => {
      trackMilestone(milestone, properties);
    },
    [trackMilestone]
  );

  return { trackCompletedMilestone };
}

/**
 * Hook for tracking search functionality
 */
export function useSearchTracking() {
  const { trackEvent } = useAnalytics();

  const trackSearch = useCallback(
    (query: string, resultCount: number, properties?: Record<string, any>) => {
      trackEvent('search_performed', {
        query_length: query.length,
        result_count: resultCount,
        has_results: resultCount > 0,
        ...properties,
      });
    },
    [trackEvent]
  );

  const trackSearchResultClick = useCallback(
    (query: string, resultPosition: number, properties?: Record<string, any>) => {
      trackEvent('search_result_clicked', {
        query_length: query.length,
        result_position: resultPosition,
        ...properties,
      });
    },
    [trackEvent]
  );

  return {
    trackSearch,
    trackSearchResultClick,
  };
}
