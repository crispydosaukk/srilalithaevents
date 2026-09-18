import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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

    const port = Number(smtp.port) || 587;
    const isSecure = port === 465 ? true : Boolean(smtp.secure);

    const transporter = nodemailer.createTransport({
      host: smtp.host || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: { user: smtp.user, pass: smtp.pass },
      tls: { rejectUnauthorized: false },
    });

    const sender = `"${smtp.fromName || 'SriLalitha Events & Catering'}" <${smtp.fromEmail || smtp.user}>`;
    const isDeposit = params.paymentType === 'deposit';
    const remainingBalance = Math.max(0, params.totalAmount - params.amountPaid);

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation – SriLalitha Events & Catering</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 24px; color: #1F2937;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #111827 0%, #1F2937 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #C8860A;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">SriLalitha Events &amp; Catering</h1>
      <p style="color: #F59E0B; font-size: 12px; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">London's Premier Pure Vegetarian Catering</p>
      <div style="margin-top: 10px; display: inline-block; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; padding: 3px 12px; font-size: 11px; color: #D1D5DB; font-family: monospace;">
        Booking Reference: #${params.orderId.slice(-8).toUpperCase()}
      </div>
    </div>

    <!-- Success Banner -->
    <div style="background: #ECFDF5; border-bottom: 2px solid #10B981; padding: 16px 24px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 6px;">✅</div>
      <h2 style="color: #065F46; font-size: 18px; font-weight: 800; margin: 0;">Payment Received!</h2>
      <p style="color: #047857; font-size: 13px; margin: 4px 0 0 0;">Your ${isDeposit ? 'deposit' : 'full payment'} of <strong>£${params.amountPaid.toFixed(2)}</strong> has been successfully processed via Stripe.</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px; font-size: 14px; line-height: 1.7; color: #374151;">
      <p style="font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 20px 0;">Dear ${params.customerName},</p>
      <p style="margin: 0 0 20px 0;">Thank you for booking with SriLalitha Events &amp; Catering! We're thrilled to be part of your special event. Below is a summary of your booking:</p>

      <!-- Booking Summary -->
      <div style="background: #FDFBF7; border: 1px solid #E5E7EB; border-left: 4px solid #C8860A; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #92400E; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">📋 Booking Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="padding: 8px 0; color: #6B7280; font-weight: 600; width: 45%;">Package</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700;">${params.packageName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Number of Guests</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700;">${params.guests}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F3F4F6;">
            <td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Event Date</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700;">${params.eventDate || 'To be confirmed'}${params.eventTime ? ` at ${params.eventTime}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Venue</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700;">${params.location || 'To be confirmed'}</td>
          </tr>
        </table>
      </div>

      <!-- Payment Summary -->
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #065F46; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">💳 Payment Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #D1FAE5;">
            <td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Total Event Cost</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 700;">£${params.totalAmount.toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #D1FAE5;">
            <td style="padding: 8px 0; color: #065F46; font-weight: 700;">${isDeposit ? `Deposit Paid (${params.depositPercentage}%)` : 'Full Payment'}</td>
            <td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 15px;">£${params.amountPaid.toFixed(2)} ✓</td>
          </tr>
          ${remainingBalance > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #B45309; font-weight: 600;">Remaining Balance Due</td>
            <td style="padding: 8px 0; color: #92400E; font-weight: 700;">£${remainingBalance.toFixed(2)}</td>
          </tr>` : ''}
        </table>
        ${remainingBalance > 0 ? `<p style="font-size: 11px; color: #6B7280; margin: 10px 0 0 0;">⚠️ The remaining balance of <strong>£${remainingBalance.toFixed(2)}</strong> is due 14 days before your event date. We will contact you to arrange payment.</p>` : '<p style="font-size: 12px; color: #059669; font-weight: 600; margin: 10px 0 0 0;">🎉 Your event is fully paid — no further payment required!</p>'}
      </div>

      <p style="color: #374151; font-size: 13px;">Our team will be in touch shortly to confirm all the final details. If you have any questions, feel free to reply to this email or WhatsApp us directly.</p>

      <!-- Footer Contact -->
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">
        <p style="margin: 0; font-weight: 700; color: #111827;">SriLalitha Events &amp; Catering Team</p>
        <p style="margin: 2px 0;">📞 Phone / WhatsApp: <a href="tel:+447700900000" style="color: #C8860A; text-decoration: none;">+44 7700 900000</a></p>
        <p style="margin: 2px 0;">✉️ Email: <a href="mailto:admin@vegchennaisrilalitha.co.uk" style="color: #C8860A; text-decoration: none;">admin@vegchennaisrilalitha.co.uk</a></p>
        <p style="margin: 2px 0;">🌐 Website: <a href="https://vegchennaisrilalitha.events" style="color: #C8860A; text-decoration: none;">vegchennaisrilalitha.events</a></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #F3F4F6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0;">This is an automated payment confirmation for your booking with SriLalitha Events &amp; Catering.</p>
    </div>
  </div>
</body>
</html>`;

    // Send to customer
    await transporter.sendMail({
      from: sender,
      to: params.customerEmail.trim(),
      subject: `✅ Payment Confirmed – SriLalitha Catering Booking #${params.orderId.slice(-8).toUpperCase()}`,
      html: htmlContent,
      replyTo: smtp.fromEmail || smtp.user,
    });

    // Also notify admin (BCC or separate send)
    const adminEmail = smtp.fromEmail || smtp.user;
    if (adminEmail && adminEmail !== params.customerEmail) {
      await transporter.sendMail({
        from: sender,
        to: adminEmail,
        subject: `🔔 New Online Payment Received – ${params.customerName} | £${params.amountPaid.toFixed(2)} | Order #${params.orderId.slice(-8).toUpperCase()}`,
        html: htmlContent.replace(
          `Dear ${params.customerName},`,
          `[ADMIN COPY] Customer ${params.customerName} (${params.customerEmail}) has completed payment.`
        ),
        replyTo: params.customerEmail,
      });
    }

    console.log(`✅ Payment confirmation email sent to ${params.customerEmail}`);
  } catch (emailErr) {
    // Non-fatal — log but don't fail the verification response
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
      try {
        const orderRef = doc(db, 'booking_requests', orderId);
        const orderSnap = await getDoc(orderRef);

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

        if (orderSnap.exists()) {
          // Only send the email once — if it's not already marked paid
          const wasAlreadyPaid = orderSnap.data()?.depositPaid === true;
          await updateDoc(orderRef, updateData);

          if (!wasAlreadyPaid) {
            // Send confirmation email to customer
            const customerEmail = session.customer_details?.email || metadata.customerEmail || '';
            if (customerEmail && customerEmail.includes('@')) {
              await sendPaymentConfirmationEmail({
                customerEmail,
                customerName: metadata.customerName || orderSnap.data()?.name || 'Valued Customer',
                orderId,
                packageName: metadata.packageName || orderSnap.data()?.packageName || 'Catering Package',
                guests: metadata.guests || orderSnap.data()?.guests || 0,
                eventDate: metadata.eventDate || orderSnap.data()?.date || '',
                eventTime: metadata.eventTime || orderSnap.data()?.timeOfDay || '',
                location: metadata.location || orderSnap.data()?.location || '',
                amountPaid,
                totalAmount,
                paymentType: metadata.paymentType || 'deposit',
                depositPercentage: metadata.depositPercentage || '30',
              });
            }
          }
        } else {
          // Order not in Firestore yet — create it and send email
          await setDoc(orderRef, {
            id: orderId,
            name: metadata.customerName || 'Customer',
            email: metadata.customerEmail || session.customer_details?.email || '',
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

          const customerEmail = session.customer_details?.email || metadata.customerEmail || '';
          if (customerEmail && customerEmail.includes('@')) {
            await sendPaymentConfirmationEmail({
              customerEmail,
              customerName: metadata.customerName || 'Valued Customer',
              orderId,
              packageName: metadata.packageName || 'Custom Package',
              guests: metadata.guests || 0,
              eventDate: metadata.eventDate || '',
              eventTime: metadata.eventTime || '',
              location: metadata.location || '',
              amountPaid,
              totalAmount,
              paymentType: metadata.paymentType || 'deposit',
              depositPercentage: metadata.depositPercentage || '30',
            });
          }
        }
      } catch (dbErr) {
        console.error('Error updating order status in Firestore:', dbErr);
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
