import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import {
  BookingEmailData,
} from './emailTemplates';
import {
  getEmailConfig,
  createTransporter,
  sendEnquiryEmails,
  sendPaymentReceiptEmail,
  sendCustomEmailDirect,
} from './emailService';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for all 2nd Gen functions (matching Firestore region europe-west2)
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 10,
});

/**
 * 1. AUTOMATIC FIRESTORE TRIGGER: onBookingRequestCreated
 * Triggers automatically whenever any new booking or online order is saved to 'booking_requests'
 */
export const onBookingRequestCreated = onDocumentCreated(
  'booking_requests/{bookingId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log('No data associated with event');
      return;
    }

    const data = snap.data() as BookingEmailData & { emailSent?: boolean };
    const bookingId = event.params.bookingId;

    // Idempotency: Skip if emails have already been dispatched for this booking
    if (data.emailSent === true) {
      console.log(`Email already dispatched for booking #${bookingId}, skipping duplicate.`);
      return;
    }

    console.log(`[onBookingRequestCreated] Processing booking #${bookingId} for ${data.name || 'Customer'}`);

    try {
      const result = await sendEnquiryEmails(data, bookingId);

      await snap.ref.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailStatus: result.success ? 'delivered' : 'partial_failure',
        emailRecipients: result.recipients || [],
        customerNotified: result.customerSent || false,
      });

      console.log(`✅ [onBookingRequestCreated] Successfully dispatched emails for booking #${bookingId}`);
    } catch (err: any) {
      console.error(`❌ [onBookingRequestCreated] Failed to dispatch emails for booking #${bookingId}:`, err);
      try {
        await snap.ref.update({
          emailSent: false,
          emailStatus: 'failed',
          emailError: err?.message || String(err),
        });
      } catch (updateErr) {
        console.error('Failed to update emailStatus on doc:', updateErr);
      }
    }
  }
);

/**
 * 2. AUTOMATIC FIRESTORE TRIGGER: onBookingPaymentUpdated
 * Triggers automatically when an order's deposit/payment status is marked as paid
 */
export const onBookingPaymentUpdated = onDocumentUpdated(
  'booking_requests/{bookingId}',
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data() as any;
    const after = change.after.data() as any;
    const bookingId = event.params.bookingId;

    // Trigger when depositPaid changes to true and payment receipt has not been dispatched yet
    const justPaid = !before.depositPaid && after.depositPaid === true;
    const paymentReceiptNeeded = !after.paymentConfirmationSent;

    if (justPaid && paymentReceiptNeeded) {
      console.log(`[onBookingPaymentUpdated] Payment detected for #${bookingId}. Dispatching receipt emails.`);
      try {
        await sendPaymentReceiptEmail(after, bookingId);
        await change.after.ref.update({
          paymentConfirmationSent: true,
          paymentConfirmationSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ [onBookingPaymentUpdated] Payment confirmation dispatched for #${bookingId}`);
      } catch (err) {
        console.error(`❌ [onBookingPaymentUpdated] Error dispatching payment receipt for #${bookingId}:`, err);
      }
    }
  }
);

/**
 * 3. HTTPS CALLABLE / HTTP ENDPOINT: sendEnquiryEmailHttp
 * Allows the website frontend or server to trigger email directly via HTTPS POST.
 */
export const sendEnquiryEmailHttp = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const bookingId = body.bookingId || `REQ_${Date.now()}`;

    console.log(`[sendEnquiryEmailHttp] Received request for booking #${bookingId}`);

    const result = await sendEnquiryEmails(body, bookingId);

    // If bookingId matches an existing Firestore doc, record email delivery status
    if (body.bookingId) {
      try {
        const docRef = admin.firestore().collection('booking_requests').doc(body.bookingId);
        const snap = await docRef.get();
        if (snap.exists) {
          await docRef.update({
            emailSent: true,
            emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
            emailStatus: result.success ? 'delivered' : 'partial_failure',
          });
        }
      } catch (docErr) {
        console.warn('Could not update Firestore document status:', docErr);
      }
    }

    res.status(200).json({
      success: result.success,
      adminSent: result.adminSent,
      customerSent: result.customerSent,
      recipients: result.recipients,
    });
  } catch (err: any) {
    console.error('Error in sendEnquiryEmailHttp:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch emails',
    });
  }
});

/**
 * 4. HTTPS ENDPOINT: sendCustomEmailHttp
 * Allows Admin Dashboard to dispatch custom reply messages safely through Cloud Functions.
 */
export const sendCustomEmailHttp = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const { to, subject, message, customerName, bookingId } = req.body || {};

    if (!to || !to.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid recipient email is required.' });
      return;
    }
    if (!subject || !subject.trim()) {
      res.status(400).json({ success: false, error: 'Subject is required.' });
      return;
    }
    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: 'Message content is required.' });
      return;
    }

    const result = await sendCustomEmailDirect(to, subject, message, customerName, bookingId);
    res.status(200).json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error('Error in sendCustomEmailHttp:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch email' });
  }
});

/**
 * 5. HTTPS ENDPOINT: sendTestEmailHttp
 * Allows Admin Dashboard to test SMTP configuration from Google Cloud runtime.
 */
export const sendTestEmailHttp = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const { smtp, testRecipient } = req.body || {};
    if (!testRecipient || !testRecipient.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid test recipient email is required.' });
      return;
    }

    const config = await getEmailConfig();
    const activeSmtp = smtp || config.smtp;

    if (!activeSmtp.user || !activeSmtp.pass) {
      res.status(400).json({ success: false, error: 'SMTP credentials missing.' });
      return;
    }

    const transporter = createTransporter(activeSmtp);
    const fromEmail = activeSmtp.fromEmail || activeSmtp.user;
    const fromName = activeSmtp.fromName || 'SriLalitha Events & Catering';

    const testHtml = `
      <div style="font-family:sans-serif; padding:20px; border:1px solid #E5E7EB; border-radius:12px; max-width:500px;">
        <h2 style="color:#059669; margin:0 0 10px 0;">✓ Email Test Succeeded!</h2>
        <p style="color:#4B5563; font-size:14px;">This test was sent via <strong>Firebase Cloud Functions</strong>.</p>
        <div style="background:#F9FAFB; padding:10px; border-radius:6px; font-size:12px; color:#6B7280;">
          <div>Host: ${activeSmtp.host}</div>
          <div>Port: ${activeSmtp.port}</div>
          <div>From: ${fromEmail}</div>
          <div>To: ${testRecipient}</div>
          <div>Time: ${new Date().toLocaleString()}</div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: testRecipient.trim(),
      subject: '✅ SriLalitha Events: Firebase Cloud Functions Email Test Succeeded',
      html: testHtml,
    });

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${testRecipient}!`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('Error in sendTestEmailHttp:', err);
    res.status(500).json({ success: false, error: err?.message || 'SMTP Connection Error' });
  }
});
