'use client';

import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut,
  updateProfile, type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '@/shared/models';
import { auth, db, firebaseReady } from './firebase';

interface AuthState {
  user: User | null;
  /** user.reload() sonrası güncel değer (User nesnesi aynı referans kalır). */
  emailVerified: boolean;
  profile: (UserProfile & { uid: string }) | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Doğrulama linkine tıklandıktan sonra: kullanıcıyı ve ID token'ı yeniler. */
  refreshVerification: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Devam linki sadece Firebase'de yetkili alan adlarında verilir (aksi halde auth/unauthorized-continue-uri).
const CONTINUE_HOSTS = ['amplifierguild.online', 'www.amplifierguild.online', 'localhost'];
const actionSettings = () =>
  typeof window !== 'undefined' && CONTINUE_HOSTS.includes(window.location.hostname)
    ? { url: `${window.location.origin}/profil-olustur` }
    : undefined;

/** Firebase hata kodlarını Türkçe mesaja çevirir. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'Geçerli bir e-posta adresi gir.',
    'auth/missing-password': 'Şifre gir.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/wrong-password': 'E-posta veya şifre hatalı.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap yok.',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'auth/network-request-failed': 'Bağlantı hatası. İnternetini kontrol et.',
    'auth/popup-blocked': 'Tarayıcı giriş penceresini engelledi. Açılır pencerelere izin ver.',
    'auth/unauthorized-domain': 'Bu alan adı Firebase\'de yetkili değil (Authorized domains).',
    'auth/operation-not-allowed': 'Bu giriş yöntemi Firebase\'de etkin değil.',
    'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle kayıtlı.',
  };
  return map[code] ?? 'Bir şeyler ters gitti. Tekrar dene.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<AuthState['profile']>(null);
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) return;
    auth.languageCode = 'tr';
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      unsubProfile?.();
      setUser(u);
      setEmailVerified(Boolean(u?.emailVerified));
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      unsubProfile = onSnapshot(
        doc(db, 'users', u.uid),
        (snap) => {
          setProfile(snap.exists() ? { ...(snap.data() as UserProfile), uid: u.uid } : null);
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  const refreshVerification = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (u.emailVerified) await u.getIdToken(true); // kurallardaki email_verified claim'i için
    setEmailVerified(u.emailVerified);
    return u.emailVerified;
  }, []);

  const value: AuthState = {
    user,
    emailVerified,
    profile,
    loading,
    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signUpWithEmail: async (name, email, password) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user, actionSettings());
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim(), actionSettings()),
    resendVerification: async () => {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser, actionSettings());
    },
    refreshVerification,
    signOut: () => fbSignOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
