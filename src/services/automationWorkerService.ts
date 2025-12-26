/**
 * Automation Worker Service
 *
 * This service handles automated tasks that should run periodically:
 * - Processing scheduled notifications
 * - Assessing late fees
 * - Scheduling rent reminders
 * - Scheduling lease expiration reminders
 *
 * IMPORTANT: This service should be called by a cron job or similar scheduler.
 * It can be invoked from a backend API endpoint or Edge Function.
 *
 * Recommended schedule:
 * - Every 5 minutes: processScheduledNotifications()
 * - Daily at 6 AM: scheduleRentReminders(), assessLateFees()
 * - Daily at 7 AM: scheduleLeaseExpirationReminders()
 */

import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import { lateFeeService } from './lateFeeService';

export interface WorkerRunResult {
  success: boolean;
  task: string;
  processed: number;
  failed: number;
  errors: string[];
  timestamp: string;
}

export const automationWorkerService = {
  /**
   * Process all pending notifications that are scheduled to be sent
   * Should run frequently (every 5-15 minutes)
   */
  async processScheduledNotifications(): Promise<WorkerRunResult> {
    const result: WorkerRunResult = {
      success: true,
      task: 'processScheduledNotifications',
      processed: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Get pending notifications that are due
      const notifications = await notificationService.getPendingNotifications();

      for (const notification of notifications) {
        try {
          // In a real implementation, this would call the actual email service
          // For now, we'll just mark it as sent
          // TODO: Integrate with actual email sending service

          console.log('Processing notification:', {
            id: notification.id,
            type: notification.notification_type,
            to: notification.recipient_email,
            subject: notification.subject,
          });

          // Simulate email sending
          const emailSent = await this.sendNotificationEmail(notification);

          if (emailSent) {
            await notificationService.markAsSent(notification.id);
            result.processed++;
          } else {
            await notificationService.markAsFailed(
              notification.id,
              'Email sending failed'
            );
            result.failed++;
            result.errors.push(`Failed to send notification ${notification.id}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Error processing notification ${notification.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );

          await notificationService.markAsFailed(
            notification.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  },

  /**
   * Schedule rent reminders for all active businesses
   * Should run once daily (e.g., 6 AM)
   */
  async scheduleRentReminders(): Promise<WorkerRunResult> {
    const result: WorkerRunResult = {
      success: true,
      task: 'scheduleRentReminders',
      processed: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Get all active businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name')
        .eq('is_active', true);

      if (!businesses) {
        return result;
      }

      for (const business of businesses) {
        try {
          const count = await notificationService.scheduleRentReminders(
            business.id
          );
          result.processed += count;
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Error scheduling rent reminders for business ${business.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  },

  /**
   * Schedule lease expiration reminders for all active businesses
   * Should run once daily (e.g., 7 AM)
   */
  async scheduleLeaseExpirationReminders(): Promise<WorkerRunResult> {
    const result: WorkerRunResult = {
      success: true,
      task: 'scheduleLeaseExpirationReminders',
      processed: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Get all active businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name')
        .eq('is_active', true);

      if (!businesses) {
        return result;
      }

      for (const business of businesses) {
        try {
          const count = await notificationService.scheduleLeaseExpirationReminders(
            business.id
          );
          result.processed += count;
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Error scheduling lease reminders for business ${business.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  },

  /**
   * Assess late fees for all businesses with overdue payments
   * Should run once daily (e.g., 6 AM)
   */
  async assessLateFees(): Promise<WorkerRunResult> {
    const result: WorkerRunResult = {
      success: true,
      task: 'assessLateFees',
      processed: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Get all active businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, business_name')
        .eq('is_active', true);

      if (!businesses) {
        return result;
      }

      for (const business of businesses) {
        try {
          const lateFeesAssessed = await lateFeeService.assessLateFees(
            business.id
          );
          result.processed += lateFeesAssessed.length;

          // Schedule late fee notifications for each assessed fee
          for (const lateFee of lateFeesAssessed) {
            try {
              // Get tenant info
              const { data: tenant } = await supabase
                .from('tenants')
                .select('first_name, last_name, email')
                .eq('id', lateFee.late_fee_id)
                .maybeSingle();

              if (tenant && tenant.email) {
                await notificationService.scheduleNotification(
                  business.id,
                  'rent_overdue',
                  tenant.email,
                  `${tenant.first_name} ${tenant.last_name}`,
                  {
                    tenant_name: `${tenant.first_name} ${tenant.last_name}`,
                    amount: `$${(lateFee.late_fee_cents / 100).toFixed(2)}`,
                    late_fee: `$${(lateFee.late_fee_cents / 100).toFixed(2)}`,
                    days_overdue: 1, // Calculate actual days
                    organization_name: business.business_name,
                  }
                );
              }
            } catch (error) {
              console.error('Error scheduling late fee notification:', error);
            }
          }
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Error assessing late fees for business ${business.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  },

  /**
   * Run all daily tasks
   * Convenience method to run all automation tasks at once
   */
  async runDailyTasks(): Promise<{
    rentReminders: WorkerRunResult;
    leaseReminders: WorkerRunResult;
    lateFees: WorkerRunResult;
  }> {
    const [rentReminders, leaseReminders, lateFees] = await Promise.all([
      this.scheduleRentReminders(),
      this.scheduleLeaseExpirationReminders(),
      this.assessLateFees(),
    ]);

    return {
      rentReminders,
      leaseReminders,
      lateFees,
    };
  },

  /**
   * Simulate sending a notification email
   * In production, this would integrate with the actual email service
   */
  private async sendNotificationEmail(notification: any): Promise<boolean> {
    // TODO: Integrate with actual email service
    // This would call the email service configured in the system

    // For now, just log to console
    console.log('📧 Sending email notification:', {
      to: notification.recipient_email,
      subject: notification.subject,
      body: notification.body.substring(0, 100) + '...',
    });

    // Simulate async email sending
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate 95% success rate
    return Math.random() > 0.05;
  },

  /**
   * Get worker status and recent runs
   * Useful for monitoring and debugging
   */
  async getWorkerStatus(): Promise<{
    last_notification_run: string | null;
    pending_notifications: number;
    failed_notifications_24h: number;
    scheduled_for_today: number;
  }> {
    // Get last successful notification run
    const { data: lastRun } = await supabase
      .from('scheduled_notifications')
      .select('sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get pending notification count
    const { count: pendingCount } = await supabase
      .from('scheduled_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    // Get failed notifications in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { count: failedCount } = await supabase
      .from('scheduled_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', yesterday.toISOString());

    // Get notifications scheduled for today
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { count: todayCount } = await supabase
      .from('scheduled_notifications')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_for', today)
      .lt('scheduled_for', tomorrowStr);

    return {
      last_notification_run: lastRun?.sent_at || null,
      pending_notifications: pendingCount || 0,
      failed_notifications_24h: failedCount || 0,
      scheduled_for_today: todayCount || 0,
    };
  },
};
