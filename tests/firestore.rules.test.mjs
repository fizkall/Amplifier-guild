// Firestore kuralları testleri — çalıştırma: npm run test:rules (emülatör gerekir)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
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
  test('başvuru + "Başvurularım" referansı tek batch', async () => {
    const db = verified('ayse');
    const b = writeBatch(db);
    b.set(doc(db, 'projects/p1/applications/o1_ayse'), application('o1', 'ayse'));
    b.set(doc(db, 'users/ayse/applications/o1_ayse'), { projectId: 'p1', opportunityId: 'o1', createdAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });
  test('başvuru olmadan sahte referans yazılamaz', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'users/ayse/applications/o1_ayse'), { projectId: 'p1', opportunityId: 'o1', createdAt: serverTimestamp() }));
  });
  test('ilanlar: yayındaki projeler + açık ilanlar indekssiz listelenir', async () => {
    const db = verified('ayse');
    await assertSucceeds(getDocs(query(collection(db, 'projects'), where('status', '==', 'active'))));
    await assertSucceeds(getDocs(query(collection(db, 'projects/p1/opportunities'), where('status', '==', 'open'))));
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
        { status: 'in_review', statusHistory: [{ status: 'in_review', by: 'owner' }], updatedAt: serverTimestamp() }));
    });
    test('geçmiş kaydı eklemeden durum değiştirilemez', async () => {
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

describe('Admin & proje yöneticisi', () => {
  const ADMIN = 'A3gNGw4d54T9QE3fCXfN2T5mLn63';
  const newProject = (extra = {}) => ({
    name: 'Volt Robotics', slug: 'volt', tagline: 'x', description: 'Hakkında', logoUrl: null, coverUrl: null,
    kind: 'partner_startup', ownerId: ADMIN, managerIds: [], status: 'active', tags: [], links: {},
    stats: { members: 0, followers: 0, posts: 0, openOpportunities: 0 }, ...extra,
  });
  const opp = (extra = {}) => ({
    projectId: 'volt', projectSnapshot: { name: 'Volt', slug: 'volt', logoUrl: null }, title: 'Yazılım',
    description: 'd', coverUrl: null, links: [], roleType: 'volunteer', commitment: { hoursPerWeek: 5, durationWeeks: null },
    location: { remote: true, city: null }, requiredSkills: [], requiredSkillSlugs: [], niceToHaveSkillSlugs: [],
    questions: [], slots: 2, filledCount: 0, applicationCount: 0, status: 'open', deadline: null,
    createdBy: 'mgr', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  });

  test('admin aktif proje açar', async () => {
    await assertSucceeds(setDoc(doc(verified(ADMIN), 'projects/volt'), newProject()));
  });
  test('admin olmayan aktif proje açamaz', async () => {
    await assertFails(setDoc(doc(verified('mert'), 'projects/volt'), newProject({ ownerId: 'mert' })));
  });

  describe('yönetici atanmış proje', () => {
    beforeEach(() => env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, 'projects/volt'), newProject({ managerIds: ['mgr'] }));
      await setDoc(doc(db, 'projects/volt/opportunities/o1'), opp());
      await setDoc(doc(db, 'projects/volt/applications/o1_ayse'), application('o1', 'ayse', { projectId: 'volt' }));
    }));

    test('admin UID ile yönetici atar (managerIds + üyelik)', async () => {
      const db = verified(ADMIN);
      const b = writeBatch(db);
      b.update(doc(db, 'projects/volt'), { managerIds: ['mgr', 'zeynep'] });
      b.set(doc(db, 'projects/volt/members/zeynep'), { uid: 'zeynep', role: 'admin' });
      await assertSucceeds(b.commit());
    });
    test('yönetici kendine başka yönetici ekleyemez', async () => {
      await assertFails(updateDoc(doc(verified('mgr'), 'projects/volt'), { managerIds: ['mgr', 'arkadas'] }));
    });
    test('yönetici proje sayfasını düzenler', async () => {
      await assertSucceeds(updateDoc(doc(verified('mgr'), 'projects/volt'), { description: 'Yeni hakkında', name: 'Volt Robotics' }));
    });
    test('yönetici projeyi kendisi aktif/pasif yapamaz', async () => {
      await assertFails(updateDoc(doc(verified('mgr'), 'projects/volt'), { status: 'archived' }));
    });
    test('yönetici ilan açar', async () => {
      await assertSucceeds(setDoc(doc(verified('mgr'), 'projects/volt/opportunities/o2'), opp({ createdBy: 'mgr' })));
    });
    test('yetkisiz kullanıcı ilan açamaz', async () => {
      await assertFails(setDoc(doc(verified('mert'), 'projects/volt/opportunities/o2'), opp({ createdBy: 'mert' })));
    });
    test('yönetici ilanın başvurularını listeler', async () => {
      await assertSucceeds(getDocs(query(collection(verified('mgr'), 'projects/volt/applications'), where('opportunityId', '==', 'o1'))));
    });
    test('yetkisiz kullanıcı başvuruları listeleyemez', async () => {
      await assertFails(getDocs(query(collection(verified('mert'), 'projects/volt/applications'), where('opportunityId', '==', 'o1'))));
    });

    const acceptBatch = (db) => {
      const b = writeBatch(db);
      b.update(doc(db, 'projects/volt/applications/o1_ayse'), {
        status: 'accepted', statusHistory: [{ status: 'accepted', by: 'mgr' }],
        decidedBy: 'mgr', decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      b.set(doc(db, 'projects/volt/members/ayse'), { uid: 'ayse', role: 'member', title: 'Yazılım', viaOpportunityId: 'o1' });
      b.set(doc(db, 'users/ayse/experiences/x1'), {
        type: 'guild_project', title: 'Yazılım', organization: 'Volt', verified: true,
        source: { projectId: 'volt', opportunityId: 'o1' }, description: '', order: -1,
      });
      b.update(doc(db, 'projects/volt/opportunities/o1'), { filledCount: 1, updatedAt: serverTimestamp(), title: 'Yazılım', questions: [], links: [], status: 'open' });
      return b.commit();
    };
    test('yönetici başvuruyu kabul eder: üyelik + doğrulanmış deneyim + kontenjan', async () => {
      await assertSucceeds(acceptBatch(verified('mgr')));
    });
    test('yetkisiz kullanıcı kabul edemez', async () => {
      await assertFails(acceptBatch(verified('mert')));
    });
    test('başvuru kabul edilmeden doğrulanmış deneyim eklenemez', async () => {
      await assertFails(setDoc(doc(verified('mgr'), 'users/ayse/experiences/x2'), {
        type: 'guild_project', title: 'Hile', organization: 'Volt', verified: true,
        source: { projectId: 'volt', opportunityId: 'o1' }, description: '', order: -1,
      }));
    });
    test('iletişim bilgisi kabulden önce yöneticiye kapalı, sonra açık', async () => {
      await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'projects/volt/applications/o1_ayse/contact/info'), { email: 'a@x.com' }));
      await assertFails(getDoc(doc(verified('mgr'), 'projects/volt/applications/o1_ayse/contact/info')));
      await acceptBatch(verified('mgr'));
      await assertSucceeds(getDoc(doc(verified('mgr'), 'projects/volt/applications/o1_ayse/contact/info')));
    });
        test('başvuran kendi başvurusunu kabul edemez', async () => {
      await assertFails(updateDoc(doc(verified('ayse'), 'projects/volt/applications/o1_ayse'), {
        status: 'accepted', statusHistory: [{ status: 'accepted' }], decidedBy: 'ayse', decidedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }));
    });
  });
});

describe('Hesap ayarları & iletişim', () => {
  const msg = (extra = {}) => ({
    name: 'Ali', email: 'ali@ornek.com', subject: 'Merhaba', message: 'Proje önerim var', topic: 'proje',
    status: 'new', uid: null, createdAt: serverTimestamp(), ...extra,
  });
  test('giriş yapmamış ziyaretçi iletişim formu gönderir', async () => {
    await assertSucceeds(setDoc(doc(env.unauthenticatedContext().firestore(), 'messages/m1'), msg()));
  });
  test('giriş yapmış kullanıcı kendi uid ile gönderir', async () => {
    await assertSucceeds(setDoc(doc(verified('ayse'), 'messages/m2'), msg({ uid: 'ayse' })));
  });
  test('başkası adına / geçersiz e-posta ile mesaj gönderilemez', async () => {
    await assertFails(setDoc(doc(verified('ayse'), 'messages/m3'), msg({ uid: 'mert' })));
    await assertFails(setDoc(doc(verified('ayse'), 'messages/m4'), msg({ uid: 'ayse', email: 'gecersiz' })));
  });
  test('mesajları sadece admin okur', async () => {
    await assertFails(getDocs(collection(verified('ayse'), 'messages')));
    await assertSucceeds(getDocs(collection(verified('A3gNGw4d54T9QE3fCXfN2T5mLn63'), 'messages')));
  });

  describe('mevcut kullanıcı', () => {
    beforeEach(() => env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, 'handles/ayse'), { uid: 'ayse' });
      await setDoc(doc(db, 'users/ayse'), userDoc('ayse', 'ayse'));
      await setDoc(doc(db, 'users/ayse/private/profile'), { email: 'a@x.com' });
      await setDoc(doc(db, 'users/ayse/experiences/v1'), { type: 'guild_project', verified: true, title: 'X', description: '' });
    }));
    test('devre dışı hesap başkalarına görünmez, sahibine görünür', async () => {
      await assertSucceeds(updateDoc(doc(verified('ayse'), 'users/ayse'), { deactivated: true, updatedAt: serverTimestamp() }));
      await assertFails(getDoc(doc(verified('mert'), 'users/ayse')));
      await assertSucceeds(getDoc(doc(verified('ayse'), 'users/ayse')));
    });
    test('kullanıcı hesabını ve verilerini silebilir', async () => {
      const db = verified('ayse');
      const b = writeBatch(db);
      b.delete(doc(db, 'users/ayse/experiences/v1'));
      b.delete(doc(db, 'users/ayse/private/profile'));
      b.delete(doc(db, 'handles/ayse'));
      b.delete(doc(db, 'users/ayse'));
      await assertSucceeds(b.commit());
    });
    test('başkasının hesabı silinemez', async () => {
      await assertFails(deleteDoc(doc(verified('mert'), 'users/ayse')));
    });
    test('kullanıcı adı değiştirme (yeni handle + eskisini sil + profil)', async () => {
      const db = verified('ayse');
      const b = writeBatch(db);
      b.set(doc(db, 'handles/ayse_yeni'), { uid: 'ayse' });
      b.delete(doc(db, 'handles/ayse'));
      b.update(doc(db, 'users/ayse'), { handle: 'ayse_yeni', updatedAt: serverTimestamp() });
      await assertSucceeds(b.commit());
    });
  });
});
