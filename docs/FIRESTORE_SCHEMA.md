# Firestore Veritabanı Şeması

> Amfiplier Guild — v1 şema. TypeScript karşılıkları: [`shared/models.ts`](../shared/models.ts) ·
> Güvenlik kuralları: [`firestore.rules`](../firestore.rules) · İndeksler: [`firestore.indexes.json`](../firestore.indexes.json)

## 0. Tasarım ilkeleri

1. **Okuma için modelle, yazma için değil.** Firestore'da JOIN yok. Akışta her gönderi kartı tek bir
   belge okumasıyla çizilebilmeli → yazar adı/fotoğrafı gönderinin içine **snapshot** olarak gömülür.
2. **Yol (path) = yetki.** Bir belgeyi kimin yönetebileceği yolundan anlaşılmalı:
   `projects/{pid}/applications/...` → kuralda `pid` doğrudan kullanılabilir, sorgular da güvenle filtrelenir.
3. **Sayaçlar ve kritik durum geçişleri sadece sunucuda.** `likeCount`, `applicationCount`,
   başvuru `accepted/rejected` geçişi gibi alanlar **Cloud Functions** (Admin SDK) ile yazılır; istemci yazamaz.
4. **Public / private ayrımı.** E‑posta, telefon, doğum tarihi, veli onayı gibi KVKK kapsamındaki veriler
   ayrı bir alt belgede (`users/{uid}/private/profile`) tutulur. Public profil herkesle paylaşılabilir CV'dir.
5. **Deterministik ID'ler ile tekillik.** Başvuru ID'si `${opportunityId}_${uid}` → aynı ilana iki kez
   başvurmak fiziksel olarak imkânsız. Kullanıcı adı tekilliği `handles/{handle}` ile sağlanır.

## 1. Koleksiyon ağacı

```
/users/{uid}                              ← public profil (yetenek kartı / CV vitrini)
    /private/profile                      ← KVKK hassas veri (sadece sahibi + admin)
    /experiences/{expId}                  ← CV kalemleri (FRC sezonu, ödül, proje...)
    /following/{targetId}                 ← takip ettiklerim (kullanıcı veya proje)
    /followers/{followerUid}              ← beni takip edenler (Function aynalar)
    /notifications/{notifId}              ← bildirim kutusu
    /timeline/{postId}                    ← (Faz 2) fan-out akış

/handles/{handle}                         ← @kullaniciadi → uid eşlemesi (tekillik)

/projects/{projectId}                     ← girişim / proje sayfası
    /members/{uid}                        ← ekip (owner | admin | member)
    /opportunities/{opportunityId}        ← açık pozisyon (ilan)
    /applications/{opportunityId_uid}     ← başvurular
        /internal/review                  ← sadece yöneticilerin göreceği değerlendirme notları

/posts/{postId}                           ← akış gönderileri + yanıtlar (Threads modeli)
    /likes/{uid}

/reports/{reportId}                       ← moderasyon şikâyetleri
/auditLogs/{logId}                        ← yönetim işlemleri kaydı (sadece Functions yazar)
/meta/taxonomy                            ← yetenek etiketleri, program listesi (FRC, FTC, FLL...)
```

**Collection group sorguları** (tüm projeler genelinde):

| Sorgu | Kim kullanır |
|---|---|
| `collectionGroup('opportunities').where('status','==','open')` | İlan tahtası (herkes) |
| `collectionGroup('applications').where('applicantId','==',uid)` | Öğrenci: "Başvurularım" |
| `collectionGroup('applications').where('status','==','submitted')` | Guild admin paneli |

## 2. Belge şemaları

### 2.1 `users/{uid}` — Yetenek profili (public)

| Alan | Tip | Not |
|---|---|---|
| `uid` | string | Auth UID ile aynı |
| `handle` | string | `handles/` ile senkron, küçük harf, `^[a-z0-9_.]{3,24}$` |
| `displayName` | string | |
| `photoURL` | string \| null | Storage: `avatars/{uid}/...` |
| `headline` | string | "FRC #6232 Yazılım Kaptanı · Full‑stack meraklısı" (≤ 120) |
| `bio` | string | ≤ 500 |
| `accountType` | `'student' \| 'founder' \| 'mentor'` | Yetki DEĞİL, sadece profil türü. Yetki = custom claims |
| `school` | `{ name, city, gradYear }` | |
| `skills` | `string[]` | Görünen etiketler: `["Python","CAD","Takım Liderliği"]` (≤ 30) |
| `skillSlugs` | `string[]` | Normalize: `["python","cad","takim-liderligi"]` → sorgu + eşleştirme |
| `interests` | `string[]` | |
| `programs` | `ProgramEntry[]` | Özet: `{ program:'FRC', teamNumber:6232, teamName, seasons:[2024,2025], role }` |
| `links` | `{ github?, linkedin?, portfolio?, instagram? }` | |
| `openToWork` | boolean | İlan tahtasında "uygun yetenek" filtresi |
| `availability` | `{ hoursPerWeek, remote, city }` | |
| `visibility` | `'public' \| 'members'` | `public` → giriş yapmamış biri de CV linkini görebilir |
| `stats` | `{ followers, following, posts, projectsJoined }` | **Sadece Functions** |
| `badges` | `string[]` | `verified_frc`, `guild_alumni`... **Sadece admin/Functions** |
| `onboardingComplete` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

### 2.2 `users/{uid}/private/profile` — Hassas veri

| Alan | Tip | Not |
|---|---|---|
| `email`, `phone` | string | Proje yöneticileri **sadece kabul sonrası** Function aracılığıyla görür |
| `birthDate` | string (ISO) | 18 yaş altı tespiti |
| `isMinor` | boolean | |
| `guardianConsent` | `{ name, email, consentedAt } \| null` | 18 yaş altı için veli onayı |
| `kvkkConsentAt`, `marketingConsent` | timestamp / boolean | Aydınlatma metni onayı |
| `cvFileUrl` | string \| null | Storage: `cv/{uid}/cv.pdf` (opsiyonel PDF) |

### 2.3 `users/{uid}/experiences/{expId}` — CV kalemleri

| Alan | Tip | Not |
|---|---|---|
| `type` | `'frc_season' \| 'competition' \| 'award' \| 'project' \| 'education' \| 'volunteer' \| 'guild_project'` | |
| `title` | string | "Yazılım Alt Takım Lideri" |
| `organization` | string | "FRC #6232 — Takım Adı" |
| `program` | string \| null | `FRC`, `FTC`, `FLL`, `TEKNOFEST`, `TÜBİTAK`... |
| `startDate` / `endDate` | string `YYYY-MM` / null | |
| `description` | string | ≤ 1000 |
| `skills` | string[] | |
| `verified` | boolean | **`true` sadece Function yazar** (Guild projesinde kabul edilince otomatik) |
| `source` | `{ projectId, opportunityId } \| null` | `guild_project` için referans |
| `order` | number | Sürükle‑bırak sıralama |

> 💡 Guild'in değer önerisi burada: Guild projesine kabul edilen öğrencinin CV'sine **doğrulanmış (✔)**
> bir deneyim kalemi otomatik eklenir. Kullanıcı bunu düzenleyemez/silemez → CV'de güvenilir sinyal.

### 2.4 `handles/{handle}`
`{ uid: string, createdAt }` — Kullanıcı adı değişimi tek bir batch: yeni handle oluştur + eskisini sil + `users.handle` güncelle.

### 2.5 `projects/{projectId}` — Girişim / proje

| Alan | Tip | Not |
|---|---|---|
| `name`, `slug` | string | `slug` URL için: `/p/{slug}` |
| `tagline` | string | ≤ 100 |
| `description` | string | Markdown, ≤ 5000 |
| `logoUrl`, `coverUrl` | string \| null | |
| `kind` | `'guild_internal' \| 'partner_startup' \| 'community'` | Kendi girişimimiz / anlaşmalı / topluluk |
| `ownerId` | string | |
| `status` | `'pending' \| 'active' \| 'paused' \| 'archived' \| 'rejected'` | **Admin onayı** ile `active` |
| `tags` | string[] | |
| `links` | `{ website?, instagram?, linkedin? }` | |
| `stats` | `{ members, followers, posts, openOpportunities }` | **Sadece Functions** |
| `createdAt` / `updatedAt` | timestamp | |

### 2.6 `projects/{pid}/members/{uid}`
`{ uid, role: 'owner'|'admin'|'member', title, userSnapshot:{displayName,handle,photoURL}, joinedAt, viaOpportunityId|null }`

### 2.7 `projects/{pid}/opportunities/{oid}` — İlan

| Alan | Tip | Not |
|---|---|---|
| `projectId` | string | Collection group sorgusunda geri referans |
| `projectSnapshot` | `{ name, slug, logoUrl }` | Kartı tek okumada çizmek için |
| `title` | string | "Gömülü Yazılım Stajyeri" |
| `description` | string | Markdown |
| `roleType` | `'volunteer' \| 'internship' \| 'part_time' \| 'project_based'` | |
| `commitment` | `{ hoursPerWeek, durationWeeks }` | |
| `location` | `{ remote: boolean, city: string \| null }` | |
| `requiredSkills` / `requiredSkillSlugs` | string[] | Eşleştirme skoru bunlardan |
| `niceToHaveSkillSlugs` | string[] | |
| `questions` | `{ id, label, required, maxLength }[]` | Opsiyonel ek sorular (≤ 3, tek tık ruhunu bozmamak için) |
| `slots` / `filledCount` | number | `filledCount` **sadece Functions** |
| `applicationCount` | number | **sadece Functions** |
| `status` | `'draft' \| 'open' \| 'closed' \| 'filled'` | |
| `deadline` | timestamp \| null | Zamanlanmış Function süresi geçeni `closed` yapar |
| `createdBy`, `createdAt`, `updatedAt` | | |

### 2.8 `projects/{pid}/applications/{oid}_{uid}` — Başvuru

| Alan | Tip | Not |
|---|---|---|
| `opportunityId`, `projectId`, `applicantId` | string | |
| `opportunitySnapshot` | `{ title, roleType }` | "Başvurularım" listesi için |
| `projectSnapshot` | `{ name, slug, logoUrl }` | |
| `applicantSnapshot` | `{ displayName, handle, photoURL, headline, skills, programs, school }` | **Başvuru anındaki CV donar** → sonradan profil değişse de karar geçmişi tutarlı |
| `answers` | `{ [questionId]: string }` | |
| `message` | string | Opsiyonel ≤ 1000 |
| `matchScore` | number 0‑100 | Function hesaplar (yetenek kesişimi) |
| `status` | `'submitted' \| 'in_review' \| 'shortlisted' \| 'accepted' \| 'rejected' \| 'withdrawn'` | |
| `statusHistory` | `{ status, at, by }[]` | Zaman çizelgesi (Functions ekler) |
| `decidedBy`, `decidedAt` | | |
| `createdAt`, `updatedAt` | timestamp | |

`.../applications/{aid}/internal/review` → `{ notes, rating, updatedBy }` — başvuran **göremez**.

**Durum makinesi:**

```
submitted ──► in_review ──► shortlisted ──► accepted
    │             │              │
    │             └──────────────┴────────► rejected
    └─(başvuran)──► withdrawn  (accepted/rejected sonrası değil)
```

| Geçiş | Kim | Nasıl |
|---|---|---|
| `∅ → submitted` | Öğrenci | İstemci yazımı (kurallarla doğrulanır) |
| `submitted → in_review` | Proje yöneticisi | İstemci (sadece `status`,`updatedAt` değişebilir) — "görüldü" |
| `* → shortlisted / accepted / rejected` | Proje yöneticisi / Guild admin | **Callable Function `reviewApplication`** |
| `submitted/in_review → withdrawn` | Öğrenci | İstemci |

### 2.9 `posts/{postId}` — Akış (Threads modeli)

Yanıtlar ayrı bir koleksiyon değil, **aynı koleksiyonda `parentId` dolu gönderilerdir** (Threads/X modeli).
Böylece bir yanıt da beğenilebilir, yanıtlanabilir, profilde "Yanıtlar" sekmesinde listelenebilir.

| Alan | Tip | Not |
|---|---|---|
| `authorId` | string | |
| `authorSnapshot` | `{ displayName, handle, photoURL, badges }` | Profil güncellenince Function toplu günceller |
| `projectId` / `projectSnapshot` | string \| null | Proje adına paylaşım ("@proje adına") |
| `type` | `'text' \| 'update' \| 'announcement' \| 'opportunity'` | `announcement` sadece proje yöneticisi/admin; `opportunity` ilan açılınca Function üretir |
| `text` | string | ≤ 500 karakter (Threads limiti) |
| `media` | `{ url, type:'image'\|'video', width, height, alt }[]` | ≤ 4 |
| `link` | `{ url, title, image } \| null` | Link önizleme (Function doldurur) |
| `opportunityRef` | `{ projectId, opportunityId, title } \| null` | Akışta "Başvur" butonu |
| `mentions` / `tags` | string[] | uid listesi / hashtag |
| `parentId` | string \| null | Doğrudan yanıt verilen gönderi |
| `rootId` | string \| null | Thread'in kökü (zincirleme okuma) |
| `replyCount`, `likeCount`, `repostCount` | number | **Sadece Functions** |
| `status` | `'published' \| 'hidden' \| 'removed'` | Moderasyon |
| `pinned` | boolean | Profil/proje sayfasında sabitleme |
| `createdAt`, `editedAt` | timestamp | |

`posts/{postId}/likes/{uid}` → `{ createdAt }` — Belge ID'si = uid → aynı kişi iki kez beğenemez.

### 2.10 Diğer

- `users/{uid}/notifications/{id}` → `{ type: 'like'|'reply'|'follow'|'mention'|'application_status'|'new_application'|'project_approved', actorSnapshot, target:{kind,id,projectId?}, text, read:false, createdAt }`
- `reports/{id}` → `{ reporterId, target:{kind:'post'|'user'|'project', path}, reason, status:'open'|'resolved', createdAt }`
- `auditLogs/{id}` → `{ actorId, action, target, before, after, at }` — sadece Functions yazar, sadece admin okur.
- `meta/taxonomy` → `{ skills: [{slug,label,category}], programs: ['FRC','FTC','FLL','TEKNOFEST','TÜBİTAK','WRO','MUN',...] }`

## 3. Yetki modeli

| Katman | Kaynak | Örnek |
|---|---|---|
| **Global rol** | Firebase Auth **custom claims** | `{ admin: true }`, `{ moderator: true }` — sadece `setUserRole` callable ile |
| **Proje rolü** | `projects/{pid}/members/{uid}.role` | `owner`, `admin` → ilan aç, başvuru değerlendir; `member` → proje adına gönderi |
| **Sahiplik** | Belgedeki `authorId` / `applicantId` / yol `{uid}` | Kendi gönderini düzenle, kendi başvurunu geri çek |

## 4. Sorgu kataloğu ve gerekli indeksler

| Ekran | Sorgu | İndeks |
|---|---|---|
| Ana akış "Senin için" | `posts where status=='published' && parentId==null orderBy createdAt desc limit 20` | `status ASC, parentId ASC, createdAt DESC` |
| Ana akış "Takip" (Faz 1) | yukarıdaki + `authorId in [≤30 uid]` | `status, parentId, authorId, createdAt DESC` |
| Profil → Gönderiler | `posts where authorId==X && parentId==null && status=='published' orderBy createdAt desc` | `authorId, parentId, status, createdAt DESC` |
| Profil → Yanıtlar | `posts where authorId==X && parentId!=null...` | `authorId, status, createdAt DESC` |
| Thread detayı | `posts where rootId==X && status=='published' orderBy createdAt asc` | `rootId, status, createdAt ASC` |
| Proje sayfası akışı | `posts where projectId==X && status=='published' orderBy createdAt desc` | `projectId, status, createdAt DESC` |
| İlan tahtası | `CG opportunities where status=='open' orderBy createdAt desc` | CG: `status, createdAt DESC` |
| İlan filtre (yetenek) | `+ requiredSkillSlugs array-contains 'python'` | CG: `status, requiredSkillSlugs CONTAINS, createdAt DESC` |
| İlan filtre (tür) | `+ roleType == 'internship'` | CG: `status, roleType, createdAt DESC` |
| Başvurularım | `CG applications where applicantId==uid orderBy createdAt desc` | CG: `applicantId, createdAt DESC` |
| Proje paneli | `projects/{pid}/applications where opportunityId==X && status==Y orderBy matchScore desc` | `opportunityId, status, matchScore DESC` |
| Guild admin paneli | `CG applications where status=='submitted' orderBy createdAt asc` | CG: `status, createdAt ASC` |
| Onay bekleyen projeler | `projects where status=='pending' orderBy createdAt asc` | `status, createdAt ASC` |
| Yetenek keşfi | `users where openToWork==true && skillSlugs array-contains X` | `openToWork, skillSlugs CONTAINS, updatedAt DESC` |

> Firestore tam metin aramayı desteklemez. Faz 2'de **Typesense / Algolia Firebase Extension** ile
> `users`, `projects`, `opportunities` indekslenir (arama çubuğu).
