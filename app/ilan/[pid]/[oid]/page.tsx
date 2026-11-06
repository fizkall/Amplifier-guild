'use client';
/* eslint-disable @next/next/no-img-element */

import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { computeMatchScore } from '@/shared/match';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { ApplySheet } from '@/components/Opportunities';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { APP_STATUS_LABEL, ROLE_TYPE_LABEL } from '@/lib/format';
import { getOpportunity, useCanManage, useProject, type OppDoc } from '@/lib/projects';

function Detail({ pid, oid }: { pid: string; oid: string }) {
  const { profile } = useAuth();
  const project = useProject(pid);
  const canManage = useCanManage(project);
  const [opp, setOpp] = useState<OppDoc | null | undefined>(undefined);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { getOpportunity(pid, oid).then(setOpp).catch(() => setOpp(null)); }, [pid, oid]);
  useEffect(() => {
    if (!profile) return;
    getDoc(doc(db, 'projects', pid, 'applications', `${oid}_${profile.uid}`))
      .then((s) => setMyStatus(s.exists() ? (s.get('status') as string) : null))
      .catch(() => setMyStatus(null));
  }, [pid, oid, profile]);

  if (opp === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!opp) return <div className="empty">İlan bulunamadı ya da yayından kaldırılmış.</div>;

  const score = profile ? computeMatchScore({ applicant: profile, opportunity: opp }) : 0;
  const expired = opp.deadline ? opp.deadline.toDate() < new Date() : false;
  const canApply = opp.status === 'open' && !expired && !myStatus && !canManage;

  return (
    <>
      {opp.coverUrl && <img src={opp.coverUrl} alt={`${opp.title} ilan görseli`} className="opp-cover" style={{ borderRadius: 0, border: 0 }} />}
      <div className="pad stack">
        <Link href={`/proje/${pid}`} className="row" style={{ gap: 8 }}>
          <Avatar name={opp.projectSnapshot?.name} src={project?.logoUrl ?? opp.projectSnapshot?.logoUrl} size={28} />
          <span className="meta">{opp.projectSnapshot?.name}</span>
        </Link>
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <h1 className="h1">{opp.title}</h1>
          {score >= 50 && <span className={`badge-match${score >= 80 ? ' high' : ''}`}>%{score} uyum</span>}
        </div>
        <div className="chips">
          <span className="chip solid">{ROLE_TYPE_LABEL[opp.roleType] ?? opp.roleType}</span>
          <span className="chip solid">{opp.commitment?.hoursPerWeek} sa/hafta</span>
          {opp.commitment?.durationWeeks && <span className="chip solid">{opp.commitment.durationWeeks} hafta</span>}
          <span className="chip solid">{opp.location?.remote ? 'Uzaktan' : opp.location?.city}</span>
          <span className="chip solid">{Math.max(0, opp.slots - (opp.filledCount ?? 0))} kontenjan</span>
          {opp.deadline && <span className="chip solid">Son başvuru: {opp.deadline.toDate().toLocaleDateString('tr-TR')}</span>}
        </div>

        {canApply ? (
          <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>Başvur</button>
        ) : myStatus ? (
          <Link href="/basvurularim" className="btn btn-lg" style={{ textAlign: 'center' }}>Başvurun: {APP_STATUS_LABEL[myStatus]}</Link>
        ) : canManage ? (
          <Link href={`/proje/${pid}/ilan/${oid}/basvurular`} className="btn btn-primary btn-lg" style={{ textAlign: 'center' }}>Başvuruları gör</Link>
        ) : (
          <button className="btn btn-lg" disabled>{expired ? 'Son başvuru tarihi geçti' : 'Başvurular kapalı'}</button>
        )}
      </div>

      {opp.description && (<><div className="section-head"><span>Açıklama</span></div><p className="post-text pad" style={{ margin: 0 }}>{opp.description}</p></>)}

      {(opp.requiredSkills ?? []).length > 0 && (
        <><div className="section-head"><span>Aranan yetenekler</span></div>
          <div className="pad chips">{opp.requiredSkills.map((s) => <span key={s} className="chip">{s}</span>)}</div></>
      )}

      {(opp.links ?? []).length > 0 && (
        <><div className="section-head"><span>Bağlantılar</span></div>
          {opp.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="card row spread">
              <span>{l.label}</span><span className="meta" aria-hidden>↗</span>
            </a>
          ))}</>
      )}

      {canApply && (
        <>
          <div style={{ height: 64 }} className="mobile-only-spacer" aria-hidden />
          <div className="sticky-cta above-nav">
            <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>Başvur · {opp.title}</button>
          </div>
        </>
      )}

      {open && <ApplySheet opp={opp} onClose={() => setOpen(false)} onDone={() => { setOpen(false); setMyStatus('submitted'); }} />}
    </>
  );
}

export default function IlanDetayPage() {
  const { pid, oid } = useParams<{ pid: string; oid: string }>();
  return <AppShell title="İlan">{firebaseReady && <Detail pid={decodeURIComponent(pid)} oid={oid} />}</AppShell>;
}
