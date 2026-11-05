'use client';

import {
  collection, collectionGroup, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';

function AccountActions() {
  const { user, profile, hasPassword, reauthenticate, deleteAuthUser, signOut } = useAuth();
  const [mode, setMode] = useState<'none' | 'deactivate' | 'delete'>('none');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [err, setErr] = useState('');
  if (!user || !profile) return null;

  async function deactivate() {
    setBusy(true); setErr('');
    try {
      await updateDoc(doc(db, 'users', user!.uid), { deactivated: true, openToWork: false, updatedAt: serverTimestamp() });
      await signOut();
      window.location.replace('/?hesap=devre-disi');
    } catch (e) {
      setErr(authErrorMessage(e));
      setBusy(false);
    }
  }

  async function deleteAccount() {
    const uid = user!.uid;
    setBusy(true); setErr('');
    try {
      setStep('Kimlik doğrulanıyor…');
      await reauthenticate(hasPassword ? password : undefined);
      // Silme sürerken uygulamanın "profil yok" yönlendirmelerini durdur
      try { sessionStorage.setItem('ag-deleting', '1'); } catch { /* yok say */ }

      setStep('Açık başvurular geri çekiliyor…');
      const apps = await getDocs(query(collectionGroup(db, 'applications'), where('applicantId', '==', uid)));
      for (const a of apps.docs) {
        if (['submitted', 'in_review', 'shortlisted'].includes(a.get('status'))) {
          await updateDoc(a.ref, { status: 'withdrawn', updatedAt: serverTimestamp() }).catch(() => {});
        }
        await deleteDoc(doc(a.ref, 'contact', 'info')).catch(() => {});
      }

      setStep('Profil verileri siliniyor…');
      const subs = ['experiences', 'following', 'notifications', 'private'];
      for (const sub of subs) {
        const s = await getDocs(collection(db, 'users', uid, sub)).catch(() => null);
        if (!s) continue;
        const b = writeBatch(db);
        s.docs.forEach((d) => b.delete(d.ref));
        if (s.size) await b.commit();
      }
      const b = writeBatch(db);
      b.delete(doc(db, 'handles', profile!.handle));
      b.delete(doc(db, 'users', uid));
      await b.commit();

      setStep('Hesap kapatılıyor…');
      await deleteAuthUser();
      try { sessionStorage.removeItem('ag-deleting'); } catch { /* yok say */ }
      window.location.replace('/?hesap=silindi');
    } catch (e) {
      console.error(e);
      try { sessionStorage.removeItem('ag-deleting'); } catch { /* yok say */ }
      setErr(authErrorMessage(e));
      setStep('');
      setBusy(false);
    }
  }

  return (
    <div className="pad stack" style={{ gap: 16 }}>
      <div className="notice" style={{ margin: 0 }}>
        <b>Hesabı devre dışı bırak</b>
        <p className="meta" style={{ margin: '6px 0 10px' }}>
          Profilin gizlenir ve önerilerde çıkmazsın; verilerin silinmez. İstediğin zaman tekrar giriş yapıp hesabını yeniden etkinleştirebilirsin.
        </p>
        {mode === 'deactivate' ? (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => setMode('none')}>Vazgeç</button>
            <button className="btn btn-primary" disabled={busy} onClick={deactivate}>{busy ? 'Bekle…' : 'Evet, devre dışı bırak'}</button>
          </div>
        ) : (
          <button className="btn" onClick={() => setMode('deactivate')}>Devre dışı bırak</button>
        )}
      </div>

      <div className="notice" style={{ margin: 0, borderColor: 'var(--danger)' }}>
        <b className="danger">Hesabı kalıcı olarak sil</b>
        <p className="meta" style={{ margin: '6px 0 10px' }}>
          Profilin, CV deneyimlerin, kullanıcı adın ve giriş hesabın silinir; açık başvuruların geri çekilir. <b>Bu işlem geri alınamaz.</b>
          Projelerin karar kayıtlarında yalnızca başvuru anındaki özet kalabilir (KVKK metnine bak).
        </p>
        {mode === 'delete' ? (
          <div className="stack">
            {hasPassword ? (
              <input className="input" type="password" autoComplete="current-password" placeholder="Şifren" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Şifre" />
            ) : (
              <span className="meta">Onay için Google penceresi açılacak.</span>
            )}
            <input className="input" placeholder={`Onaylamak için kullanıcı adını yaz: ${profile.handle}`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Kullanıcı adı onayı" />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" disabled={busy} onClick={() => setMode('none')}>Vazgeç</button>
              <button className="btn btn-danger" disabled={busy || confirmText.trim().toLowerCase() !== profile.handle || (hasPassword && !password)} onClick={deleteAccount}>
                {busy ? step || 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setMode('delete')}>Hesabı sil</button>
        )}
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      <p style={{ textAlign: 'center' }}><Link href="/ayarlar" className="link-btn">← Ayarlar</Link></p>
    </div>
  );
}

export default function HesapPage() {
  return <AppShell title="Hesap">{firebaseReady && <AccountActions />}</AppShell>;
}
