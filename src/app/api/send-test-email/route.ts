import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { SmtpConfig } from '@/app/data/emailNotificationConfig';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { smtp, testRecipient }: { smtp: SmtpConfig; testRecipient: string } = body;

    if (!testRecipient || !testRecipient.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid test recipient email address.' },
        { status: 400 }
      );
    }

    // 1. Primary: Delegate to Firebase Cloud Function HTTPS endpoint
    const cloudFunctionsBaseUrl = process.env.FIREBASE_FUNCTIONS_URL || 
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL ||
      `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'srilalitha-a0cff'}.cloudfunctions.net`;

    try {
      const cfRes = await fetch(`${cloudFunctionsBaseUrl}/sendTestEmailHttp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });

      if (cfRes.ok) {
        const cfData = await cfRes.json();
        if (cfData && cfData.success) {
          return NextResponse.json({
            success: true,
            method: 'firebase_cloud_function_http',
            message: cfData.message || `Test email successfully sent to ${testRecipient}!`,
            messageId: cfData.messageId,
          });
        }
      }
    } catch (cfErr: any) {
      console.warn('Firebase Cloud Function test email failed or timed out, trying local fallback:', cfErr?.message);
    }

    // 2. Fallback: Validate SMTP credentials sent from the Admin Dashboard form for local Nodemailer
    if (!smtp || !smtp.user || !smtp.pass) {
      return NextResponse.json(
        { success: false, error: 'SMTP credentials are required. Please fill in the SMTP Username and Password fields in Admin Dashboard → Email Settings.' },
        { status: 400 }
      );
    }

    // Create Nodemailer transporter using the SMTP settings submitted by the admin
    const transporter = nodemailer.createTransport({
      host: smtp.host || 'mail.vegchennaisrilalitha.co.uk',
      port: smtp.port || 465,
      secure: smtp.secure !== false,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const fromName = smtp.fromName || 'SriLalitha Events & Catering';
    const fromEmail = smtp.fromEmail || smtp.user;
    const sender = `"${fromName}" <${fromEmail}>`;

    const testHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #F8F9FA; padding: 24px; color: #1F2937;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #E5E7EB; text-align: center;">
    <div style="width: 48px; height: 48px; background: #ECFDF5; color: #059669; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
      ✓
    </div>
    <h2 style="margin: 0 0 8px 0; color: #111827;">Email Integration Working!</h2>
    <p style="color: #4B5563; font-size: 14px; margin: 0 0 16px 0;">
      This test message confirms that your SMTP email integration is configured correctly.
    </p>
    <div style="background: #F9FAFB; border-radius: 8px; padding: 12px; font-size: 12px; text-align: left; color: #6B7280;">
      <p style="margin: 2px 0;"><strong>Service:</strong> Native SMTP (Nodemailer)</p>
      <p style="margin: 2px 0;"><strong>SMTP Host:</strong> ${smtp.host || 'mail.vegchennaisrilalitha.co.uk'}</p>
      <p style="margin: 2px 0;"><strong>SMTP Port:</strong> ${smtp.port || 465}</p>
      <p style="margin: 2px 0;"><strong>Sent From:</strong> ${fromEmail}</p>
      <p style="margin: 2px 0;"><strong>Sent To:</strong> ${testRecipient}</p>
      <p style="margin: 2px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Attempt to send test email — any SMTP error will be caught below
    const info = await transporter.sendMail({
      from: sender,
      to: testRecipient.trim(),
      subject: '✅ SriLalitha Events: Email Test Succeeded',
      html: testHtml,
    });

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${testRecipient}!`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('Error sending test email:', err);
    // Return a helpful error message based on common SMTP errors
    let errorMessage = err?.message || 'Failed to send test email.';
    if (err?.code === 'ECONNREFUSED') {
      errorMessage = `Connection refused. GoDaddy may be blocking outbound SMTP on port ${(err as any)?.port || 'the configured port'}. Try using port 25 or localhost as the SMTP host if your email is hosted on the same server.`;
    } else if (err?.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Check that the SMTP host and port are correct and that GoDaddy allows outbound connections on this port.';
    } else if (err?.responseCode === 535 || err?.responseCode === 534) {
      errorMessage = 'Authentication failed. Please check your SMTP username and password are correct.';
    }
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
