'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { KIND_LABEL, useManagedProjects } from '@/lib/projects';

const STATUS: Record<string, string> = { active: 'Yayında', paused: 'Duraklatıldı', pending: 'Onay bekliyor', archived: 'Arşiv', rejected: 'Reddedildi' };

function Panel() {
  const { user } = useAuth();
  const projects = useManagedProjects();
  if (!isAdminUid(user?.uid)) return <div className="empty">Bu sayfa yalnızca Guild yöneticilerine açık.</div>;

  return (
    <>
      <div className="pad stack">
        <h1 className="h1">Yönetim Paneli</h1>
        <p className="meta" style={{ margin: 0 }}>Girişim ve projeleri aç, sayfalarını düzenle, yönetici ata, ilan ver ve başvuruları yönet.</p>
        <Link href="/yonetim/yeni-proje" className="btn btn-primary btn-lg" style={{ textAlign: 'center' }}>+ Yeni girişim / proje</Link>
      </div>
      <div className="section-head"><span>Girişimler ve projeler</span><span className="meta">{projects?.length ?? ''}</span></div>
      {projects === null ? (
        <div className="center" style={{ minHeight: 120 }}><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty">Henüz proje yok. İlk girişimi oluştur.</div>
      ) : (
        projects.map((p) => (
          <Link key={p.id} href={`/proje/${p.id}/yonet`} className="card row spread">
            <div className="row" style={{ minWidth: 0 }}>
              <Avatar name={p.name} src={p.logoUrl} size={44} />
              <div style={{ minWidth: 0 }}>
                <div className="post-name">{p.name}</div>
                <div className="meta">{KIND_LABEL[p.kind] ?? p.kind} · {STATUS[p.status] ?? p.status} · {(p.managerIds ?? []).length} yönetici</div>
              </div>
            </div>
            <span aria-hidden>→</span>
          </Link>
        ))
      )}
    </>
  );
}

export default function YonetimPage() {
  return <AppShell title="Yönetim">{firebaseReady && <Panel />}</AppShell>;
}
