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
      depositLabel,
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

    // 5. Create Nodemailer Transporter with connection pooling
    const port = Number(smtp.port) || 587;
    const isSecure = port === 465 ? true : Boolean(smtp.secure);

    const transporter = nodemailer.createTransport({
      host: smtp.host || 'smtp.gmail.com',
      port: port,
      secure: isSecure,
      pool: true,
      maxConnections: 3,
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>New Booking Enquiry</title>
  <style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    table { border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    img { -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding: 18px 14px !important; }
      .mobile-card-padding { padding: 14px !important; }
      .mobile-btn-cell { display: block !important; width: 100% !important; padding: 0 0 8px 0 !important; box-sizing: border-box !important; }
      .mobile-spec-col { display: block !important; width: 100% !important; padding-right: 0 !important; padding-left: 0 !important; padding-bottom: 12px !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F172A;">
    <tr>
      <td align="center" style="padding: 20px 8px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.28); border: 1px solid #1E293B;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px 20px; text-align: center; border-bottom: 3px solid #C8860A;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background: rgba(200, 134, 10, 0.2); color: #F59E0B; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 14px; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.35); margin-bottom: 10px;">
                      ✨ NEW WEBSITE ENQUIRY
                    </span>
                    <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.25;">
                      SriLalitha Events &amp; Catering
                    </h1>
                    <p style="color: #F59E0B; font-size: 12px; font-weight: 600; margin: 5px 0 0 0; letter-spacing: 0.5px;">
                      Authentic Pure Vegetarian Indian Catering • London
                    </p>
                    <div style="margin-top: 12px;">
                      <span style="display: inline-block; background: #1E293B; border: 1px solid #334155; color: #94A3B8; font-size: 11px; font-family: monospace; font-weight: 700; padding: 3px 10px; border-radius: 6px;">
                        REF: ${bookingId ? '#' + bookingId : 'WEB-LEAD'}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 20px; background-color: #FFFFFF;">

              ${isWaitlist ? `
              <!-- Waitlist Alert Banner -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <div style="font-size: 12px; font-weight: 800; color: #92400E; margin-bottom: 2px;">
                      ⚠️ High-Demand / Waitlist Slot Requested
                    </div>
                    <div style="font-size: 12px; color: #B45309; line-height: 1.4;">
                      This requested time slot is at or near standard capacity. Please review kitchen availability and contact the customer promptly.
                    </div>
                  </td>
                </tr>
              </table>` : ''}

              <!-- CARD 1: CUSTOMER CONTACT DETAILS -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 18px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 12px 16px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #B45309;">
                      👤 Customer Contact Details
                    </span>
                  </td>
                </tr>
                <!-- Body Items (Full 100% width stacked - never squishes!) -->
                <tr>
                  <td class="mobile-card-padding" style="padding: 16px;">

                    <!-- Name -->
                    <div style="padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 2px;">
                        Full Name
                      </div>
                      <div style="font-size: 15px; font-weight: 800; color: #0F172A; line-height: 1.3;">
                        ${name || 'Not Provided'}
                      </div>
                    </div>

                    <!-- Phone -->
                    <div style="padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 2px;">
                        Phone / WhatsApp
                      </div>
                      <div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                        <a href="tel:${phone}" style="color: #0F172A; text-decoration: none;">${phone || 'Not Provided'}</a>
                      </div>
                    </div>

                    <!-- Email (100% width, break-all, NEVER cuts off!) -->
                    <div style="padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0;">
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 2px;">
                        Email Address
                      </div>
                      <div style="font-size: 14px; font-weight: 700; color: #2563EB; line-height: 1.4; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word;">
                        <a href="mailto:${email}" style="color: #2563EB; text-decoration: none;">${email || 'Not Provided'}</a>
                      </div>
                    </div>

                    <!-- Location -->
                    <div>
                      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 2px;">
                        Event Location &amp; Distance
                      </div>
                      <div style="font-size: 14px; font-weight: 700; color: #0F172A; line-height: 1.4; word-break: break-word;">
                        ${location || 'To be confirmed'}
                      </div>
                      ${distanceMiles ? `
                      <div style="margin-top: 6px;">
                        <span style="display: inline-block; background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
                          📍 ${distanceMiles} miles from Kitchen
                        </span>
                      </div>` : ''}
                    </div>

                  </td>
                </tr>

                <!-- Dedicated Action Buttons Bar -->
                <tr>
                  <td style="background-color: #F1F5F9; padding: 12px 16px; border-top: 1px solid #E2E8F0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        ${whatsappLink ? `
                        <td class="mobile-btn-cell" width="50%" style="padding-right: 5px;">
                          <a href="${whatsappLink}" target="_blank" style="display: block; background-color: #16A34A; color: #FFFFFF; text-align: center; font-size: 12px; font-weight: 800; padding: 10px 14px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.25);">
                            💬 Chat WhatsApp
                          </a>
                        </td>` : ''}
                        <td class="mobile-btn-cell" width="${whatsappLink ? '50%' : '100%'}" style="padding-left: ${whatsappLink ? '5px' : '0'};">
                          <a href="mailto:${email}?subject=${encodeURIComponent(`SriLalitha Events: Follow-up on Your ${eventType || 'Catering'} Enquiry (#${bookingId || 'Web'})`)}&body=${encodeURIComponent(`Hi ${name || 'Customer'},\n\nThank you for reaching out to SriLalitha Events regarding your ${eventType || 'event'} on ${date || 'your requested date'}.\n\nWe would be delighted to assist you. Could you please confirm your preferred timings and estimated guest count?\n\nWarm regards,\nSriLalitha Events & Catering\nLondon, United Kingdom`)}" style="display: block; background-color: #2563EB; color: #FFFFFF; text-align: center; font-size: 12px; font-weight: 800; padding: 10px 14px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);">
                            ✉️ Reply by Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 2: EVENT & CATERING REQUIREMENTS -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 18px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="padding: 12px 16px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #B45309;">
                      📅 Event &amp; Catering Requirements
                    </span>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td class="mobile-card-padding" style="padding: 16px;">

                    <!-- 2-Column Responsive Specs Grid -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Event Type -->
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-right: 6px; padding-bottom: 12px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">Event Type</div>
                          <span style="display: inline-block; background-color: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px;">
                            ${eventType || 'Not Specified'}
                          </span>
                        </td>
                        <!-- Event Date -->
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-left: 6px; padding-bottom: 12px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">Event Date</div>
                          <span style="display: inline-block; background-color: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px;">
                            📅 ${date || 'To be confirmed'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <!-- Time Slot -->
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-right: 6px; padding-bottom: 12px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">Serving Time</div>
                          <span style="display: inline-block; background-color: #F1F5F9; color: #1E293B; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                            ⏰ ${timeOfDay || 'Flexible'}
                          </span>
                        </td>
                        <!-- Guest Count -->
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-left: 6px; padding-bottom: 12px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">Guest Count</div>
                          <span style="display: inline-block; background-color: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px;">
                            👥 ${guests ? guests + ' Guests' : 'To be confirmed'}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Package Highlight Box -->
                    <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 12px 14px; margin-top: 2px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #92400E; margin-bottom: 3px;">
                        🍽️ Selected Catering Package
                      </div>
                      <div style="font-size: 14px; font-weight: 800; color: #78350F; line-height: 1.4; word-break: break-word;">
                        ${selectedPackage || 'Custom Menu Enquiry'}
                      </div>
                    </div>

                    ${(totalEstimatedAmount || deposit || deliveryCharge) ? `
                    <!-- Financial Summary Breakdown -->
                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #CBD5E1;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                        ${totalEstimatedAmount ? `
                        <tr>
                          <td style="padding: 4px 0; color: #64748B;">Estimated Total:</td>
                          <td align="right" style="padding: 4px 0; font-weight: 800; color: #0F172A; font-size: 14px;">£${Number(totalEstimatedAmount).toFixed(2)}</td>
                        </tr>` : ''}
                        ${deposit ? `
                        <tr>
                          <td style="padding: 4px 0; color: #64748B;">${depositLabel || 'Deposit Paid:'}</td>
                          <td align="right" style="padding: 4px 0; font-weight: 800; color: #059669; font-size: 14px;">£${Number(deposit).toFixed(2)}</td>
                        </tr>` : ''}
                        ${deliveryCharge ? `
                        <tr>
                          <td style="padding: 4px 0; color: #64748B;">Delivery Fee:</td>
                          <td align="right" style="padding: 4px 0; font-weight: 700; color: #475569;">£${Number(deliveryCharge).toFixed(2)}</td>
                        </tr>` : ''}
                      </table>
                    </div>` : ''}

                  </td>
                </tr>
              </table>

              <!-- CARD 3: SPECIAL REQUIREMENTS / MESSAGE (IF ANY) -->
              ${message ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 14px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #92400E; margin-bottom: 4px;">
                      📝 Customer Notes / Dietary Requests
                    </div>
                    <div style="font-size: 13px; color: #78350F; line-height: 1.5; white-space: pre-line; word-break: break-word;">
                      ${message}
                    </div>
                  </td>
                </tr>
              </table>` : ''}

              <!-- CARD 4: CUSTOM DYNAMIC FIELDS (IF ANY) -->
              ${customFields && Object.keys(customFields).length > 0 ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 10px 16px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">
                      Additional Information
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                      ${Object.entries(customFields).map(([k, v]) => `
                        <tr>
                          <td style="padding: 4px 0; color: #64748B; text-transform: capitalize; width: 40%;">${k.replace(/_/g, ' ')}:</td>
                          <td style="padding: 4px 0; font-weight: 700; color: #0F172A; word-break: break-word;">${String(v)}</td>
                        </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- PRIMARY ACTION BUTTON -->
              <div style="text-align: center; margin: 26px 0 14px 0;">
                <a href="https://vegchennaisrilalitha.events/admin" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #C8860A 0%, #E69D24 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(200, 134, 10, 0.3); letter-spacing: 0.3px;">
                  Open Admin Dashboard to Manage →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; line-height: 1.5;">
              <div style="font-weight: 800; color: #0F172A; font-size: 12px; margin-bottom: 4px;">
                SriLalitha Events &amp; Catering London
              </div>
              <div style="color: #94A3B8; margin-bottom: 6px;">
                This automated notification was dispatched to registered administrators.
              </div>
              <div style="color: #94A3B8;">
                London, United Kingdom • <a href="https://vegchennaisrilalitha.events" style="color: #C8860A; text-decoration: none; font-weight: 700;">vegchennaisrilalitha.events</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 7. Prepare Mail Options
    const adminMailOptionsBase = {
      from: sender,
      subject: adminSubject,
      html: adminHtml,
      replyTo: email && email.includes('@') ? email : undefined,
    };

    // 8. Optionally Prepare Customer Confirmation Email
    let customerMailOptions: any = null;
    if (emailConfig.sendCustomerConfirmation && email && email.includes('@')) {
      const customerSubject = `Thank You for Your Enquiry - SriLalitha Events & Catering`;
      const customerHtml = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Thank You for Your Enquiry</title>
  <style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    table { border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
    img { -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding: 18px 14px !important; }
      .mobile-spec-col { display: block !important; width: 100% !important; padding-right: 0 !important; padding-left: 0 !important; padding-bottom: 10px !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F172A;">
    <tr>
      <td align="center" style="padding: 20px 8px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.28); border: 1px solid #1E293B;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px 20px; text-align: center; border-bottom: 3px solid #C8860A;">
              <span style="display: inline-block; background: rgba(200, 134, 10, 0.2); color: #F59E0B; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 14px; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.35); margin-bottom: 10px;">
                CATERING ENQUIRY RECEIVED
              </span>
              <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.3px;">
                SriLalitha Events &amp; Catering
              </h1>
              <p style="color: #F59E0B; font-size: 12px; font-weight: 600; margin: 5px 0 0 0;">
                Authentic Pure Vegetarian Indian Catering • London
              </p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 20px; background-color: #FFFFFF;">
              
              <h2 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0 0 10px 0;">
                Hello ${name || 'there'},
              </h2>
              
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">
                Thank you for choosing SriLalitha Events! We have successfully received your catering enquiry. Our senior event coordinator is reviewing your details and will get in touch within <strong>24 hours</strong> with your tailored proposal.
              </p>

              <!-- Summary Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #B45309;">
                      📋 Your Enquiry Summary
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-right: 6px; padding-bottom: 10px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 2px;">Event</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0F172A;">${eventType || 'Catering'}</div>
                        </td>
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-left: 6px; padding-bottom: 10px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 2px;">Requested Date</div>
                          <div style="font-size: 13px; font-weight: 700; color: #DC2626;">📅 ${date || 'To be confirmed'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-right: 6px; padding-bottom: 10px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 2px;">Service Time</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0F172A;">⏰ ${timeOfDay || 'Flexible'}</div>
                        </td>
                        <td class="mobile-spec-col" width="50%" style="vertical-align: top; padding-left: 6px; padding-bottom: 10px;">
                          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 2px;">Estimated Guests</div>
                          <div style="font-size: 13px; font-weight: 700; color: #0F172A;">👥 ${guests || 'N/A'}</div>
                        </td>
                      </tr>
                    </table>

                    <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 12px; margin-top: 4px;">
                      <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400E; margin-bottom: 2px;">Package</div>
                      <div style="font-size: 13px; font-weight: 800; color: #78350F; word-break: break-word;">
                        ${selectedPackage || 'Custom Menu Enquiry'}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Help / Contact Box -->
              <p style="font-size: 13px; line-height: 1.5; color: #64748B; margin: 0 0 16px 0;">
                Need to add specific dishes or make immediate changes to your date? Feel free to reply directly to this email or speak with us on WhatsApp.
              </p>

              <!-- Direct WhatsApp Button for Customer -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://wa.me/447700900000?text=${encodeURIComponent(`Hi SriLalitha Events, I submitted an enquiry for ${date || 'my event'}. Could we discuss my package?`)}" target="_blank" style="display: inline-block; background-color: #16A34A; color: #FFFFFF; font-size: 13px; font-weight: 800; padding: 11px 22px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);">
                  💬 Chat with Our Event Planner on WhatsApp
                </a>
              </div>

              <!-- Sign-off -->
              <div style="border-top: 1px solid #E2E8F0; padding-top: 14px;">
                <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0F172A;">SriLalitha Events &amp; Catering Team</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748B;">London, United Kingdom • <a href="https://vegchennaisrilalitha.events" style="color: #C8860A; text-decoration: none; font-weight: 700;">vegchennaisrilalitha.events</a></p>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
      customerMailOptions = {
        from: sender,
        to: email.trim(),
        subject: customerSubject,
        html: customerHtml,
      };
    }

    // 9. Dispatch concurrently to avoid timeouts and dropped requests
    const tasks: Promise<any>[] = [];
    
    // Add a task for each admin recipient
    activeRecipients.forEach(recipientEmail => {
      tasks.push(
        transporter.sendMail({
          ...adminMailOptionsBase,
          to: recipientEmail,
        })
      );
    });

    if (customerMailOptions) {
      tasks.push(transporter.sendMail(customerMailOptions));
    }

    const results = await Promise.allSettled(tasks);

    // Consider admin sent if at least one admin email succeeded
    const adminResults = results.slice(0, activeRecipients.length);
    const adminSent = adminResults.some(r => r.status === 'fulfilled');
    const firstSuccessfulAdmin = adminResults.find(r => r.status === 'fulfilled');
    const adminMessageId = firstSuccessfulAdmin ? (firstSuccessfulAdmin as any).value?.messageId : null;
    
    let customerSent = false;
    if (customerMailOptions) {
      const customerResult = results[results.length - 1];
      customerSent = customerResult.status === 'fulfilled';
      if (customerResult.status === 'rejected') {
        console.warn('Failed to deliver customer confirmation email:', customerResult.reason);
      }
    }

    // Log any admin failures
    adminResults.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`Failed to deliver admin notification to ${activeRecipients[idx]}:`, result.reason);
      }
    });

    return NextResponse.json({
      success: adminSent || customerSent,
      messageId: adminMessageId,
      recipients: activeRecipients,
      customerNotified: customerSent,
      adminSent,
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
