'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { SocialLinks } from '@/components/SocialLinks';
import { firebaseReady } from '@/lib/firebase';
import { ROLE_TYPE_LABEL } from '@/lib/format';
import { KIND_LABEL, useCanManage, useProject, useProjectOpportunities } from '@/lib/projects';

function ProjectView({ slug }: { slug: string }) {
  const project = useProject(slug);
  const canManage = useCanManage(project);
  const opps = useProjectOpportunities(project ? project.id : undefined, false);

  if (project === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (project === null) return <div className="empty">Proje bulunamadı.</div>;

  return (
    <>
      <div className="pad stack">
        <div className="row" style={{ alignItems: 'center' }}>
          <Avatar name={project.name} src={project.logoUrl} size={72} />
          <div style={{ minWidth: 0 }}>
            <h1 className="h1">{project.name}</h1>
            {project.tagline && <div className="meta">{project.tagline}</div>}
            <div className="meta" style={{ fontSize: 12, marginTop: 2 }}>{KIND_LABEL[project.kind] ?? ''}</div>
          </div>
        </div>
        <SocialLinks links={project.links} />
        {canManage && <Link href={`/proje/${project.id}/yonet`} className="btn" style={{ textAlign: 'center' }}>Projeyi yönet</Link>}
      </div>

      {project.description && (
        <>
          <div className="section-head"><span>Hakkında</span></div>
          <p className="post-text pad" style={{ margin: 0 }}>{project.description}</p>
        </>
      )}

      <div className="section-head"><span>Açık pozisyonlar</span><span className="meta">{opps?.length ?? ''}</span></div>
      {opps === null ? (
        <div className="center" style={{ minHeight: 100 }}><div className="spinner" /></div>
      ) : opps.length ? opps.map((o) => (
        <Link key={o.id} href={`/ilan/${project.id}/${o.id}`} className="card row spread">
          {o.coverUrl
            ? <span className="opp-thumb" aria-hidden>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={o.coverUrl} alt={`${o.title} ilan görseli`} /></span>
            : <Avatar name={project.name} src={project.logoUrl} size={48} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="post-name">{o.title}</div>
            <div className="meta">{ROLE_TYPE_LABEL[o.roleType]} · {o.commitment?.hoursPerWeek} sa/hafta · {o.location?.remote ? 'Uzaktan' : o.location?.city}</div>
          </div>
          <span className="btn btn-primary">İncele</span>
        </Link>
      )) : <div className="empty">Şu an açık pozisyon yok.</div>}
    </>
  );
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  return <AppShell title="Proje">{firebaseReady && <ProjectView slug={decodeURIComponent(slug)} />}</AppShell>;
}
