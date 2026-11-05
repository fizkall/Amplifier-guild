'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { OpportunityForm } from '@/components/OpportunityForm';
import { firebaseReady } from '@/lib/firebase';
import { getOpportunity, useCanManage, useProject, type OppDoc } from '@/lib/projects';

function EditOpp({ slug, oid }: { slug: string; oid: string }) {
  const project = useProject(slug);
  const canManage = useCanManage(project);
  const [opp, setOpp] = useState<OppDoc | null | undefined>(undefined);
  useEffect(() => { getOpportunity(slug, oid).then(setOpp).catch(() => setOpp(null)); }, [slug, oid]);

  if (project === undefined || opp === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!project || !canManage) return <div className="empty">Bu ilanı düzenleme yetkin yok.</div>;
  if (!opp) return <div className="empty">İlan bulunamadı.</div>;
  return <OpportunityForm project={project} initial={opp} />;
}

export default function IlanDuzenlePage() {
  const { slug, oid } = useParams<{ slug: string; oid: string }>();
  return <AppShell title="İlanı düzenle">{firebaseReady && <EditOpp slug={decodeURIComponent(slug)} oid={oid} />}</AppShell>;
}
