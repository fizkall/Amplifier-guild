/**
 * Amplifier Guild — Cloud Functions (v2) iskeleti.
 * Mimari: docs/ARCHITECTURE.md §3
 *
 * Bu dosya çekirdek iş akışlarını içerir: sayaçlar, eşleştirme skoru, başvuru kararı,
 * proje onayı ve rol yönetimi. Bildirim/e-posta/fan-out gibi ek işler Faz 2'de eklenir.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import type {
  Application,
  ApplicationStatus,
  Opportunity,
  Project,
  ReviewApplicationRequest,
  ReviewProjectRequest,
  SetUserRoleRequest,
  UserProfile,
} from '../../shared/models';
import { computeMatchScore } from '../../shared/match';

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: 'europe-west3', maxInstances: 10 });

/* ─────────────── Yardımcılar ─────────────── */

function requireAuth(auth: { uid: string; token: Record<string, unknown> } | undefined) {
  if (!auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısın.');
  return auth;
}

async function isProjectManager(projectId: string, uid: string): Promise<boolean> {
  const m = await db.doc(`projects/${projectId}/members/${uid}`).get();
  return m.exists && ['owner', 'admin'].includes(m.get('role'));
}

async function notify(uid: string, data: Record<string, unknown>) {
  await db.collection(`users/${uid}/notifications`).add({
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    ...data,
  });
}

function audit(actorId: string, action: string, target: string, extra: Record<string, unknown> = {}) {
  return db.collection('auditLogs').add({ actorId, action, target, at: FieldValue.serverTimestamp(), ...extra });
}

/* ─────────────── Takip ─────────────── */

export const onFollowWritten = onDocumentWritten('users/{uid}/following/{targetId}', async (event) => {
  const { uid, targetId } = event.params;
  const created = !event.data?.before.exists && event.data?.after.exists;
  const deleted = event.data?.before.exists && !event.data?.after.exists;
  if (!created && !deleted) return;

  const kind = (event.data?.after.get('kind') ?? event.data?.before.get('kind')) as 'user' | 'project';
  const delta = FieldValue.increment(created ? 1 : -1);
  const batch = db.batch();
  batch.update(db.doc(`users/${uid}`), { 'stats.following': delta });
  if (kind === 'user') {
    batch.update(db.doc(`users/${targetId}`), { 'stats.followers': delta });
    const mirror = db.doc(`users/${targetId}/followers/${uid}`);
    if (created) batch.set(mirror, { createdAt: FieldValue.serverTimestamp() });
    else batch.delete(mirror);
  } else {
    batch.update(db.doc(`projects/${targetId}`), { 'stats.followers': delta });
  }
  await batch.commit();
});

/* ─────────────── İlanlar & başvurular ─────────────── */

export const onApplicationCreated = onDocumentCreated(
  'projects/{projectId}/applications/{applicationId}',
  async (event) => {
    const app = event.data?.data() as Application | undefined;
    if (!app) return;
    const { projectId } = event.params;

    const [oppSnap, userSnap] = await Promise.all([
      db.doc(`projects/${projectId}/opportunities/${app.opportunityId}`).get(),
      db.doc(`users/${app.applicantId}`).get(),
    ]);
    const opp = oppSnap.data() as Opportunity;
    const user = userSnap.data() as UserProfile;

    const matchScore = computeMatchScore({ applicant: user, opportunity: opp });

    await db.runTransaction(async (tx) => {
      tx.update(event.data!.ref, {
        matchScore,
        statusHistory: [{ status: 'submitted', at: Timestamp.now(), by: app.applicantId }],
      });
      tx.update(oppSnap.ref, { applicationCount: FieldValue.increment(1) });
    });

    const managers = await db
      .collection(`projects/${projectId}/members`)
      .where('role', 'in', ['owner', 'admin'])
      .get();
    await Promise.all(
      managers.docs.map((m) =>
        notify(m.id, {
          type: 'new_application',
          actorSnapshot: { uid: app.applicantId, ...app.applicantSnapshot },
          target: { kind: 'application', id: event.params.applicationId, projectId },
          text: `${app.applicantSnapshot.displayName} → ${opp.title} (%${matchScore} uyum)`,
        }),
      ),
    );
  },
);

const ALLOWED_FROM: Record<ReviewApplicationRequest['decision'], ApplicationStatus[]> = {
  shortlisted: ['submitted', 'in_review'],
  accepted: ['submitted', 'in_review', 'shortlisted'],
  rejected: ['submitted', 'in_review', 'shortlisted'],
};

/**
 * Başvuru kararı — tek atomik transaction.
 * Kabulde: üyelik + doğrulanmış CV kalemi + kontenjan + sayaçlar.
 */
export const reviewApplication = onCall<ReviewApplicationRequest>(async (req) => {
  const auth = requireAuth(req.auth);
  const { projectId, applicationId, decision, messageToApplicant } = req.data;
  if (!projectId || !applicationId || !(decision in ALLOWED_FROM)) {
    throw new HttpsError('invalid-argument', 'Eksik veya geçersiz parametre.');
  }

  const isAdmin = auth.token.admin === true;
  if (!isAdmin && !(await isProjectManager(projectId, auth.uid))) {
    throw new HttpsError('permission-denied', 'Bu projede başvuru değerlendirme yetkin yok.');
  }

  const appRef = db.doc(`projects/${projectId}/applications/${applicationId}`);

  const result = await db.runTransaction(async (tx) => {
    const appSnap = await tx.get(appRef);
    if (!appSnap.exists) throw new HttpsError('not-found', 'Başvuru bulunamadı.');
    const app = appSnap.data() as Application;

    if (!ALLOWED_FROM[decision].includes(app.status)) {
      throw new HttpsError('failed-precondition', `'${app.status}' durumundan '${decision}' yapılamaz.`);
    }

    const oppRef = db.doc(`projects/${projectId}/opportunities/${app.opportunityId}`);
    const projectRef = db.doc(`projects/${projectId}`);
    const [oppSnap, projectSnap] = await Promise.all([tx.get(oppRef), tx.get(projectRef)]);
    const opp = oppSnap.data() as Opportunity;
    const project = projectSnap.data() as Project;

    if (decision === 'accepted' && opp.filledCount >= opp.slots) {
      throw new HttpsError('failed-precondition', 'Bu ilanın kontenjanı dolu.');
    }

    const now = Timestamp.now();
    tx.update(appRef, {
      status: decision,
      statusHistory: FieldValue.arrayUnion({ status: decision, at: now, by: auth.uid }),
      decidedBy: decision === 'shortlisted' ? null : auth.uid,
      decidedAt: decision === 'shortlisted' ? null : now,
      updatedAt: now,
    });

    if (decision === 'accepted') {
      const filled = opp.filledCount + 1;
      tx.update(oppRef, {
        filledCount: filled,
        ...(filled >= opp.slots ? { status: 'filled' } : {}),
        updatedAt: now,
      });

      tx.set(db.doc(`projects/${projectId}/members/${app.applicantId}`), {
        uid: app.applicantId,
        role: 'member',
        title: opp.title,
        userSnapshot: {
          displayName: app.applicantSnapshot.displayName,
          handle: app.applicantSnapshot.handle,
          photoURL: app.applicantSnapshot.photoURL,
        },
        joinedAt: now,
        viaOpportunityId: app.opportunityId,
      });

      // Guild'in kalbi: kullanıcı tarafından düzenlenemeyen, doğrulanmış CV kalemi
      const ym = now.toDate().toISOString().slice(0, 7);
      tx.set(db.collection(`users/${app.applicantId}/experiences`).doc(), {
        type: 'guild_project',
        title: opp.title,
        organization: project.name,
        program: null,
        startDate: ym,
        endDate: null,
        description: project.tagline,
        skills: opp.requiredSkills,
        verified: true,
        source: { projectId, opportunityId: app.opportunityId },
        order: -1,
      });

      tx.update(projectRef, { 'stats.members': FieldValue.increment(1) });
      tx.update(db.doc(`users/${app.applicantId}`), {
        'stats.projectsJoined': FieldValue.increment(1),
      });
    }

    return { app, project, opp };
  });

  const statusText: Record<string, string> = {
    shortlisted: 'kısa listeye alındı',
    accepted: 'kabul edildi 🎉',
    rejected: 'bu sefer olumsuz sonuçlandı',
  };
  await Promise.all([
    notify(result.app.applicantId, {
      type: 'application_status',
      actorSnapshot: null,
      target: { kind: 'application', id: applicationId, projectId },
      text: `${result.project.name} · ${result.opp.title} başvurun ${statusText[decision]}.${
        messageToApplicant ? ` "${messageToApplicant.slice(0, 280)}"` : ''
      }`,
    }),
    audit(auth.uid, `application.${decision}`, appRef.path),
  ]);

  return { ok: true, status: decision };
});

/** Kabul edilmiş başvuranın iletişim bilgisini sadece proje yöneticisine döner. */
export const getApplicantContact = onCall<{ projectId: string; applicationId: string }>(async (req) => {
  const auth = requireAuth(req.auth);
  const { projectId, applicationId } = req.data;
  if (auth.token.admin !== true && !(await isProjectManager(projectId, auth.uid))) {
    throw new HttpsError('permission-denied', 'Yetkin yok.');
  }
  const app = await db.doc(`projects/${projectId}/applications/${applicationId}`).get();
  if (app.get('status') !== 'accepted') {
    throw new HttpsError('failed-precondition', 'İletişim bilgisi sadece kabul sonrası paylaşılır.');
  }
  const priv = await db.doc(`users/${app.get('applicantId')}/private/profile`).get();
  await audit(auth.uid, 'application.contact_viewed', app.ref.path);
  return { email: priv.get('email') ?? null, phone: priv.get('phone') ?? null };
});

export const closeExpiredOpportunities = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Europe/Istanbul' },
  async () => {
    const expired = await db
      .collectionGroup('opportunities')
      .where('status', '==', 'open')
      .where('deadline', '<=', Timestamp.now())
      .limit(400)
      .get();
    const batch = db.batch();
    expired.docs.forEach((d) => batch.update(d.ref, { status: 'closed', updatedAt: Timestamp.now() }));
    await batch.commit();
  },
);

/* ─────────────── Guild admin ─────────────── */

export const reviewProject = onCall<ReviewProjectRequest>(async (req) => {
  const auth = requireAuth(req.auth);
  if (auth.token.admin !== true) throw new HttpsError('permission-denied', 'Sadece Guild admin.');
  const { projectId, decision, reason } = req.data;
  if (!['active', 'rejected', 'paused'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Geçersiz karar.');
  }
  const ref = db.doc(`projects/${projectId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Proje bulunamadı.');

  await ref.update({ status: decision, updatedAt: FieldValue.serverTimestamp() });
  await Promise.all([
    notify(snap.get('ownerId'), {
      type: 'project_approved',
      actorSnapshot: null,
      target: { kind: 'project', id: projectId },
      text:
        decision === 'active'
          ? `${snap.get('name')} onaylandı! Artık ilan açabilirsin.`
          : `${snap.get('name')} durumu: ${decision}${reason ? ` — ${reason}` : ''}`,
    }),
    audit(auth.uid, `project.${decision}`, ref.path, { reason: reason ?? null }),
  ]);
  return { ok: true };
});

export const setUserRole = onCall<SetUserRoleRequest>(async (req) => {
  const auth = requireAuth(req.auth);
  if (auth.token.admin !== true) throw new HttpsError('permission-denied', 'Sadece Guild admin.');
  const { uid, role } = req.data;
  const claims = role === 'admin' ? { admin: true } : role === 'moderator' ? { moderator: true } : {};
  await getAuth().setCustomUserClaims(uid, claims);
  await audit(auth.uid, 'user.set_role', `users/${uid}`, { role });
  return { ok: true };
});
