import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
          status: isDeposit ? 'deposit_confirmed' : 'deposit_confirmed',
          paymentMethodDeposit: 'Paid via Stripe Checkout (Online)',
          deposit: isDeposit ? amountPaid : totalAmount,
          amountPaidSoFar: amountPaid,
          finalPaymentPaid: !isDeposit,
          paymentProofDeposit: 'stripe_verified_payment',
          isOnlineOrder: true,
          updatedAt: new Date().toISOString(),
        };

        if (orderSnap.exists()) {
          await updateDoc(orderRef, updateData);
        } else {
          // If not created yet, create it
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
