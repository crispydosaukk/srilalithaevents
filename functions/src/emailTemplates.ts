/**
 * Premium Email HTML templates for SriLalitha Events & Catering
 * Includes brand logo, comprehensive booking/order breakdowns, and official tax invoices.
 */

export interface BookingEmailData {
  bookingId?: string;
  name?: string;
  email?: string;
  phone?: string;
  eventType?: string;
  location?: string;
  distanceMiles?: number;
  deliveryCharge?: number;
  totalEstimatedAmount?: number;
  baseAmount?: number;
  date?: string;
  time?: string;
  timeOfDay?: string;
  guests?: number | string;
  adults?: number | string;
  kids4to10?: number | string;
  kidsUnder4?: number | string;
  message?: string;
  notes?: string;
  package?: string;
  packageName?: string;
  selectedPackage?: string;
  deposit?: number;
  depositLabel?: string;
  depositPaid?: boolean;
  paymentChoice?: string;
  customFields?: Record<string, any>;
  isWaitlist?: boolean;
  isOnlineOrder?: boolean;
  selectedMenuDishes?: Record<string, any>;
  extraCharges?: any[];
}

export interface InvoiceEmailData {
  orderId: string;
  invoiceNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  packageName: string;
  guests: string | number;
  adults?: string | number;
  kids?: string | number;
  eventDate: string;
  eventTime: string;
  location: string;
  amountPaid: number;
  totalAmount: number;
  paymentType: string;
  depositPercentage?: string;
  paymentIntentId?: string;
  dishesSummary?: string;
  deliveryCharge?: number;
  upgrades?: string;
}

const LOGO_URL = 'https://vegchennaisrilalitha.events/assets/images/srilalitha.png';
const WEBSITE_URL = 'https://vegchennaisrilalitha.events';
const ADMIN_PORTAL_URL = 'https://vegchennaisrilalitha.events/admin';
const BRAND_PHONE = '+44 7700 900000';
const BRAND_EMAIL = 'admin@vegchennaisrilalitha.co.uk';

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDishesSummaryHtml(dishes: any): string {
  if (!dishes) return '';
  try {
    let obj = dishes;
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch {
        return escapeHtml(obj);
      }
    }
    if (Array.isArray(obj)) {
      const items = obj.map((i: any) => typeof i === 'string' ? i : i?.name || '').filter(Boolean);
      return items.length > 0 ? `<div style="margin-bottom: 4px;">${escapeHtml(items.join(', '))}</div>` : '';
    }
    if (typeof obj === 'object') {
      return Object.entries(obj)
        .filter(([_, items]) => items && (Array.isArray(items) ? items.length > 0 : true))
        .map(([cat, items]: [string, any]) => {
          if (Array.isArray(items)) {
            const itemNames = items.map((i: any) => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', ');
            return `<div style="margin-bottom: 6px;"><strong style="color: #92400E;">${escapeHtml(cat)}:</strong> <span style="color: #334155;">${escapeHtml(itemNames)}</span></div>`;
          } else {
            return `<div style="margin-bottom: 6px;"><strong style="color: #92400E;">${escapeHtml(cat)}:</strong> <span style="color: #334155;">${escapeHtml(String(items))}</span></div>`;
          }
        })
        .join('');
    }
  } catch (e) {
    console.warn('Error formatting dishes summary:', e);
  }
  return '';
}

/**
 * 1. ADMIN NOTIFICATION EMAIL (For both Online Orders and Booking Forms)
 */
export function generateAdminEnquiryHtml(data: BookingEmailData, bookingId?: string): string {
  const name = escapeHtml(data.name || 'Valued Customer');
  const email = escapeHtml(data.email || 'Not Provided');
  const phone = escapeHtml(data.phone || 'Not Provided');
  const cleanPhone = (data.phone || '').replace(/[^0-9+]/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}` : '';
  const ref = escapeHtml(bookingId || data.bookingId || 'SL-BOOKING');
  const eventType = escapeHtml(data.eventType || (data.isOnlineOrder ? 'Online Menu Order' : 'Catering Enquiry'));
  const pkg = escapeHtml(data.packageName || data.selectedPackage || data.package || 'Custom Catering Menu');
  const date = escapeHtml(data.date || 'To be confirmed');
  const time = escapeHtml(data.timeOfDay || data.time || 'Flexible');
  const guests = data.guests ? String(data.guests) : 'To be confirmed';
  const location = escapeHtml(data.location || 'To be confirmed');
  const total = Number(data.totalEstimatedAmount || data.baseAmount || 0);
  const deposit = Number(data.deposit || 0);
  const deliveryCharge = Number(data.deliveryCharge || 0);
  const isOnline = data.isOnlineOrder || false;

  // Dishes summary
  const dishesSummary = formatDishesSummaryHtml(data.selectedMenuDishes);

  const notes = escapeHtml(data.message || data.notes || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Enquiry #${ref}</title>
  <style type="text/css">
    body { margin:0 !important; padding:0 !important; background-color:#0B1320 !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .p-card { padding:14px !important; }
      .btn-cell { display:block !important; width:100% !important; padding:4px 0 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:20px 8px; background-color:#0B1320;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0B1320;">
    <tr>
      <td align="center">
        <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:620px; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #1E293B; box-shadow:0 10px 35px rgba(0,0,0,0.35);">
          
          <!-- Header Banner with Official Brand Logo -->
          <tr>
            <td style="background:linear-gradient(135deg, #0B1320 0%, #172554 100%); padding:28px 24px 22px 24px; text-align:center; border-bottom:3px solid #C8860A;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${WEBSITE_URL}" target="_blank" style="display:inline-block; text-decoration:none;">
                      <img src="${LOGO_URL}" alt="SriLalitha Events &amp; Catering" width="220" style="max-width:220px; width:100%; height:auto; display:block; margin:0 auto 12px auto;" border="0" />
                    </a>
                    <div>
                      <span style="display:inline-block; background:rgba(200,134,10,0.25); color:#F59E0B; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; padding:4px 14px; border-radius:9999px; border:1px solid rgba(245,158,11,0.4); margin-bottom:8px;">
                        ${isOnline ? '🛒 NEW ONLINE ORDER RECEIVED' : '✨ NEW BOOKING ENQUIRY'}
                      </span>
                    </div>
                    <div style="margin-top:6px;">
                      <span style="background:#1E293B; border:1px solid #334155; color:#E2E8F0; font-size:12px; font-family:monospace; font-weight:700; padding:4px 12px; border-radius:6px;">
                        REF: #${ref}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="p-card" style="padding:24px 22px; background-color:#FFFFFF;">

              <!-- Customer Contact Details Card -->
              <table width="100%" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; margin-bottom:18px; overflow:hidden;">
                <tr>
                  <td style="background:#F1F5F9; padding:10px 16px; font-size:12px; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #E2E8F0;">
                    👤 Customer Contact Details
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px; font-size:14px; line-height:1.6; color:#0F172A;">
                    <div style="margin-bottom:8px;">
                      <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B; display:block;">Full Name</span>
                      <strong style="font-size:15px; color:#0F172A;">${name}</strong>
                    </div>
                    <div style="margin-bottom:8px;">
                      <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B; display:block;">Phone / WhatsApp</span>
                      <a href="tel:${phone}" style="font-size:14px; font-weight:700; color:#0F172A; text-decoration:none;">📞 ${phone}</a>
                    </div>
                    <div style="margin-bottom:8px;">
                      <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B; display:block;">Email Address</span>
                      <a href="mailto:${email}" style="font-size:14px; font-weight:700; color:#2563EB; text-decoration:none;">✉️ ${email}</a>
                    </div>
                    <div>
                      <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#64748B; display:block;">Event Venue &amp; Distance</span>
                      <div style="font-size:14px; font-weight:600; color:#0F172A;">📍 ${location}</div>
                      ${data.distanceMiles ? `<span style="display:inline-block; margin-top:4px; background:#FEF3C7; color:#92400E; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; border:1px solid #FDE68A;">${data.distanceMiles} miles from Kitchen</span>` : ''}
                    </div>
                  </td>
                </tr>
                <!-- One-click Contact Actions Bar -->
                <tr>
                  <td style="background:#F1F5F9; padding:12px 16px; border-top:1px solid #E2E8F0;">
                    <table width="100%">
                      <tr>
                        ${whatsappLink ? `
                        <td class="btn-cell" width="50%" style="padding-right:6px;">
                          <a href="${whatsappLink}" target="_blank" style="display:block; background:#16A34A; color:#FFFFFF; text-align:center; font-size:12px; font-weight:800; padding:10px 14px; border-radius:8px; text-decoration:none; box-shadow:0 2px 4px rgba(22,163,74,0.2);">
                            💬 Chat WhatsApp
                          </a>
                        </td>` : ''}
                        <td class="btn-cell" width="${whatsappLink ? '50%' : '100%'}" style="padding-left:${whatsappLink ? '6px' : '0'};">
                          <a href="mailto:${email}?subject=Regarding%20Your%20SriLalitha%20Booking%20%23${ref}" style="display:block; background:#2563EB; color:#FFFFFF; text-align:center; font-size:12px; font-weight:800; padding:10px 14px; border-radius:8px; text-decoration:none; box-shadow:0 2px 4px rgba(37,99,235,0.2);">
                            ✉️ Reply Email
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Event & Catering Requirements -->
              <table width="100%" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; margin-bottom:18px; overflow:hidden;">
                <tr>
                  <td style="background:#F1F5F9; padding:10px 16px; font-size:12px; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #E2E8F0;">
                    📅 Event &amp; Catering Requirements
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px; font-size:14px; line-height:1.6; color:#0F172A;">
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                      <span style="background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px;">
                        Event: ${eventType}
                      </span>
                      <span style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px;">
                        📅 ${date}
                      </span>
                      <span style="background:#F1F5F9; color:#1E293B; border:1px solid #CBD5E1; font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px;">
                        ⏰ ${time}
                      </span>
                      <span style="background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px;">
                        👥 ${guests} Guests
                      </span>
                    </div>

                    <!-- Package Highlight -->
                    <div style="background:#FEF3C7; border:1px solid #FDE68A; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
                      <div style="font-size:11px; font-weight:800; color:#92400E; text-transform:uppercase;">Selected Package:</div>
                      <div style="font-size:15px; font-weight:800; color:#78350F; margin-top:2px;">${pkg}</div>
                    </div>

                    <!-- Categorized Dishes Breakdown -->
                    ${dishesSummary ? `
                    <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:12px 14px; margin-bottom:12px; font-size:13px; line-height:1.5;">
                      <div style="font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:8px; border-bottom:1px solid #F1F5F9; padding-bottom:4px;">🍽️ Selected Menu Dishes:</div>
                      ${dishesSummary}
                    </div>` : ''}

                    <!-- Financial Summary -->
                    ${(total > 0 || deposit > 0 || deliveryCharge > 0) ? `
                    <div style="background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:8px; padding:12px 14px; font-size:13px;">
                      ${total > 0 ? `
                      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="color:#64748B;">Estimated Total Value:</span>
                        <strong style="font-size:15px; color:#0F172A;">£${total.toFixed(2)}</strong>
                      </div>` : ''}
                      ${deposit > 0 ? `
                      <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#059669;">
                        <span>${data.depositPaid ? 'Deposit Paid Online:' : (data.depositLabel || 'Deposit Required:')}</span>
                        <strong>£${deposit.toFixed(2)}</strong>
                      </div>` : ''}
                      ${deliveryCharge > 0 ? `
                      <div style="display:flex; justify-content:space-between; color:#64748B;">
                        <span>Travel &amp; Delivery Logistics:</span>
                        <strong>£${deliveryCharge.toFixed(2)}</strong>
                      </div>` : ''}
                    </div>` : ''}

                  </td>
                </tr>
              </table>

              <!-- Customer Notes / Dietary Requests -->
              ${notes ? `
              <div style="background:#FFFBEB; border:1px solid #FEF3C7; border-radius:12px; padding:14px 16px; margin-bottom:18px;">
                <div style="font-size:11px; font-weight:800; color:#92400E; text-transform:uppercase; margin-bottom:4px;">📝 Customer Notes &amp; Special Requests</div>
                <div style="font-size:13px; color:#78350F; line-height:1.6; white-space:pre-wrap;">${notes}</div>
              </div>` : ''}

              <!-- Admin Dashboard Action Button -->
              <div style="text-align:center; margin:24px 0 10px 0;">
                <a href="${ADMIN_PORTAL_URL}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #C8860A 0%, #E69D24 100%); color:#FFFFFF; font-size:13px; font-weight:800; padding:12px 28px; border-radius:10px; text-decoration:none; box-shadow:0 4px 14px rgba(200,134,10,0.3); letter-spacing:0.3px;">
                  Open Admin Dashboard to Manage →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC; padding:18px; text-align:center; border-top:1px solid #E2E8F0; font-size:11px; color:#94A3B8; line-height:1.5;">
              <strong style="color:#0F172A; font-size:12px;">SriLalitha Events &amp; Catering London</strong><br />
              London, United Kingdom • <a href="${WEBSITE_URL}" style="color:#C8860A; text-decoration:none; font-weight:700;">vegchennaisrilalitha.events</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 2. CUSTOMER CONFIRMATION EMAIL (Professional layout with Brand Logo & Summary)
 */
export function generateCustomerConfirmationHtml(data: BookingEmailData, bookingId?: string): string {
  const name = escapeHtml(data.name || 'Valued Customer');
  const ref = escapeHtml(bookingId || data.bookingId || 'SL-BOOKING');
  const eventType = escapeHtml(data.eventType || (data.isOnlineOrder ? 'Online Menu Order' : 'Catering Enquiry'));
  const pkg = escapeHtml(data.packageName || data.selectedPackage || data.package || 'Custom Pure Vegetarian Catering');
  const date = escapeHtml(data.date || 'To be confirmed');
  const time = escapeHtml(data.timeOfDay || data.time || 'Flexible');
  const guests = data.guests ? String(data.guests) : 'To be confirmed';
  const location = escapeHtml(data.location || 'To be confirmed');
  const isOnline = data.isOnlineOrder || false;

  // Dishes summary
  const dishesSummary = formatDishesSummaryHtml(data.selectedMenuDishes);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - SriLalitha Events</title>
  <style type="text/css">
    body { margin:0 !important; padding:0 !important; background-color:#0B1320 !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .p-card { padding:16px 14px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:20px 8px; background-color:#0B1320;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0B1320;">
    <tr>
      <td align="center">
        <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #1E293B; box-shadow:0 10px 35px rgba(0,0,0,0.35);">
          
          <!-- Header Banner with Official Brand Logo -->
          <tr>
            <td style="background:linear-gradient(135deg, #0B1320 0%, #172554 100%); padding:28px 24px 22px 24px; text-align:center; border-bottom:3px solid #C8860A;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${WEBSITE_URL}" target="_blank" style="display:inline-block; text-decoration:none;">
                      <img src="${LOGO_URL}" alt="SriLalitha Events &amp; Catering" width="220" style="max-width:220px; width:100%; height:auto; display:block; margin:0 auto 12px auto;" border="0" />
                    </a>
                    <div>
                      <span style="display:inline-block; background:rgba(200,134,10,0.25); color:#F59E0B; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; padding:4px 14px; border-radius:9999px; border:1px solid rgba(245,158,11,0.4); margin-bottom:6px;">
                        ${isOnline ? 'ORDER CONFIRMATION' : 'CATERING REQUEST RECEIVED'}
                      </span>
                    </div>
                    <p style="color:#CBD5E1; font-size:12px; margin:4px 0 0 0;">
                      Authentic Pure Vegetarian South &amp; North Indian Catering • London
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="p-card" style="padding:28px 24px; background-color:#FFFFFF;">
              
              <h2 style="font-size:18px; font-weight:800; color:#0F172A; margin:0 0 10px 0;">
                Dear ${name},
              </h2>
              
              <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px 0;">
                Thank you for choosing <strong>SriLalitha Events &amp; Catering</strong>! We have successfully received your catering request. Our dedicated event coordinator and head chef are reviewing your requirements and will reach out to you within <strong>24 hours</strong> with tailored options.
              </p>

              <!-- Summary Card -->
              <table width="100%" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; margin-bottom:20px; overflow:hidden;">
                <tr>
                  <td style="background:#F1F5F9; padding:12px 16px; font-size:12px; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #E2E8F0;">
                    📋 Your Request Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px; font-size:13px; line-height:1.7; color:#0F172A;">
                    <div style="margin-bottom:6px;"><strong>Reference Number:</strong> <span style="font-family:monospace; font-weight:700; background:#E2E8F0; padding:2px 8px; border-radius:4px;">#${ref}</span></div>
                    <div style="margin-bottom:6px;"><strong>Event Type:</strong> ${eventType}</div>
                    <div style="margin-bottom:6px;"><strong>Requested Date:</strong> 📅 <strong style="color:#DC2626;">${date}</strong> (Serving at ${time})</div>
                    <div style="margin-bottom:6px;"><strong>Estimated Guests:</strong> 👥 ${guests}</div>
                    <div style="margin-bottom:6px;"><strong>Venue Location:</strong> 📍 ${location}</div>
                    <div style="margin-top:10px; background:#FEF3C7; border:1px solid #FDE68A; border-radius:8px; padding:10px 12px;">
                      <div style="font-size:11px; font-weight:800; color:#92400E; text-transform:uppercase;">Selected Package:</div>
                      <div style="font-size:14px; font-weight:800; color:#78350F; margin-top:2px;">${pkg}</div>
                    </div>
                    ${dishesSummary ? `
                    <div style="margin-top:10px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:10px 12px; font-size:12px; line-height:1.5;">
                      <div style="font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:4px;">Selected Dishes:</div>
                      ${dishesSummary}
                    </div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- What Happens Next -->
              <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:12px; padding:14px 16px; margin-bottom:20px;">
                <div style="font-size:12px; font-weight:800; color:#065F46; text-transform:uppercase; margin-bottom:4px;">
                  ✨ Next Steps
                </div>
                <div style="font-size:13px; color:#047857; line-height:1.5;">
                  1. Our coordinator will verify kitchen capacity and travel logistics.<br />
                  2. We will contact you via phone or WhatsApp to finalize your dishes &amp; exact serving schedule.<br />
                  3. A customized tasting or formal invoice will be prepared for your event.
                </div>
              </div>

              <!-- Direct WhatsApp Button for Customer -->
              <div style="text-align:center; margin:22px 0;">
                <a href="https://wa.me/447700900000?text=${encodeURIComponent(`Hi SriLalitha Events, I submitted booking #${ref} for ${date}. I would like to discuss my menu.`)}" target="_blank" style="display:inline-block; background-color:#16A34A; color:#FFFFFF; font-size:13px; font-weight:800; padding:12px 24px; border-radius:8px; text-decoration:none; box-shadow:0 3px 8px rgba(22,163,74,0.25);">
                  💬 Chat with Our Event Planner on WhatsApp
                </a>
              </div>

              <p style="font-size:13px; line-height:1.5; color:#64748B; margin:0 0 16px 0;">
                Need to add specific dishes or make immediate changes to your date? Feel free to reply directly to this email or speak with us on WhatsApp.
              </p>

              <!-- Sign-off -->
              <div style="border-top:1px solid #E2E8F0; padding-top:16px;">
                <p style="margin:0; font-size:13px; font-weight:800; color:#0F172A;">SriLalitha Events &amp; Catering Team</p>
                <p style="margin:2px 0 0 0; font-size:12px; color:#64748B;">
                  London, United Kingdom • 📞 <a href="tel:${BRAND_PHONE}" style="color:#C8860A; text-decoration:none;">${BRAND_PHONE}</a> • <a href="${WEBSITE_URL}" style="color:#C8860A; text-decoration:none; font-weight:700;">vegchennaisrilalitha.events</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC; padding:16px; text-align:center; border-top:1px solid #E2E8F0; font-size:11px; color:#94A3B8;">
              Thank you for trusting SriLalitha Events &amp; Catering London.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 3. OFFICIAL TAX INVOICE & PAYMENT RECEIPT
 * Dispatched automatically when a customer makes an online deposit or full payment.
 */
export function generatePaymentInvoiceHtml(params: InvoiceEmailData, isAdminCopy: boolean = false): string {
  const ref = escapeHtml((params.orderId || 'SL-ORD').slice(-8).toUpperCase());
  const invoiceNumber = escapeHtml(params.invoiceNumber || `INV-SL-${ref}`);
  const name = escapeHtml(params.customerName || 'Valued Customer');
  const email = escapeHtml(params.customerEmail || 'Not Provided');
  const phone = escapeHtml(params.customerPhone || 'Not Provided');
  const pkg = escapeHtml(params.packageName || 'Catering Package');
  const isDeposit = params.paymentType === 'deposit';
  const amountPaid = Number(params.amountPaid || 0);
  const totalAmount = Number(params.totalAmount || amountPaid);
  const deliveryCharge = Number(params.deliveryCharge || 0);
  const remaining = Math.max(0, totalAmount - amountPaid);
  const eventDate = escapeHtml(params.eventDate || 'To be confirmed');
  const eventTime = escapeHtml(params.eventTime || 'To be arranged');
  const location = escapeHtml(params.location || 'To be confirmed');
  const guests = params.guests ? String(params.guests) : '1';
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice &amp; Payment Receipt #${invoiceNumber}</title>
  <style type="text/css">
    body { margin:0 !important; padding:0 !important; background-color:#0B1320 !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .p-card { padding:16px 14px !important; }
      .col-half { display:block !important; width:100% !important; padding-right:0 !important; padding-left:0 !important; padding-bottom:12px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:20px 8px; background-color:#0B1320;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0B1320;">
    <tr>
      <td align="center">
        <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:620px; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #1E293B; box-shadow:0 10px 35px rgba(0,0,0,0.35);">
          
          <!-- Header Banner with Logo & Invoice Title -->
          <tr>
            <td style="background:linear-gradient(135deg, #0B1320 0%, #172554 100%); padding:28px 24px 20px 24px; text-align:center; border-bottom:3px solid #C8860A;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${WEBSITE_URL}" target="_blank" style="display:inline-block; text-decoration:none;">
                      <img src="${LOGO_URL}" alt="SriLalitha Events &amp; Catering" width="220" style="max-width:220px; width:100%; height:auto; display:block; margin:0 auto 12px auto;" border="0" />
                    </a>
                    <h1 style="color:#FFFFFF; margin:0; font-size:20px; font-weight:800; letter-spacing:0.5px;">
                      TAX INVOICE &amp; PAYMENT RECEIPT
                    </h1>
                    <div style="margin-top:8px;">
                      <span style="background:#1E293B; border:1px solid #334155; color:#F59E0B; font-size:12px; font-family:monospace; font-weight:800; padding:4px 12px; border-radius:6px;">
                        INVOICE: ${invoiceNumber}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${isAdminCopy ? `
          <!-- Admin Notification Top Banner -->
          <tr>
            <td style="background:#FEF3C7; border-bottom:1px solid #F59E0B; padding:12px 20px; font-size:12px; color:#92400E; font-weight:700; text-align:center;">
              🔔 <strong>Admin Payment Notice:</strong> Customer <strong>${name}</strong> has successfully completed payment of <strong>£${amountPaid.toFixed(2)}</strong> via Stripe Checkout.
            </td>
          </tr>` : ''}

          <!-- Green Verified Payment Status Ribbon -->
          <tr>
            <td style="background:#ECFDF5; border-bottom:2px solid #10B981; padding:16px 24px; text-align:center;">
              <div style="font-size:28px; margin-bottom:4px;">✅</div>
              <h2 style="color:#065F46; font-size:17px; font-weight:800; margin:0;">Payment Confirmed &amp; Verified</h2>
              <p style="color:#047857; font-size:13px; margin:4px 0 0 0;">
                Your ${isDeposit ? 'deposit' : 'full payment'} of <strong>£${amountPaid.toFixed(2)}</strong> has been processed via secure card payment.
              </p>
            </td>
          </tr>

          <!-- Invoice Details Card -->
          <tr>
            <td class="p-card" style="padding:24px 22px; background-color:#FFFFFF;">

              <!-- Two-Column Billing Header -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td class="col-half" width="50%" style="vertical-align:top; padding-right:10px;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748B; margin-bottom:4px;">BILLED TO (CUSTOMER):</div>
                    <div style="font-size:14px; font-weight:800; color:#0F172A;">${name}</div>
                    <div style="font-size:12px; color:#475569; margin-top:2px;">📞 ${phone}</div>
                    <div style="font-size:12px; color:#2563EB; margin-top:2px;">✉️ ${email}</div>
                    <div style="font-size:12px; color:#475569; margin-top:4px;">📍 ${location}</div>
                  </td>
                  <td class="col-half" width="50%" style="vertical-align:top; padding-left:10px;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748B; margin-bottom:4px;">INVOICE DETAILS:</div>
                    <div style="font-size:12px; color:#0F172A;"><strong>Invoice No:</strong> ${invoiceNumber}</div>
                    <div style="font-size:12px; color:#0F172A; margin-top:2px;"><strong>Issue Date:</strong> ${todayStr}</div>
                    <div style="font-size:12px; color:#0F172A; margin-top:2px;"><strong>Event Date:</strong> 📅 ${eventDate} (${eventTime})</div>
                    <div style="font-size:12px; color:#0F172A; margin-top:2px;"><strong>Payment Method:</strong> Stripe Online Card</div>
                  </td>
                </tr>
              </table>

              <!-- Itemized Invoice Table -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; margin-bottom:18px;">
                <tr style="background:#F1F5F9; border-bottom:1px solid #E2E8F0;">
                  <th align="left" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Item Description</th>
                  <th align="center" style="padding:10px 8px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Qty</th>
                  <th align="right" style="padding:10px 12px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Amount</th>
                </tr>
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:12px; font-size:13px; color:#0F172A; vertical-align:top;">
                    <strong>${pkg}</strong>
                    <div style="font-size:11px; color:#64748B; margin-top:2px;">Authentic pure vegetarian catering for ${guests} guests.</div>
                  </td>
                  <td align="center" style="padding:12px 8px; font-size:13px; color:#0F172A; vertical-align:top;">${guests}</td>
                  <td align="right" style="padding:12px; font-size:13px; font-weight:700; color:#0F172A; vertical-align:top;">
                    £${(totalAmount - deliveryCharge).toFixed(2)}
                  </td>
                </tr>
                ${deliveryCharge > 0 ? `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:12px; font-size:13px; color:#0F172A;">
                    <strong>Travel &amp; Delivery Logistics</strong>
                    <div style="font-size:11px; color:#64748B; margin-top:2px;">Dedicated kitchen transport to ${location}</div>
                  </td>
                  <td align="center" style="padding:12px 8px; font-size:13px; color:#0F172A;">1</td>
                  <td align="right" style="padding:12px; font-size:13px; font-weight:700; color:#0F172A;">£${deliveryCharge.toFixed(2)}</td>
                </tr>` : ''}
              </table>

              <!-- Total & Payment Breakdown -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:14px; margin-bottom:20px; font-size:13px;">
                <tr>
                  <td style="padding:4px 0; color:#64748B;">Total Event Package:</td>
                  <td align="right" style="padding:4px 0; font-weight:800; color:#0F172A; font-size:15px;">£${totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0; color:#059669; font-weight:700;">
                    ${isDeposit ? `Deposit Received (${params.depositPercentage || '30'}%):` : 'Full Payment Received:'}
                  </td>
                  <td align="right" style="padding:4px 0; font-weight:800; color:#059669; font-size:16px;">
                    £${amountPaid.toFixed(2)} ✓
                  </td>
                </tr>
                ${remaining > 0 ? `
                <tr style="border-top:1px dashed #CBD5E1;">
                  <td style="padding:8px 0 2px 0; color:#B45309; font-weight:700;">Remaining Balance Due:</td>
                  <td align="right" style="padding:8px 0 2px 0; font-weight:800; color:#92400E; font-size:15px;">
                    £${remaining.toFixed(2)}
                  </td>
                </tr>` : `
                <tr style="border-top:1px dashed #CBD5E1;">
                  <td colspan="2" style="padding:8px 0 2px 0; color:#059669; font-weight:700; font-size:12px; text-align:center;">
                    🎉 Fully Paid — No Further Balance Outstanding
                  </td>
                </tr>`}
              </table>

              ${remaining > 0 ? `
              <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:10px 14px; margin-bottom:18px; font-size:12px; color:#92400E; line-height:1.5;">
                ⚠️ <strong>Balance Payment Notice:</strong> The remaining balance of <strong>£${remaining.toFixed(2)}</strong> is due <strong>14 days prior to your event date</strong>. Our coordinator will contact you to arrange the final payment.
              </div>` : ''}

              <!-- WhatsApp Chat Button -->
              <div style="text-align:center; margin:20px 0 14px 0;">
                <a href="https://wa.me/447700900000?text=${encodeURIComponent(`Hi SriLalitha Events, I have completed payment for Invoice ${invoiceNumber}. Looking forward to confirming final arrangements!`)}" target="_blank" style="display:inline-block; background-color:#16A34A; color:#FFFFFF; font-size:13px; font-weight:800; padding:12px 24px; border-radius:8px; text-decoration:none; box-shadow:0 2px 6px rgba(22,163,74,0.25);">
                  💬 Message Coordinator on WhatsApp
                </a>
              </div>

              <!-- Company Contact & Terms -->
              <div style="border-top:1px solid #E2E8F0; padding-top:16px; font-size:12px; color:#64748B; line-height:1.6;">
                <strong style="color:#0F172A;">SriLalitha Events &amp; Catering London</strong><br />
                📞 Phone: <a href="tel:${BRAND_PHONE}" style="color:#C8860A; text-decoration:none;">${BRAND_PHONE}</a> | ✉️ Email: <a href="mailto:${BRAND_EMAIL}" style="color:#C8860A; text-decoration:none;">${BRAND_EMAIL}</a><br />
                🌐 Website: <a href="${WEBSITE_URL}" style="color:#C8860A; text-decoration:none; font-weight:700;">vegchennaisrilalitha.events</a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC; padding:16px; text-align:center; border-top:1px solid #E2E8F0; font-size:11px; color:#94A3B8;">
              This is an official payment invoice generated for your booking with SriLalitha Events &amp; Catering.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
