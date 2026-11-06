'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { ProjectForm } from '@/components/ProjectForm';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { PROJECT_STATUS_LABEL, useManagedProjects } from '@/lib/projects';

function Proposals() {
  const { user } = useAuth();
  const projects = useManagedProjects();
  const [form, setForm] = useState(false);
  const mine = (projects ?? []).filter((p) => p.ownerId === user?.uid);

  return (
    <>
      <div className="pad stack">
        <h1 className="h1" style={{ fontSize: 20 }}>Girişim / proje başvurusu</h1>
        <p className="meta" style={{ margin: 0 }}>
          Girişimini ya da projeni Amplifier Guild&apos;e ekle. Guild yönetimi onayladığında sayfan yayına girer;
          sen de <b>kurucu</b> olarak kendi yöneticilerini atayabilir, ilan verip başvuruları yönetebilirsin.
        </p>
      </div>

      {mine.length > 0 && (
        <>
          <div className="section-head"><span>Başvurularım ve girişimlerim</span></div>
          {mine.map((p) => (
            <Link key={p.id} href={p.status === 'active' ? `/proje/${p.id}/yonet` : `/proje/${p.id}/yonet`} className="card row spread">
              <div className="row" style={{ minWidth: 0 }}>
                <Avatar name={p.name} src={p.logoUrl} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div className="post-name">{p.name}</div>
                  <div className="meta">Kurucu · {p.status === 'active' ? 'yönetmek için dokun' : p.status === 'pending' ? 'admin onayı bekleniyor' : 'başvuru sonuçlandı'}</div>
                </div>
              </div>
              <span className={`status-chip st-${p.status}`}>{PROJECT_STATUS_LABEL[p.status] ?? p.status}</span>
            </Link>
          ))}
        </>
      )}

      {form ? (
        <>
          <div className="section-head"><span>Yeni başvuru</span><button className="link-btn" onClick={() => setForm(false)}>Vazgeç</button></div>
          <ProjectForm />
        </>
      ) : (
        <div className="pad">
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setForm(true)}>+ Girişim / proje başvurusu yap</button>
        </div>
      )}
    </>
  );
}

export default function GirisimBasvurusuPage() {
  return <AppShell title="Girişim başvurusu">{firebaseReady && <Proposals />}</AppShell>;
}
