'use client';

import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Opportunity, Project, ProjectSnapshot } from '@/shared/models';
import { isAdminUid } from './admin';
import { useAuth } from './auth';
import { db } from './firebase';

export type ProjectDoc = Project & { id: string };
export type OppDoc = Opportunity & { id: string };

export function projectSnapshot(p: Project): ProjectSnapshot {
  return { name: p.name, slug: p.slug, logoUrl: p.logoUrl };
}

/** Proje (belge ID'si = slug). undefined: yükleniyor, null: yok / erişim yok. */
export function useProject(slug: string) {
  const [project, setProject] = useState<ProjectDoc | null | undefined>(undefined);
  useEffect(() => {
    if (!slug) return;
    return onSnapshot(
      doc(db, 'projects', slug),
      (s) => setProject(s.exists() ? { id: s.id, ...(s.data() as Project) } : null),
      () => setProject(null),
    );
  }, [slug]);
  return project;
}

export function useCanManage(project: ProjectDoc | null | undefined) {
  const { user } = useAuth();
  if (!user || !project) return false;
  return isAdminUid(user.uid) || (project.managerIds ?? []).includes(user.uid) || project.ownerId === user.uid;
}

/** Projenin kurucusu mu? (Girişim başvurusunu yapan ve admin onayıyla kurucu olan kişi) */
export function useIsOwner(project: ProjectDoc | null | undefined) {
  const { user } = useAuth();
  return Boolean(user && project && project.ownerId === user.uid);
}

/** Kullanıcının yönettiği projeler (admin için tüm projeler). */
export function useManagedProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectDoc[] | null>(null);
  useEffect(() => {
    if (!user) return;
    const qs = isAdminUid(user.uid)
      ? [query(collection(db, 'projects'), orderBy('createdAt', 'desc'))]
      : [query(collection(db, 'projects'), where('managerIds', 'array-contains', user.uid)),
         query(collection(db, 'projects'), where('ownerId', '==', user.uid))];
    Promise.all(qs.map((q) => getDocs(q).catch(() => null)))
      .then((snaps) => {
        const map = new Map<string, ProjectDoc>();
        snaps.forEach((s) => s?.docs.forEach((d) => map.set(d.id, { id: d.id, ...(d.data() as Project) })));
        setProjects([...map.values()]);
      })
      .catch((e) => { console.error(e); setProjects([]); });
  }, [user]);
  return projects;
}

/** Projenin ilanları (yöneticiler taslakları da görür). */
export function useProjectOpportunities(pid: string | undefined, includeDrafts: boolean) {
  const [opps, setOpps] = useState<OppDoc[] | null>(null);
  useEffect(() => {
    if (!pid) return;
    const base = collection(db, 'projects', pid, 'opportunities');
    const q = includeDrafts ? query(base) : query(base, where('status', '==', 'open'));
    return onSnapshot(
      q,
      (s) => setOpps(
        s.docs.map((d) => ({ id: d.id, ...(d.data() as Opportunity) }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
      ),
      (e) => { console.error(e); setOpps([]); },
    );
  }, [pid, includeDrafts]);
  return opps;
}

export async function getOpportunity(pid: string, oid: string): Promise<OppDoc | null> {
  const s = await getDoc(doc(db, 'projects', pid, 'opportunities', oid));
  return s.exists() ? { id: s.id, ...(s.data() as Opportunity) } : null;
}

export const KIND_LABEL: Record<string, string> = {
  guild_internal: 'Guild girişimi',
  partner_startup: 'Girişim',
  community: 'Topluluk projesi',
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  pending: 'Onay bekliyor', active: 'Yayında', paused: 'Duraklatıldı', archived: 'Arşiv', rejected: 'Reddedildi',
};

export const OPP_STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak',
  open: 'Yayında',
  closed: 'Kapalı',
  filled: 'Doldu',
};
