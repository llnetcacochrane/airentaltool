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

type EmailType =
  | 'verification'
  | 'password_reset'
  | 'welcome'
  | 'invitation'
  | 'notification'
  | 'payment_reminder'
  | 'lease_expiring'
  | 'maintenance_update';

interface EmailRequest {
  to: string;
  type: EmailType;
  data: Record<string, string>;
}

interface EmailConfig {
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password_encrypted: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  sendgrid_api_key_encrypted: string | null;
}

// Email templates
const emailTemplates: Record<EmailType, { subject: (data: Record<string, string>) => string; html: (data: Record<string, string>) => string }> = {
  verification: {
    subject: () => 'Verify Your Email - AI Rental Tools',
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">AI Rental Tools</h1>
    </div>
    <h2 style="color: #111827; font-size: 20px; text-align: center;">Verify Your Email Address</h2>
    <p style="color: #4b5563; text-align: center;">Hi ${data.name || 'there'},</p>
    <p style="color: #4b5563; text-align: center;">Please click the button below to verify your email address and complete your registration.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.verification_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">This link will expire in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
  },

  password_reset: {
    subject: () => 'Reset Your Password - AI Rental Tools',
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">AI Rental Tools</h1>
    </div>
    <h2 style="color: #111827; font-size: 20px; text-align: center;">Reset Your Password</h2>
    <p style="color: #4b5563; text-align: center;">Hi ${data.name || 'there'},</p>
    <p style="color: #4b5563; text-align: center;">We received a request to reset your password. Click the button below to create a new password.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.reset_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">This link will expire in 1 hour.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
  },

  welcome: {
    subject: () => 'Welcome to AI Rental Tools!',
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">Welcome to AI Rental Tools!</h1>
    </div>
    <p style="color: #4b5563;">Hi ${data.name || 'there'},</p>
    <p style="color: #4b5563;">Thank you for joining AI Rental Tools! We're excited to help you manage your rental properties more efficiently.</p>
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #1e40af; margin: 0 0 12px 0;">Get Started:</h3>
      <ul style="color: #1e3a8a; margin: 0; padding-left: 20px;">
        <li>Add your first property</li>
        <li>Set up your business profile</li>
        <li>Invite team members</li>
        <li>Explore AI-powered features</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.dashboard_url || 'https://app.airentaltool.com'}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">Need help? Visit our <a href="${data.help_url || 'https://app.airentaltool.com/help'}" style="color: #2563eb;">Help Center</a></p>
  </div>
</body>
</html>`,
  },

  invitation: {
    subject: (data) => `You've been invited to join ${data.business_name || 'AI Rental Tools'}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">You're Invited!</h1>
    </div>
    <p style="color: #4b5563;">Hi ${data.name || 'there'},</p>
    <p style="color: #4b5563;">${data.inviter_name || 'Someone'} has invited you to join <strong>${data.business_name || 'their business'}</strong> on AI Rental Tools.</p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Your Invitation Code:</p>
      <div style="background: white; padding: 12px 24px; border-radius: 8px; display: inline-block;">
        <code style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #15803d;">${data.invitation_code}</code>
      </div>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.signup_url}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">This invitation expires in 7 days.</p>
  </div>
</body>
</html>`,
  },

  notification: {
    subject: (data) => data.subject || 'Notification from AI Rental Tools',
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">AI Rental Tools</h1>
    </div>
    <h2 style="color: #111827; font-size: 18px;">${data.title || 'Notification'}</h2>
    <p style="color: #4b5563;">${data.message}</p>
    ${data.action_url ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.action_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${data.action_text || 'View Details'}</a>
    </div>
    ` : ''}
  </div>
</body>
</html>`,
  },

  payment_reminder: {
    subject: (data) => `Payment Reminder: ${data.amount} due ${data.due_date}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #f59e0b; margin: 0;">Payment Reminder</h1>
    </div>
    <p style="color: #4b5563;">Hi ${data.tenant_name || 'there'},</p>
    <p style="color: #4b5563;">This is a friendly reminder that your rent payment is due soon.</p>
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%;">
        <tr><td style="color: #92400e; font-weight: 600;">Amount Due:</td><td style="text-align: right; color: #78350f; font-weight: bold;">${data.amount}</td></tr>
        <tr><td style="color: #92400e; font-weight: 600;">Due Date:</td><td style="text-align: right; color: #78350f;">${data.due_date}</td></tr>
        <tr><td style="color: #92400e; font-weight: 600;">Property:</td><td style="text-align: right; color: #78350f;">${data.property_name || 'N/A'}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.payment_url}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Pay Now</a>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">If you've already made this payment, please disregard this reminder.</p>
  </div>
</body>
</html>`,
  },

  lease_expiring: {
    subject: (data) => `Your Lease is Expiring Soon - ${data.property_name}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #7c3aed; margin: 0;">Lease Expiration Notice</h1>
    </div>
    <p style="color: #4b5563;">Hi ${data.tenant_name || 'there'},</p>
    <p style="color: #4b5563;">Your lease at <strong>${data.property_name}</strong> is expiring soon.</p>
    <div style="background-color: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%;">
        <tr><td style="color: #5b21b6; font-weight: 600;">Property:</td><td style="text-align: right; color: #4c1d95;">${data.property_name}</td></tr>
        <tr><td style="color: #5b21b6; font-weight: 600;">Expiration Date:</td><td style="text-align: right; color: #4c1d95;">${data.expiration_date}</td></tr>
        <tr><td style="color: #5b21b6; font-weight: 600;">Days Remaining:</td><td style="text-align: right; color: #4c1d95;">${data.days_remaining}</td></tr>
      </table>
    </div>
    <p style="color: #4b5563;">Please contact your property manager to discuss renewal options.</p>
    ${data.contact_url ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.contact_url}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Contact Manager</a>
    </div>
    ` : ''}
  </div>
</body>
</html>`,
  },

  maintenance_update: {
    subject: (data) => `Maintenance Update: ${data.request_title}`,
    html: (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #0891b2; margin: 0;">Maintenance Update</h1>
    </div>
    <p style="color: #4b5563;">Hi ${data.tenant_name || 'there'},</p>
    <p style="color: #4b5563;">There's an update on your maintenance request:</p>
    <div style="background-color: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #0e7490; margin: 0 0 12px 0;">${data.request_title}</h3>
      <p style="color: #155e75; margin: 0 0 8px 0;"><strong>Status:</strong> ${data.status}</p>
      <p style="color: #155e75; margin: 0;">${data.message}</p>
    </div>
    ${data.details_url ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.details_url}" style="display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Details</a>
    </div>
    ` : ''}
  </div>
</body>
</html>`,
  },
};

async function sendEmailSMTP(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  const smtpHost = config.smtp_host || Deno.env.get('SMTP_HOST') || '';
  const smtpPort = config.smtp_port || parseInt(Deno.env.get('SMTP_PORT') || '587');
  const smtpUser = config.smtp_user || Deno.env.get('SMTP_USER') || '';
  const smtpPassword = config.smtp_password_encrypted || Deno.env.get('SMTP_PASSWORD') || '';
  const smtpFromEmail = config.smtp_from_email || Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@airentaltool.com';
  const smtpFromName = config.smtp_from_name || Deno.env.get('SMTP_FROM_NAME') || 'AI Rental Tools';

  if (!smtpHost) {
    // Fallback: Log the email instead of failing
    console.log('=== EMAIL (SMTP NOT CONFIGURED) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html.substring(0, 500) + '...');
    console.log('===================================');
    return {
      success: true,
      message: 'Email logged (SMTP not configured)',
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

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('SMTP Error:', error);
    return {
      success: false,
      message: `SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function sendEmailSendGrid(
  config: EmailConfig,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  const apiKey = config.sendgrid_api_key_encrypted;
  const fromEmail = config.smtp_from_email || 'noreply@airentaltool.com';
  const fromName = config.smtp_from_name || 'AI Rental Tools';

  if (!apiKey) {
    return { success: false, message: 'SendGrid API key not configured' };
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
      return { success: true, message: 'Email sent successfully via SendGrid' };
    } else {
      const errorText = await response.text();
      return { success: false, message: `SendGrid error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return {
      success: false,
      message: `SendGrid error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
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

    // Verify user is authenticated
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, type, data }: EmailRequest = await req.json();

    if (!to || !type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email address and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = emailTemplates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown email type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active email configuration
    const { data: config } = await supabase
      .from('email_configuration')
      .select('*')
      .eq('is_active', true)
      .single();

    const emailConfig: EmailConfig = config || {
      provider: 'smtp',
      smtp_host: null,
      smtp_port: null,
      smtp_user: null,
      smtp_password_encrypted: null,
      smtp_from_email: null,
      smtp_from_name: null,
      sendgrid_api_key_encrypted: null,
    };

    const subject = template.subject(data);
    const html = template.html(data);

    let result: { success: boolean; message: string };

    switch (emailConfig.provider) {
      case 'sendgrid':
        result = await sendEmailSendGrid(emailConfig, to, subject, html);
        break;
      case 'smtp':
      default:
        result = await sendEmailSMTP(emailConfig, to, subject, html);
        break;
    }

    // Log the email send attempt
    await supabase.from('email_diagnostic_logs').insert({
      test_type: type,
      recipient_email: to,
      subject: subject,
      status: result.success ? 'success' : 'failed',
      error_message: result.success ? null : result.message,
      provider_used: emailConfig.provider,
      created_by: userData.user.id,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to send email. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
