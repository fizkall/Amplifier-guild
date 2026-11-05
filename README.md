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
| **Auth & Profil** | Google / e-posta girişi, profil oluşturma, yetenek profili = paylaşılabilir CV (FRC/etkinlik geçmişi, yetenekler, ✔ doğrulanmış Guild deneyimleri) |
| **İlan & Eşleştirme** | Projelerin açık pozisyonları, yetenek uyum skoru, tek tıkla başvuru, başvuru takibi |
| **Yönetim Paneli** | Proje paneli (başvuru kanban'ı) + Guild admin (proje onayı, roller) |

Forum / akış bölümü yoktur: site yalnızca öğrenci ↔ proje eşleştirme sistemidir.

## Adresler

| Adres | Sayfa |
|---|---|
| `/` | Tanıtım |
| `/giris` | Giriş / kayıt / şifre sıfırlama |
| `/profil-olustur` | İlk profil (CV) oluşturma |
| `/ana-sayfa` | Kişisel ana sayfa: başvuru durumu, sana uygun ilanlar |
| `/ilanlar` | Tüm açık ilanlar (filtre + uyum skoru) |
| `/basvurularim` | Başvuru takibi |
| `/profil/{kullanici}` veya `/@{kullanici}` | Profil / CV |
| `/proje/{slug}` | Proje sayfası |

## Uygulama olarak yükleme (PWA)

Site telefona uygulama olarak eklenebilir: Android/Chrome'da "Uygulamayı yükle" butonu,
iPhone'da Safari → Paylaş → **Ana Ekrana Ekle**. Açılış sayfası `/ana-sayfa`, tam ekran çalışır.

## Dokümanlar

- 📐 [Mimari doküman & veri akış şemaları](docs/ARCHITECTURE.md)
- 🗄️ [Firestore veritabanı şeması](docs/FIRESTORE_SCHEMA.md)
- 🗺️ [Adım adım uygulama rehberi / yol haritası](docs/ROADMAP.md)
- 🎨 [Tasarım sistemi](docs/DESIGN_SYSTEM.md)

## Repo yapısı

```
.
├─ app/ components/ lib/   Next.js web uygulaması (Vercel otomatik deploy)
├─ docs/                     Mimari, şema, yol haritası, tasarım sistemi
├─ shared/                   models.ts (ortak tipler) · match.ts (eşleştirme skoru)
├─ functions/                Cloud Functions v2 (TypeScript)
├─ tests/                    Firestore kural testleri (emülatör)
├─ assets/brand/             Logo (koyu / açık)
├─ firestore.rules           Güvenlik kuralları
├─ firestore.indexes.json    Bileşik indeksler
├─ storage.rules
└─ firebase.json             Emülatör + deploy yapılandırması
```

## Teknoloji

Next.js 15 · TypeScript · Firebase Auth · Cloud Firestore · Cloud Storage ·
Cloud Functions v2 · App Check · Vercel

## Başlangıç

```bash
cp .env.example .env.local   # Firebase web yapılandırmasını doldur
npm install && npm run dev   # http://localhost:3000
(cd tests && npm install && npm run test:rules)   # Firestore kural testleri
```

Canlı: **https://amplifierguild.online** — `git push` → Vercel otomatik yayınlar.
