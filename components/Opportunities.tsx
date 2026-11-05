'use client';

import {
  collection, collectionGroup, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Application, Opportunity } from '@/shared/models';
import { computeMatchScore } from '@/shared/match';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { ROLE_TYPE_LABEL } from '@/lib/format';

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
    () => new Set([...(apps ?? []).filter((a) => a.status !== 'withdrawn').map((a) => a.opportunityId), ...extraApplied]),
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
            <div className="row spread" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="meta"><Link href={`/proje/${o.projectSnapshot?.slug}`}>{o.projectSnapshot?.name}</Link></div>
                <div className="post-name" style={{ fontSize: 16 }}>{o.title}</div>
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

function ApplySheet({ opp, onClose, onDone }: { opp: Opp; onClose: () => void; onDone: () => void }) {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!profile) return null;

  const missing = (opp.questions ?? []).some((q) => q.required && !answers[q.id]?.trim());

  async function apply() {
    if (!profile) return;
    setBusy(true);
    setErr('');
    try {
      const member = await getDoc(doc(db, 'projects', opp.projectId, 'members', profile.uid));
      if (member.exists()) throw new Error('member');
      await setDoc(doc(collection(db, 'projects', opp.projectId, 'applications'), `${opp.id}_${profile.uid}`), {
        opportunityId: opp.id,
        projectId: opp.projectId,
        applicantId: profile.uid,
        opportunitySnapshot: { title: opp.title, roleType: opp.roleType },
        projectSnapshot: opp.projectSnapshot,
        applicantSnapshot: {
          displayName: profile.displayName, handle: profile.handle, photoURL: profile.photoURL,
          headline: profile.headline, skills: profile.skills, programs: profile.programs, school: profile.school,
        },
        answers,
        message: message.trim().slice(0, 1000),
        matchScore: null,
        status: 'submitted',
        statusHistory: [],
        decidedBy: null,
        decidedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onDone();
    } catch (e) {
      console.error(e);
      setErr((e as Error).message === 'member' ? 'Zaten bu projenin ekibindesin.' : 'Başvuru gönderilemedi (zaten başvurmuş olabilirsin).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Başvuru" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="pad"
        style={{ background: 'var(--surface-raised)', width: '100%', maxWidth: 560, borderRadius: '24px 24px 0 0', border: '1px solid var(--border)', maxHeight: '90dvh', overflow: 'auto' }}>
        <div className="meta">{opp.projectSnapshot?.name}</div>
        <h2 className="h1" style={{ fontSize: 19, marginBottom: 12 }}>{opp.title}</h2>
        <p className="meta" style={{ marginTop: 0 }}>Profilin (@{profile.handle}) CV olarak gönderilecek.</p>
        {(opp.questions ?? []).map((q) => (
          <div className="field" key={q.id}>
            <label>{q.label}{q.required && ' *'}</label>
            <textarea className="input" rows={3} maxLength={q.maxLength} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
          </div>
        ))}
        <div className="field">
          <label>Kısa not (isteğe bağlı)</label>
          <textarea className="input" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {err && <p className="error">{err}</p>}
        <div className="row spread">
          <button className="btn" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-primary" disabled={busy || missing} onClick={apply}>{busy ? 'Gönderiliyor…' : 'Başvuruyu gönder'}</button>
        </div>
      </div>
    </div>
  );
}

