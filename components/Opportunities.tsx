'use client';

import {
  collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Application, Opportunity } from '@/shared/models';
import { computeMatchScore } from '@/shared/match';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { ROLE_TYPE_LABEL } from '@/lib/format';
import { normalizeUrl } from '@/lib/image';

export type Opp = Opportunity & { id: string };
export type App = Application & { id: string };

/** Açık ilanlar (tüm projeler, collection group). */
export function useOpenOpportunities(max = 50) {
  const { profile } = useAuth();
  const [opps, setOpps] = useState<Opp[] | null>(null);
  useEffect(() => {
    if (!profile) return;
    getDocs(query(collectionGroup(db, 'opportunities'), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limit(max)))
      .then((s) => setOpps(s.docs.map((d) => ({ id: d.id, ...(d.data() as Opportunity) }))))
      .catch((e) => { console.error(e); setOpps([]); });
  }, [profile, max]);
  return opps;
}

/** Kullanıcının başvuruları (collection group). */
export function useMyApplications() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<App[] | null>(null);
  const reload = useMemo(() => () => {
    if (!profile) return;
    getDocs(query(collectionGroup(db, 'applications'), where('applicantId', '==', profile.uid), orderBy('createdAt', 'desc')))
      .then((s) => setApps(s.docs.map((d) => ({ id: d.id, ...(d.data() as Application) }))))
      .catch((e) => { console.error(e); setApps([]); });
  }, [profile]);
  useEffect(() => { reload(); }, [reload]);
  return { apps, reload };
}

/** İlan listesi: uyum skoruna göre sıralı kartlar + tek tık başvuru. */
export function OpportunityList({ max, filters = true, emptyText }: { max?: number; filters?: boolean; emptyText?: string }) {
  const { profile } = useAuth();
  const opps = useOpenOpportunities();
  const { apps } = useMyApplications();
  const [extraApplied, setExtraApplied] = useState<string[]>([]);
  const [skill, setSkill] = useState<string | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [open, setOpen] = useState<Opp | null>(null);

  const applied = useMemo(
    () => new Set([...(apps ?? []).map((a) => a.opportunityId), ...extraApplied]),
    [apps, extraApplied],
  );

  const scored = useMemo(() => (opps ?? [])
    .map((o) => ({ o, score: profile ? computeMatchScore({ applicant: profile, opportunity: o }) : 0 }))
    .filter(({ o }) => (!skill || o.requiredSkillSlugs?.includes(skill)) && (!remoteOnly || o.location?.remote))
    .sort((a, b) => b.score - a.score)
    .slice(0, max ?? Infinity), [opps, profile, skill, remoteOnly, max]);

  const allSkills = useMemo(() => {
    const m = new Map<string, string>();
    (opps ?? []).forEach((o) => o.requiredSkillSlugs?.forEach((s, i) => m.set(s, o.requiredSkills?.[i] ?? s)));
    return [...m.entries()].slice(0, 16);
  }, [opps]);

  return (
    <>
      {filters && (
        <div className="pad" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="chips">
            <button className={`chip${remoteOnly ? ' on' : ''}`} onClick={() => setRemoteOnly(!remoteOnly)}>Uzaktan</button>
            {allSkills.map(([slug, label]) => (
              <button key={slug} className={`chip${skill === slug ? ' on' : ''}`} onClick={() => setSkill(skill === slug ? null : slug)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {opps === null ? (
        <div className="center" style={{ minHeight: 160 }}><div className="spinner" /></div>
      ) : scored.length === 0 ? (
        <div className="empty">{emptyText ?? 'Şu an açık ilan yok. Projeler pozisyon açtığında burada göreceksin.'}</div>
      ) : (
        scored.map(({ o, score }) => (
          <div key={`${o.projectId}/${o.id}`} className="card stack">
            {o.coverUrl && (
              <Link href={`/ilan/${o.projectId}/${o.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.coverUrl} alt="" className="opp-cover" />
              </Link>
            )}
            <div className="row spread" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="meta"><Link href={`/proje/${o.projectId}`}>{o.projectSnapshot?.name}</Link></div>
                <Link href={`/ilan/${o.projectId}/${o.id}`} className="post-name" style={{ fontSize: 16 }}>{o.title}</Link>
              </div>
              {score >= 50 && <span className={`badge-match${score >= 80 ? ' high' : ''}`}>%{score} uyum</span>}
            </div>
            <div className="chips">
              <span className="chip solid">{ROLE_TYPE_LABEL[o.roleType] ?? o.roleType}</span>
              <span className="chip solid">{o.commitment?.hoursPerWeek} sa/hafta</span>
              <span className="chip solid">{o.location?.remote ? 'Uzaktan' : o.location?.city}</span>
              <span className="chip solid">{o.slots - (o.filledCount ?? 0)} kontenjan</span>
            </div>
            {o.description && <p className="post-text meta" style={{ margin: 0 }}>{o.description.slice(0, 220)}</p>}
            <div className="row spread">
              <div className="chips">{o.requiredSkills?.map((s) => <span key={s} className="meta">#{s}</span>)}</div>
              {applied.has(o.id) ? (
                <button className="btn" disabled>Başvuruldu ✓</button>
              ) : (
                <button className="btn btn-primary" onClick={() => setOpen(o)}>Başvur</button>
              )}
            </div>
          </div>
        ))
      )}

      {open && profile && (
        <ApplySheet opp={open} onClose={() => setOpen(null)} onDone={() => { setExtraApplied([...extraApplied, open.id]); setOpen(null); }} />
      )}
    </>
  );
}

/** İlana özel başvuru formu — site içinde açılır. */
export function ApplySheet({ opp, onClose, onDone }: { opp: Opp; onClose: () => void; onDone: () => void }) {
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!profile || !user) return null;

  const questions = opp.questions ?? [];
  const invalidUrl = questions.some((q) => q.type === 'url' && answers[q.id]?.trim() && !normalizeUrl(answers[q.id]));
  const missing = questions.some((q) => q.required && !answers[q.id]?.trim());

  async function apply() {
    if (!profile || !user) return;
    setBusy(true);
    setErr('');
    try {
      const member = await getDoc(doc(db, 'projects', opp.projectId, 'members', profile.uid));
      if (member.exists()) throw new Error('member');
      const clean: Record<string, string> = {};
      for (const q of questions) {
        const v = answers[q.id]?.trim();
        if (v) clean[q.id] = (q.type === 'url' ? normalizeUrl(v) ?? v : v).slice(0, q.maxLength || 2000);
      }
      const aid = `${opp.id}_${profile.uid}`;
      const appRef = doc(db, 'projects', opp.projectId, 'applications', aid);
      const batch = writeBatch(db);
      batch.set(appRef, {
        opportunityId: opp.id,
        projectId: opp.projectId,
        applicantId: profile.uid,
        opportunitySnapshot: { title: opp.title, roleType: opp.roleType },
        projectSnapshot: opp.projectSnapshot,
        applicantSnapshot: {
          displayName: profile.displayName, handle: profile.handle, photoURL: profile.photoURL,
          headline: profile.headline, skills: profile.skills, programs: profile.programs, school: profile.school,
        },
        answers: clean,
        message: message.trim().slice(0, 1000),
        matchScore: null,
        status: 'submitted',
        statusHistory: [],
        decidedBy: null,
        decidedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // İletişim bilgisi ayrı belge: yöneticiye yalnızca kabul sonrası açılır
      batch.set(doc(appRef, 'contact', 'info'), { email: user.email ?? '', createdAt: serverTimestamp() });
      await batch.commit();
      onDone();
    } catch (e) {
      console.error(e);
      setErr((e as Error).message === 'member' ? 'Zaten bu projenin ekibindesin.' : 'Başvuru gönderilemedi (zaten başvurmuş olabilirsin ya da ilan kapanmış olabilir).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Başvuru formu" className="sheet-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sheet pad">
        <div className="meta">{opp.projectSnapshot?.name}</div>
        <h2 className="h1" style={{ fontSize: 19, marginBottom: 12 }}>{opp.title}</h2>
        <p className="meta" style={{ marginTop: 0 }}>Profilin (@{profile.handle}) CV olarak başvuruna eklenecek.</p>
        {questions.map((q) => (
          <div className="field" key={q.id}>
            <label htmlFor={`q-${q.id}`}>{q.label}{q.required && ' *'}</label>
            {q.type === 'textarea' ? (
              <textarea id={`q-${q.id}`} className="input" rows={4} maxLength={q.maxLength || 2000}
                value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            ) : q.type === 'select' ? (
              <select id={`q-${q.id}`} className="input" value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                <option value="">Seç…</option>
                {(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input id={`q-${q.id}`} className="input" type={q.type === 'url' ? 'url' : 'text'} inputMode={q.type === 'url' ? 'url' : undefined}
                placeholder={q.type === 'url' ? 'https://…' : ''} maxLength={q.maxLength || 300}
                value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            )}
            {q.type === 'url' && answers[q.id]?.trim() && !normalizeUrl(answers[q.id]) && <span className="error">Geçerli bir bağlantı gir.</span>}
          </div>
        ))}
        <div className="field">
          <label htmlFor="q-msg">Kısa not (isteğe bağlı)</label>
          <textarea id="q-msg" className="input" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <p className="meta" style={{ fontSize: 12 }}>E-posta adresin proje yöneticisiyle yalnızca başvurun kabul edilirse paylaşılır.</p>
        {err && <p className="error">{err}</p>}
        <div className="row spread">
          <button className="btn" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-primary" disabled={busy || missing || invalidUrl} onClick={apply}>{busy ? 'Gönderiliyor…' : 'Başvuruyu gönder'}</button>
        </div>
      </div>
    </div>
  );
}
