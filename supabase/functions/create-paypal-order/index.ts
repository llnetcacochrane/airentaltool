import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// SECURITY: Restrict CORS to allowed origins only
const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://airental.tools').split(',');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0]; // Default to first allowed origin
};

const getCorsHeaders = (requestOrigin: string | null) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(requestOrigin),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
});

interface CreateOrderRequest {
  organization_id: string;
  amount_cents: number;
  currency: string;
  description?: string;
}

async function getPayPalCredentials(supabase: any) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['paypal_client_id', 'paypal_client_secret', 'paypal_environment']);

  if (error) throw new Error('Failed to get PayPal credentials');

  const settings: Record<string, string> = {};
  data?.forEach((s: any) => {
    settings[s.setting_key] = s.setting_value;
  });

  return {
    clientId: settings['paypal_client_id'],
    clientSecret: settings['paypal_client_secret'],
    environment: settings['paypal_environment'] || 'sandbox',
  };
}

async function getPayPalAccessToken(clientId: string, clientSecret: string, environment: string): Promise<string> {
  const baseUrl = environment === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Failed to get PayPal access token');
  }

  return data.access_token;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const request: CreateOrderRequest = await req.json();
    const { clientId, clientSecret, environment } = await getPayPalCredentials(supabase);

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PayPal credentials not configured',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accessToken = await getPayPalAccessToken(clientId, clientSecret, environment);

    const baseUrl = environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Convert cents to dollars for PayPal
    const amountDollars = (request.amount_cents / 100).toFixed(2);

    // Create PayPal order
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: amountDollars,
          },
          description: request.description || 'Rent Payment',
        }],
        application_context: {
          brand_name: 'AI Rental Tools',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: 'https://example.com/return', // Not used for JS SDK
          cancel_url: 'https://example.com/cancel', // Not used for JS SDK
        },
      }),
    });

    const result = await response.json();

    if (result.id) {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: result.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message || result.details?.[0]?.description || 'Failed to create PayPal order',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    // SECURITY: Log detailed error server-side but return generic message to client
    console.error('PayPal order creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create payment order. Please try again or contact support.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
