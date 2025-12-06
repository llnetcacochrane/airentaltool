import { supabase } from '../lib/supabase';

// Square Web Payments SDK types
declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
  verifyBuyer: (sourceId: string, verificationDetails: any) => Promise<{ token: string }>;
}

interface SquareCard {
  attach: (containerId: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: any[] }>;
  destroy: () => void;
}

export interface SquareConfig {
  application_id: string;
  location_id: string;
  environment: 'sandbox' | 'production';
}

export interface SquarePaymentRequest {
  amount_cents: number;
  currency: string;
  source_id: string; // Card token from Square
  verification_token?: string;
  tenant_id?: string;
  lease_id?: string;
  payment_type: 'rent' | 'security_deposit' | 'pet_deposit' | 'late_fee' | 'utility' | 'other';
  description?: string;
  idempotency_key: string;
}

export interface SquarePaymentResponse {
  success: boolean;
  payment_id?: string;
  receipt_url?: string;
  error?: string;
  error_code?: string;
}

export const squarePaymentService = {
  sdkLoaded: false,
  payments: null as SquarePayments | null,

  async loadSquareSDK(): Promise<boolean> {
    if (this.sdkLoaded && window.Square) {
      return true;
    }

    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Square) {
        this.sdkLoaded = true;
        resolve(true);
        return;
      }

      // Load Square Web Payments SDK
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use sandbox for dev
      script.onload = () => {
        this.sdkLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  },

  async getSquareConfig(organizationId: string): Promise<SquareConfig | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['square_application_id', 'square_location_id', 'square_environment', 'square_enabled']);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach(s => {
        settings[s.setting_key] = s.setting_value;
      });

      if (settings['square_enabled'] !== 'true') {
        return null;
      }

      return {
        application_id: settings['square_application_id'] || '',
        location_id: settings['square_location_id'] || '',
        environment: (settings['square_environment'] as 'sandbox' | 'production') || 'sandbox',
      };
    } catch (error) {
      return null;
    }
  },

  async initializePayments(config: SquareConfig): Promise<SquarePayments | null> {
    if (!window.Square) {
      const loaded = await this.loadSquareSDK();
      if (!loaded || !window.Square) {
        return null;
      }
    }

    try {
      this.payments = await window.Square.payments(config.application_id, config.location_id);
      return this.payments;
    } catch (error) {
      return null;
    }
  },

  async createCardPaymentForm(containerId: string, config: SquareConfig): Promise<SquareCard | null> {
    const payments = await this.initializePayments(config);
    if (!payments) return null;

    try {
      const card = await payments.card();
      await card.attach(`#${containerId}`);
      return card;
    } catch (error) {
      return null;
    }
  },

  async tokenizeCard(card: SquareCard): Promise<{ token: string } | { error: string }> {
    try {
      const result = await card.tokenize();
      if (result.status === 'OK' && result.token) {
        return { token: result.token };
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Failed to process card';
        return { error: errorMessage };
      }
    } catch (error) {
      return { error: 'Failed to tokenize card' };
    }
  },

  async processPayment(
    organizationId: string,
    request: SquarePaymentRequest
  ): Promise<SquarePaymentResponse> {
    try {
      // Call our Supabase Edge Function to process the payment
      const { data, error } = await supabase.functions.invoke('process-square-payment', {
        body: {
          organization_id: organizationId,
          ...request,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Payment processing failed',
        };
      }

      // Record successful payment in database
      if (data?.success) {
        await this.recordPaymentTransaction(organizationId, request, data);
      }

      return data as SquarePaymentResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  },

  async recordPaymentTransaction(
    organizationId: string,
    request: SquarePaymentRequest,
    response: SquarePaymentResponse
  ): Promise<void> {
    try {
      await supabase.from('payment_transactions').insert({
        organization_id: organizationId,
        gateway_name: 'square',
        transaction_type: 'charge',
        amount: request.amount_cents,
        currency: request.currency,
        status: response.success ? 'completed' : 'failed',
        external_transaction_id: response.payment_id,
        gateway_response: {
          payment_id: response.payment_id,
          receipt_url: response.receipt_url,
          payment_type: request.payment_type,
          tenant_id: request.tenant_id,
          lease_id: request.lease_id,
        },
      });

      // If payment was for rent, update rent_payments table
      if (response.success && request.tenant_id && request.lease_id) {
        await supabase.from('rent_payments').insert({
          lease_id: request.lease_id,
          tenant_id: request.tenant_id,
          organization_id: organizationId,
          amount_cents: request.amount_cents,
          payment_date: new Date().toISOString(),
          payment_method: 'square',
          status: 'paid',
          notes: `Square Payment: ${response.payment_id}`,
        });
      }
    } catch (error) {
      // Log but don't fail the payment
    }
  },

  generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },
};
