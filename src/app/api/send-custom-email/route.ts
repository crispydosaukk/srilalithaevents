import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  DEFAULT_EMAIL_NOTIFICATION_CONFIG,
  EmailNotificationConfig,
  sanitizeEmailNotificationConfig,
} from '@/app/data/emailNotificationConfig';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, message, customerName, bookingId } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid recipient email address.' },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide an email subject.' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter message content.' },
        { status: 400 }
      );
    }

    // 1. Primary: Delegate to Firebase Cloud Function HTTPS endpoint
    const cloudFunctionsBaseUrl = process.env.FIREBASE_FUNCTIONS_URL || 
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL ||
      `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'srilalitha-a0cff'}.cloudfunctions.net`;

    try {
      const cfRes = await fetch(`${cloudFunctionsBaseUrl}/sendCustomEmailHttp`, {
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
            message: `Email successfully sent to ${to}!`,
            messageId: cfData.messageId,
          });
        }
      }
    } catch (cfErr: any) {
      console.warn('Firebase Cloud Function HTTP call failed or timed out, trying local fallback:', cfErr?.message);
    }

    // 2. Fallback: Fetch SMTP settings from Firestore for local Nodemailer
    let emailConfig: EmailNotificationConfig = { ...DEFAULT_EMAIL_NOTIFICATION_CONFIG };
    try {
      const snap = await getDoc(doc(db, 'site_data', 'email_settings'));
      if (snap.exists()) {
        emailConfig = sanitizeEmailNotificationConfig(snap.data());
      }
    } catch (e) {
      console.warn('Could not read email_settings from Firestore, using default:', e);
    }

    // 2. Validate SMTP credentials
    const smtp = emailConfig.smtp;
    if (!smtp || !smtp.user || !smtp.pass) {
      return NextResponse.json(
        { success: false, error: 'SMTP credentials not configured. Please set them in Admin Dashboard → Email Settings.' },
        { status: 500 }
      );
    }

    // 3. Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host || 'mail.vegchennaisrilalitha.co.uk',
      port: smtp.port || 465,
      secure: smtp.secure !== false,
      pool: true,
      maxConnections: 3,
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

    // 4. Format HTML email with branding and clean typography
    const formattedBody = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 24px; color: #1F2937;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #111827 0%, #1F2937 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #C8860A;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
        SriLalitha Events &amp; Catering
      </h1>
      <p style="color: #F59E0B; font-size: 12px; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">
        London's Premier Pure Vegetarian Catering
      </p>
      ${bookingId ? `
      <div style="margin-top: 10px; display: inline-block; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; padding: 3px 12px; font-size: 11px; color: #D1D5DB; font-family: monospace;">
        Booking Reference: #${bookingId}
      </div>` : ''}
    </div>

    <!-- Message Body -->
    <div style="padding: 28px 24px; font-size: 14px; line-height: 1.7; color: #374151;">
      ${customerName ? `<p style="font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 16px 0;">Dear ${customerName},</p>` : ''}
      
      <div style="background: #FDFBF7; border-left: 4px solid #C8860A; padding: 18px; border-radius: 8px; margin: 16px 0; color: #1F2937;">
        ${formattedBody}
      </div>

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">
        <p style="margin: 0; font-weight: 700; color: #111827;">SriLalitha Events &amp; Catering Team</p>
        <p style="margin: 2px 0;">📞 Phone / WhatsApp: <a href="tel:+447700900000" style="color: #C8860A; text-decoration: none;">+44 7700 900000</a></p>
        <p style="margin: 2px 0;">✉️ Email: <a href="mailto:admin@vegchennaisrilalitha.co.uk" style="color: #C8860A; text-decoration: none;">admin@vegchennaisrilalitha.co.uk</a></p>
        <p style="margin: 2px 0;">🌐 Website: <a href="https://vegchennaisrilalitha.events" style="color: #C8860A; text-decoration: none;">vegchennaisrilalitha.events</a></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #F3F4F6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0;">You received this email regarding your booking with SriLalitha Events &amp; Catering.</p>
    </div>
  </div>
</body>
</html>
    `;

    // 5. Send email via Nodemailer
    const info = await transporter.sendMail({
      from: sender,
      to: to.trim(),
      subject: subject.trim(),
      html: htmlContent,
      replyTo: fromEmail,
    });

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${to}!`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('Error sending custom email:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to dispatch email.',
      },
      { status: 500 }
    );
  }
}
