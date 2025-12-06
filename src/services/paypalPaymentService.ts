import { supabase } from '../lib/supabase';

// PayPal JavaScript SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonConfig) => PayPalButtons;
      FUNDING: {
        PAYPAL: string;
        CARD: string;
        VENMO: string;
      };
    };
  }
}

interface PayPalButtons {
  render: (containerId: string) => Promise<void>;
  close: () => void;
}

interface PayPalButtonConfig {
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay';
    height?: number;
  };
  fundingSource?: string;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError?: (err: any) => void;
  onCancel?: () => void;
}

export interface PayPalConfig {
  client_id: string;
  environment: 'sandbox' | 'production';
  currency: string;
}

export interface PayPalPaymentRequest {
  amount_cents: number;
  currency: string;
  tenant_id?: string;
  lease_id?: string;
  payment_type: 'rent' | 'security_deposit' | 'pet_deposit' | 'late_fee' | 'utility' | 'other';
  description?: string;
}

export interface PayPalPaymentResponse {
  success: boolean;
  order_id?: string;
  capture_id?: string;
  payer_email?: string;
  error?: string;
}

export const paypalPaymentService = {
  sdkLoaded: false,
  currentConfig: null as PayPalConfig | null,

  async loadPayPalSDK(config: PayPalConfig): Promise<boolean> {
    // If SDK is already loaded with the same config, return
    if (this.sdkLoaded && window.paypal && this.currentConfig?.client_id === config.client_id) {
      return true;
    }

    return new Promise((resolve) => {
      // Remove existing PayPal script if config changed
      const existingScript = document.getElementById('paypal-sdk');
      if (existingScript) {
        existingScript.remove();
        this.sdkLoaded = false;
        delete window.paypal;
      }

      // Load PayPal JavaScript SDK
      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.client_id}&currency=${config.currency}&intent=capture`;
      script.onload = () => {
        this.sdkLoaded = true;
        this.currentConfig = config;
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  },

  async getPayPalConfig(organizationId: string): Promise<PayPalConfig | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['paypal_client_id', 'paypal_environment', 'paypal_enabled']);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach(s => {
        settings[s.setting_key] = s.setting_value;
      });

      if (settings['paypal_enabled'] !== 'true') {
        return null;
      }

      return {
        client_id: settings['paypal_client_id'] || '',
        environment: (settings['paypal_environment'] as 'sandbox' | 'production') || 'sandbox',
        currency: 'USD', // Or get from org settings
      };
    } catch (error) {
      return null;
    }
  },

  async createPayPalButtons(
    containerId: string,
    organizationId: string,
    request: PayPalPaymentRequest,
    onSuccess: (response: PayPalPaymentResponse) => void,
    onError: (error: string) => void,
    onCancel?: () => void
  ): Promise<PayPalButtons | null> {
    const config = await this.getPayPalConfig(organizationId);
    if (!config) {
      onError('PayPal is not configured');
      return null;
    }

    const loaded = await this.loadPayPalSDK(config);
    if (!loaded || !window.paypal) {
      onError('Failed to load PayPal SDK');
      return null;
    }

    try {
      const buttons = window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
        },
        createOrder: async () => {
          // Create order via Edge Function
          const { data, error } = await supabase.functions.invoke('create-paypal-order', {
            body: {
              organization_id: organizationId,
              amount_cents: request.amount_cents,
              currency: request.currency,
              description: request.description || `Rent Payment`,
            },
          });

          if (error || !data?.order_id) {
            throw new Error(error?.message || 'Failed to create PayPal order');
          }

          return data.order_id;
        },
        onApprove: async (data: { orderID: string }) => {
          try {
            // Capture the payment via Edge Function
            const { data: captureData, error } = await supabase.functions.invoke('capture-paypal-order', {
              body: {
                organization_id: organizationId,
                order_id: data.orderID,
              },
            });

            if (error) {
              throw new Error(error.message || 'Failed to capture payment');
            }

            // Record the transaction
            await this.recordPaymentTransaction(organizationId, request, {
              success: true,
              order_id: data.orderID,
              capture_id: captureData?.capture_id,
              payer_email: captureData?.payer_email,
            });

            onSuccess({
              success: true,
              order_id: data.orderID,
              capture_id: captureData?.capture_id,
              payer_email: captureData?.payer_email,
            });
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Payment capture failed');
          }
        },
        onError: (err: any) => {
          onError(err?.message || 'PayPal error occurred');
        },
        onCancel: () => {
          onCancel?.();
        },
      });

      await buttons.render(`#${containerId}`);
      return buttons;
    } catch (error) {
      onError('Failed to initialize PayPal buttons');
      return null;
    }
  },

  async recordPaymentTransaction(
    organizationId: string,
    request: PayPalPaymentRequest,
    response: PayPalPaymentResponse
  ): Promise<void> {
    try {
      await supabase.from('payment_transactions').insert({
        organization_id: organizationId,
        gateway_name: 'paypal',
        transaction_type: 'charge',
        amount: request.amount_cents,
        currency: request.currency,
        status: response.success ? 'completed' : 'failed',
        external_transaction_id: response.capture_id || response.order_id,
        gateway_response: {
          order_id: response.order_id,
          capture_id: response.capture_id,
          payer_email: response.payer_email,
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
          payment_method: 'paypal',
          status: 'paid',
          notes: `PayPal Payment: ${response.order_id}`,
        });
      }
    } catch (error) {
      // Log but don't fail the payment
    }
  },
};
