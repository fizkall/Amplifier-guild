'use client';
/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SetupNotice } from '@/components/SetupNotice';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';

export default function Login() {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    router.replace(profile?.onboardingComplete ? '/feed' : '/onboarding');
  }, [user, profile, loading, router]);

  return (
    <main className="hero">
      <img className="logo-img" src="/logo.png" alt="" width={84} height={84} />
      <h1 style={{ fontSize: 30 }}>Loncaya giriş</h1>
      <p>Okul veya kişisel Google hesabınla devam et.</p>
      {firebaseReady ? (
        <button
          className="btn btn-primary btn-lg"
          onClick={() => signInWithGoogle().catch((e) => setErr(e?.code === 'auth/popup-closed-by-user' ? '' : 'Giriş başarısız oldu.'))}
        >
          Google ile devam et
        </button>
      ) : (
        <SetupNotice />
      )}
      {err && <div className="error">{err}</div>}
      <p className="meta" style={{ fontSize: 12 }}>
        Devam ederek KVKK aydınlatma metnini ve kullanım koşullarını kabul etmiş olursun.
      </p>
    </main>
  );
}
