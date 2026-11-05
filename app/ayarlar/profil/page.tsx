'use client';

import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Experience, ExperienceType, Program, ProgramEntry } from '@/shared/models';
import { toSlug } from '@/shared/match';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { CheckIcon } from '@/components/Icons';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { imageToDataUrl, normalizeUrl } from '@/lib/image';

const HANDLE_RE = /^[a-z0-9_.]{3,24}$/;
const PROGRAMS: Program[] = ['FRC', 'FTC', 'FLL', 'TEKNOFEST', 'TUBITAK', 'WRO', 'MUN', 'OTHER'];
const P_LABEL = (p: Program) => (p === 'OTHER' ? 'Diğer' : p === 'TUBITAK' ? 'TÜBİTAK' : p);
const LINKS = [['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['portfolio', 'Portfolyo / web'], ['instagram', 'Instagram']] as const;
const EXP_TYPES: [ExperienceType, string][] = [
  ['frc_season', 'Takım sezonu'], ['competition', 'Yarışma'], ['award', 'Ödül'], ['project', 'Proje'],
  ['education', 'Eğitim'], ['volunteer', 'Gönüllülük'],
];

type Exp = Experience & { id: string };

function ExperiencesEditor({ uid }: { uid: string }) {
  const [list, setList] = useState<Exp[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: 'project' as ExperienceType, title: '', organization: '', startDate: '', endDate: '', description: '' });
  const [err, setErr] = useState('');

  const load = () => getDocs(collection(db, 'users', uid, 'experiences'))
    .then((s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))))
    .catch(() => setList([]));
  useEffect(() => { load(); }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    setErr('');
    if (!form.title.trim()) return setErr('Başlık gir.');
    if (!/^\d{4}-\d{2}$/.test(form.startDate)) return setErr('Başlangıç tarihini seç.');
    await addDoc(collection(db, 'users', uid, 'experiences'), {
      type: form.type, title: form.title.trim().slice(0, 100), organization: form.organization.trim().slice(0, 100),
      program: null, startDate: form.startDate, endDate: form.endDate || null, description: form.description.trim().slice(0, 1000),
      skills: [], verified: false, source: null, order: (list?.length ?? 0) + 1,
    });
    setForm({ type: 'project', title: '', organization: '', startDate: '', endDate: '', description: '' });
    setAdding(false);
    load();
  }

  async function remove(x: Exp) {
    if (!confirm(x.verified ? 'Doğrulanmış Guild deneyimi CV\'nden kaldırılsın mı? Geri eklenemez.' : 'Deneyim silinsin mi?')) return;
    await deleteDoc(doc(db, 'users', uid, 'experiences', x.id));
    load();
  }

  return (
    <>
      <div className="section-head" style={{ margin: '8px -16px 0' }}><span>Deneyimler (CV)</span></div>
      {list === null ? <div className="center" style={{ minHeight: 60 }}><div className="spinner" /></div> : list.map((x) => (
        <div key={x.id} className="row spread" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 6 }}><b>{x.title}</b>{x.verified && <span className="verified" title="Doğrulanmış"><CheckIcon /></span>}</div>
            <div className="meta">{x.organization} · {x.startDate}{x.endDate ? ` – ${x.endDate}` : ' – devam'}</div>
          </div>
          <button className="link-btn" onClick={() => remove(x)}>Sil</button>
        </div>
      ))}
      {adding ? (
        <div className="notice" style={{ margin: '12px 0' }}>
          <div className="field"><label>Tür</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExperienceType })}>
              {EXP_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></div>
          <div className="field"><label>Başlık *</label><input className="input" maxLength={100} placeholder="Ör. Yazılım Alt Takım Lideri" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Kurum / takım</label><input className="input" maxLength={100} placeholder="Ör. FRC #6232" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="field" style={{ flex: 1 }}><label>Başlangıç *</label><input className="input" type="month" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field" style={{ flex: 1 }}><label>Bitiş</label><input className="input" type="month" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="field"><label>Açıklama</label><textarea className="input" rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {err && <p className="error">{err}</p>}
          <div className="row" style={{ gap: 8 }}><button className="btn" onClick={() => setAdding(false)}>Vazgeç</button><button className="btn btn-primary" onClick={add}>Ekle</button></div>
        </div>
      ) : (
        <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={() => setAdding(true)}>+ Deneyim ekle</button>
      )}
    </>
  );
}

function EditProfile() {
  const { user, profile } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'same' | 'checking' | 'free' | 'taken' | 'invalid'>('same');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [school, setSchool] = useState('');
  const [city, setCity] = useState('');
  const [gradYear, setGradYear] = useState(new Date().getFullYear() + 1);
  const [programs, setPrograms] = useState<ProgramEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [hours, setHours] = useState(5);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!profile || ready) return;
    setPhoto(profile.photoURL); setName(profile.displayName); setHandle(profile.handle);
    setHeadline(profile.headline ?? ''); setBio(profile.bio ?? '');
    setSchool(profile.school?.name ?? ''); setCity(profile.school?.city ?? profile.availability?.city ?? '');
    setGradYear(profile.school?.gradYear ?? new Date().getFullYear() + 1);
    setPrograms(profile.programs ?? []); setSkills(profile.skills ?? []);
    setHours(profile.availability?.hoursPerWeek ?? 5); setLinks({ ...(profile.links ?? {}) } as Record<string, string>);
    setReady(true);
  }, [profile, ready]);

  useEffect(() => {
    if (!profile || !ready) return;
    if (handle === profile.handle) return setHandleState('same');
    if (!HANDLE_RE.test(handle)) return setHandleState('invalid');
    setHandleState('checking');
    const t = setTimeout(async () => {
      const s = await getDoc(doc(db, 'handles', handle)).catch(() => null);
      setHandleState(!s?.exists() || s.data().uid === profile.uid ? 'free' : 'taken');
    }, 350);
    return () => clearTimeout(t);
  }, [handle, profile, ready]);

  if (!user || !profile || !ready) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;

  function addSkill(v: string) {
    const t = v.trim();
    if (t && !skills.some((s) => toSlug(s) === toSlug(t)) && skills.length < 30) setSkills([...skills, t]);
    setSkillInput('');
  }
  async function pickPhoto(f: File | undefined) {
    if (!f) return;
    try { setPhoto(await imageToDataUrl(f, 256, 0.85)); } catch (e) { setErr((e as Error).message); }
  }

  async function save() {
    setErr(''); setMsg('');
    if (!name.trim()) return setErr('Ad soyad boş olamaz.');
    if (handleState === 'taken' || handleState === 'invalid' || handleState === 'checking') return setErr('Kullanıcı adını kontrol et.');
    const cleanLinks: Record<string, string> = {};
    for (const [k] of LINKS) {
      const v = links[k]?.trim();
      if (!v) continue;
      const n = normalizeUrl(v);
      if (!n) return setErr(`Geçersiz bağlantı: ${k}`);
      cleanLinks[k] = n;
    }
    setBusy(true);
    try {
      const b = writeBatch(db);
      const handleChanged = handle !== profile!.handle;
      if (handleChanged) {
        b.set(doc(db, 'handles', handle), { uid: profile!.uid, createdAt: serverTimestamp() });
        b.delete(doc(db, 'handles', profile!.handle));
      }
      b.update(doc(db, 'users', profile!.uid), {
        displayName: name.trim().slice(0, 60), handle, photoURL: photo, headline: headline.trim().slice(0, 120), bio: bio.trim().slice(0, 500),
        school: school.trim() ? { name: school.trim(), city: city.trim(), gradYear } : null,
        programs: programs.filter((p) => p.program), skills, skillSlugs: skills.map(toSlug),
        availability: { ...(profile!.availability ?? { remote: true }), hoursPerWeek: hours, city: city.trim() || null },
        links: cleanLinks, updatedAt: serverTimestamp(),
      });
      await b.commit();
      setMsg('Profil kaydedildi ✓');
    } catch (e) {
      console.error(e);
      setErr('Kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  const hint = { same: '', checking: 'Kontrol ediliyor…', free: '✓ Müsait', taken: 'Bu kullanıcı adı alınmış', invalid: '3–24 karakter: küçük harf, rakam, _ ve .' }[handleState];

  return (
    <div className="pad">
      <div className="row" style={{ marginBottom: 16 }}>
        <Avatar name={name} src={photo} size={80} />
        <div className="stack" style={{ gap: 6 }}>
          <label className="btn" style={{ textAlign: 'center' }}>Fotoğraf seç<input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} /></label>
          {photo && <button className="link-btn" onClick={() => setPhoto(null)}>Fotoğrafı kaldır</button>}
        </div>
      </div>

      <div className="field"><label htmlFor="ep-name">Ad Soyad</label><input id="ep-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="ep-handle">Kullanıcı adı</label>
        <input id="ep-handle" className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
        {hint && <span className={handleState === 'free' ? 'meta' : 'error'}>{hint}</span>}
        {handleState === 'free' && <span className="meta" style={{ fontSize: 12 }}>Eski profil bağlantın (@{profile.handle}) çalışmayı bırakır.</span>}
      </div>
      <div className="field"><label htmlFor="ep-hl">Kısa başlık</label><input id="ep-hl" className="input" maxLength={120} value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
      <div className="field"><label htmlFor="ep-bio">Hakkımda</label><textarea id="ep-bio" className="input" rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} /><span className="meta" style={{ fontSize: 12 }}>{bio.length}/500</span></div>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="field" style={{ flex: 2 }}><label htmlFor="ep-school">Okul</label><input id="ep-school" className="input" value={school} onChange={(e) => setSchool(e.target.value)} /></div>
        <div className="field" style={{ flex: 1 }}><label htmlFor="ep-grad">Mezuniyet</label><input id="ep-grad" className="input" type="number" value={gradYear} onChange={(e) => setGradYear(Number(e.target.value))} /></div>
      </div>
      <div className="field"><label htmlFor="ep-city">Şehir</label><input id="ep-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} /></div>

      <div className="field">
        <label>Program / takım geçmişi</label>
        <div className="stack">
          {programs.map((p, i) => (
            <div key={i} className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <select className="input" style={{ flex: '1 1 110px' }} value={p.program} aria-label="Program"
                onChange={(e) => setPrograms(programs.map((x, j) => (j === i ? { ...x, program: e.target.value as Program } : x)))}>
                {PROGRAMS.map((x) => <option key={x} value={x}>{P_LABEL(x)}</option>)}
              </select>
              <input className="input" style={{ flex: '1 1 80px' }} inputMode="numeric" placeholder="Takım no" value={p.teamNumber ?? ''} aria-label="Takım numarası"
                onChange={(e) => setPrograms(programs.map((x, j) => (j === i ? { ...x, teamNumber: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined } : x)))} />
              <input className="input" style={{ flex: '2 1 140px' }} placeholder="Rolün" value={p.role ?? ''} aria-label="Rol"
                onChange={(e) => setPrograms(programs.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
              <button className="link-btn" aria-label="Sil" onClick={() => setPrograms(programs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn" onClick={() => setPrograms([...programs, { program: 'FRC', seasons: [new Date().getFullYear()] }])}>+ Program ekle</button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="ep-skill">Yetenekler</label>
        <div className="chips" style={{ marginBottom: 8 }}>
          {skills.map((s) => <button key={s} className="chip on" onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} ✕</button>)}
        </div>
        <input id="ep-skill" className="input" placeholder="Yaz ve Enter'a bas" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }} onBlur={() => skillInput && addSkill(skillInput)} />
      </div>

      <div className="field"><label htmlFor="ep-hours">Haftada ayırabileceğin saat: {hours}</label><input id="ep-hours" type="range" min={1} max={40} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></div>

      <div className="field">
        <label>Bağlantılar</label>
        <div className="stack">
          {LINKS.map(([k, l]) => (
            <div key={k} className="row" style={{ gap: 8 }}>
              <span className="meta" style={{ width: 110, flexShrink: 0 }}>{l}</span>
              <input className="input" inputMode="url" placeholder="https://…" value={links[k] ?? ''} aria-label={l} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="meta" role="status" style={{ color: 'var(--success)' }}>{msg}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Profili kaydet'}</button>

      <ExperiencesEditor uid={profile.uid} />
      <p style={{ textAlign: 'center', marginTop: 20 }}><Link href="/ayarlar" className="link-btn">← Ayarlar</Link></p>
    </div>
  );
}

export default function ProfilDuzenlePage() {
  return <AppShell title="Profili düzenle">{firebaseReady && <EditProfile />}</AppShell>;
}
