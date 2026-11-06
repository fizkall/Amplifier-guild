'use client';

import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Project, SocialKey } from '@/shared/models';
import { toSlug } from '@/shared/match';
import { Avatar } from '@/components/Avatar';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { imageToDataUrl, normalizeUrl, SOCIALS } from '@/lib/image';
import { KIND_LABEL, type ProjectDoc } from '@/lib/projects';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Girişim / proje sayfası oluşturma ve düzenleme formu. */
export function ProjectForm({ initial }: { initial?: ProjectDoc }) {
  const { user } = useAuth();
  const router = useRouter();
  const admin = isAdminUid(user?.uid);
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(editing);
  const [tagline, setTagline] = useState(initial?.tagline ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [kind, setKind] = useState<Project['kind']>(initial?.kind ?? 'partner_startup');
  const [status, setStatus] = useState<Project['status']>(initial?.status ?? 'active');
  const [logoUrl, setLogoUrl] = useState<string | null>(initial?.logoUrl ?? null);
  const [links, setLinks] = useState<Partial<Record<SocialKey, string>>>(initial?.links ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const effectiveSlug = slugTouched ? slug : toSlug(name).slice(0, 40);
  const badLinks = SOCIALS.filter((s) => links[s.key]?.trim() && !normalizeUrl(links[s.key]!));

  async function pickLogo(f: File | undefined) {
    if (!f) return;
    setErr('');
    try { setLogoUrl(await imageToDataUrl(f, 320, 0.85)); } catch (e) { setErr((e as Error).message); }
  }

  async function save() {
    if (!user) return;
    setErr('');
    setOk('');
    if (name.trim().length < 2) return setErr('İsim en az 2 karakter olmalı.');
    if (!SLUG_RE.test(effectiveSlug)) return setErr('Adres (slug) 2–40 karakter: küçük harf, rakam ve tire.');
    if (badLinks.length) return setErr(`Geçersiz bağlantı: ${badLinks.map((b) => b.label).join(', ')}`);

    const cleanLinks: Partial<Record<SocialKey, string>> = {};
    for (const s of SOCIALS) {
      const v = links[s.key]?.trim();
      if (v) cleanLinks[s.key] = normalizeUrl(v)!;
    }

    setBusy(true);
    try {
      if (!editing && !admin) {
        // Üye başvurusu: admin onayına kadar 'pending'; başvuran kurucu olarak kaydedilir
        const b = writeBatch(db);
        b.set(doc(db, 'projects', effectiveSlug), {
          name: name.trim(), slug: effectiveSlug, tagline: tagline.trim(), description: description.trim(),
          logoUrl, coverUrl: null, kind, ownerId: user.uid, managerIds: [], status: 'pending', tags: [], links: cleanLinks,
          stats: { members: 1, followers: 0, posts: 0, openOpportunities: 0 },
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        b.set(doc(db, 'projects', effectiveSlug, 'members', user.uid), {
          uid: user.uid, role: 'owner', title: 'Kurucu', joinedAt: serverTimestamp(), viaOpportunityId: null,
        });
        try { await b.commit(); } catch (e) {
          if ((e as { code?: string }).code === 'permission-denied') throw new Error('Bu adreste zaten bir proje var ya da e-postan doğrulanmamış; farklı bir sayfa adresi dene.');
          throw e;
        }
        router.push('/tesekkurler?tip=girisim');
      } else if (!editing) {
        const ref = doc(db, 'projects', effectiveSlug);
        if ((await getDoc(ref)).exists()) throw new Error('Bu adreste zaten bir proje var; farklı bir adres seç.');
        await setDoc(ref, {
          name: name.trim(), slug: effectiveSlug, tagline: tagline.trim(), description: description.trim(),
          logoUrl, coverUrl: null, kind, ownerId: user.uid, managerIds: [], status, tags: [], links: cleanLinks,
          stats: { members: 0, followers: 0, posts: 0, openOpportunities: 0 },
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        router.push(`/proje/${effectiveSlug}/yonet`);
      } else {
        await updateDoc(doc(db, 'projects', initial!.id), {
          name: name.trim(), tagline: tagline.trim(), description: description.trim(), logoUrl, links: cleanLinks,
          updatedAt: serverTimestamp(),
          ...(admin ? { kind, status } : {}),
        });
        setOk('Kaydedildi ✓');
      }
    } catch (e) {
      console.error(e);
      setErr((e as Error).message?.startsWith('Bu adreste') ? (e as Error).message : 'Kaydedilemedi. Yetkini ve alanları kontrol et.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pad">
      <div className="field">
        <label>Logo</label>
        <div className="row">
          <Avatar name={name || '?'} src={logoUrl} size={72} />
          <div className="stack" style={{ gap: 6 }}>
            <label className="btn" style={{ textAlign: 'center' }}>
              Görsel seç
              <input type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files?.[0])} />
            </label>
            {logoUrl && <button className="link-btn" onClick={() => setLogoUrl(null)}>Logoyu kaldır</button>}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pf-name">Girişim / proje adı *</label>
        <input id="pf-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="pf-slug">Sayfa adresi</label>
        <div className="row" style={{ gap: 6 }}>
          <span className="meta">amplifierguild.online/proje/</span>
          <input id="pf-slug" className="input" disabled={editing} value={effectiveSlug}
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} />
        </div>
        {editing && <span className="meta" style={{ fontSize: 12 }}>Adres oluşturulduktan sonra değiştirilemez.</span>}
      </div>

      <div className="field">
        <label htmlFor="pf-tag">Kısa tanım</label>
        <input id="pf-tag" className="input" maxLength={100} placeholder="Ör. Öğrenci ekipleri için akıllı robot kitleri"
          value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="pf-about">Hakkında</label>
        <textarea id="pf-about" className="input" rows={7} maxLength={5000} value={description}
          placeholder="Girişimin/projenin hikâyesi, ne yaptığı, hedefleri, ekibi…" onChange={(e) => setDescription(e.target.value)} />
        <span className="meta" style={{ fontSize: 12 }}>{description.length}/5000</span>
      </div>

      {!admin && !editing && (
        <div className="field">
          <label htmlFor="pf-kind2">Tür</label>
          <select id="pf-kind2" className="input" value={kind} onChange={(e) => setKind(e.target.value as Project['kind'])}>
            <option value="partner_startup">Girişim</option>
            <option value="community">Topluluk / öğrenci projesi</option>
          </select>
        </div>
      )}
      {admin && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pf-kind">Tür</label>
            <select id="pf-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as Project['kind'])}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="pf-status">Durum</label>
            <select id="pf-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
              <option value="active">Yayında</option>
              <option value="paused">Duraklatıldı</option>
              <option value="pending">Onay bekliyor (gizli)</option>
              <option value="archived">Arşiv (gizli)</option>
            </select>
          </div>
        </div>
      )}

      <div className="field">
        <label>Sosyal medya ve bağlantılar</label>
        <div className="stack">
          {SOCIALS.map((s) => (
            <div key={s.key} className="row" style={{ gap: 8 }}>
              <span className="meta" style={{ width: 96, flexShrink: 0 }}>{s.label}</span>
              <input className="input" inputMode="url" placeholder={s.placeholder} value={links[s.key] ?? ''}
                onChange={(e) => setLinks({ ...links, [s.key]: e.target.value })} aria-label={s.label} />
            </div>
          ))}
        </div>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {ok && <p className="meta" role="status">{ok}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy} onClick={save}>
        {busy ? 'Kaydediliyor…' : editing ? 'Değişiklikleri kaydet' : admin ? 'Sayfayı oluştur' : 'Başvuruyu gönder'}
      </button>
    </div>
  );
}
