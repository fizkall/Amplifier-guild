'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { InstallAppRow } from '@/components/InstallAppRow';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { useManagedProjects } from '@/lib/projects';
import { useAppearance, type TextSize, type Theme } from '@/lib/theme';

function Row({ href, title, desc, right, danger }: { href: string; title: string; desc?: string; right?: ReactNode; danger?: boolean }) {
  return (
    <Link href={href} className="set-row">
      <div style={{ minWidth: 0 }}>
        <div className={danger ? 'danger' : ''} style={{ fontWeight: 600 }}>{title}</div>
        {desc && <div className="meta">{desc}</div>}
      </div>
      {right ?? <span className="meta" aria-hidden>→</span>}
    </Link>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="set-row" style={{ cursor: 'pointer' }}>
      <div><div style={{ fontWeight: 600 }}>{label}</div>{desc && <div className="meta">{desc}</div>}</div>
      <span className="switch"><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><span /></span>
    </label>
  );
}

function Settings() {
  const { user, profile, signOut, hasPassword, hasGoogle } = useAuth();
  const projects = useManagedProjects();
  const { theme, setTheme, size, setSize } = useAppearance();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!user || !profile) return null;
  const admin = isAdminUid(user.uid);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    try { await updateDoc(doc(db, 'users', user!.uid), { ...data, updatedAt: serverTimestamp() }); } finally { setSaving(false); }
  }
  async function copyUid() {
    try { await navigator.clipboard.writeText(user!.uid); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* yok say */ }
  }

  const THEMES: [Theme, string][] = [['system', 'Sistem'], ['dark', 'Koyu'], ['light', 'Açık']];
  const SIZES: [TextSize, string][] = [['normal', 'Normal'], ['large', 'Büyük']];
  const method = [hasGoogle && 'Google', hasPassword && 'E-posta ve şifre'].filter(Boolean).join(' + ');

  return (
    <>
      <Link href="/ayarlar/profil" className="pad row" style={{ borderBottom: '1px solid var(--border)' }}>
        <Avatar name={profile.displayName} src={profile.photoURL} size={56} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="post-name">{profile.displayName}</div>
          <div className="meta">@{profile.handle}</div>
          {admin && <span className="chip on" style={{ display: 'inline-block', marginTop: 6, fontSize: 12 }}>Guild yöneticisi</span>}
        </div>
        <span className="meta">Düzenle →</span>
      </Link>

      {admin && (
        <>
          <div className="section-head"><span>Yönetim</span></div>
          <Row href="/yonetim" title="Yönetim Paneli" desc="Girişim/proje aç, yönetici ata, ilanlar ve başvurular" />
          <Row href="/yonetim/mesajlar" title="İletişim mesajları" desc="İletişim formundan gelenler" />
        </>
      )}
      {!admin && projects && projects.length > 0 && (
        <>
          <div className="section-head"><span>Yönettiğim projeler</span></div>
          {projects.map((p) => <Row key={p.id} href={`/proje/${p.id}/yonet`} title={p.name} desc={p.ownerId === user.uid ? (p.status === 'active' ? 'Kurucu' : `Kurucu · ${p.status === 'pending' ? 'onay bekliyor' : p.status}`) : 'Yönetici'} />)}
        </>
      )}

      <div className="section-head"><span>Girişimler</span></div>
      <Row href="/ayarlar/girisim-basvurusu" title="Girişim / proje başvurusu yap" desc="Girişimini Guild'e ekle; onaylanınca kurucu olarak yönet" />

      <div className="section-head"><span>Profil</span></div>
      <Row href="/ayarlar/profil" title="Profili düzenle" desc="Fotoğraf, ad, kullanıcı adı, okul, yetenekler, deneyimler" />
      <Row href={`/profil/${profile.handle}`} title="Profilimi görüntüle" desc="Başkalarının gördüğü CV sayfan" />

      <div className="section-head"><span>Gizlilik</span></div>
      <Toggle label="Profilim herkese açık" desc="Kapalıysa yalnızca giriş yapmış üyeler görür"
        checked={profile.visibility === 'public'} onChange={(v) => patch({ visibility: v ? 'public' : 'members' })} />
      <Toggle label="Projelerde yer almaya açığım" desc="Uyum önerilerinde ve aramalarda öne çıkarsın"
        checked={profile.openToWork} onChange={(v) => patch({ openToWork: v })} />
      {saving && <div className="meta" style={{ padding: '4px 16px' }}>Kaydediliyor…</div>}

      <div className="section-head"><span>Görünüm</span></div>
      <div className="set-row">
        <span style={{ fontWeight: 600 }}>Tema</span>
        <div className="seg" role="radiogroup" aria-label="Tema">
          {THEMES.map(([k, l]) => <button key={k} role="radio" aria-checked={theme === k} className={theme === k ? 'on' : ''} onClick={() => setTheme(k)}>{l}</button>)}
        </div>
      </div>
      <div className="set-row">
        <span style={{ fontWeight: 600 }}>Yazı boyutu</span>
        <div className="seg" role="radiogroup" aria-label="Yazı boyutu">
          {SIZES.map(([k, l]) => <button key={k} role="radio" aria-checked={size === k} className={size === k ? 'on' : ''} onClick={() => setSize(k)}>{l}</button>)}
        </div>
      </div>

      <div className="section-head"><span>Hesap ve güvenlik</span></div>
      <div className="set-row"><div><div style={{ fontWeight: 600 }}>E-posta</div><div className="meta">{user.email}</div></div></div>
      <div className="set-row"><div><div style={{ fontWeight: 600 }}>Giriş yöntemi</div><div className="meta">{method || '—'}</div></div></div>
      <Row href="/ayarlar/sifre" title={hasPassword ? 'Şifre değiştir' : 'Şifre oluştur'} desc={hasPassword ? undefined : 'Google dışında e-posta ve şifreyle de giriş yap'} />
      <div className="set-row">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Kullanıcı kimliği (UID)</div>
          <code className="meta" style={{ wordBreak: 'break-all' }}>{user.uid}</code>
        </div>
        <button className="link-btn strong" onClick={copyUid}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</button>
      </div>

      <div className="section-head"><span>Araçlar</span></div>
      {/* Statik HTML sayfası: Next Link yerine düz bağlantı */}
      <a href="/pit-kamera" className="set-row">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Pit Kamera</div>
          <div className="meta">FRC pit güvenliği: gözlük, yasak bölge, kalabalık ve koşma uyarıları. Kayıtlar bu cihazda kalır.</div>
        </div>
        <span className="meta" aria-hidden>→</span>
      </a>

      <div className="section-head"><span>Destek</span></div>
      <Row href="/iletisim" title="İletişim" desc="Soru, öneri, proje başvurusu veya KVKK talebi" />
      <Row href="/hakkinda" title="Hakkında" />
      <Row href="/kvkk" title="KVKK · Gizlilik · Çerezler" />

      <div className="section-head"><span>Hesabı yönet</span></div>
      <Row href="/ayarlar/hesap" title="Hesabı devre dışı bırak veya sil" danger />
      <button className="set-row" onClick={() => signOut()}><span style={{ fontWeight: 600 }}>Çıkış yap</span><span className="meta" aria-hidden>↩</span></button>

      <div className="section-head"><span>Uygulama</span></div>
      <InstallAppRow />
    </>
  );
}

export default function AyarlarPage() {
  return <AppShell title="Ayarlar">{firebaseReady && <Settings />}</AppShell>;
}
