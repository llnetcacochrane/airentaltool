import { supabase } from '../lib/supabase';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'interac' | 'paypal';
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export interface PaymentGatewayConfig {
  gateway_name: string;
  is_enabled: boolean;
  is_primary: boolean;
  configuration: {
    apiKey?: string;
    secretKey?: string;
    clientId?: string;
    clientSecret?: string;
    webhookSecret?: string;
    [key: string]: any;
  };
}

export const paymentGatewayService = {
  async getActiveGateways(organizationId: string): Promise<PaymentGatewayConfig[]> {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async processPayment(organizationId: string, request: PaymentRequest): Promise<PaymentResponse> {
    const gateways = await this.getActiveGateways(organizationId);

    if (gateways.length === 0) {
      return {
        success: false,
        error: 'No payment gateways configured',
      };
    }

    const primaryGateway = gateways.find((g) => g.is_primary) || gateways[0];

    try {
      switch (primaryGateway.gateway_name) {
        case 'stripe':
          return await this.processStripePayment(organizationId, primaryGateway, request);
        case 'paypal':
          return await this.processPayPalPayment(organizationId, primaryGateway, request);
        case 'interac':
          return await this.processInteracPayment(organizationId, primaryGateway, request);
        default:
          return {
            success: false,
            error: `Unknown payment gateway: ${primaryGateway.gateway_name}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  },

  async processStripePayment(organizationId: string, gateway: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    // Stripe integration placeholder
    // In production, this would call the Stripe API via an Edge Function
    const response = {
      success: true,
      transactionId: `stripe_${Date.now()}`,
    };

    await supabase.from('payment_transactions').insert({
      organization_id: organizationId,
      gateway_name: 'stripe',
      transaction_type: 'charge',
      amount: request.amount,
      currency: request.currency,
      status: 'completed',
      gateway_response: request.metadata,
    });

    return response;
  },

  async processPayPalPayment(organizationId: string, gateway: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    // PayPal integration placeholder
    // In production, this would call the PayPal API via an Edge Function
    const response = {
      success: true,
      transactionId: `paypal_${Date.now()}`,
    };

    await supabase.from('payment_transactions').insert({
      organization_id: organizationId,
      gateway_name: 'paypal',
      transaction_type: 'charge',
      amount: request.amount,
      currency: request.currency,
      status: 'completed',
      gateway_response: request.metadata,
    });

    return response;
  },

  async processInteracPayment(organizationId: string, gateway: PaymentGatewayConfig, request: PaymentRequest): Promise<PaymentResponse> {
    // Interac e-Transfer integration placeholder
    // In production, this would generate a payment request reference
    const referenceNumber = `RENT${Date.now().toString().slice(-8).toUpperCase()}`;

    const response = {
      success: true,
      transactionId: referenceNumber,
      requiresAction: true,
    };

    await supabase.from('payment_transactions').insert({
      organization_id: organizationId,
      gateway_name: 'interac',
      transaction_type: 'charge',
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      gateway_response: {
        referenceNumber,
        metadata: request.metadata,
      },
    });

    return response;
  },

  async recordTransaction(organizationId: string, gatewayName: string, transactionData: any) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        organization_id: organizationId,
        gateway_name: gatewayName,
        transaction_type: 'webhook',
        amount: transactionData.amount,
        currency: transactionData.currency || 'CAD',
        status: transactionData.status,
        gateway_response: transactionData,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async reconcilePayments(organizationId: string, gatewayName: string) {
    // Fetch all pending transactions for this gateway
    const { data: transactions, error: transError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('gateway_name', gatewayName)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (transError) throw transError;

    // In production, this would call the gateway's API to check status
    // For now, we'll just return the pending transactions
    return transactions || [];
  },
};
