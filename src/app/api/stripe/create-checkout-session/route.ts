import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      packageName,
      guests,
      eventDate,
      eventTime,
      location,
      deliveryCharge,
      selectedMenuDishes,
      totalAmount,
      paymentType, // 'deposit' | 'full'
      amountToPay,
      origin,
    } = body;

    if (!amountToPay || amountToPay <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const stripe = await getServerStripe();

    const siteOrigin =
      origin ||
      req.headers.get('origin') ||
      req.headers.get('referer') ||
      'https://vegchennaisrilalitha.events';

    // Format selected dishes summary for metadata
    const dishesSummary = selectedMenuDishes
      ? Object.entries(selectedMenuDishes)
          .filter(([_, items]) => Array.isArray(items) && items.length > 0)
          .map(([category, items]: [string, any]) => {
            const listStr = items.map((i: any) => (typeof i === 'string' ? i : i?.name || '')).filter(Boolean).join(', ');
            return `${category}: ${listStr}`;
          })
          .join(' | ')
          .slice(0, 450)
      : '';

    // Only include images array if publicly accessible https URL is available
    const hasValidHttpsOrigin = siteOrigin && siteOrigin.startsWith('https://');
    const imageList = hasValidHttpsOrigin ? [`${siteOrigin}/assets/images/srilalitha.png`] : undefined;

    const formattedCustomerEmail = customerEmail && customerEmail.includes('@') ? customerEmail.trim() : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: formattedCustomerEmail,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `SriLalitha Catering - ${packageName || 'Custom Event Package'}`,
              description: `${paymentType === 'deposit' ? '30% Booking Deposit' : 'Full Payment'} for ${guests || 0} Guests on ${eventDate || 'Date TBD'}${location ? ` (${location})` : ''}`,
              ...(imageList ? { images: imageList } : {}),
            },
            unit_amount: Math.round(Number(amountToPay) * 100), // In Pence
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: String(orderId || `ORD_${Date.now()}`),
        customerName: String(customerName || ''),
        customerPhone: String(customerPhone || ''),
        customerEmail: String(customerEmail || ''),
        packageName: String(packageName || ''),
        guests: String(guests || '0'),
        eventDate: String(eventDate || ''),
        eventTime: String(eventTime || ''),
        location: String(location || ''),
        paymentType: String(paymentType || 'full'),
        totalAmount: String(totalAmount || amountToPay),
        amountPaid: String(amountToPay),
        deliveryCharge: String(deliveryCharge || '0'),
        dishesSummary,
      },
      success_url: `${siteOrigin}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(orderId || '')}`,
      cancel_url: `${siteOrigin}/?payment_cancelled=true#book`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating Stripe Checkout session:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize Stripe checkout session' },
      { status: 500 }
    );
  }
}
