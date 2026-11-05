'use client';
/* eslint-disable @next/next/no-img-element */

import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Opportunity, Project } from '@/shared/models';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { db, firebaseReady } from '@/lib/firebase';
import { ROLE_TYPE_LABEL } from '@/lib/format';

function ProjectView({ slug }: { slug: string }) {
  const [project, setProject] = useState<(Project & { id: string }) | null | undefined>(undefined);
  const [opps, setOpps] = useState<(Opportunity & { id: string })[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getDocs(query(collection(db, 'projects'), where('slug', '==', slug), where('status', '==', 'active'), limit(1)));
      if (s.empty) return setProject(null);
      const p = { id: s.docs[0].id, ...(s.docs[0].data() as Project) };
      setProject(p);
      const o = await getDocs(query(collection(db, 'projects', p.id, 'opportunities'), where('status', '==', 'open')));
      setOpps(o.docs.map((d) => ({ id: d.id, ...(d.data() as Opportunity) })));
    })().catch((e) => { console.error(e); setProject(null); });
  }, [slug]);

  if (project === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (project === null) return <div className="empty">Proje bulunamadı.</div>;

  return (
    <>
      <div className="pad stack">
        <div className="row">
          <Avatar name={project.name} src={project.logoUrl} size={64} />
          <div>
            <h1 className="h1">{project.name}</h1>
            <div className="meta">{project.tagline}</div>
          </div>
        </div>
        <p className="post-text">{project.description}</p>
        <div className="meta">{project.stats?.members ?? 0} üye · {project.stats?.followers ?? 0} takipçi</div>
      </div>
      <div className="tabs"><div className="tab active">Açık pozisyonlar ({opps.length})</div></div>
      {opps.length ? opps.map((o) => (
        <div key={o.id} className="card row spread">
          <div>
            <div className="post-name">{o.title}</div>
            <div className="meta">{ROLE_TYPE_LABEL[o.roleType]} · {o.commitment?.hoursPerWeek} sa/hafta</div>
          </div>
          <Link href="/ilanlar" className="btn btn-primary">Başvur</Link>
        </div>
      )) : <div className="empty">Şu an açık pozisyon yok.</div>}
    </>
  );
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  return <AppShell title="Proje">{firebaseReady && <ProjectView slug={slug} />}</AppShell>;
}
