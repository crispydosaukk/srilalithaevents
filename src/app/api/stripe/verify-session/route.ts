import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ensureServerAuth } from '@/lib/firebaseServer';
import nodemailer from 'nodemailer';
import {
  DEFAULT_EMAIL_NOTIFICATION_CONFIG,
  EmailNotificationConfig,
  sanitizeEmailNotificationConfig,
} from '@/app/data/emailNotificationConfig';

/** Send a branded confirmation email to the customer after successful Stripe payment */
async function sendPaymentConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  orderId: string;
  packageName: string;
  guests: string | number;
  eventDate: string;
  eventTime: string;
  location: string;
  amountPaid: number;
  totalAmount: number;
  paymentType: string;
  depositPercentage: string;
}) {
  try {
    // Fetch SMTP settings from Firestore
    let emailConfig: EmailNotificationConfig = { ...DEFAULT_EMAIL_NOTIFICATION_CONFIG };
    try {
      const snap = await getDoc(doc(db, 'site_data', 'email_settings'));
      if (snap.exists()) {
        emailConfig = sanitizeEmailNotificationConfig(snap.data());
      }
    } catch (e) {
      console.warn('Could not read email_settings from Firestore:', e);
    }

    const smtp = emailConfig.smtp;
    if (!smtp || !smtp.user || !smtp.pass) {
      console.warn('SMTP credentials not configured — skipping payment confirmation email.');
      return;
    }

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

    const sender = `"${smtp.fromName || 'SriLalitha Events & Catering'}" <${smtp.fromEmail || smtp.user}>`;
    const isDeposit = params.paymentType === 'deposit';
    const remainingBalance = Math.max(0, params.totalAmount - params.amountPaid);

    const ref = params.orderId.slice(-8).toUpperCase();
    const invoiceNumber = `INV-SL-${ref}`;
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice &amp; Payment Receipt #${invoiceNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1320; margin: 0; padding: 24px 8px; color: #1F2937;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 35px rgba(0,0,0,0.35); border: 1px solid #1E293B;">

    <!-- Header with Brand Logo -->
    <div style="background: linear-gradient(135deg, #0B1320 0%, #172554 100%); padding: 28px 20px 22px 20px; text-align: center; border-bottom: 3px solid #C8860A;">
      <a href="https://vegchennaisrilalitha.events" target="_blank" style="text-decoration: none; display: inline-block;">
        <img src="https://vegchennaisrilalitha.events/assets/images/srilalitha.png" alt="SriLalitha Events &amp; Catering" width="220" style="max-width: 220px; width: 100%; height: auto; display: block; margin: 0 auto 12px auto;" border="0" />
      </a>
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">TAX INVOICE &amp; PAYMENT RECEIPT</h1>
      <div style="margin-top: 8px;">
        <span style="display: inline-block; background: #1E293B; border: 1px solid #334155; border-radius: 6px; padding: 3px 12px; font-size: 11px; color: #F59E0B; font-family: monospace; font-weight: 700;">
          INVOICE: ${invoiceNumber}
        </span>
      </div>
    </div>

    <!-- Success Verified Payment Banner -->
    <div style="background: #ECFDF5; border-bottom: 2px solid #10B981; padding: 16px 24px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 4px;">✅</div>
      <h2 style="color: #065F46; font-size: 17px; font-weight: 800; margin: 0;">Payment Verified &amp; Confirmed</h2>
      <p style="color: #047857; font-size: 13px; margin: 4px 0 0 0;">Your ${isDeposit ? 'deposit' : 'full payment'} of <strong>£${params.amountPaid.toFixed(2)}</strong> has been successfully processed.</p>
    </div>

    <!-- Billing Info & Invoice Details -->
    <div style="padding: 24px 22px; font-size: 14px; line-height: 1.6; color: #374151;">
      
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
        <tr>
          <td width="50%" style="vertical-align: top; padding-right: 8px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">BILLED TO:</div>
            <div style="font-size: 14px; font-weight: 800; color: #0F172A;">${params.customerName}</div>
            <div style="font-size: 12px; color: #2563EB;">${params.customerEmail}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">📍 ${params.location || 'London'}</div>
          </td>
          <td width="50%" style="vertical-align: top; padding-left: 8px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748B; margin-bottom: 3px;">INVOICE INFO:</div>
            <div style="font-size: 12px; color: #0F172A;"><strong>Invoice No:</strong> ${invoiceNumber}</div>
            <div style="font-size: 12px; color: #0F172A; margin-top: 2px;"><strong>Issue Date:</strong> ${todayStr}</div>
            <div style="font-size: 12px; color: #0F172A; margin-top: 2px;"><strong>Event Date:</strong> 📅 ${params.eventDate}${params.eventTime ? ` (${params.eventTime})` : ''}</div>
          </td>
        </tr>
      </table>

      <!-- Itemized Table -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 16px;">
        <tr style="background: #F1F5F9;">
          <th align="left" style="padding: 10px 12px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Description</th>
          <th align="center" style="padding: 10px 8px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Guests</th>
          <th align="right" style="padding: 10px 12px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Amount</th>
        </tr>
        <tr>
          <td style="padding: 12px; font-size: 13px; color: #0F172A;">
            <strong>${params.packageName}</strong>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Pure vegetarian catering service</div>
          </td>
          <td align="center" style="padding: 12px 8px; font-size: 13px; color: #0F172A;">${params.guests}</td>
          <td align="right" style="padding: 12px; font-size: 13px; font-weight: 700; color: #0F172A;">£${params.totalAmount.toFixed(2)}</td>
        </tr>
      </table>

      <!-- Payment Summary -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748B;">Total Event Cost:</span>
          <strong style="color: #0F172A; font-size: 15px;">£${params.totalAmount.toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #059669;">
          <span style="font-weight: 700;">${isDeposit ? `Deposit Received (${params.depositPercentage}%):` : 'Full Payment Received:'}</span>
          <strong style="font-size: 16px; font-weight: 800;">£${params.amountPaid.toFixed(2)} ✓</strong>
        </div>
        ${remainingBalance > 0 ? `
        <div style="border-top: 1px dashed #CBD5E1; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; color: #92400E;">
          <span style="font-weight: 700;">Remaining Balance Due:</span>
          <strong style="font-size: 15px; font-weight: 800;">£${remainingBalance.toFixed(2)}</strong>
        </div>` : `
        <div style="border-top: 1px dashed #CBD5E1; padding-top: 6px; margin-top: 6px; text-align: center; color: #059669; font-weight: 700; font-size: 12px;">
          🎉 Fully Paid — No Further Balance Outstanding
        </div>`}
      </div>

      ${remainingBalance > 0 ? `
      <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #92400E; line-height: 1.5;">
        ⚠️ The remaining balance of <strong>£${remainingBalance.toFixed(2)}</strong> is due 14 days before your event date. Our team will contact you to arrange final payment.
      </div>` : ''}

      <!-- WhatsApp Button -->
      <div style="text-align: center; margin: 20px 0 14px 0;">
        <a href="https://wa.me/447700900000?text=${encodeURIComponent(`Hi SriLalitha Events, I completed payment for Invoice ${invoiceNumber}. Looking forward to confirming my final menu!`)}" target="_blank" style="display: inline-block; background-color: #16A34A; color: #FFFFFF; font-size: 13px; font-weight: 800; padding: 11px 22px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 6px rgba(22,163,74,0.25);">
          💬 Message Event Coordinator on WhatsApp
        </a>
      </div>

      <!-- Footer Contact -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 12px; color: #6B7280; line-height: 1.6;">
        <p style="margin: 0; font-weight: 700; color: #111827;">SriLalitha Events &amp; Catering Team</p>
        <p style="margin: 2px 0;">📞 Phone / WhatsApp: <a href="tel:+447700900000" style="color: #C8860A; text-decoration: none;">+44 7700 900000</a></p>
        <p style="margin: 2px 0;">✉️ Email: <a href="mailto:admin@vegchennaisrilalitha.co.uk" style="color: #C8860A; text-decoration: none;">admin@vegchennaisrilalitha.co.uk</a></p>
        <p style="margin: 2px 0;">🌐 Website: <a href="https://vegchennaisrilalitha.events" style="color: #C8860A; text-decoration: none;">vegchennaisrilalitha.events</a></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #F3F4F6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0;">This is an official payment confirmation &amp; invoice generated for your booking with SriLalitha Events &amp; Catering.</p>
    </div>
  </div>
</body>
</html>`;

    // 1. Prepare Admin recipients
    const adminRecipients = (emailConfig.recipients || []).filter(
      (r) => r.enabled && r.email && r.email.includes('@')
    );

    if (adminRecipients.length === 0) {
      // Fallback to SMTP sender if no recipients configured
      const fallbackEmail = smtp.fromEmail || smtp.user || 'admin@vegchennaisrilalitha.co.uk';
      adminRecipients.push({ id: 'fallback', email: fallbackEmail, name: 'Admin', enabled: true });
    }

    const tasks: Promise<any>[] = [];

    // Send to customer if valid email provided
    if (params.customerEmail && params.customerEmail.includes('@')) {
      tasks.push(
        transporter.sendMail({
          from: sender,
          to: params.customerEmail.trim(),
          subject: `✅ Payment Confirmed – SriLalitha Catering Booking #${params.orderId.slice(-8).toUpperCase()}`,
          html: htmlContent,
          replyTo: smtp.fromEmail || smtp.user,
        })
      );
    }

    // Send individual email to each active admin recipient
    adminRecipients.forEach((recipient) => {
      tasks.push(
        transporter.sendMail({
          from: sender,
          to: recipient.email.trim(),
          subject: `🔔 New Online Payment Received – ${params.customerName} | £${params.amountPaid.toFixed(2)} | Order #${params.orderId.slice(-8).toUpperCase()}`,
          html: htmlContent.replace(
            `Dear ${params.customerName},`,
            `<div style="background:#FEF3C7; border:1px solid #F59E0B; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#92400E;"><strong>Admin Notification:</strong> Dispatched to <em>${recipient.name} (${recipient.email})</em>. Customer <strong>${params.customerName}</strong> (${params.customerEmail || 'No email provided'}) has completed online payment.</div>Dear ${params.customerName},`
          ),
          replyTo: params.customerEmail && params.customerEmail.includes('@') ? params.customerEmail.trim() : undefined,
        })
      );
    });

    const results = await Promise.allSettled(tasks);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      failed.forEach((f: any) => console.error('Failed to send a payment email task:', f.reason));
    }
    console.log(`✅ Payment emails dispatched (${succeeded}/${tasks.length} succeeded). Admin recipients: ${adminRecipients.map(r => r.email).join(', ')}`);
  } catch (emailErr) {
    // Non-fatal — log but don’t fail the verification response
    console.error('Failed to send payment confirmation email:', emailErr);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const stripe = await getServerStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid = session.payment_status === 'paid';
    const metadata = session.metadata || {};
    const orderId = metadata.orderId;

    if (isPaid && orderId) {
      // 1. Authenticate server session to satisfy Firestore update security rules
      await ensureServerAuth();

      const isDeposit = metadata.paymentType === 'deposit';
      const amountPaid = Number(metadata.amountPaid || (session.amount_total ? session.amount_total / 100 : 0));
      const totalAmount = Number(metadata.totalAmount || amountPaid);

      const updateData: any = {
        stripeSessionId: session.id,
        stripePaymentIntentId: String(session.payment_intent || ''),
        stripeCustomerEmail: session.customer_details?.email || metadata.customerEmail || '',
        depositPaid: true,
        status: 'deposit_confirmed',
        paymentMethodDeposit: 'Paid via Stripe Checkout (Online)',
        deposit: isDeposit ? amountPaid : totalAmount,
        amountPaidSoFar: amountPaid,
        finalPaymentPaid: !isDeposit,
        paymentProofDeposit: 'stripe_verified_payment',
        isOnlineOrder: true,
        updatedAt: new Date().toISOString(),
      };

      let wasAlreadyPaid = false;
      let existingOrderData: any = null;

      try {
        const orderRef = doc(db, 'booking_requests', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          existingOrderData = orderSnap.data();
          wasAlreadyPaid = existingOrderData?.depositPaid === true;
          await updateDoc(orderRef, updateData);
        } else {
          const customerEmail = metadata.customerEmail || session.customer_details?.email || '';
          await setDoc(orderRef, {
            id: orderId,
            name: metadata.customerName || 'Customer',
            email: customerEmail,
            phone: metadata.customerPhone || '',
            packageName: metadata.packageName || 'Custom Package',
            guests: Number(metadata.guests || 0),
            date: metadata.eventDate || '',
            timeOfDay: metadata.eventTime || '',
            location: metadata.location || '',
            totalEstimatedAmount: totalAmount,
            baseAmount: totalAmount,
            ...updateData,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (dbErr) {
        console.error('Error updating order status in Firestore:', dbErr);
      }

      // 2. ALWAYS dispatch payment confirmation email (runs independently of DB update status)
      if (!wasAlreadyPaid) {
        const customerEmail = session.customer_details?.email || metadata.customerEmail || existingOrderData?.email || '';
        try {
          await sendPaymentConfirmationEmail({
            customerEmail,
            customerName: metadata.customerName || existingOrderData?.name || 'Valued Customer',
            orderId,
            packageName: metadata.packageName || existingOrderData?.packageName || 'Catering Package',
            guests: metadata.guests || existingOrderData?.guests || 0,
            eventDate: metadata.eventDate || existingOrderData?.date || '',
            eventTime: metadata.eventTime || existingOrderData?.timeOfDay || '',
            location: metadata.location || existingOrderData?.location || '',
            amountPaid,
            totalAmount,
            paymentType: metadata.paymentType || 'deposit',
            depositPercentage: metadata.depositPercentage || '30',
          });
        } catch (emailDispatchErr) {
          console.error('Error in sendPaymentConfirmationEmail:', emailDispatchErr);
        }
      }
    }

    return NextResponse.json({
      paid: isPaid,
      customerEmail: session.customer_details?.email || metadata.customerEmail,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase() || 'GBP',
      metadata,
      paymentIntent: session.payment_intent,
      paymentStatus: session.payment_status,
    });
  } catch (error: any) {
    console.error('Error verifying Stripe session:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment session' },
      { status: 500 }
    );
  }
}
