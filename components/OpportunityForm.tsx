'use client';

import { addDoc, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OpportunityQuestion, QuestionType, RoleType } from '@/shared/models';
import { toSlug } from '@/shared/match';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { ROLE_TYPE_LABEL } from '@/lib/format';
import { imageToDataUrl, normalizeUrl } from '@/lib/image';
import { projectSnapshot, type OppDoc, type ProjectDoc } from '@/lib/projects';

const Q_TYPES: Record<QuestionType, string> = {
  text: 'Kısa yanıt',
  textarea: 'Uzun yanıt',
  url: 'Bağlantı (link)',
  select: 'Seçenekli',
};

const newId = () => Math.random().toString(36).slice(2, 8);

function toDateInput(ts: { toDate(): Date } | null | undefined) {
  return ts ? ts.toDate().toISOString().slice(0, 10) : '';
}

/** İlan oluşturma / düzenleme + ilana özel başvuru formu oluşturucu. */
export function OpportunityForm({ project, initial }: { project: ProjectDoc; initial?: OppDoc }) {
  const { user } = useAuth();
  const router = useRouter();
  const editing = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.coverUrl ?? null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>(initial?.links ?? []);
  const [roleType, setRoleType] = useState<RoleType>(initial?.roleType ?? 'volunteer');
  const [hours, setHours] = useState(initial?.commitment?.hoursPerWeek ?? 5);
  const [weeks, setWeeks] = useState<string>(initial?.commitment?.durationWeeks ? String(initial.commitment.durationWeeks) : '');
  const [remote, setRemote] = useState(initial?.location?.remote ?? true);
  const [city, setCity] = useState(initial?.location?.city ?? '');
  const [skills, setSkills] = useState<string[]>(initial?.requiredSkills ?? []);
  const [skillInput, setSkillInput] = useState('');
  const [slots, setSlots] = useState(initial?.slots ?? 1);
  const [deadline, setDeadline] = useState(toDateInput(initial?.deadline as never));
  const [questions, setQuestions] = useState<OpportunityQuestion[]>(initial?.questions ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function addSkill(v: string) {
    const t = v.trim();
    if (t && !skills.some((s) => toSlug(s) === toSlug(t)) && skills.length < 15) setSkills([...skills, t]);
    setSkillInput('');
  }

  async function pickCover(f: File | undefined) {
    if (!f) return;
    setErr('');
    try { setCoverUrl(await imageToDataUrl(f, 1200, 0.75)); } catch (e) { setErr((e as Error).message); }
  }

  const updQ = (i: number, patch: Partial<OpportunityQuestion>) =>
    setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const moveQ = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
  };

  async function save(status: 'draft' | 'open') {
    if (!user) return;
    setErr('');
    if (title.trim().length < 3) return setErr('Başlık en az 3 karakter olmalı.');
    const cleanLinks = links.filter((l) => l.url.trim()).map((l) => ({ label: l.label.trim() || 'Bağlantı', url: normalizeUrl(l.url) ?? '' }));
    if (cleanLinks.some((l) => !l.url)) return setErr('Bağlantılardan biri geçersiz.');
    const cleanQs = questions.filter((q) => q.label.trim()).map((q) => ({
      id: q.id, label: q.label.trim(), type: q.type, required: q.required,
      maxLength: q.type === 'textarea' ? 2000 : 300,
      ...(q.type === 'select' ? { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
    }));
    if (cleanQs.some((q) => q.type === 'select' && (q.options?.length ?? 0) < 2)) return setErr('Seçenekli sorularda en az 2 seçenek olmalı.');

    const data = {
      projectId: project.id,
      projectSnapshot: projectSnapshot(project),
      title: title.trim(),
      description: description.trim(),
      coverUrl,
      links: cleanLinks,
      roleType,
      commitment: { hoursPerWeek: Number(hours) || 1, durationWeeks: weeks ? Number(weeks) : null },
      location: { remote, city: remote ? null : city.trim() || null },
      requiredSkills: skills,
      requiredSkillSlugs: skills.map(toSlug),
      niceToHaveSkillSlugs: initial?.niceToHaveSkillSlugs ?? [],
      questions: cleanQs,
      slots: Math.max(1, Math.min(50, Math.round(Number(slots) || 1))),
      deadline: deadline ? Timestamp.fromDate(new Date(`${deadline}T23:59:59`)) : null,
      status,
      updatedAt: serverTimestamp(),
    };

    setBusy(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'projects', project.id, 'opportunities', initial!.id), data);
      } else {
        await addDoc(collection(db, 'projects', project.id, 'opportunities'), {
          ...data, filledCount: 0, applicationCount: 0, createdBy: user.uid, createdAt: serverTimestamp(),
        });
      }
      router.push(`/proje/${project.id}/yonet`);
    } catch (e) {
      console.error(e);
      setErr('Kaydedilemedi. Projenin "Yayında" olduğundan ve yetkin olduğundan emin ol.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pad">
      <div className="field">
        <label htmlFor="of-title">İlan başlığı *</label>
        <input id="of-title" className="input" maxLength={100} placeholder="Ör. Gömülü Yazılım Geliştirici" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label>Görsel (isteğe bağlı)</label>
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="İlan görseli önizlemesi" className="opp-cover" style={{ marginBottom: 8 }} />
        )}
        <div className="row">
          <label className="btn">{coverUrl ? 'Görseli değiştir' : 'Görsel seç'}<input type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} /></label>
          {coverUrl && <button className="link-btn" onClick={() => setCoverUrl(null)}>Kaldır</button>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="of-desc">Açıklama</label>
        <textarea id="of-desc" className="input" rows={8} maxLength={8000} value={description}
          placeholder="Proje ne, bu rolde ne yapılacak, aranan nitelikler, ekibe katılınca neler kazanılacak…"
          onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label>Bağlantılar</label>
        <div className="stack">
          {links.map((l, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Başlık" value={l.label} maxLength={40}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Bağlantı başlığı" />
              <input className="input" style={{ flex: 2 }} placeholder="https://…" inputMode="url" value={l.url}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} aria-label="Bağlantı adresi" />
              <button className="link-btn" aria-label="Bağlantıyı sil" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          {links.length < 10 && <button className="btn" onClick={() => setLinks([...links, { label: '', url: '' }])}>+ Bağlantı ekle</button>}
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="of-type">Tür</label>
          <select id="of-type" className="input" value={roleType} onChange={(e) => setRoleType(e.target.value as RoleType)}>
            {Object.entries(ROLE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: '1 1 100px' }}>
          <label htmlFor="of-hours">Saat / hafta</label>
          <input id="of-hours" className="input" type="number" min={1} max={60} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: '1 1 100px' }}>
          <label htmlFor="of-weeks">Süre (hafta)</label>
          <input id="of-weeks" className="input" type="number" min={1} max={104} placeholder="Belirsiz" value={weeks} onChange={(e) => setWeeks(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 100px' }}>
          <label htmlFor="of-slots">Kontenjan</label>
          <input id="of-slots" className="input" type="number" min={1} max={50} value={slots} onChange={(e) => setSlots(Number(e.target.value))} />
        </div>
        <div className="field" style={{ flex: '1 1 140px' }}>
          <label htmlFor="of-deadline">Son başvuru</label>
          <input id="of-deadline" className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>

      <label className="row" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Uzaktan çalışılabilir
      </label>
      {!remote && (
        <div className="field">
          <label htmlFor="of-city">Şehir</label>
          <input id="of-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label htmlFor="of-skill">Aranan yetenekler (uyum skoru bunlardan hesaplanır)</label>
        <div className="chips" style={{ marginBottom: 8 }}>
          {skills.map((s) => <button key={s} className="chip on" onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} ✕</button>)}
        </div>
        <input id="of-skill" className="input" placeholder="Yaz ve Enter'a bas" value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); } }}
          onBlur={() => skillInput && addSkill(skillInput)} />
      </div>

      <div className="section-head" style={{ margin: '8px -16px 12px' }}><span>Başvuru formu</span><span className="meta">{questions.length}/10</span></div>
      <p className="meta" style={{ marginTop: 0 }}>Başvuranın profili (CV) otomatik eklenir. Ek olarak sormak istediklerini buraya ekle.</p>
      <div className="stack">
        {questions.map((q, i) => (
          <div key={q.id} className="notice" style={{ margin: 0 }}>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" style={{ flex: 1 }} placeholder={`Soru ${i + 1}`} value={q.label} maxLength={200}
                onChange={(e) => updQ(i, { label: e.target.value })} aria-label={`Soru ${i + 1}`} />
            </div>
            <div className="row spread" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
              <select className="input" style={{ width: 'auto' }} value={q.type} onChange={(e) => updQ(i, { type: e.target.value as QuestionType })} aria-label="Soru tipi">
                {Object.entries(Q_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className="row meta" style={{ gap: 6 }}><input type="checkbox" checked={q.required} onChange={(e) => updQ(i, { required: e.target.checked })} /> Zorunlu</label>
              <div className="row" style={{ gap: 4 }}>
                <button className="link-btn" aria-label="Yukarı taşı" onClick={() => moveQ(i, -1)}>↑</button>
                <button className="link-btn" aria-label="Aşağı taşı" onClick={() => moveQ(i, 1)}>↓</button>
                <button className="link-btn" aria-label="Soruyu sil" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>Sil</button>
              </div>
            </div>
            {q.type === 'select' && (
              <textarea className="input" rows={3} style={{ marginTop: 8 }} placeholder={'Her satıra bir seçenek\nÖr. Yazılım\nMekanik'}
                value={(q.options ?? []).join('\n')} onChange={(e) => updQ(i, { options: e.target.value.split('\n') })} aria-label="Seçenekler" />
            )}
          </div>
        ))}
        {questions.length < 10 && (
          <button className="btn" onClick={() => setQuestions([...questions, { id: newId(), label: '', type: 'text', required: false, maxLength: 300 }])}>+ Soru ekle</button>
        )}
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      <div className="row" style={{ marginTop: 20, gap: 8 }}>
        <button className="btn btn-lg" style={{ flex: 1 }} disabled={busy} onClick={() => save('draft')}>Taslak kaydet</button>
        <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={busy} onClick={() => save('open')}>{editing && initial?.status === 'open' ? 'Kaydet' : 'Yayınla'}</button>
      </div>
    </div>
  );
}
