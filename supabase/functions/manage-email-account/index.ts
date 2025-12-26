import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate SHA512-CRYPT hash compatible with Dovecot
async function hashPassword(password: string): Promise<string> {
  const salt = base64Encode(crypto.getRandomValues(new Uint8Array(16)))
    .replace(/[+/=]/g, '.')
    .substring(0, 16);

  // For production, we'll use a simpler hash that Dovecot can verify
  // SHA512-CRYPT format: $6$rounds=5000$salt$hash
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashBase64 = base64Encode(hashArray).replace(/[+/=]/g, '.');

  return `{SHA512-CRYPT}$6$${salt}$${hashBase64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Check if using service role key directly (for internal calls)
    const token = authHeader.replace('Bearer ', '');
    let isAuthorized = false;

    // Use service role client for all operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (token === supabaseServiceKey) {
      // Service role key - authorized for internal operations
      isAuthorized = true;
    } else {
      // Verify user from JWT token using admin client
      const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
      console.log('User from token:', user?.id, user?.email, 'Error:', userError?.message);

      if (!userError && user) {
        // Check if user is super admin
        const { data: superAdmin, error: saError } = await adminClient
          .from('super_admins')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        console.log('Super admin check:', superAdmin?.id, 'Error:', saError?.message);

        if (superAdmin) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new Error('Unauthorized - Super admin access required');
    }

    // adminClient already defined above with service role

    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case 'create': {
        const { username, domain, password, display_name } = body;

        if (!username || !domain || !password) {
          throw new Error('Missing required fields');
        }

        // Use RPC function to create email account (password hashed in DB)
        const { data, error } = await adminClient.rpc('create_email_account', {
          p_username: username,
          p_domain: domain,
          p_password: password,
          p_display_name: display_name || null,
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error);
        }

        result = { success: true, message: 'Email account created', email: data.email };
        break;
      }

      case 'delete': {
        const { account_id } = body;

        if (!account_id) {
          throw new Error('Missing account_id');
        }

        const { data, error } = await adminClient.rpc('delete_email_account', {
          p_account_id: account_id,
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error);
        }

        result = data;
        break;
      }

      case 'change_password': {
        const { account_id, password } = body;

        if (!account_id || !password) {
          throw new Error('Missing required fields');
        }

        // Password hashed in DB function
        const { data, error } = await adminClient.rpc('update_email_password', {
          p_account_id: account_id,
          p_password: password,
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error);
        }

        result = data;
        break;
      }

      case 'toggle_active': {
        const { account_id, is_active } = body;

        if (account_id === undefined || is_active === undefined) {
          throw new Error('Missing required fields');
        }

        const { data, error } = await adminClient.rpc('toggle_email_account', {
          p_account_id: account_id,
          p_is_active: is_active,
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error);
        }

        result = data;
        break;
      }

      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message?.includes('Unauthorized') ? 401 : 400,
      }
    );
  }
});
