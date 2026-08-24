import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface PaymentGatewayConfig {
  enabled: boolean;
  publishableKey: string;
  secretKey: string;
  paymentMode: 'both' | 'deposit' | 'full';
  depositPercentage: number;
  currency: string;
  allowPayLater: boolean;
  updatedAt?: string;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  enabled: true,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  paymentMode: 'both',
  depositPercentage: 30,
  currency: 'gbp',
  allowPayLater: true,
};

export async function getStripeSecretKey(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'site_data', 'payment_gateway_settings'));
    if (snap.exists()) {
      const data = snap.data() as Partial<PaymentGatewayConfig>;
      if (data.secretKey && data.secretKey.trim()) {
        return data.secretKey.trim();
      }
    }
  } catch (e) {
    console.warn('Could not fetch dynamic stripe secret key from Firestore, using env fallback:', e);
  }

  return process.env.STRIPE_SECRET_KEY || '';
}

export async function getServerStripe(): Promise<Stripe> {
  const secretKey = await getStripeSecretKey();
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });
}
