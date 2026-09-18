export interface CommunicationTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

export interface CommunicationConfig {
  contactEmail: string;
  contactWhatsApp: string;
  templates: Record<string, CommunicationTemplate>;
  updatedAt?: string;
}

export const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  contactEmail: 'admin@vegchennaisrilalitha.co.uk',
  contactWhatsApp: '+44 7700 900000',
  templates: {
    enquiry_reply: {
      id: 'enquiry_reply',
      name: 'Enquiry Follow-up',
      description: 'Sent when replying to a new website booking enquiry',
      subject: '✨ SriLalitha Events: Thank You for Your {eventType} Enquiry',
      body: `Hi {customerName},

Thank you for your enquiry with SriLalitha Events & Catering! We would love to cater for your upcoming {eventType} on {eventDate}.

Could you please confirm your preferred event timings and approximate guest count ({guests} guests)?

We have delicious authentic South & North Indian menus, live dosa counters, and full event packages ready for you.

Looking forward to hearing from you!

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}
Website: https://vegchennaisrilalitha.events`,
    },
    menu_sharing: {
      id: 'menu_sharing',
      name: 'Menu & Packages Proposal',
      description: 'Sent when sharing a menu package with a customer',
      subject: '🍽️ SriLalitha Events: {menuType} Proposal for Your {eventType}',
      body: `Hi {customerName},

Here are our catering options and menu details for your {eventType} on {eventDate}:

{menuDetails}

👥 Estimated Guests: {guests}
💰 Estimated Total: £{totalEstimatedAmount}

Please review the menu options and let us know your preferred selections or any dietary requests.

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    deposit_request: {
      id: 'deposit_request',
      name: 'Deposit Payment Request',
      description: 'Sent to request a booking deposit and share bank details',
      subject: '💳 SriLalitha Events: Deposit Request for Booking #{bookingId}',
      body: `Hi {customerName},

To confirm and secure your {eventType} booking on {eventDate}, please transfer the deposit of £{deposit} to our account:

🏦 Account Name: {bankAccountName}
📋 Sort Code: {bankSortCode}
🔢 Account No: {bankAccountNumber}
📌 Reference: {bookingId}

Once paid, please reply with a screenshot or payment confirmation so we can immediately secure your date.

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    final_invoice: {
      id: 'final_invoice',
      name: 'Final Invoice & Payment Summary',
      description: 'Sent before the event with complete invoice and bank details',
      subject: '🧾 SriLalitha Events: Final Invoice & Summary for Booking #{bookingId}',
      body: `Hi {customerName},

Thank you for choosing SriLalitha Events for your upcoming {eventType}!

Here is your final invoice summary:
📋 Booking Reference: #{bookingId}
📅 Event Date: {eventDate} ({eventTime})
📦 Package: {packageName} ({guests} Guests)

{invoiceBreakdown}

Please transfer the outstanding balance to:
🏦 Account Name: {bankAccountName}
📋 Sort Code: {bankSortCode}
🔢 Account No: {bankAccountNumber}
📌 Reference: {bookingId}

Once the transfer is made, kindly reply to confirm. Thank you!

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    extra_invoice: {
      id: 'extra_invoice',
      name: 'Extra Adjustments Invoice',
      description: 'Sent when additional guest counts or items are added after the event',
      subject: '🧾 SriLalitha Events: Additional Charges Invoice #{bookingId}',
      body: `Hi {customerName},

Thank you for celebrating with SriLalitha Events! We hope you and your guests had a memorable time.

Here is the breakdown for additional services/adjustments added during your event:
{extrasList}

💰 Outstanding Balance Due: £{extraTotal}

Please transfer this balance to:
🏦 Account Name: {bankAccountName}
📋 Sort Code: {bankSortCode}
🔢 Account No: {bankAccountNumber}
📌 Reference: {bookingId} (Extras)

Once paid, please reply to let us know. Thank you!

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    event_reminder: {
      id: 'event_reminder',
      name: 'Upcoming Event Reminder',
      description: 'Sent a few days before the event to remind the customer',
      subject: '🎉 SriLalitha Events: Upcoming Event Reminder for {eventDate}',
      body: `Hi {customerName},

Just a friendly reminder that your {eventType} with SriLalitha Events is coming up on {eventDate} at {eventTime}!

Our team and chefs are fully prepared to make your event a great success. If you have any last-minute adjustments or venue notes, please let us know.

We look forward to serving you and your guests!

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    booking_completed: {
      id: 'booking_completed',
      name: 'Event Completed & Thank You',
      description: 'Sent after the event is completed to thank the customer and request feedback',
      subject: '🙏 SriLalitha Events: Thank You for Celebrating with Us! (#{bookingId})',
      body: `Hi {customerName},

Thank you so much for booking with SriLalitha Events! 🎊 Your event was a wonderful success and your booking is now marked as completed.

{completedSummary}

It was an absolute pleasure serving you and your guests. If you enjoyed our food and service, we would love your review and look forward to catering for your future celebrations!

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
    general_message: {
      id: 'general_message',
      name: 'General Customer Message',
      description: 'Direct communication with a customer',
      subject: 'SriLalitha Events & Catering: Hello {customerName}',
      body: `Hi {customerName},

This is SriLalitha Events & Catering regarding your booking.

How can we help you today? Please feel free to let us know your questions or requirements.

Warm regards,
SriLalitha Events & Catering
Phone / WhatsApp: {contactWhatsApp}
Email: {contactEmail}`,
    },
  },
};

export function renderCommunicationTemplate(
  text: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

export function buildMailtoLink(to: string, subject: string, body: string): string {
  const cleanTo = (to || '').trim();
  return `mailto:${cleanTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function sanitizeCommunicationConfig(data: any): CommunicationConfig {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_COMMUNICATION_CONFIG };
  }

  const templates: Record<string, CommunicationTemplate> = {};
  const baseTemplates = DEFAULT_COMMUNICATION_CONFIG.templates;

  Object.keys(baseTemplates).forEach((k) => {
    const raw = data.templates?.[k] || {};
    const base = baseTemplates[k];
    templates[k] = {
      id: base.id,
      name: String(raw.name || base.name),
      description: String(raw.description || base.description),
      subject: String(raw.subject || base.subject),
      body: String(raw.body || base.body),
    };
  });

  return {
    contactEmail: String(data.contactEmail || DEFAULT_COMMUNICATION_CONFIG.contactEmail).trim(),
    contactWhatsApp: String(data.contactWhatsApp || DEFAULT_COMMUNICATION_CONFIG.contactWhatsApp).trim(),
    templates,
    updatedAt: data.updatedAt,
  };
}
