// Firestore kuralları testleri — çalıştırma: npm run test:rules (emülatör gerekir)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collectionGroup, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';

let env;
const verified = (uid) => env.authenticatedContext(uid, { email_verified: true }).firestore();
const ZERO_USER_STATS = { followers: 0, following: 0, posts: 0, projectsJoined: 0 };

function userDoc(uid, handle, extra = {}) {
  return {
    uid, handle, displayName: 'Test', photoURL: null, headline: '', bio: '',
    accountType: 'student', school: null, skills: ['Python'], skillSlugs: ['python'],
    interests: [], programs: [], links: {}, openToWork: true,
    availability: { hoursPerWeek: 5, remote: true, city: null }, visibility: 'public',
    stats: ZERO_USER_STATS, badges: [], onboardingComplete: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  };
}

function application(oid, uid, extra = {}) {
  return {
    opportunityId: oid, projectId: 'p1', applicantId: uid,
    opportunitySnapshot: { title: 'Dev', roleType: 'volunteer' },
    projectSnapshot: { name: 'Volt', slug: 'volt', logoUrl: null },
    applicantSnapshot: { displayName: 'Ayşe', handle: 'ayse' },
    answers: {}, message: 'Merhaba', matchScore: null, status: 'submitted',
    statusHistory: [], decidedBy: null, decidedAt: null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-amplifier',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'projects/p1'), { name: 'Volt', ownerId: 'owner', status: 'active' });
    await setDoc(doc(db, 'projects/p1/members/owner'), { uid: 'owner', role: 'owner' });
    await setDoc(doc(db, 'projects/p1/opportunities/o1'), { projectId: 'p1', status: 'open', applicationCount: 0 });
    await setDoc(doc(db, 'projects/p1/opportunities/o2'), { projectId: 'p1', status: 'draft', applicationCount: 0 });
  });
});

describe('Auth & Profil', () => {
  test('onboarding batch: handle + profil oluşturulur', async () => {
    const db = verified('ayse');
    const b = writeBatch(db);
    b.set(doc(db, 'handles/ayse'), { uid: 'ayse', createdAt: serverTimestamp() });
    b.set(doc(db, 'users/ayse'), userDoc('ayse', 'ayse'));
    await assertSucceeds(b.commit());
  });

  test('sayaçlar sıfır değilse profil oluşturulamaz', async () => {
    const db = verified('ayse');
    const b = writeBatch(db);
    b.set(doc(db, 'handles/ayse'), { uid: 'ayse' });
    b.set(doc(db, 'users/ayse'), userDoc('ayse', 'ayse', { stats: { ...ZERO_USER_STATS, followers: 999 } }));
    await assertFails(b.commit());
  });

  test('başkasının handle\'ını kullanamaz', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'handles/ayse'), { uid: 'other' }));
    await assertFails(setDoc(doc(verified('ayse'), 'users/ayse'), userDoc('ayse', 'ayse')));
  });

  test('doğrulanmış CV kalemi istemciden oluşturulamaz', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'users/ayse/experiences/x'), {
      type: 'guild_project', title: 'Hile', description: '', verified: true, source: null,
    }));
  });
});

describe('İlan tahtası & başvuru', () => {
  test('giriş yapmamış kullanıcı açık ilanları listeler', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(query(collectionGroup(db, 'opportunities'), where('status', '==', 'open'))));
  });
  test('taslak ilanlar collection group ile sızdırılamaz', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(query(collectionGroup(db, 'opportunities'), where('status', '==', 'draft'))));
  });
  test('tek tık başvuru başarılı', async () => {
    await assertSucceeds(setDoc(doc(verified('ayse'), 'projects/p1/applications/o1_ayse'), application('o1', 'ayse')));
  });
  test('başkası adına / yanlış ID ile başvuru yapılamaz', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'projects/p1/applications/o1_mert'), application('o1', 'mert')));
  });
  test('taslak ilana başvuru yapılamaz', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'projects/p1/applications/o2_ayse'), application('o2', 'ayse')));
  });
  test('kendini "accepted" olarak başvuramaz', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'projects/p1/applications/o1_ayse'),
      application('o1', 'ayse', { status: 'accepted' })));
  });

  describe('mevcut başvuru', () => {
    beforeEach(() => env.withSecurityRulesDisabled((c) =>
      setDoc(doc(c.firestore(), 'projects/p1/applications/o1_ayse'), application('o1', 'ayse'))));

    test('öğrenci "Başvurularım" sorgusu', async () => {
      const db = verified('ayse');
      await assertSucceeds(getDocs(query(collectionGroup(db, 'applications'), where('applicantId', '==', 'ayse'))));
    });
    test('başkasının başvurularını sorgulayamaz', async () => {
      const db = verified('mert');
      await assertFails(getDocs(query(collectionGroup(db, 'applications'), where('applicantId', '==', 'ayse'))));
    });
    test('yönetici "görüldü" işaretler', async () => {
      await assertSucceeds(updateDoc(doc(verified('owner'), 'projects/p1/applications/o1_ayse'),
        { status: 'in_review', updatedAt: serverTimestamp() }));
    });
    test('yönetici istemciden doğrudan kabul edemez (callable zorunlu)', async () => {
      await assertFails(updateDoc(doc(verified('owner'), 'projects/p1/applications/o1_ayse'),
        { status: 'accepted', updatedAt: serverTimestamp() }));
    });
    test('öğrenci başvurusunu geri çeker', async () => {
      await assertSucceeds(updateDoc(doc(verified('ayse'), 'projects/p1/applications/o1_ayse'),
        { status: 'withdrawn', updatedAt: serverTimestamp() }));
    });
    test('iç değerlendirme notlarını başvuran okuyamaz', async () => {
      await assertFails(getDocs(query(collectionGroup(verified('ayse'), 'internal'))));
    });
  });
});

describe('Projeler', () => {
  test('proje önerisi + sahip üyeliği tek batch', async () => {
    const db = verified('mert');
    const b = writeBatch(db);
    b.set(doc(db, 'projects/p2'), {
      name: 'Yeni Girişim', tagline: 'x', ownerId: 'mert', status: 'pending',
      stats: { members: 1, followers: 0, posts: 0, openOpportunities: 0 },
    });
    b.set(doc(db, 'projects/p2/members/mert'), { uid: 'mert', role: 'owner' });
    await assertSucceeds(b.commit());
  });
  test('proje kendini "active" olarak oluşturamaz', async () => {
    const db = verified('mert');
    const b = writeBatch(db);
    b.set(doc(db, 'projects/p2'), {
      name: 'Yeni', tagline: 'x', ownerId: 'mert', status: 'active',
      stats: { members: 1, followers: 0, posts: 0, openOpportunities: 0 },
    });
    b.set(doc(db, 'projects/p2/members/mert'), { uid: 'mert', role: 'owner' });
    await assertFails(b.commit());
  });
  test('başka projeye kendini üye ekleyemez', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'projects/p1/members/ayse'), { uid: 'ayse', role: 'owner' }));
  });
});
