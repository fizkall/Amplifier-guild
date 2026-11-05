'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { OpportunityForm } from '@/components/OpportunityForm';
import { firebaseReady } from '@/lib/firebase';
import { useCanManage, useProject } from '@/lib/projects';

function NewOpp({ slug }: { slug: string }) {
  const project = useProject(slug);
  const canManage = useCanManage(project);
  if (project === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!project || !canManage) return <div className="empty">Bu projede ilan verme yetkin yok.</div>;
  return <OpportunityForm project={project} />;
}

export default function IlanYeniPage() {
  const { slug } = useParams<{ slug: string }>();
  return <AppShell title="Yeni ilan">{firebaseReady && <NewOpp slug={decodeURIComponent(slug)} />}</AppShell>;
}
