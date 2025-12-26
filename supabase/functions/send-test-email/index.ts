import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const getAllowedOrigin = (requestOrigin: string | null): string => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://app.airentaltool.com,https://api.airentaltool.com').split(',');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0];
};

const getCorsHeaders = (requestOrigin: string | null) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(requestOrigin),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
});

interface EmailConfig {
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_encrypted: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_use_tls: boolean;
  sendgrid_api_key_encrypted: string | null;
}

async function sendEmailSMTP(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string; responseTime: number }> {
  const startTime = Date.now();

  const smtpHost = config.smtp_host || Deno.env.get('SMTP_HOST') || '';
  const smtpPort = config.smtp_port || parseInt(Deno.env.get('SMTP_PORT') || '587');
  const smtpUser = config.smtp_user || Deno.env.get('SMTP_USER') || '';
  const smtpPassword = config.smtp_password_encrypted || Deno.env.get('SMTP_PASSWORD') || '';
  const smtpFromEmail = config.smtp_from_email || Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@airentaltool.com';
  const smtpFromName = config.smtp_from_name || Deno.env.get('SMTP_FROM_NAME') || 'AI Rental Tools';

  if (!smtpHost) {
    return {
      success: false,
      message: 'SMTP host not configured. Please configure email settings.',
      responseTime: Date.now() - startTime,
    };
  }

  try {
    const { SMTPClient } = await import('npm:smtp-client@1.0.1');

    const client = new SMTPClient({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
    });

    await client.connect();

    if (smtpUser && smtpPassword) {
      await client.greet({ hostname: 'airentaltool.com' });
      await client.authPlain({ username: smtpUser, password: smtpPassword });
    }

    await client.mail({ from: smtpFromEmail });
    await client.rcpt({ to });
    await client.data(
      `From: ${smtpFromName} <${smtpFromEmail}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `\r\n` +
      html
    );

    await client.quit();

    return {
      success: true,
      message: 'Email sent successfully via SMTP',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('SMTP Error:', error);
    return {
      success: false,
      message: `SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function sendEmailSendGrid(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string; responseTime: number }> {
  const startTime = Date.now();

  const apiKey = config.sendgrid_api_key_encrypted;
  const fromEmail = config.smtp_from_email || 'noreply@airentaltool.com';
  const fromName = config.smtp_from_name || 'AI Rental Tools';

  if (!apiKey) {
    return {
      success: false,
      message: 'SendGrid API key not configured',
      responseTime: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject: subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (response.ok || response.status === 202) {
      return {
        success: true,
        message: 'Email sent successfully via SendGrid',
        responseTime: Date.now() - startTime,
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `SendGrid error: ${response.status} - ${errorText}`,
        responseTime: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    };
  }
}

function generateTestEmailHtml(testId: string): string {
  const timestamp = new Date().toISOString();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Test</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; padding: 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>

    <h1 style="color: #111827; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 8px 0;">
      Email Configuration Test Successful!
    </h1>

    <p style="color: #6b7280; text-align: center; margin: 0 0 24px 0;">
      Your email configuration is working correctly.
    </p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #166534; font-weight: 600; padding: 4px 0;">Test ID:</td>
          <td style="color: #15803d; text-align: right; font-family: monospace;">${testId}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-weight: 600; padding: 4px 0;">Timestamp:</td>
          <td style="color: #15803d; text-align: right;">${timestamp}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px;">
      <h3 style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
        What this means:
      </h3>
      <ul style="color: #1e3a8a; font-size: 14px; margin: 0; padding-left: 20px;">
        <li>Your SMTP/email server connection is working</li>
        <li>Authentication credentials are valid</li>
        <li>Emails can be sent from your configured address</li>
        <li>The system is ready to send notifications</li>
      </ul>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      This is an automated test email from AI Rental Tools.<br>
      No action is required.
    </p>
  </div>
</body>
</html>
`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated and is super admin
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only super admins can send test emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, logId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active email configuration
    const { data: config, error: configError } = await supabase
      .from('email_configuration')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      // Update log if provided
      if (logId) {
        await supabase
          .from('email_diagnostic_logs')
          .update({
            status: 'failed',
            error_message: 'No active email configuration found',
            response_time_ms: 0,
          })
          .eq('id', logId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active email configuration found. Please configure email settings first.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const testId = logId || crypto.randomUUID();
    const subject = 'AI Rental Tools - Email Configuration Test';
    const html = generateTestEmailHtml(testId);

    let result: { success: boolean; message: string; responseTime: number };

    // Send email based on provider
    switch (config.provider) {
      case 'sendgrid':
        result = await sendEmailSendGrid(config, email, subject, html);
        break;
      case 'smtp':
      default:
        result = await sendEmailSMTP(config, email, subject, html);
        break;
    }

    // Create or update the diagnostic log
    if (logId) {
      await supabase
        .from('email_diagnostic_logs')
        .update({
          status: result.success ? 'success' : 'failed',
          error_message: result.success ? null : result.message,
          response_time_ms: result.responseTime,
        })
        .eq('id', logId);
    } else {
      await supabase
        .from('email_diagnostic_logs')
        .insert({
          test_type: 'manual_test',
          recipient_email: email,
          subject: subject,
          status: result.success ? 'success' : 'failed',
          error_message: result.success ? null : result.message,
          response_time_ms: result.responseTime,
          provider_used: config.provider,
          created_by: userData.user.id,
        });
    }

    // Update last test info on email configuration
    await supabase
      .from('email_configuration')
      .update({
        last_test_at: new Date().toISOString(),
        last_test_status: result.success ? 'success' : 'failed',
      })
      .eq('id', config.id);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        responseTime: result.responseTime,
        provider: config.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test email error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to send test email. Please check your configuration.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
