'use client';

import { AppShell } from '@/components/AppShell';
import { ProjectForm } from '@/components/ProjectForm';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';

function NewProject() {
  const { user } = useAuth();
  if (!isAdminUid(user?.uid)) return <div className="empty">Bu sayfa yalnızca Guild yöneticilerine açık.</div>;
  return <ProjectForm />;
}

export default function YeniProjePage() {
  return <AppShell title="Yeni girişim / proje">{firebaseReady && <NewProject />}</AppShell>;
}
