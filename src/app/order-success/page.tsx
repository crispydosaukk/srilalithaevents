'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/AppIcon';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [orderDoc, setOrderDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (res.ok && data.paid) {
          setSessionData(data);

          // Fetch full order record from Firestore
          const targetId = orderId || data.metadata?.orderId;
          if (targetId) {
            const snap = await getDoc(doc(db, 'booking_requests', targetId));
            if (snap.exists()) {
              setOrderDoc({ id: snap.id, ...snap.data() });
            }
          }
        } else {
          setError(data.error || 'Payment verification could not be completed.');
        }
      } catch (err: any) {
        console.error('Error verifying payment:', err);
        setError(err.message || 'An error occurred while verifying your payment.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [sessionId, orderId]);

  const handlePrint = () => {
    window.print();
  };

  const metadata = sessionData?.metadata || {};
  const customerName = orderDoc?.name || metadata.customerName || 'Valued Customer';
  const customerEmail = orderDoc?.email || sessionData?.customerEmail || metadata.customerEmail || '';
  const customerPhone = orderDoc?.phone || metadata.customerPhone || '';
  const eventDate = orderDoc?.date || metadata.eventDate || 'Date TBD';
  const eventTime = orderDoc?.timeOfDay || metadata.eventTime || 'Time TBD';
  const guests = orderDoc?.guests || metadata.guests || 0;
  const packageName = orderDoc?.packageName || orderDoc?.package || metadata.packageName || 'Catering Package';
  const location = orderDoc?.location || metadata.location || 'Venue Location TBD';
  const distanceMiles = orderDoc?.distanceMiles || metadata.distanceMiles || 0;
  const deliveryCharge = Number(orderDoc?.deliveryCharge || metadata.deliveryCharge || 0);
  const totalAmount = Number(orderDoc?.totalEstimatedAmount || orderDoc?.baseAmount || metadata.totalAmount || 0);
  const amountPaid = Number(orderDoc?.deposit || orderDoc?.amountPaidSoFar || metadata.amountPaid || sessionData?.amountTotal || 0);
  const remainingBalance = Math.max(0, totalAmount - amountPaid);
  const selectedDishes = orderDoc?.selectedMenuDishes || {};

  const buildWhatsAppShare = () => {
    const text = `Hi SriLalitha, I have just completed my online booking payment for Order #${orderDoc?.id || orderId || 'N/A'}.\n\n` +
      `👤 Name: ${customerName}\n` +
      `📅 Event Date: ${eventDate} (${eventTime})\n` +
      `📦 Package: ${packageName} (${guests} Guests)\n` +
      `💳 Amount Paid: £${amountPaid.toFixed(2)}\n` +
      `📍 Location: ${location}\n\n` +
      `Looking forward to confirming all details with you! 🙏`;
    return `https://wa.me/447700900000?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C8860A] border-t-transparent mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Your Secure Payment...</h2>
        <p className="text-xs text-gray-500 mt-1">Please wait while we confirm your Stripe transaction.</p>
      </div>
    );
  }

  if (error || (!sessionData && !sessionId)) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-between">
        <Header />
        <div className="max-w-md mx-auto my-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-200 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="ExclamationTriangleIcon" size={28} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Verification Notice</h2>
          <p className="text-xs text-gray-600 mb-5">{error || 'Session ID is missing or invalid.'}</p>
          <Link
            href="/home"
            className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
            style={{ background: '#C8860A' }}
          >
            Return to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between">
      <Header />

      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        {/* Success Alert Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Icon name="CheckBadgeIcon" size={36} className="text-white" />
            </div>
            <div>
              <span className="inline-block text-[11px] uppercase font-bold tracking-widest px-3 py-0.5 rounded-full bg-white/20 mb-1">
                Stripe Verified Payment ✓
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Order &amp; Booking Confirmed!
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                Thank you, {customerName}. Your event order and deposit have been successfully received.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs shadow-md hover:bg-emerald-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="PrinterIcon" size={15} />
              Print Receipt
            </button>
            <a
              href={buildWhatsAppShare()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
            >
              <Icon name="ChatBubbleLeftRightIcon" size={15} />
              WhatsApp
            </a>
          </div>
        </div>

        {/* Official Printable Invoice Card */}
        <div id="printable-invoice" className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-10 space-y-8">
          {/* Header of Invoice */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b border-gray-100 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/images/srilalitha.png"
                  alt="SriLalitha Logo"
                  width={140}
                  height={48}
                  className="object-contain h-10 w-auto"
                />
              </div>
              <p className="text-xs text-gray-500 font-medium">Authentic Indian &amp; Sri Lankan Banquet Catering</p>
              <p className="text-[11px] text-gray-400">Website: vegchennaisrilalitha.events • Tel: +44 7700 900000</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block mb-1">
                PAID VIA STRIPE
              </span>
              <div className="text-sm font-mono font-bold text-gray-900">
                Order Ref: #{orderDoc?.id || orderId || metadata.orderId || 'SL-ORD'}
              </div>
              <div className="text-xs text-gray-400">
                Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {sessionData?.paymentIntent && (
                <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs">
                  Stripe ID: {sessionData.paymentIntent}
                </div>
              )}
            </div>
          </div>

          {/* Customer & Event Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-amber-50/40 p-5 rounded-2xl border border-amber-200/70 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Customer Details</span>
              <div className="font-bold text-gray-900 text-sm">{customerName}</div>
              <div className="text-gray-600 mt-0.5">{customerEmail}</div>
              <div className="text-gray-600">{customerPhone}</div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Event Schedule</span>
              <div className="font-bold text-gray-900 text-sm">📅 {eventDate}</div>
              <div className="text-gray-700 font-semibold mt-0.5">⏰ {eventTime}</div>
              <div className="text-amber-800 font-medium">👥 {guests} Confirmed Guests</div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Event Location / Venue</span>
              <div className="font-bold text-gray-900 text-sm flex items-start gap-1">
                <span>📍</span>
                <span>{location}</span>
              </div>
              {distanceMiles > 0 && (
                <div className="text-gray-600 mt-1">
                  🚗 {distanceMiles} miles from restaurant ({deliveryCharge > 0 ? `+£${deliveryCharge.toFixed(2)} Delivery` : 'Free Delivery'})
                </div>
              )}
            </div>
          </div>

          {/* Chosen Menu Dishes Breakdown (if selected) */}
          {selectedDishes && Object.keys(selectedDishes).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                <Icon name="ClipboardDocumentCheckIcon" size={18} className="text-[#C8860A]" />
                Your Custom Selected Menu Dishes ({packageName})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {Object.entries(selectedDishes).map(([catKey, dishList]: [string, any]) => {
                  if (!Array.isArray(dishList) || dishList.length === 0) return null;
                  const catTitle = catKey
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());

                  return (
                    <div key={catKey} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs">
                      <span className="font-bold text-amber-950 uppercase tracking-wide block mb-1.5 text-[11px]">
                        • {catTitle} ({dishList.length})
                      </span>
                      <ul className="space-y-1 text-gray-700 font-medium pl-1">
                        {dishList.map((dish: any, dIdx: number) => {
                          const dishText = typeof dish === 'string'
                            ? dish
                            : dish?.name
                              ? `${dish.name}${dish.price ? ` (+£${dish.price}${dish.perPerson ? '/person' : ''})` : ''}`
                              : JSON.stringify(dish);
                          return (
                            <li key={dIdx} className="flex items-center gap-1.5">
                              <span className="text-[#C8860A] text-[10px]">✓</span>
                              <span>{dishText}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing & Invoice Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Financial Breakdown &amp; Payment Summary
            </h3>

            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">Item &amp; Description</th>
                    <th className="py-3 px-4 text-center">Guests / Qty</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {packageName} — Authentic Catering Service
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{guests}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      £{(totalAmount - deliveryCharge).toFixed(2)}
                    </td>
                  </tr>

                  {deliveryCharge > 0 && (
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        🚗 Travel &amp; Long-Distance Delivery Fee ({distanceMiles} miles)
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-500">1 Event</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        +£{deliveryCharge.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-amber-50/60 font-bold text-sm text-gray-900">
                    <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wide text-xs">
                      Grand Total:
                    </td>
                    <td className="py-3 px-4 text-right text-base text-[#C8860A]">
                      £{totalAmount.toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/70 text-emerald-950 font-bold text-xs">
                    <td colSpan={2} className="py-2.5 px-4 text-right">
                      💳 Amount Paid Online via Stripe:
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 text-sm">
                      -£{amountPaid.toFixed(2)} (PAID ✓)
                    </td>
                  </tr>

                  {remainingBalance > 0 && (
                    <tr className="bg-gray-50 text-amber-900 font-bold text-xs">
                      <td colSpan={2} className="py-2.5 px-4 text-right">
                        Remaining Balance (Due 14 days before event):
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-800 text-sm">
                        £{remainingBalance.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Next Steps & Support Note */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-xs text-gray-600 space-y-2">
            <div className="font-bold text-gray-900 flex items-center gap-1.5">
              <Icon name="InformationCircleIcon" size={16} className="text-[#C8860A]" />
              What Happens Next?
            </div>
            <p className="leading-relaxed">
              Our head catering coordinator will review your exact selected menu dishes and timing requirements. You will receive a confirmation call and WhatsApp summary from us. If you need any adjustments to guest count or dietary options, feel free to reply to our WhatsApp support anytime.
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <Link
              href="/home"
              className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
            >
              <Icon name="ArrowLeftIcon" size={14} />
              Return to Website
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Icon name="ArrowDownTrayIcon" size={14} />
                Download / Print
              </button>
              <Link
                href="/home#book"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
              >
                Book Another Event
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#C8860A] border-t-transparent" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
