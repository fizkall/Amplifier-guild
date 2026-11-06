'use client';

import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Application, ApplicationStatus } from '@/shared/models';
import { computeMatchScore, toSlug } from '@/shared/match';
import { AppShell } from '@/components/AppShell';
import { programChip } from '@/lib/team';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { APP_STATUS_LABEL, timeAgo } from '@/lib/format';
import { useCanManage, useProject, type OppDoc, type ProjectDoc } from '@/lib/projects';

type App = Application & { id: string };
const ORDER: ApplicationStatus[] = ['submitted', 'in_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'];
const FILTERS: { key: 'all' | ApplicationStatus; label: string }[] = [
  { key: 'all', label: 'Tümü' }, { key: 'submitted', label: 'Yeni' }, { key: 'in_review', label: 'İnceleniyor' },
  { key: 'shortlisted', label: 'Kısa liste' }, { key: 'accepted', label: 'Kabul' }, { key: 'rejected', label: 'Ret' },
];

function AppCard({ app, opp, project }: { app: App; opp: OppDoc; project: ProjectDoc }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [contact, setContact] = useState<string | null>(null);
  const a = app.applicantSnapshot;
  const score = computeMatchScore({
    applicant: { skillSlugs: (a.skills ?? []).map(toSlug), programs: a.programs ?? [], availability: null },
    opportunity: opp,
  });

  useEffect(() => {
    if (app.status !== 'accepted') return;
    // Kabul yazımı sunucuya ulaşmadan okuma reddedilebilir → birkaç kez tekrar dene
    let cancelled = false;
    const load = async (attempt: number) => {
      try {
        const s = await getDoc(doc(db, 'projects', project.id, 'applications', app.id, 'contact', 'info'));
        if (!cancelled) setContact(s.exists() ? (s.get('email') as string) : null);
      } catch {
        if (!cancelled && attempt < 4) setTimeout(() => load(attempt + 1), 800 * (attempt + 1));
      }
    };
    load(0);
    return () => { cancelled = true; };
  }, [app.status, app.id, project.id]);

  async function decide(status: ApplicationStatus) {
    if (!user) return;
    if (status === 'accepted' && !confirm(`${a.displayName} kabul edilsin mi? Ekibe eklenecek ve profiline doğrulanmış deneyim yazılacak.`)) return;
    if (status === 'rejected' && !confirm(`${a.displayName} başvurusu reddedilsin mi?`)) return;
    setBusy(true);
    setErr('');
    try {
      const now = Timestamp.now();
      const b = writeBatch(db);
      const appRef = doc(db, 'projects', project.id, 'applications', app.id);
      b.update(appRef, {
        status,
        statusHistory: [...(app.statusHistory ?? []), { status, at: now, by: user.uid }],
        updatedAt: serverTimestamp(),
        ...(status === 'accepted' || status === 'rejected' ? { decidedBy: user.uid, decidedAt: now } : {}),
      });
      if (status === 'accepted') {
        b.set(doc(db, 'projects', project.id, 'members', app.applicantId), {
          uid: app.applicantId, role: 'member', title: opp.title,
          userSnapshot: { displayName: a.displayName, handle: a.handle, photoURL: a.photoURL },
          joinedAt: now, viaOpportunityId: opp.id,
        });
        b.set(doc(collection(db, 'users', app.applicantId, 'experiences')), {
          type: 'guild_project', title: opp.title, organization: project.name, program: null,
          startDate: now.toDate().toISOString().slice(0, 7), endDate: null,
          description: project.tagline || '', skills: opp.requiredSkills ?? [], verified: true,
          source: { projectId: project.id, opportunityId: opp.id }, order: -1,
        });
        const filled = (opp.filledCount ?? 0) + 1;
        b.update(doc(db, 'projects', project.id, 'opportunities', opp.id), {
          filledCount: filled, ...(filled >= opp.slots ? { status: 'filled' } : {}), updatedAt: serverTimestamp(),
        });
      }
      await b.commit();
    } catch (e) {
      console.error(e);
      setErr('İşlem kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  const answers = (opp.questions ?? []).filter((q) => app.answers?.[q.id]);
  const final = ['accepted', 'rejected', 'withdrawn'].includes(app.status);

  return (
    <div className="card stack">
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <Link href={`/profil/${a.handle}`} className="row" style={{ minWidth: 0 }}>
          <Avatar name={a.displayName} src={a.photoURL} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="post-name">{a.displayName}</div>
            <div className="meta">@{a.handle} · {timeAgo(app.createdAt as never)}</div>
          </div>
        </Link>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
          <span className={`status-${app.status}`} style={{ fontWeight: 600, fontSize: 13 }}>{APP_STATUS_LABEL[app.status]}</span>
          {score >= 1 && <span className={`badge-match${score >= 80 ? ' high' : ''}`}>%{score}</span>}
        </div>
      </div>
      {a.headline && <div>{a.headline}</div>}
      <div className="chips">
        {(a.programs ?? []).map((p, i) => <span key={i} className="chip solid">{programChip(p)}</span>)}
        {(a.skills ?? []).slice(0, 8).map((s) => <span key={s} className="chip">{s}</span>)}
      </div>
      {a.school && <div className="meta">{a.school.name}{a.school.gradYear ? ` · ${a.school.gradYear}` : ''}</div>}

      {(answers.length > 0 || app.message) && (
        <button className="link-btn strong" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(!open)}>
          {open ? 'Form yanıtlarını gizle' : `Form yanıtları (${answers.length + (app.message ? 1 : 0)})`}
        </button>
      )}
      {open && (
        <div className="notice" style={{ margin: 0 }}>
          {answers.map((q) => (
            <div key={q.id} style={{ marginBottom: 10 }}>
              <div className="meta" style={{ fontWeight: 600 }}>{q.label}</div>
              {q.type === 'url'
                ? <a href={app.answers[q.id]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', wordBreak: 'break-all' }}>{app.answers[q.id]}</a>
                : <div className="post-text" style={{ margin: 0 }}>{app.answers[q.id]}</div>}
            </div>
          ))}
          {app.message && (<div><div className="meta" style={{ fontWeight: 600 }}>Not</div><div className="post-text" style={{ margin: 0 }}>{app.message}</div></div>)}
        </div>
      )}

      {app.status === 'accepted' && (
        <div className="meta">İletişim: {contact ? <a href={`mailto:${contact}`} style={{ textDecoration: 'underline' }}>{contact}</a> : '—'}</div>
      )}

      {!final && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {app.status === 'submitted' && <button className="btn" disabled={busy} onClick={() => decide('in_review')}>İncelemeye al</button>}
          {app.status !== 'shortlisted' && <button className="btn" disabled={busy} onClick={() => decide('shortlisted')}>Kısa liste</button>}
          <button className="btn btn-primary" disabled={busy || (opp.filledCount ?? 0) >= opp.slots} onClick={() => decide('accepted')}>Kabul et</button>
          <button className="btn" disabled={busy} onClick={() => decide('rejected')}>Reddet</button>
        </div>
      )}
      {err && <p className="error" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}

function Applications({ slug, oid }: { slug: string; oid: string }) {
  const project = useProject(slug);
  const canManage = useCanManage(project);
  const [opp, setOpp] = useState<OppDoc | null | undefined>(undefined);
  const [apps, setApps] = useState<App[] | null>(null);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  useEffect(() => {
    if (!canManage) return;
    const unsubOpp = onSnapshot(
      doc(db, 'projects', slug, 'opportunities', oid),
      (s) => setOpp(s.exists() ? ({ ...(s.data() as Omit<OppDoc, 'id'>), id: s.id }) : null),
      () => setOpp(null),
    );
    const unsubApps = onSnapshot(
      query(collection(db, 'projects', slug, 'applications'), where('opportunityId', '==', oid)),
      (s) => setApps(s.docs.map((d) => ({ id: d.id, ...(d.data() as Application) }))),
      (e) => { console.error(e); setApps([]); },
    );
    return () => { unsubOpp(); unsubApps(); };
  }, [slug, oid, canManage]);

  const list = useMemo(() => (apps ?? [])
    .filter((a) => (filter === 'all' ? a.status !== 'withdrawn' : a.status === filter))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
  [apps, filter]);

  if (project === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!project || !canManage) return <div className="empty">Bu başvuruları görme yetkin yok.</div>;
  if (opp === undefined || apps === null) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!opp) return <div className="empty">İlan bulunamadı.</div>;

  return (
    <>
      <div className="pad stack" style={{ gap: 4 }}>
        <Link href={`/proje/${project.id}/yonet`} className="meta">← {project.name}</Link>
        <h1 className="h1" style={{ fontSize: 20 }}>{opp.title}</h1>
        <div className="meta">{(apps ?? []).filter((a) => a.status !== 'withdrawn').length} başvuru · {opp.filledCount ?? 0}/{opp.slots} kontenjan dolu</div>
      </div>
      <div className="pad" style={{ paddingTop: 0, borderBottom: '1px solid var(--border)' }}>
        <div className="chips">
          {FILTERS.map((f) => {
            const n = f.key === 'all' ? apps.filter((a) => a.status !== 'withdrawn').length : apps.filter((a) => a.status === f.key).length;
            return <button key={f.key} className={`chip${filter === f.key ? ' on' : ''}`} onClick={() => setFilter(f.key)}>{f.label} {n}</button>;
          })}
        </div>
      </div>
      {list.length === 0 ? <div className="empty">Bu filtrede başvuru yok.</div> : list.map((a) => <AppCard key={a.id} app={a} opp={opp} project={project} />)}
    </>
  );
}

export default function BasvurularPage() {
  const { slug, oid } = useParams<{ slug: string; oid: string }>();
  return <AppShell title="Başvurular">{firebaseReady && <Applications slug={decodeURIComponent(slug)} oid={oid} />}</AppShell>;
}
