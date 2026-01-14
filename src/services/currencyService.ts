import { supabase } from '../lib/supabase';
import { Currency, ExchangeRate } from '../types';

export interface CurrencyFilters {
  isActive?: boolean;
}

export interface ExchangeRateFilters {
  fromCurrency?: string;
  toCurrency?: string;
  startDate?: string;
  endDate?: string;
}

export const currencyService = {
  // ========================================
  // Currency Operations
  // ========================================

  /**
   * Get all available currencies
   */
  async getCurrencies(filters?: CurrencyFilters): Promise<Currency[]> {
    let query = supabase
      .from('currencies')
      .select('*')
      .order('code');

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single currency by code
   */
  async getCurrency(code: string): Promise<Currency | null> {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get active currencies only (commonly used)
   */
  async getActiveCurrencies(): Promise<Currency[]> {
    return this.getCurrencies({ isActive: true });
  },

  // ========================================
  // Exchange Rate Operations
  // ========================================

  /**
   * Get exchange rates with optional filters
   */
  async getExchangeRates(filters?: ExchangeRateFilters): Promise<ExchangeRate[]> {
    let query = supabase
      .from('exchange_rates')
      .select('*')
      .order('effective_date', { ascending: false });

    if (filters?.fromCurrency) {
      query = query.eq('from_currency', filters.fromCurrency);
    }

    if (filters?.toCurrency) {
      query = query.eq('to_currency', filters.toCurrency);
    }

    if (filters?.startDate) {
      query = query.gte('effective_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('effective_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get the exchange rate for a specific currency pair on a specific date
   * Returns the most recent rate on or before the given date
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<number> {
    // Same currency = 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const effectiveDate = date || new Date().toISOString().split('T')[0];

    // Try direct rate
    const { data: directRate, error: directError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .lte('effective_date', effectiveDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (directError) throw directError;

    if (directRate) {
      return Number(directRate.rate);
    }

    // Try inverse rate
    const { data: inverseRate, error: inverseError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', toCurrency)
      .eq('to_currency', fromCurrency)
      .lte('effective_date', effectiveDate)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inverseError) throw inverseError;

    if (inverseRate) {
      return 1 / Number(inverseRate.rate);
    }

    // No rate found - default to 1 (should log warning in production)
    console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency} on ${effectiveDate}`);
    return 1;
  },

  /**
   * Create a new exchange rate
   */
  async createExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    effectiveDate: string,
    source: 'manual' | 'api' | 'bank' = 'manual'
  ): Promise<ExchangeRate> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        effective_date: effectiveDate,
        source,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing exchange rate
   */
  async updateExchangeRate(
    id: string,
    updates: { rate?: number; effective_date?: string; source?: string }
  ): Promise<ExchangeRate> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an exchange rate
   */
  async deleteExchangeRate(id: string): Promise<void> {
    const { error } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ========================================
  // Currency Conversion Utilities
  // ========================================

  /**
   * Convert an amount from one currency to another
   * Amount is in cents
   */
  async convertAmount(
    amountCents: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<{ amountCents: number; rate: number }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    const convertedAmount = Math.round(amountCents * rate);

    return {
      amountCents: convertedAmount,
      rate,
    };
  },

  /**
   * Format amount in cents to display string with currency symbol
   */
  formatAmount(amountCents: number, currency: Currency): string {
    const amount = amountCents / Math.pow(10, currency.decimal_places);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    }).format(amount);
  },

  /**
   * Format amount with simple symbol prefix
   */
  formatAmountSimple(amountCents: number, symbol: string, decimalPlaces: number = 2): string {
    const amount = amountCents / Math.pow(10, decimalPlaces);
    const formatted = amount.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${symbol}${formatted}`;
  },

  /**
   * Parse a display amount string to cents
   */
  parseAmountToCents(amountString: string, decimalPlaces: number = 2): number {
    // Remove currency symbols and commas
    const cleaned = amountString.replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleaned);

    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${amountString}`);
    }

    return Math.round(amount * Math.pow(10, decimalPlaces));
  },

  // ========================================
  // Multi-Currency Report Helpers
  // ========================================

  /**
   * Convert multiple amounts to a base currency
   * Useful for aggregating transactions in different currencies
   */
  async convertToBaseCurrency(
    amounts: Array<{ amountCents: number; currency: string; date?: string }>,
    baseCurrency: string
  ): Promise<{ totalCents: number; conversions: Array<{ original: number; converted: number; rate: number }> }> {
    const conversions: Array<{ original: number; converted: number; rate: number }> = [];
    let totalCents = 0;

    for (const item of amounts) {
      const { amountCents, rate } = await this.convertAmount(
        item.amountCents,
        item.currency,
        baseCurrency,
        item.date
      );

      conversions.push({
        original: item.amountCents,
        converted: amountCents,
        rate,
      });

      totalCents += amountCents;
    }

    return { totalCents, conversions };
  },

  /**
   * Get commonly used currency pairs for a business
   * (e.g., CAD-USD for Canadian businesses dealing with US vendors)
   */
  async getCommonCurrencyPairs(): Promise<Array<{ from: string; to: string }>> {
    // Common pairs for property management in Canada/US
    return [
      { from: 'CAD', to: 'USD' },
      { from: 'USD', to: 'CAD' },
      { from: 'CAD', to: 'EUR' },
      { from: 'USD', to: 'EUR' },
      { from: 'GBP', to: 'CAD' },
      { from: 'GBP', to: 'USD' },
      { from: 'AUD', to: 'CAD' },
      { from: 'AUD', to: 'USD' },
    ];
  },

  /**
   * Bulk create exchange rates (e.g., from API import)
   */
  async bulkCreateExchangeRates(
    rates: Array<{
      fromCurrency: string;
      toCurrency: string;
      rate: number;
      effectiveDate: string;
    }>,
    source: 'manual' | 'api' | 'bank' = 'api'
  ): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert(
        rates.map((r) => ({
          from_currency: r.fromCurrency,
          to_currency: r.toCurrency,
          rate: r.rate,
          effective_date: r.effectiveDate,
          source,
        })),
        { onConflict: 'from_currency,to_currency,effective_date' }
      )
      .select();

    if (error) throw error;
    return data || [];
  },
};
