import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import {
  BookingEmailData,
  generateAdminEnquiryHtml,
  generateCustomerConfirmationHtml,
  generatePaymentInvoiceHtml,
  InvoiceEmailData,
} from './emailTemplates';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailRecipient {
  id?: string;
  email: string;
  name?: string;
  enabled: boolean;
}

export interface SiteEmailSettings {
  enabled: boolean;
  recipients: EmailRecipient[];
  sendCustomerConfirmation: boolean;
  smtp: SmtpConfig;
}

// Built-in fallback SMTP settings (Zingbite / SriLalitha Gmail SMTP)
const DEFAULT_EMAIL_SETTINGS: SiteEmailSettings = {
  enabled: true,
  recipients: [
    {
      id: 'default-1',
      email: 'admin@vegchennaisrilalitha.co.uk',
      name: 'Primary Admin',
      enabled: true,
    },
  ],
  sendCustomerConfirmation: true,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'zingbiteuk@gmail.com',
    pass: process.env.SMTP_PASS || 'yyozpzropaysxtah',
    fromName: 'SriLalitha Events & Catering',
    fromEmail: process.env.SMTP_USER || 'zingbiteuk@gmail.com',
  },
};

/**
 * Fetch dynamic email configuration from Firestore 'site_data/email_settings'
 */
export async function getEmailConfig(): Promise<SiteEmailSettings> {
  try {
    const docSnap = await admin.firestore().collection('site_data').doc('email_settings').get();
    if (docSnap.exists) {
      const data = docSnap.data() as any;
      const smtp = data.smtp || {};

      const recipients: EmailRecipient[] = Array.isArray(data.recipients) && data.recipients.length > 0
        ? data.recipients
            .map((r: any, idx: number) => ({
              id: r.id || `recipient-${idx}`,
              email: String(r.email || '').trim().toLowerCase(),
              name: String(r.name || 'Admin Recipient').trim(),
              enabled: r.enabled !== false,
            }))
            .filter((r: EmailRecipient) => Boolean(r.email && r.email.includes('@')))
        : DEFAULT_EMAIL_SETTINGS.recipients;

      let rawUser = String(smtp.user || DEFAULT_EMAIL_SETTINGS.smtp.user).trim();
      let cleanPass = String(smtp.pass || '').replace(/\s+/g, '');
      let host = String(smtp.host || '').trim();
      let shouldRepair = false;

      // Detect invalid credentials:
      // 1. If host is smtp.gmail.com but user is not a @gmail.com address (e.g. admin@vegchennaisrilalitha.events)
      // 2. If user is from the website domain (which cannot authenticate against Gmail SMTP)
      // 3. If password is not a valid 16-character Google App Password
      const isInvalidGmailUser = host === 'smtp.gmail.com' && !rawUser.toLowerCase().includes('@gmail.com');
      const isLegacyDomainUser = rawUser.includes('vegchennaisrilalitha.events');
      const isLegacyHost = !host || host.includes('vegchennaisrilalitha.events');

      if (isInvalidGmailUser || isLegacyDomainUser || isLegacyHost) {
        rawUser = DEFAULT_EMAIL_SETTINGS.smtp.user; // 'zingbiteuk@gmail.com'
        cleanPass = DEFAULT_EMAIL_SETTINGS.smtp.pass; // 'yyozpzropaysxtah'
        host = 'smtp.gmail.com';
        shouldRepair = true;
      }

      if (rawUser.toLowerCase() === 'zingbiteuk@gmail.com' && (!cleanPass || cleanPass.length !== 16 || cleanPass === 'Rahul@798#')) {
        cleanPass = 'yyozpzropaysxtah';
        shouldRepair = true;
      }

      const isGmail = rawUser.toLowerCase().includes('@gmail.com');
      const port = isGmail ? 587 : (Number(smtp.port) || DEFAULT_EMAIL_SETTINGS.smtp.port);
      const secure = port === 465;
      const pass = cleanPass || DEFAULT_EMAIL_SETTINGS.smtp.pass;
      const fromName = String(smtp.fromName || DEFAULT_EMAIL_SETTINGS.smtp.fromName).trim();
      const fromEmail = isGmail ? rawUser : String(smtp.fromEmail || rawUser || DEFAULT_EMAIL_SETTINGS.smtp.fromEmail).trim();

      if (shouldRepair) {
        // Auto-repair invalid credentials in Firestore so Admin Dashboard reflects working Gmail SMTP
        docSnap.ref.set(
          {
            smtp: {
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              user: rawUser,
              pass,
              fromName,
              fromEmail,
            },
          },
          { merge: true }
        ).catch((err) => console.warn('Could not auto-repair email_settings in Firestore:', err));
      }

      return {
        enabled: data.enabled !== false,
        recipients: recipients.length > 0 ? recipients : DEFAULT_EMAIL_SETTINGS.recipients,
        sendCustomerConfirmation: data.sendCustomerConfirmation !== false,
        smtp: {
          host,
          port,
          secure,
          user: rawUser,
          pass,
          fromName,
          fromEmail,
        },
      };
    }
  } catch (err) {
    console.warn('Could not read email_settings from Firestore, using defaults:', err);
  }

  return DEFAULT_EMAIL_SETTINGS;
}

/**
 * Build a Nodemailer Transporter
 */
export function createTransporter(smtp: SmtpConfig): nodemailer.Transporter {
  const isPort465 = Number(smtp.port) === 465;
  const isSecure = smtp.secure !== undefined ? smtp.secure : isPort465;

  return nodemailer.createTransport({
    host: smtp.host || 'smtp.gmail.com',
    port: Number(smtp.port) || 587,
    secure: isSecure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Dispatch booking enquiry / online order emails:
 * 1) Admin notification email to all active admin recipients
 * 2) Customer confirmation email (if email present)
 */
export async function sendEnquiryEmails(data: BookingEmailData, bookingId?: string) {
  const config = await getEmailConfig();

  if (!config.enabled) {
    console.log('Enquiry emails disabled in site_data/email_settings');
    return { success: false, reason: 'disabled' };
  }

  const { smtp } = config;
  if (!smtp.user || !smtp.pass) {
    console.error('SMTP credentials missing');
    return { success: false, reason: 'missing_credentials' };
  }

  const transporter = createTransporter(smtp);
  const fromName = smtp.fromName || 'SriLalitha Events & Catering';
  const fromEmail = smtp.fromEmail || smtp.user;
  const sender = `"${fromName}" <${fromEmail}>`;

  // 1. Admin recipients
  const activeRecipients = (config.recipients || [])
    .filter((r) => r.enabled && r.email && r.email.includes('@'))
    .map((r) => r.email.trim());

  if (activeRecipients.length === 0) {
    activeRecipients.push(smtp.fromEmail || smtp.user || 'admin@vegchennaisrilalitha.co.uk');
  }

  const adminSubject = `✨ New ${data.isOnlineOrder ? 'Order' : 'Enquiry'}: ${data.name || 'Customer'} - ${data.eventType || 'Catering'} (${data.date || 'TBD'})`;
  const adminHtml = generateAdminEnquiryHtml(data, bookingId);

  const tasks: Promise<any>[] = [];

  // Send to each admin recipient
  activeRecipients.forEach((recipientEmail) => {
    tasks.push(
      transporter.sendMail({
        from: sender,
        to: recipientEmail,
        subject: adminSubject,
        html: adminHtml,
        replyTo: data.email && data.email.includes('@') ? data.email.trim() : undefined,
      })
    );
  });

  // 2. Send Customer Confirmation Email
  let customerTaskIndex = -1;
  const customerEmail = (data.email || '').trim();
  if (config.sendCustomerConfirmation && customerEmail && customerEmail.includes('@')) {
    const customerSubject = `Thank You for Your ${data.isOnlineOrder ? 'Order' : 'Enquiry'} - SriLalitha Events & Catering`;
    const customerHtml = generateCustomerConfirmationHtml(data, bookingId);

    customerTaskIndex = tasks.length;
    tasks.push(
      transporter.sendMail({
        from: sender,
        to: customerEmail,
        subject: customerSubject,
        html: customerHtml,
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  const adminResults = results.slice(0, activeRecipients.length);
  const adminSent = adminResults.some((r) => r.status === 'fulfilled');

  let customerSent = false;
  if (customerTaskIndex >= 0) {
    customerSent = results[customerTaskIndex].status === 'fulfilled';
    if (!customerSent) {
      console.warn('Failed customer confirmation email:', (results[customerTaskIndex] as any).reason);
    }
  }

  return {
    success: adminSent || customerSent,
    adminSent,
    customerSent,
    recipients: activeRecipients,
  };
}

/**
 * Dispatch payment confirmation receipt to customer and notification to admin
 */
export async function sendPaymentReceiptEmail(orderData: any, bookingId: string) {
  const config = await getEmailConfig();
  const { smtp } = config;

  if (!smtp.user || !smtp.pass) {
    console.error('SMTP credentials missing for payment receipt email');
    return { success: false, reason: 'missing_credentials' };
  }

  const transporter = createTransporter(smtp);
  const fromName = smtp.fromName || 'SriLalitha Events & Catering';
  const fromEmail = smtp.fromEmail || smtp.user;
  const sender = `"${fromName}" <${fromEmail}>`;

  const amountPaid = Number(orderData.deposit || orderData.amountPaidSoFar || orderData.amountToPay || 0);
  const totalAmount = Number(orderData.totalEstimatedAmount || orderData.baseAmount || amountPaid);
  const customerEmail = (orderData.email || orderData.stripeCustomerEmail || '').trim();
  const customerName = orderData.name || 'Valued Customer';
  const customerPhone = orderData.phone || '';
  const ref = (bookingId || 'SL-ORD').slice(-8).toUpperCase();
  const invoiceNumber = `INV-SL-${ref}`;

  const invoiceData: InvoiceEmailData = {
    orderId: bookingId,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    packageName: orderData.packageName || orderData.package || 'Catering Package',
    guests: orderData.guests || 0,
    eventDate: orderData.date || 'TBD',
    eventTime: orderData.timeOfDay || orderData.time || '',
    location: orderData.location || 'To be confirmed',
    amountPaid,
    totalAmount,
    deliveryCharge: Number(orderData.deliveryCharge || 0),
    paymentType: orderData.paymentChoice || (amountPaid < totalAmount ? 'deposit' : 'full'),
    depositPercentage: orderData.depositPercentage || '30',
    paymentIntentId: orderData.stripePaymentIntentId || '',
  };

  const customerInvoiceHtml = generatePaymentInvoiceHtml(invoiceData, false);
  const adminInvoiceHtml = generatePaymentInvoiceHtml(invoiceData, true);

  const tasks: Promise<any>[] = [];

  // 1. Dispatch Official Tax Invoice & Payment Receipt to Customer
  if (customerEmail && customerEmail.includes('@')) {
    tasks.push(
      transporter.sendMail({
        from: sender,
        to: customerEmail,
        subject: `🧾 Official Tax Invoice & Payment Confirmation – SriLalitha Catering #${ref}`,
        html: customerInvoiceHtml,
        replyTo: smtp.fromEmail || smtp.user,
      })
    );
  }

  // 2. Dispatch Payment & Invoice Notification to Admin Recipients
  const adminRecipients = (config.recipients || [])
    .filter((r) => r.enabled && r.email && r.email.includes('@'))
    .map((r) => r.email.trim());

  if (adminRecipients.length === 0) {
    adminRecipients.push(smtp.fromEmail || smtp.user || 'admin@vegchennaisrilalitha.co.uk');
  }

  adminRecipients.forEach((adminEmail) => {
    tasks.push(
      transporter.sendMail({
        from: sender,
        to: adminEmail,
        subject: `💳 Payment Received: ${customerName} | £${amountPaid.toFixed(2)} | Invoice #${invoiceNumber}`,
        html: adminInvoiceHtml,
        replyTo: customerEmail && customerEmail.includes('@') ? customerEmail : undefined,
      })
    );
  });

  const results = await Promise.allSettled(tasks);
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  return { success: succeeded > 0, count: succeeded };
}

/**
 * Send custom email directly (used by admin dashboard custom email tool)
 */
export async function sendCustomEmailDirect(to: string, subject: string, message: string, customerName?: string, bookingId?: string) {
  const config = await getEmailConfig();
  const { smtp } = config;

  if (!smtp.user || !smtp.pass) {
    throw new Error('SMTP credentials not configured in Admin Dashboard.');
  }

  const transporter = createTransporter(smtp);
  const sender = `"${smtp.fromName || 'SriLalitha Events & Catering'}" <${smtp.fromEmail || smtp.user}>`;

  const formattedBody = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif; background:#F8FAFC; margin:0; padding:24px; color:#1F2937;">
  <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:14px; overflow:hidden; border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg, #111827 0%, #1F2937 100%); padding:24px; text-align:center; border-bottom:3px solid #C8860A;">
      <h1 style="color:#FFFFFF; margin:0; font-size:20px;">SriLalitha Events &amp; Catering</h1>
      ${bookingId ? `<div style="color:#D1D5DB; font-size:12px; margin-top:6px;">Booking #${bookingId}</div>` : ''}
    </div>
    <div style="padding:24px; font-size:14px; line-height:1.7;">
      ${customerName ? `<p>Dear <strong>${customerName}</strong>,</p>` : ''}
      <div style="background:#FDFBF7; border-left:4px solid #C8860A; padding:16px; border-radius:6px; margin:16px 0;">
        ${formattedBody}
      </div>
      <div style="border-top:1px solid #E5E7EB; padding-top:14px; margin-top:20px; font-size:12px; color:#6B7280;">
        SriLalitha Events &amp; Catering<br />
        📞 +44 7700 900000 | ✉️ admin@vegchennaisrilalitha.co.uk | 🌐 vegchennaisrilalitha.events
      </div>
    </div>
  </div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: sender,
    to: to.trim(),
    subject: subject.trim(),
    html,
  });

  return { success: true, messageId: info.messageId };
}
