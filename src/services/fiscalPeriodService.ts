import { supabase } from '../lib/supabase';
import { FiscalPeriod, FiscalPeriodStatus } from '../types';
import { glAccountService } from './glAccountService';

export interface FiscalPeriodFilters {
  fiscalYear?: number;
  isOpen?: boolean;
  isAdjustingPeriod?: boolean;
}

export interface FiscalYearSummary {
  fiscalYear: number;
  startDate: string;
  endDate: string;
  periodsCount: number;
  openPeriods: number;
  closedPeriods: number;
  isCurrentYear: boolean;
}

export const fiscalPeriodService = {
  // ========================================
  // Fiscal Period CRUD Operations
  // ========================================

  /**
   * Create fiscal periods for a year
   */
  async createFiscalYear(
    businessId: string,
    fiscalYear: number
  ): Promise<FiscalPeriod[]> {
    // Get business accounting settings
    const settings = await glAccountService.getAccountingSettings(businessId);
    const startMonth = settings?.fiscal_year_start_month || 1;
    const startDay = settings?.fiscal_year_start_day || 1;

    // Calculate periods based on fiscal year start
    const periods: Array<Partial<FiscalPeriod>> = [];

    for (let period = 1; period <= 12; period++) {
      // Calculate the month for this period
      let month = startMonth + period - 1;
      let year = fiscalYear;

      if (month > 12) {
        month -= 12;
        year += 1;
      }

      // Calculate start and end dates
      const startDate = new Date(year, month - 1, period === 1 ? startDay : 1);
      const endDate = new Date(year, month, 0); // Last day of month

      // For the first period, use the configured start day
      // For subsequent periods, use 1st of the month
      if (period === 1) {
        startDate.setDate(startDay);
      }

      // Format period name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      periods.push({
        business_id: businessId,
        fiscal_year: fiscalYear,
        period_number: period,
        period_name: `${monthNames[month - 1]} ${year}`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'open' as FiscalPeriodStatus,
        is_adjusting_period: false,
      });
    }

    // Add adjusting period (period 13)
    const lastPeriod = periods[11];
    periods.push({
      business_id: businessId,
      fiscal_year: fiscalYear,
      period_number: 13,
      period_name: `Adjusting Entries ${fiscalYear}`,
      start_date: lastPeriod?.start_date,
      end_date: lastPeriod?.end_date,
      status: 'open' as FiscalPeriodStatus,
      is_adjusting_period: true,
    });

    const { data, error } = await supabase
      .from('fiscal_periods')
      .insert(periods)
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all fiscal periods for a business
   */
  async getFiscalPeriods(
    businessId: string,
    filters?: FiscalPeriodFilters
  ): Promise<FiscalPeriod[]> {
    let query = supabase
      .from('fiscal_periods')
      .select('*')
      .eq('business_id', businessId)
      .order('fiscal_year', { ascending: false })
      .order('period_number');

    if (filters?.fiscalYear !== undefined) {
      query = query.eq('fiscal_year', filters.fiscalYear);
    }

    if (filters?.isOpen !== undefined) {
      query = query.eq('status', filters.isOpen ? 'open' : 'closed');
    }

    if (filters?.isAdjustingPeriod !== undefined) {
      query = query.eq('is_adjusting_period', filters.isAdjustingPeriod);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a specific fiscal period
   */
  async getFiscalPeriod(periodId: string): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('id', periodId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get fiscal period for a specific date
   */
  async getFiscalPeriodForDate(
    businessId: string,
    date: string
  ): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_adjusting_period', false)
      .lte('start_date', date)
      .gte('end_date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get current open period
   */
  async getCurrentOpenPeriod(businessId: string): Promise<FiscalPeriod | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'open')
      .eq('is_adjusting_period', false)
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get fiscal years for a business
   */
  async getFiscalYears(businessId: string): Promise<FiscalYearSummary[]> {
    const periods = await this.getFiscalPeriods(businessId);

    // Group by fiscal year
    const yearMap = new Map<number, FiscalPeriod[]>();

    for (const period of periods) {
      const existing = yearMap.get(period.fiscal_year) || [];
      existing.push(period);
      yearMap.set(period.fiscal_year, existing);
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    const summaries: FiscalYearSummary[] = [];

    for (const [fiscalYear, yearPeriods] of yearMap) {
      const regularPeriods = yearPeriods.filter((p) => !p.is_adjusting_period);
      const openPeriods = regularPeriods.filter((p) => p.status === 'open');
      const closedPeriods = regularPeriods.filter((p) => p.status === 'closed');

      const sortedPeriods = regularPeriods.sort(
        (a, b) => a.period_number - b.period_number
      );

      summaries.push({
        fiscalYear,
        startDate: sortedPeriods[0]?.start_date || '',
        endDate: sortedPeriods[sortedPeriods.length - 1]?.end_date || '',
        periodsCount: regularPeriods.length,
        openPeriods: openPeriods.length,
        closedPeriods: closedPeriods.length,
        isCurrentYear: fiscalYear === currentYear,
      });
    }

    return summaries.sort((a, b) => b.fiscalYear - a.fiscalYear);
  },

  // ========================================
  // Period Closing Operations
  // ========================================

  /**
   * Close a fiscal period
   */
  async closePeriod(
    periodId: string,
    userId: string
  ): Promise<FiscalPeriod> {
    // Get the period
    const period = await this.getFiscalPeriod(periodId);
    if (!period) {
      throw new Error('Fiscal period not found');
    }

    if (period.status !== 'open') {
      throw new Error('Period is already closed');
    }

    // Check if previous periods are closed (except for period 1)
    if (period.period_number > 1 && !period.is_adjusting_period) {
      const previousPeriod = await this.getPreviousPeriod(
        period.business_id,
        period.fiscal_year,
        period.period_number
      );

      if (previousPeriod && previousPeriod.status === 'open') {
        throw new Error(
          `Previous period (${previousPeriod.period_name}) must be closed first`
        );
      }
    }

    // Close the period
    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({
        status: 'closed' as FiscalPeriodStatus,
        closed_at: new Date().toISOString(),
        closed_by: userId,
      })
      .eq('id', periodId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Reopen a closed fiscal period
   * Only allows reopening if subsequent periods are still closed
   */
  async reopenPeriod(periodId: string): Promise<FiscalPeriod> {
    const period = await this.getFiscalPeriod(periodId);
    if (!period) {
      throw new Error('Fiscal period not found');
    }

    if (period.status === 'open') {
      throw new Error('Period is already open');
    }

    // Check if subsequent periods are closed
    if (period.period_number < 13) {
      const nextPeriod = await this.getNextPeriod(
        period.business_id,
        period.fiscal_year,
        period.period_number
      );

      if (nextPeriod && nextPeriod.status === 'open') {
        throw new Error(
          `Cannot reopen - subsequent period (${nextPeriod.period_name}) is open`
        );
      }
    }

    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({
        status: 'open' as FiscalPeriodStatus,
        closed_at: null,
        closed_by: null,
      })
      .eq('id', periodId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Close entire fiscal year
   */
  async closeFiscalYear(
    businessId: string,
    fiscalYear: number,
    userId: string
  ): Promise<{ closedPeriods: number; yearEndJournalId?: string }> {
    const periods = await this.getFiscalPeriods(businessId, { fiscalYear });
    const openPeriods = periods.filter((p) => p.status === 'open' && !p.is_adjusting_period);

    // Close all open periods
    for (const period of openPeriods) {
      await this.closePeriod(period.id, userId);
    }

    // Close adjusting period if open
    const adjustingPeriod = periods.find((p) => p.is_adjusting_period && p.status === 'open');
    if (adjustingPeriod) {
      await this.closePeriod(adjustingPeriod.id, userId);
    }

    // TODO: Create year-end closing journal entry
    // This would transfer net income to retained earnings

    return {
      closedPeriods: openPeriods.length + (adjustingPeriod ? 1 : 0),
    };
  },

  /**
   * Get the previous period
   */
  async getPreviousPeriod(
    businessId: string,
    fiscalYear: number,
    periodNumber: number
  ): Promise<FiscalPeriod | null> {
    let prevYear = fiscalYear;
    let prevPeriod = periodNumber - 1;

    if (prevPeriod < 1) {
      prevYear -= 1;
      prevPeriod = 12;
    }

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('business_id', businessId)
      .eq('fiscal_year', prevYear)
      .eq('period_number', prevPeriod)
      .eq('is_adjusting_period', false)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get the next period
   */
  async getNextPeriod(
    businessId: string,
    fiscalYear: number,
    periodNumber: number
  ): Promise<FiscalPeriod | null> {
    let nextYear = fiscalYear;
    let nextPeriod = periodNumber + 1;

    // Skip period 13 (adjusting period) when looking for next regular period
    if (nextPeriod === 13) {
      nextPeriod = 1;
      nextYear += 1;
    } else if (nextPeriod > 12) {
      nextYear += 1;
      nextPeriod = 1;
    }

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('business_id', businessId)
      .eq('fiscal_year', nextYear)
      .eq('period_number', nextPeriod)
      .eq('is_adjusting_period', false)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // ========================================
  // Period Status & Validation
  // ========================================

  /**
   * Check if posting is allowed for a date
   */
  async canPostToDate(businessId: string, date: string): Promise<boolean> {
    const period = await this.getFiscalPeriodForDate(businessId, date);

    if (!period) {
      // No period exists - check if we need to create one
      return true; // Allow posting, period will be auto-created
    }

    return period.status === 'open';
  },

  /**
   * Validate date is in an open period before posting
   */
  async validatePostingDate(businessId: string, date: string): Promise<void> {
    const canPost = await this.canPostToDate(businessId, date);

    if (!canPost) {
      const period = await this.getFiscalPeriodForDate(businessId, date);
      throw new Error(
        `Cannot post to ${date}. Fiscal period ${period?.period_name || 'unknown'} is closed.`
      );
    }
  },

  /**
   * Get period status summary for dashboard
   */
  async getPeriodStatusSummary(businessId: string): Promise<{
    currentPeriod: FiscalPeriod | null;
    openPeriods: number;
    closedPeriods: number;
    nextCloseDate: string | null;
    fiscalYearProgress: number;
  }> {
    const currentYear = new Date().getFullYear();

    const periods = await this.getFiscalPeriods(businessId, {
      fiscalYear: currentYear,
      isAdjustingPeriod: false,
    });

    const currentPeriod = await this.getCurrentOpenPeriod(businessId);
    const openPeriods = periods.filter((p) => p.status === 'open').length;
    const closedPeriods = periods.filter((p) => p.status === 'closed').length;

    // Calculate fiscal year progress
    const fiscalYearProgress = periods.length > 0
      ? Math.round((closedPeriods / 12) * 100)
      : 0;

    // Get next close date (end of current open period)
    const nextCloseDate = currentPeriod?.end_date || null;

    return {
      currentPeriod,
      openPeriods,
      closedPeriods,
      nextCloseDate,
      fiscalYearProgress,
    };
  },

  // ========================================
  // Auto-Creation of Periods
  // ========================================

  /**
   * Ensure periods exist for a date range
   * Creates fiscal periods if they don't exist
   */
  async ensurePeriodsExist(
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const periods = await this.getFiscalPeriods(businessId, { fiscalYear: year });

      if (periods.length === 0) {
        await this.createFiscalYear(businessId, year);
      }
    }
  },

  /**
   * Initialize fiscal periods for current and next year
   */
  async initializeFiscalPeriods(businessId: string): Promise<number> {
    const currentYear = new Date().getFullYear();
    let created = 0;

    // Create current year if not exists
    const currentPeriods = await this.getFiscalPeriods(businessId, {
      fiscalYear: currentYear,
    });

    if (currentPeriods.length === 0) {
      await this.createFiscalYear(businessId, currentYear);
      created += 13;
    }

    // Create next year if not exists
    const nextPeriods = await this.getFiscalPeriods(businessId, {
      fiscalYear: currentYear + 1,
    });

    if (nextPeriods.length === 0) {
      await this.createFiscalYear(businessId, currentYear + 1);
      created += 13;
    }

    return created;
  },
};
