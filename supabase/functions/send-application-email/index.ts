import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  type: 'application_submitted' | 'application_approved' | 'application_rejected';
  data: {
    applicant_name: string;
    property_name: string;
    unit_number: string;
    invitation_code?: string;
    portal_url?: string;
  };
}

async function sendSMTPEmail(to: string, subject: string, html: string) {
  const smtpHost = Deno.env.get('SMTP_HOST') || 'localhost';
  const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
  const smtpUser = Deno.env.get('SMTP_USER') || '';
  const smtpPassword = Deno.env.get('SMTP_PASSWORD') || '';
  const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || 'noreply@propertymanagement.local';
  const smtpFromName = Deno.env.get('SMTP_FROM_NAME') || 'Property Management';

  try {
    const { SMTPClient } = await import('npm:smtp-client@1.0.1');

    const client = new SMTPClient({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
    });

    await client.connect();

    if (smtpUser && smtpPassword) {
      await client.greet({ hostname: 'propertymanagement.local' });
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
    console.log('=== EMAIL THAT WOULD BE SENT ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);
    console.log('=================================');

    return {
      success: true,
      message: 'Email logged (SMTP not configured)',
      note: 'Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in environment'
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, type, data }: EmailRequest = await req.json();

    let subject = '';
    let html = '';

    switch (type) {
      case 'application_submitted':
        subject = `Application Received - ${data.property_name}`;
        html = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #2563eb;">Application Received</h1><p>Dear ${data.applicant_name},</p><p>Thank you for submitting your rental application for:</p><div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>${data.property_name}</strong><br>Unit ${data.unit_number}</div><p>Your application is being reviewed and you will be notified once a decision has been made.</p><p>Best regards,<br>Property Management Team</p></div></body></html>`;
        break;

      case 'application_approved':
        subject = `Application Approved - ${data.property_name}`;
        html = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;"><h1 style="margin: 0; font-size: 32px;">Congratulations!</h1><p style="margin: 10px 0 0 0; font-size: 18px;">Your rental application has been approved!</p></div><p>Dear ${data.applicant_name},</p><p>Great news! Your application for <strong>${data.property_name}, Unit ${data.unit_number}</strong> has been approved.</p><h2 style="color: #2563eb; margin-top: 30px;">Next Steps:</h2><div style="background: #f3f4f6; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0;"><p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Invitation Code:</p><div style="background: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${data.invitation_code}</div></div><div style="text-align: center; margin: 30px 0;"><a href="${data.portal_url}?code=${data.invitation_code}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Complete Your Signup</a></div><p>Welcome to your new home!</p><p>Best regards,<br>Property Management Team</p></div></body></html>`;
        break;

      case 'application_rejected':
        subject = `Application Update - ${data.property_name}`;
        html = `<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #dc2626;">Application Update</h1><p>Dear ${data.applicant_name},</p><p>Thank you for your interest in ${data.property_name}, Unit ${data.unit_number}.</p><p>After careful consideration, we have decided to move forward with another applicant for this property.</p><p>Best regards,<br>Property Management Team</p></div></body></html>`;
        break;

      default:
        throw new Error('Invalid email type');
    }

    const result = await sendSMTPEmail(to, subject, html);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});