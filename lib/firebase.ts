import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

// Firebase web yapılandırması gizli değildir (tarayıcıya zaten gönderilir); güvenlik
// firestore.rules + App Check ile sağlanır. Ortam değişkenleri varsa onlar önceliklidir.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDh13g6q6Vl_N3U6X7bt9dgPdcA9lBul0c',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'amp-guild.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'amp-guild',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'amp-guild.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1057183621496',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1057183621496:web:86c3e0f091f2f23c4f688d',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-KCBXFE6Y3J',
};

/** Firebase ortam değişkenleri tanımlı mı? Değilse uygulama kurulum uyarısı gösterir. */
export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
if (firebaseReady && typeof window !== 'undefined') {
  app = getApps().length ? getApp() : initializeApp(config);
}

export const auth = (app ? getAuth(app) : null) as Auth;
export const db = (app ? getFirestore(app) : null) as Firestore;

// Yerel test: NEXT_PUBLIC_USE_EMULATORS=1 ile Firebase emülatörlerine bağlanır (canlıda kullanılmaz)
if (app && process.env.NEXT_PUBLIC_USE_EMULATORS === '1') {
  const g = globalThis as { __fbEmu?: boolean };
  if (!g.__fbEmu) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    g.__fbEmu = true;
  }
}
