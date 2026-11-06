'use client';

import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, getDocs, collection, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/shared/models';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { ProjectForm } from '@/components/ProjectForm';
import { ShareButton } from '@/components/ShareButton';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { OPP_STATUS_LABEL, PROJECT_STATUS_LABEL, useCanManage, useIsOwner, useProject, useProjectOpportunities, type OppDoc, type ProjectDoc } from '@/lib/projects';

type Tab = 'ilanlar' | 'sayfa' | 'yoneticiler';

function OpportunitiesTab({ project }: { project: ProjectDoc }) {
  const opps = useProjectOpportunities(project.id, true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!opps) return;
    opps.forEach((o) => {
      getDocs(query(collection(db, 'projects', project.id, 'applications'), where('opportunityId', '==', o.id)))
        .then((s) => setCounts((c) => ({ ...c, [o.id]: s.docs.filter((d) => d.get('status') !== 'withdrawn').length })))
        .catch(() => {});
    });
  }, [opps, project.id]);

  async function setStatus(o: OppDoc, status: OppDoc['status']) {
    await updateDoc(doc(db, 'projects', project.id, 'opportunities', o.id), { status, updatedAt: serverTimestamp() });
  }

  return (
    <>
      <div className="pad">
        {project.status === 'active' ? (
          <Link href={`/proje/${project.id}/ilan-yeni`} className="btn btn-primary btn-lg" style={{ display: 'block', textAlign: 'center' }}>+ Yeni ilan ver</Link>
        ) : (
          <div className="notice" style={{ margin: 0 }}>İlan verebilmek için projenin durumu &quot;Yayında&quot; olmalı.</div>
        )}
      </div>
      {opps === null ? (
        <div className="center" style={{ minHeight: 100 }}><div className="spinner" /></div>
      ) : opps.length === 0 ? (
        <div className="empty">Henüz ilan yok.</div>
      ) : opps.map((o) => (
        <div key={o.id} className="card stack">
          <div className="row spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="post-name">{o.title}</div>
              <div className="meta">{OPP_STATUS_LABEL[o.status]} · {o.filledCount ?? 0}/{o.slots} dolu · {(o.questions ?? []).length} form sorusu</div>
            </div>
            <Link href={`/proje/${project.id}/ilan/${o.id}/basvurular`} className="btn btn-primary">
              Başvurular{counts[o.id] !== undefined ? ` (${counts[o.id]})` : ''}
            </Link>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/proje/${project.id}/ilan/${o.id}/duzenle`} className="btn">Düzenle</Link>
            <Link href={`/ilan/${project.id}/${o.id}`} className="btn">Görüntüle</Link>
            {o.status === 'open' && <ShareButton path={`/ilan/${project.id}/${o.id}`} title={`${o.title} · ${project.name}`} />}
            {o.status === 'open' && <button className="btn" onClick={() => setStatus(o, 'closed')}>Başvuruları kapat</button>}
            {(o.status === 'closed' || o.status === 'draft' || o.status === 'filled') && <button className="btn" onClick={() => setStatus(o, 'open')}>Yayınla</button>}
            {(counts[o.id] ?? 0) === 0 && (
              <button className="btn" onClick={() => { if (confirm('İlan silinsin mi?')) deleteDoc(doc(db, 'projects', project.id, 'opportunities', o.id)); }}>Sil</button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

type Manager = { uid: string; profile: UserProfile | null };

function ManagersTab({ project }: { project: ProjectDoc }) {
  const { user } = useAuth();
  const [managers, setManagers] = useState<Manager[] | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const ownerActive = project.status === 'active';
  useEffect(() => {
    const ids = [...new Set([project.ownerId, ...(project.managerIds ?? [])].filter(Boolean))];
    Promise.all(ids.map(async (uid) => {
      const s = await getDoc(doc(db, 'users', uid)).catch(() => null);
      return { uid, profile: s?.exists() ? (s.data() as UserProfile) : null };
    })).then(setManagers);
  }, [project.managerIds, project.ownerId]);

  async function resolveUid(v: string): Promise<string | null> {
    const t = v.trim().replace(/^@/, '');
    if (!t) return null;
    // Önce UID olarak dene, sonra @kullanıcı adı olarak
    if (/^[A-Za-z0-9_-]{1,128}$/.test(t)) {
      const u = await getDoc(doc(db, 'users', t)).catch(() => null);
      if (u?.exists()) return t;
    }
    if (/^[a-z0-9_.]{3,24}$/i.test(t)) {
      const h = await getDoc(doc(db, 'handles', t.toLowerCase())).catch(() => null);
      if (h?.exists()) return h.get('uid') as string;
    }
    return null;
  }

  async function add() {
    setMsg('');
    setBusy(true);
    try {
      const uid = await resolveUid(input);
      if (!uid) throw new Error('Bu UID ya da kullanıcı adıyla kayıtlı bir profil bulunamadı. Kişinin önce siteye kaydolup profilini oluşturması gerekir.');
      if ((project.managerIds ?? []).includes(uid) || uid === project.ownerId) throw new Error('Bu kişi zaten yönetici.');
      const u = await getDoc(doc(db, 'users', uid));
      const p = u.data() as UserProfile;
      const b = writeBatch(db);
      b.update(doc(db, 'projects', project.id), { managerIds: arrayUnion(uid), updatedAt: serverTimestamp() });
      b.set(doc(db, 'projects', project.id, 'members', uid), {
        uid, role: 'admin', title: 'Proje yöneticisi',
        userSnapshot: { displayName: p.displayName, handle: p.handle, photoURL: p.photoURL },
        joinedAt: serverTimestamp(), viaOpportunityId: null,
      });
      await b.commit();
      setInput('');
      setMsg(`${p.displayName} artık bu projenin yöneticisi ✓`);
    } catch (e) {
      setMsg((e as Error).message || 'Eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    if (!confirm('Yöneticilik kaldırılsın mı?')) return;
    const b = writeBatch(db);
    b.update(doc(db, 'projects', project.id), { managerIds: arrayRemove(uid), updatedAt: serverTimestamp() });
    b.delete(doc(db, 'projects', project.id, 'members', uid));
    await b.commit();
  }

  return (
    <>
      <div className="pad stack">
        <p className="meta" style={{ margin: 0 }}>
          Kurucu ve yöneticiler bu projenin sayfasını düzenleyebilir, ilan verebilir ve başvuruları yönetebilir.
          Kişinin UID&apos;sini (Ayarlar sayfasında görünür) ya da @kullanıcı adını gir.
        </p>
        {!ownerActive && <div className="notice" style={{ margin: 0 }}>Yönetici atamak için projenin onaylanıp yayına girmesi gerekiyor.</div>}
        <div className="row" style={{ gap: 8 }}>
          <input className="input" disabled={!ownerActive && !isAdminUid(user?.uid)} placeholder="UID veya @kullaniciadi" value={input} onChange={(e) => setInput(e.target.value)} aria-label="UID veya kullanıcı adı" />
          <button className="btn btn-primary" disabled={busy || !input.trim()} onClick={add}>Ekle</button>
        </div>
        {msg && <p className="meta" role="status" style={{ margin: 0 }}>{msg}</p>}
      </div>
      {managers === null ? (
        <div className="center" style={{ minHeight: 80 }}><div className="spinner" /></div>
      ) : managers.length === 0 ? (
        <div className="empty">Henüz yönetici atanmadı.</div>
      ) : managers.map((m) => (
        <div key={m.uid} className="card row spread">
          <div className="row" style={{ minWidth: 0 }}>
            <Avatar name={m.profile?.displayName ?? '?'} src={m.profile?.photoURL} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="post-name">{m.profile?.displayName ?? 'Profil yok'}</div>
              <div className="meta" style={{ wordBreak: 'break-all' }}>{m.profile ? `@${m.profile.handle}` : m.uid}</div>
            </div>
          </div>
          {m.uid === project.ownerId
            ? <span className="status-chip st-active">Kurucu</span>
            : <button className="btn" onClick={() => remove(m.uid)}>Kaldır</button>}
        </div>
      ))}
    </>
  );
}

function Manage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const project = useProject(slug);
  const canManage = useCanManage(project);
  const admin = isAdminUid(user?.uid);
  const owner = useIsOwner(project);
  const [tab, setTab] = useState<Tab>('ilanlar');

  if (project === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (project === null || !canManage) return <div className="empty">Bu projeyi yönetme yetkin yok.</div>;

  return (
    <>
      <div className="pad row spread">
        <div className="row" style={{ minWidth: 0 }}>
          <Avatar name={project.name} src={project.logoUrl} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="post-name">{project.name}</div>
            <Link href={`/proje/${project.id}`} className="meta">Sayfayı görüntüle →</Link>
          </div>
        </div>
      </div>
      {project.status !== 'active' && (
        <div className="notice" style={{ marginTop: 0 }}>
          <span className={`status-chip st-${project.status}`}>{PROJECT_STATUS_LABEL[project.status] ?? project.status}</span>{' '}
          {project.status === 'pending' ? 'Başvurun Guild yönetiminin onayını bekliyor. Bu sürede sayfa bilgilerini düzenleyebilirsin.'
            : project.status === 'rejected' ? 'Bu başvuru onaylanmadı. Ayrıntı için iletişim sayfasından bize yazabilirsin.'
            : 'Bu proje şu an yayında değil.'}
        </div>
      )}
      <div className="tabs">
        <button className={`tab${tab === 'ilanlar' ? ' active' : ''}`} onClick={() => setTab('ilanlar')}>İlanlar</button>
        <button className={`tab${tab === 'sayfa' ? ' active' : ''}`} onClick={() => setTab('sayfa')}>Sayfa</button>
        {(admin || owner) && <button className={`tab${tab === 'yoneticiler' ? ' active' : ''}`} onClick={() => setTab('yoneticiler')}>Yöneticiler</button>}
      </div>
      {tab === 'ilanlar' && <OpportunitiesTab project={project} />}
      {tab === 'sayfa' && <ProjectForm key={project.id} initial={project} />}
      {tab === 'yoneticiler' && (admin || owner) && <ManagersTab project={project} />}
    </>
  );
}

export default function ProjeYonetPage() {
  const { slug } = useParams<{ slug: string }>();
  return <AppShell title="Projeyi yönet">{firebaseReady && <Manage slug={decodeURIComponent(slug)} />}</AppShell>;
}
