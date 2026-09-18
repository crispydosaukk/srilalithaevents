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
    const {
      bookingId,
      name,
      email,
      phone,
      eventType,
      location,
      distanceMiles,
      deliveryCharge,
      totalEstimatedAmount,
      date,
      timeOfDay,
      guests,
      message,
      selectedPackage,
      deposit,
      customFields,
      isWaitlist,
    } = body;

    // 1. Fetch dynamic email notification settings from Firestore
    let emailConfig: EmailNotificationConfig = { ...DEFAULT_EMAIL_NOTIFICATION_CONFIG };
    try {
      const snap = await getDoc(doc(db, 'site_data', 'email_settings'));
      if (snap.exists()) {
        emailConfig = sanitizeEmailNotificationConfig(snap.data());
      }
    } catch (e) {
      console.warn('Could not read email_settings from Firestore, using default:', e);
    }

    // 2. Check if notifications are enabled
    if (!emailConfig.enabled) {
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Enquiry email notifications are turned OFF in Admin Dashboard settings.',
      });
    }

    // 3. Get active recipient emails
    const activeRecipients = (emailConfig.recipients || [])
      .filter((r) => r.enabled && r.email && r.email.includes('@'))
      .map((r) => r.email.trim());

    if (activeRecipients.length === 0) {
      // Fallback to default admin email
      activeRecipients.push('admin@vegchennaisrilalitha.co.uk');
    }

    // 4. Verify SMTP configuration
    const smtp = emailConfig.smtp;
    if (!smtp || !smtp.user || !smtp.pass) {
      console.warn('SMTP credentials not configured. Enquiry saved in database, skipping email dispatch.');
      return NextResponse.json({
        success: false,
        reason: 'smtp_not_configured',
        message: 'Enquiry saved in database. Outgoing SMTP credentials (user/password) not yet filled in Admin Dashboard.',
        activeRecipients,
      });
    }

    // 5. Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host || 'mail.vegchennaisrilalitha.co.uk',
      port: smtp.port || 465,
      secure: smtp.secure !== false,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert issues on cPanel/custom mail servers
      },
    });

    const sender = `"${smtp.fromName || 'SriLalitha Events'}" <${smtp.fromEmail || smtp.user}>`;

    // 6. Format Admin Notification Email
    const adminSubject = `✨ New Enquiry: ${name || 'Customer'} - ${eventType || 'Catering'} on ${date || 'TBD'}`;
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}` : '';

    const adminHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Enquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 24px; color: #1F2937;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #111827 0%, #1F2937 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #C8860A;">
      <span style="background: rgba(200, 134, 10, 0.2); color: #F59E0B; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 9999px; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
        New Website Enquiry
      </span>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">
        SriLalitha Events &amp; Catering
      </h1>
      <p style="color: #9CA3AF; font-size: 13px; margin: 6px 0 0 0;">
        Enquiry Reference: ${bookingId ? `#${bookingId}` : 'Web Lead'}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px 24px;">
      ${isWaitlist ? `
      <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400E; font-size: 13px; font-weight: 700;">
          ⚠️ Waitlist / Full-Capacity Slot Requested
        </p>
        <p style="margin: 4px 0 0 0; color: #B45309; font-size: 12px;">
          This customer requested a slot that is at or exceeding normal capacity. Check schedule availability.
        </p>
      </div>` : ''}

      <!-- Customer Overview Card -->
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #C8860A; letter-spacing: 0.5px;">
          👤 Customer Details
        </h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6B7280; width: 35%;">Name:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #111827;">${name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Phone / WhatsApp:</td>
            <td style="padding: 6px 0; font-weight: 600;">
              <a href="tel:${phone}" style="color: #111827; text-decoration: none;">${phone || 'N/A'}</a>
              ${whatsappLink ? `&nbsp; <a href="${whatsappLink}" style="display: inline-block; background: #25D366; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-decoration: none;">WhatsApp 💬</a>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Email:</td>
            <td style="padding: 6px 0;">
              <a href="mailto:${email}" style="color: #2563EB; text-decoration: none; font-weight: 600;">${email || 'N/A'}</a>
              ${email ? `&nbsp; <a href="mailto:${email}?subject=${encodeURIComponent(`SriLalitha Events: Follow-up on Your ${eventType || 'Catering'} Enquiry (#${bookingId || 'Web'})`)}&body=${encodeURIComponent(`Hi ${name || 'Customer'},\n\nThank you for reaching out to SriLalitha Events regarding your ${eventType || 'event'} on ${date || 'your requested date'}.\n\nWe would be delighted to assist you. Could you please confirm your preferred timings and estimated guest count?\n\nWarm regards,\nSriLalitha Events & Catering\n+44 7700 900000`)}" style="display: inline-block; background: #2563EB; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-decoration: none;">Email ✉️</a>` : ''}
            </td>
          </tr>
          ${location ? `
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Venue Location:</td>
            <td style="padding: 6px 0; color: #111827;">${location} ${distanceMiles ? `(${distanceMiles} miles)` : ''}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Event Specifications Card -->
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #C8860A; letter-spacing: 0.5px;">
          📅 Event &amp; Catering Requirements
        </h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6B7280; width: 35%;">Event Type:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #111827;">${eventType || 'Not Specified'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Event Date:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #DC2626;">${date || 'TBD'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Time of Day:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #111827;">${timeOfDay || 'Flexible'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Guest Count:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #111827;">${guests ? `${guests} Guests` : 'To be confirmed'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Selected Package:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #C8860A;">${selectedPackage || 'Custom Enquiry'}</td>
          </tr>
          ${totalEstimatedAmount ? `
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Estimated Total:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #111827;">£${Number(totalEstimatedAmount).toFixed(2)}</td>
          </tr>` : ''}
          ${deposit ? `
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Deposit Required:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #059669;">£${Number(deposit).toFixed(2)}</td>
          </tr>` : ''}
          ${deliveryCharge ? `
          <tr>
            <td style="padding: 6px 0; color: #6B7280;">Delivery Charge:</td>
            <td style="padding: 6px 0; color: #4B5563;">£${Number(deliveryCharge).toFixed(2)}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Notes / Dietary Requirements -->
      ${message ? `
      <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400E;">
          📝 Customer Message / Dietary Requirements:
        </h4>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #78350F; white-space: pre-line;">${message}</p>
      </div>` : ''}

      <!-- Custom Dynamic Fields if any -->
      ${customFields && Object.keys(customFields).length > 0 ? `
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280;">
          Additional Form Fields:
        </h4>
        <table style="width: 100%; font-size: 13px;">
          ${Object.entries(customFields).map(([k, v]) => `
            <tr>
              <td style="padding: 3px 0; color: #6B7280; text-transform: capitalize;">${k.replace(/_/g, ' ')}:</td>
              <td style="padding: 3px 0; font-weight: 600; color: #111827;">${String(v)}</td>
            </tr>
          `).join('')}
        </table>
      </div>` : ''}

      <!-- Direct Action Button -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="https://vegchennaisrilalitha.events/admin" style="background: linear-gradient(135deg, #C8860A, #E69D24); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(200, 134, 10, 0.3);">
          Open Admin Dashboard to Manage Enquiry →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #F3F4F6; padding: 18px 24px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0;">Sent automatically by SriLalitha Events Website Notification System</p>
      <p style="margin: 4px 0 0 0; color: #9CA3AF;">Recipients: ${activeRecipients.join(', ')}</p>
    </div>
  </div>
</body>
</html>
    `;

    // 7. Dispatch Email to Admin Recipients
    const adminMailOptions = {
      from: sender,
      to: activeRecipients.join(', '),
      subject: adminSubject,
      html: adminHtml,
      replyTo: email && email.includes('@') ? email : undefined,
    };

    const adminInfo = await transporter.sendMail(adminMailOptions);

    // 8. Optionally Send Customer Confirmation Email
    let customerSent = false;
    if (emailConfig.sendCustomerConfirmation && email && email.includes('@')) {
      try {
        const customerSubject = `Thank You for Your Enquiry - SriLalitha Events & Catering`;
        const customerHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 24px; color: #1F2937;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
    <div style="background: linear-gradient(135deg, #111827 0%, #1F2937 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #C8860A;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">
        SriLalitha Events &amp; Catering
      </h1>
      <p style="color: #F59E0B; font-size: 13px; font-weight: 600; margin: 6px 0 0 0;">
        Authentic Pure Vegetarian Indian Catering
      </p>
    </div>

    <div style="padding: 28px 24px;">
      <h2 style="font-size: 18px; color: #111827; margin: 0 0 12px 0;">Hello ${name || 'there'},</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 18px 0;">
        Thank you for choosing SriLalitha Events! We have successfully received your booking enquiry. Our catering specialist is reviewing your details and will get back to you within <strong>24 hours</strong> with a full proposal.
      </p>

      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #C8860A;">
          Your Enquiry Summary
        </h3>
        <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Event:</strong> ${eventType || 'Catering'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Requested Date:</strong> ${date || 'To be confirmed'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Time:</strong> ${timeOfDay || 'Flexible'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Guests:</strong> ${guests || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Package:</strong> ${selectedPackage || 'Custom'}</p>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #6B7280; margin: 0 0 20px 0;">
        If you have any urgent questions or need to make immediate adjustments to your booking, feel free to reply to this email or reach us on WhatsApp.
      </p>

      <div style="border-top: 1px solid #E5E7EB; padding-top: 16px;">
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #111827;">SriLalitha Events Team</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #6B7280;">London, United Kingdom</p>
      </div>
    </div>
  </div>
</body>
</html>
        `;

        await transporter.sendMail({
          from: sender,
          to: email.trim(),
          subject: customerSubject,
          html: customerHtml,
        });
        customerSent = true;
      } catch (custErr) {
        console.warn('Could not send customer confirmation email:', custErr);
      }
    }

    return NextResponse.json({
      success: true,
      messageId: adminInfo.messageId,
      recipients: activeRecipients,
      customerNotified: customerSent,
    });
  } catch (err: any) {
    console.error('Error in send-enquiry-email API route:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to dispatch email',
      },
      { status: 500 }
    );
  }
}
