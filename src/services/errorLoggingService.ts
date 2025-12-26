import { supabase } from '../lib/supabase';

export interface ErrorLog {
  id?: string;
  user_id?: string;
  error_message: string;
  error_stack?: string;
  component_stack?: string;
  page_url: string;
  user_agent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

class ErrorLoggingService {
  private queue: ErrorLog[] = [];
  private isProcessing = false;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Start batch processing interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.processBatch(), this.BATCH_INTERVAL);
    }
  }

  /**
   * Log an error to the console and optionally to the database
   */
  async logError(
    error: Error | string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>,
    componentStack?: string
  ): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Always log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorLogging]', {
        message: errorMessage,
        severity,
        stack: errorStack,
        metadata,
      });
    }

    // In production, log to console only for high/critical errors
    if (import.meta.env.PROD && (severity === 'high' || severity === 'critical')) {
      console.error('[ErrorLogging]', errorMessage);
    }

    // Get current user ID if available
    const { data: { user } } = await supabase.auth.getUser();

    // Create error log entry
    const logEntry: ErrorLog = {
      user_id: user?.id,
      error_message: errorMessage.substring(0, 1000), // Limit message length
      error_stack: errorStack?.substring(0, 5000), // Limit stack length
      component_stack: componentStack?.substring(0, 5000),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity,
      metadata,
    };

    // Add to queue for batch processing
    this.addToQueue(logEntry);

    // For critical errors, process immediately
    if (severity === 'critical') {
      await this.processBatch();
    }
  }

  /**
   * Log a custom event (non-error)
   */
  async logEvent(
    eventName: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    if (import.meta.env.DEV) {
      console.log('[Event]', eventName, eventData);
    }

    // In production, you could send this to an analytics service
    // For now, just log locally
  }

  /**
   * Add error log to processing queue
   */
  private addToQueue(logEntry: ErrorLog): void {
    this.queue.push(logEntry);

    // Prevent queue from growing too large
    if (this.queue.length > this.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest entry
    }
  }

  /**
   * Process queued errors in batches
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.queue.splice(0, 10); // Process up to 10 at a time

      // In production, you could send to a logging service like:
      // - Sentry
      // - LogRocket
      // - Custom logging endpoint

      // For now, we'll store in localStorage as a fallback
      if (import.meta.env.PROD) {
        const existingLogs = this.getStoredLogs();
        const updatedLogs = [...existingLogs, ...batch].slice(-100); // Keep last 100
        localStorage.setItem('error_logs', JSON.stringify(updatedLogs));
      }

      // Optionally, send to a backend endpoint
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(batch),
      // });

    } catch (err) {
      // Don't let logging errors crash the app
      console.error('Failed to process error log batch:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get stored error logs from localStorage
   */
  getStoredLogs(): ErrorLog[] {
    try {
      const logs = localStorage.getItem('error_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored error logs
   */
  clearStoredLogs(): void {
    localStorage.removeItem('error_logs');
  }

  /**
   * Get error log statistics
   */
  getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byPage: Record<string, number>;
  } {
    const logs = this.getStoredLogs();

    const bySeverity: Record<string, number> = {};
    const byPage: Record<string, number> = {};

    logs.forEach(log => {
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;

      const page = new URL(log.page_url).pathname;
      byPage[page] = (byPage[page] || 0) + 1;
    });

    return {
      total: logs.length,
      bySeverity,
      byPage,
    };
  }
}

// Export singleton instance
export const errorLoggingService = new ErrorLoggingService();

// Convenience functions
export const logError = (
  error: Error | string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  metadata?: Record<string, any>,
  componentStack?: string
) => errorLoggingService.logError(error, severity, metadata, componentStack);

export const logEvent = (eventName: string, eventData?: Record<string, any>) =>
  errorLoggingService.logEvent(eventName, eventData);
