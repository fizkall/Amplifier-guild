'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';

/** Devre dışı bırakılmış hesapla giriş yapıldığında gösterilir. */
export function Reactivate() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <main className="hero">
      <div style={{ fontSize: 44 }} aria-hidden>⏸️</div>
      <h1 style={{ fontSize: 28 }}>Hesabın devre dışı</h1>
      <p>Profilin şu an gizli. Yeniden etkinleştirince her şey kaldığı yerden devam eder.</p>
      <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={async () => {
          setBusy(true);
          await updateDoc(doc(db, 'users', user!.uid), { deactivated: false, updatedAt: serverTimestamp() }).finally(() => setBusy(false));
        }}>Hesabımı yeniden etkinleştir</button>
        <button className="btn btn-lg" onClick={() => signOut()}>Çıkış yap</button>
      </div>
    </main>
  );
}
