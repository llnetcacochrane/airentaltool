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

interface CaptureOrderRequest {
  organization_id: string;
  order_id: string;
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

    const request: CaptureOrderRequest = await req.json();
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

    // Capture the PayPal order
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${request.order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.status === 'COMPLETED') {
      const capture = result.purchase_units?.[0]?.payments?.captures?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          order_id: result.id,
          capture_id: capture?.id,
          payer_email: result.payer?.email_address,
          status: result.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message || result.details?.[0]?.description || 'Payment capture failed',
          status: result.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    // SECURITY: Log detailed error server-side but return generic message to client
    console.error('PayPal capture error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to capture payment. Please try again or contact support.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
