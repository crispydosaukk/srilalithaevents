import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

/**
 * Ensures the server-side Next.js environment is authenticated with Firebase.
 * This satisfies Firestore Security Rules that require request.auth != null for updates.
 */
export async function ensureServerAuth() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      'system_bot@srilalitha.internal',
      'SrilalithaSys2026!'
    );
    return cred.user;
  } catch (err: any) {
    console.warn('Server-side Firebase auth warning:', err?.message || err);
    return null;
  }
}
