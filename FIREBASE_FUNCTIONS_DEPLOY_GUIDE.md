# Firebase Cloud Functions Email Integration Guide

## Overview
This project now uses **Firebase Cloud Functions (2nd Gen)** to handle all email logic reliably. This solves the issue of cPanel and shared web hosts blocking outbound SMTP ports (587, 465, 25).

### Architecture
1. **Firestore Trigger (`onBookingRequestCreated`)**:
   - Listens on the `booking_requests/{bookingId}` collection in Firestore.
   - Whenever an **Online Order** (from `InteractiveMenuOrderModal.tsx`) or **Form Booking** (from `home/page.tsx` or Admin) is created, Google Cloud automatically triggers this function.
   - Dispatches a branded HTML notification to all active admin recipients.
   - Dispatches an instant confirmation email to the customer.
   - Updates the Firestore document with `emailSent: true` and delivery timestamp.
   - Prevents duplicate sends using an idempotency guard.

2. **Payment Trigger (`onBookingPaymentUpdated`)**:
   - Listens for status updates on `booking_requests/{bookingId}` when `depositPaid: true` (e.g. Stripe checkout completion).
   - Dispatches a payment receipt to the customer and alert to admin.

3. **HTTPS Endpoints (`sendEnquiryEmailHttp`, `sendCustomEmailHttp`, `sendTestEmailHttp`)**:
   - Accessible over standard HTTPS (port 443), which is never blocked by cPanel or GoDaddy firewalls.
   - Next.js API routes (`/api/send-enquiry-email`, `/api/send-custom-email`, `/api/send-test-email`) automatically delegate to these endpoints with local fallback.

---

## SMTP Configuration
Emails use dynamic SMTP settings configured in Firestore (`site_data/email_settings`):
- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **User**: `zingbiteuk@gmail.com`
- **Pass**: `yyozpzropaysxtah` (Verified Gmail App Password)
- **Fallback Admin**: `admin@vegchennaisrilalitha.co.uk`

---

## How to Deploy the Cloud Functions

### Step 1: Ensure you are logged into the Firebase project owner account
In your terminal, run:
```bash
firebase login:add
```
A browser window will open. Sign in with the Google Account that owns or has **Editor/Owner** access to the Firebase project **`srilalitha-a0cff`** (e.g., `zingbiteuk@gmail.com`).

*(Alternative: In Firebase Console -> Project Settings -> Users and Permissions, add `astropariharuk@gmail.com` as an Editor).*

### Step 2: Deploy Functions
Run either of the following commands from the project root:
```bash
npm run deploy:functions
```
or
```bash
firebase deploy --only functions
```

Firebase CLI will automatically compile the TypeScript files and deploy the following functions:
- `onBookingRequestCreated` (Firestore Trigger)
- `onBookingPaymentUpdated` (Firestore Trigger)
- `sendEnquiryEmailHttp` (HTTPS API)
- `sendCustomEmailHttp` (HTTPS API)
- `sendTestEmailHttp` (HTTPS API)

---

## Verifying Functions
Once deployed:
1. Submit an online order from the website or submit the booking form.
2. Check the Firebase Console under **Build -> Functions** to view execution logs.
3. Check the Firestore document in `booking_requests`: it will automatically reflect `emailSent: true` and `emailStatus: "delivered"`.
