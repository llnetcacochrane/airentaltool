import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SquarePaymentRequest {
  organization_id: string;
  amount_cents: number;
  currency: string;
  source_id: string;
  verification_token?: string;
  tenant_id?: string;
  lease_id?: string;
  payment_type: string;
  description?: string;
  idempotency_key: string;
}

async function getSquareCredentials(supabase: any) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['square_access_token', 'square_location_id', 'square_environment']);

  if (error) throw new Error('Failed to get Square credentials');

  const settings: Record<string, string> = {};
  data?.forEach((s: any) => {
    settings[s.setting_key] = s.setting_value;
  });

  return {
    accessToken: settings['square_access_token'],
    locationId: settings['square_location_id'],
    environment: settings['square_environment'] || 'sandbox',
  };
}

Deno.serve(async (req: Request) => {
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

    const request: SquarePaymentRequest = await req.json();
    const { accessToken, locationId, environment } = await getSquareCredentials(supabase);

    if (!accessToken || !locationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Square credentials not configured',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine Square API URL based on environment
    const baseUrl = environment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // Process payment via Square API
    const response = await fetch(`${baseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: request.source_id,
        idempotency_key: request.idempotency_key,
        amount_money: {
          amount: request.amount_cents,
          currency: request.currency.toUpperCase(),
        },
        location_id: locationId,
        verification_token: request.verification_token,
        note: request.description || `Rent Payment - ${request.payment_type}`,
        reference_id: request.tenant_id || undefined,
      }),
    });

    const result = await response.json();

    if (result.payment && result.payment.status === 'COMPLETED') {
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: result.payment.id,
          receipt_url: result.payment.receipt_url,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (result.errors) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.errors[0]?.detail || 'Payment failed',
          error_code: result.errors[0]?.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unexpected response from Square',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Square payment error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
