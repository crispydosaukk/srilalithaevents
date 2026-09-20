import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
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

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY environment variable is not set. Please add it in GoDaddy → Manage App → Environment Variables.' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const fromName = smtp?.fromName || 'SriLalitha Events & Catering';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const sender = `${fromName} <${fromEmail}>`;

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
      This test message confirms that your Resend email integration is configured correctly.
    </p>
    <div style="background: #F9FAFB; border-radius: 8px; padding: 12px; font-size: 12px; text-align: left; color: #6B7280;">
      <p style="margin: 2px 0;"><strong>Service:</strong> Resend API (HTTPS)</p>
      <p style="margin: 2px 0;"><strong>Sent To:</strong> ${testRecipient}</p>
      <p style="margin: 2px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: sender,
      to: [testRecipient.trim()],
      subject: '✅ SriLalitha Events: Email Test Succeeded',
      html: testHtml,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Resend API returned an error.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${testRecipient}!`,
      messageId: data?.id,
    });
  } catch (err: any) {
    console.error('Error sending test email:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to send test email.',
      },
      { status: 500 }
    );
  }
}
