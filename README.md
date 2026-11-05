<p align="center">
  <img src="assets/brand/logo-dark.png" width="140" alt="Amfiplier Guild logosu" />
</p>

<h1 align="center">Amfiplier Guild</h1>

<p align="center">
  FRC ve etkinlik topluluklarındaki öğrencileri girişimler ve projelerle buluşturan lonca.<br/>
  <em>Amfi'den sahneye — potansiyelini yükselt.</em>
</p>

---

**Amfiplier Guild**, öğrencilere gerçek projelerde yer alma fırsatı, network ve **doğrulanmış CV** kazandırır;
projelere ise motive ve yetkin insan kaynağı sağlar. Arayüz Threads tarzı: minimalist, koyu tema, akış tabanlı.
bumpermedia.online'dan bağımsız, ayrı bir site ve Firebase projesi olarak çalışır.

## Modüller

| Modül | Özet |
|---|---|
| **Auth & Profil** | Google / e-posta girişi, 4 adımlı onboarding, yetenek profili = paylaşılabilir CV (FRC/etkinlik geçmişi, yetenekler, ✔ doğrulanmış Guild deneyimleri) |
| **Akış Vitrini** | Threads tarzı feed: gönderi, yanıt zinciri, beğeni, takip, proje adına duyurular |
| **İlan & Eşleştirme Tahtası** | Projelerin açık pozisyonları, yetenek eşleşme skoru, tek tıkla başvuru |
| **Yönetim Paneli** | Proje paneli (başvuru kanban'ı) + Guild admin (proje onayı, moderasyon, roller) |

## Dokümanlar

- 📐 [Mimari doküman & veri akış şemaları](docs/ARCHITECTURE.md)
- 🗄️ [Firestore veritabanı şeması](docs/FIRESTORE_SCHEMA.md)
- 🗺️ [Adım adım uygulama rehberi / yol haritası](docs/ROADMAP.md)
- 🎨 [Tasarım sistemi](docs/DESIGN_SYSTEM.md)

## Repo yapısı

```
.
├─ docs/                     Mimari, şema, yol haritası, tasarım sistemi
├─ shared/                   models.ts (ortak tipler) · match.ts (eşleştirme skoru)
├─ functions/                Cloud Functions v2 (TypeScript)
├─ tests/                    Firestore kural testleri (emülatör)
├─ assets/brand/             Logo (koyu / açık)
├─ firestore.rules           Güvenlik kuralları
├─ firestore.indexes.json    Bileşik indeksler
├─ storage.rules
└─ firebase.json             Emülatör + deploy yapılandırması
   (apps/web — Next.js istemcisi Faz 0'da eklenecek)
```

## Teknoloji

Next.js 15 · TypeScript · Tailwind · Firebase Auth · Cloud Firestore · Cloud Storage ·
Cloud Functions v2 · App Check · Firebase App Hosting

## Başlangıç

```bash
npm install && (cd functions && npm install)
npm run emulators      # Firebase emülatörleri (UI: http://localhost:4000)
npm run test:rules     # Firestore kural testleri
```
