# MAHALLE AĞI — Sıfır Maliyetli Afet İletişim ve Hayatta Kalma Platformu

**Başakşehir Living Lab 13x13 — Teknik Mimari, Senaryolar ve MVP Yol Haritası**

> Tek cümlelik özet: Mahalle Ağı, internet ve baz istasyonları çöktüğünde halkın cebindeki telefonları, çekmecedeki eski cihazları ve muhtarlık bilgisayarlarını kendi kendini örgütleyen bir mahalle ağına dönüştürür. SOS'ları önceliklendirir, konum üretir ve kurtarma ekiplerini enkaz altındaki kişiye yönlendirir. Yeni donanım gerekmez.

---

## 0. Önce mühendislik gerçekleri (jüri bunları soracak)

Projeyi güvenilir kılan şey, sınırlarını bilmesidir. Mimarinin her kararı aşağıdaki kısıtlara göre verildi:

| Kısıt | Gerçek durum | Mimarideki çözüm |
|---|---|---|
| **Saf PWA Bluetooth mesh kuramaz** | Web Bluetooth yalnızca *central* (bağlanan) rolünü destekler; tarayıcı BLE *reklam* (advertise/peripheral) yapamaz. iOS Safari Web Bluetooth'u hiç desteklemez. Wi-Fi Direct'e tarayıcıdan erişim yoktur. | **Hibrit çekirdek:** Ortak kod tabanı PWA'dır. Mesh radyo katmanı ise aynı web kodunu saran ince bir **Capacitor yerel kabuğunda** çalışır (Android: BLE + Wi-Fi Aware/Nearby, iOS: CoreBluetooth). Protokol olarak açık kaynak **bitchat** (Unlicense / kamu malı) mesh protokolü uyumlu biçimde kullanılır. Saf PWA modu yine çalışır: akustik modem, QR ve LAN üzerinden. |
| **Service Worker HTTPS ister** | Muhtarlık bilgisayarının yerel ağda `http://192.168.x.x` ile sunduğu bir PWA çevrimdışı önbellek kuramaz. | PWA **afetten önce**, internet varken kurulur ve önbelleğe alınır (kampanya: okul, cami, muhtarlık QR'ları). Afet anında yerel ağdan yalnızca *veri* senkronize edilir. Yerel sunucu için muhtarlığa önceden kurulan bir yerel CA sertifikası (mkcert) ikinci yoldur. |
| **Tarayıcıda arka plan çalışması kısıtlı** | Kapalı ekranda PWA uyur. | Röle ve "data mule" rolleri yerel kabukta *foreground service* (Android) olarak çalışır. Saf PWA'da "Röle Modu" ekranı açık bırakılır (Wake Lock API). |
| **"Enkaz derinliği sonarı"** | Telefon hoparlörüyle, içinde boşluk olan beton yığınından yankı alarak derinlik ölçmek fiziksel olarak güvenilir değildir. | Doğru olan **iki cihaz arası akustik mesafe ölçümüdür** (BeepBeep yöntemi, saat senkronu gerektirmez, ±10–30 cm). Kurtarıcının telefonu ile enkazdaki telefon karşılıklı "chirp" atar. Sonuç bir *"yaklaşık X m"* bilgisidir, derinlik ölçümü olarak sunulmaz. |
| **Ultrasonik sivrisinek kovucu** | Hakemli çalışmalar ultrasonik kovucuların sivrisineklere **etkisiz** olduğunu gösteriyor (Cochrane derlemesi, 2007; sonraki saha testleri). Telefon hoparlörleri 18 kHz üzerinde zaten çok zayıftır. | Modül "deneysel / kanıtı zayıf" etiketiyle sunulur. Asıl haşere koruması **Edge AI rehberindeki kanıta dayalı yöntemlerdir** (cibinlik, durgun su tahliyesi, giysi). Bu dürüstlük jüri gözünde puan kazandırır. |
| **Tıbbi yapay zekâ halüsinasyonu** | Küçük yerel LLM'ler tıbbi bilgi uydurabilir. | LLM *bilgi üretmez*. Yalnızca AFAD / Kızılay / Sağlık Bakanlığı onaylı protokollerden **RAG ile alıntı yapar** ve adımları sıralar. Kritik akışlar (CPR, kanama durdurma) LLM'siz, deterministik karar ağaçlarıdır. |
| **Telefonlarda ortam sıcaklığı sensörü yok** | Hipotermi riski doğrudan ölçülemez. | Risk tahmin edilir: saat, mevsim, önbellekteki iklim normalleri, gökyüzü analizi ve kullanıcının "üşüyorum / ıslağım" girdisi birleştirilir. Batarya sıcaklığı ancak zayıf bir işaret olarak eklenir. |

---

## 1. Teknik Mimari — 7 Katman

```
┌──────────────────────────────────────────────────────────────────────┐
│ K7  SUNUM        PWA arayüzü · Sesli eller-serbest · Akıllı TV konsolu │
├──────────────────────────────────────────────────────────────────────┤
│ K6  ZEKÂ (Edge)  WebLLM/Transformers.js · Triage · İlk yardım RAG ·    │
│                  Visual GPS · Gökyüzü analizi · Ses olay algılama       │
├──────────────────────────────────────────────────────────────────────┤
│ K5  UYGULAMA     SOS · Mesaj · Kaynak panosu · Kayıp-bulundu · Durum  │
├──────────────────────────────────────────────────────────────────────┤
│ K4  VERİ & SENK. CRDT (Automerge/Yjs) · Store-and-forward · Data Mule │
├──────────────────────────────────────────────────────────────────────┤
│ K3  GÜVENLİK     Noise XX (bitchat) · Ed25519 imza · Muhtar anahtarı  │
├──────────────────────────────────────────────────────────────────────┤
│ K2  YÖNLENDİRME  Flood + TTL(7) · Bloom filtre tekilleştirme ·        │
│                  Öncelik kuyruğu (SOS > Tıbbi > Durum > Sohbet)       │
├──────────────────────────────────────────────────────────────────────┤
│ K1  TAŞIMA       BLE mesh │ Wi-Fi Aware/LAN │ Audio-FSK │ QR │ Flaş   │
└──────────────────────────────────────────────────────────────────────┘
        ▲ telefonlar        ▲ eski telefon röleleri     ▲ muhtarlık PC
```

### K1 — Taşıma katmanı (çoklu radyo, "hangisi çekerse")

Taşıma Soyutlama Arayüzü (TAI) tüm kanalları tek bir `send(packet)` / `onPacket()` arayüzünde birleştirir. Üst katmanlar hangi radyonun kullanıldığını bilmez.

| Kanal | Menzil | Hız | Kullanım |
|---|---|---|---|
| BLE mesh (bitchat uyumlu) | 10–50 m/hop, 7 hop | ~10–100 kbps | Birincil mahalle ağı |
| Wi-Fi Aware / yerel LAN (eski modem) | 50–100 m | Mbps | Apartman omurgası, harita/model dağıtımı |
| Audio-FSK (Web Audio) | 1–10 m, enkaz içinden | 20–100 bps | Radyo çekmediğinde son çare, SOS özeti |
| QR kod (ekran ↔ kamera) | 0,3–1 m | anlık, ~2 KB | Data mule'ün elle aktarımı, cihaz eşleme |
| Kamera flaşı (Mors / OOK) | 100+ m görüş hattı | ~5 bps | Görsel SOS işareti |

### K2 — Yönlendirme

- **Kontrollü flood + TTL=7** (bitchat modeli). Her paketin 8 baytlık kimliği bir **Bloom filtresinde** tutulur, tekrar iletim engellenir.
- **Öncelik kuyruğu:** `SOS_KRITIK > TIBBI > KONUM_GUNCELLEME > KAYNAK > SOHBET`. Bant daraldığında sohbet düşürülür, SOS asla düşürülmez.
- **Muhtarlığa doğru gradyan yönlendirme:** Her düğüm "muhtarlık düğümüne kaç hop uzaktayım" bilgisini yayınlar. SOS paketleri flood'un yanında bu gradyanı da izler, böylece ağ tıkanmadan ana düğüme ulaşır.
- **Batarya-farkındalıklı rol:** Pili %20'nin altındaki telefon röleliği bırakır ve yalnızca kendi SOS'unu yayar. Prizdeki eski telefonlar ise "süper röle" olur.

### K3 — Güvenlik ve güven

- Uçtan uca şifreleme: **Noise Protocol XX** (bitchat ile aynı). Anahtarlar cihazda üretilir, kayıt veya sunucu yoktur.
- **Ed25519 ile imzalı resmi duyurular:** Muhtarlık ve AFAD anahtarları PWA'ya önceden gömülür. "Resmi" rozetli mesajı yalnızca bu anahtarlar üretebilir. Bu, afet anında **sahte haber / panik dezenformasyonuna** karşı ana savunmadır.
- SOS paketleri *imzalı ama şifresiz* yayılır, çünkü kurtarmada okunabilirlik gizlilikten önce gelir. Özel mesajlar şifrelidir.
- Kimlik: anonim takma ad. İsteğe bağlı olarak muhtarlıkta önceden doğrulanmış "mahalle sakini" sertifikası.

### K4 — Veri ve senkronizasyon

- **CRDT (Automerge veya Yjs):** Kaynak panosu, kayıp listesi ve hasar haritası çakışmasız birleşir. İki muhtarlık birbirinden habersiz veri toplasa bile karşılaştıklarında sorunsuz birleşir.
- **Store-and-forward:** Her cihaz son 48 saatin SOS paketlerini IndexedDB'de taşır (ilk 10 MB). Bu, Data Mule'ün temelidir.
- **Data Mule protokolü:**
  1. Yürüyen vatandaşın telefonu karşılaştığı her düğümle *özet takası* yapar (hangi paket kimliklerine sahibiz).
  2. Yalnızca eksik paketler aktarılır (Bloom filtresi farkı → delta senkron).
  3. Muhtarlık düğümü menzile girince toplanan her şey otomatik yüklenir ve kullanıcıya "**X kişinin sesini muhtarlığa taşıdın**" bildirimi çıkar (oyunlaştırma + motivasyon).
  4. Muhtarlık, ulaşılan paketler için *imzalı alındı (ACK)* yayar. Bu ACK ağda geri yayılır, gönderen "SOS'un muhtarlığa ulaştı" bilgisini alır ve gereksiz tekrar yayın durur.

### SOS paketi — standart sıkıştırılmış format (≤ 64 bayt, FSK ile ~5 sn)

```
┌────┬────┬──────────┬───────────────┬────┬────┬────────┬──────┬───────┐
│ver │tip │ kimlik 8B│ konum 8B      │acil│kişi│ durum  │çevre │ imza  │
│ 4b │ 4b │          │ lat/lon int32 │ 3b │ 5b │ bayrak │ 1B   │ 32B*  │
└────┴────┴──────────┴───────────────┴────┴────┴────────┴──────┴───────┘
durum bayrakları (16 bit): sıkışma, kanama, kırık, nefes güçlüğü, bilinç,
çocuk, yaşlı, hamile, kronik ilaç (insülin vb.), engelli, evcil hayvan…
çevre (8 bit): yağmur riski, soğuk riski, gaz kokusu, yangın, su baskını
konum kaynağı (2 bit): GPS / Visual-GPS / güneş+adım / manuel
* FSK kanalında imza 8 bayta kısaltılır (kesik HMAC), BLE'de tam imza.
```

### K5–K6 — Uygulama ve Edge AI

| Görev | Model / Teknik | Boyut | Çalıştırma |
|---|---|---|---|
| Panik metni → SOS triage | Qwen2.5-0.5B / Llama-3.2-1B (q4) + JSON şema zorlaması | 350–700 MB | WebLLM (WebGPU). WebGPU yoksa kural tabanlı Türkçe anahtar kelime çıkarıcı (≤50 KB) |
| İlk yardım koçu | Deterministik karar ağaçları + küçük LLM ile RAG (onaylı protokoller) | +5 MB metin | WebLLM / Transformers.js |
| Konuşma → metin | Whisper-tiny / base (Türkçe) | 40–75 MB | Transformers.js (WASM/WebGPU) |
| Metin → konuşma | Tarayıcı `speechSynthesis` (çevrimdışı TR ses) / Piper TTS (WASM) | 0–20 MB | yerel |
| Ses olayı (düdük, vurma, insan sesi) | YAMNet (TF.js) + düdük için FFT bant detektörü | 4 MB | Web Audio + TF.js |
| Visual GPS | MobileNetV3 / DINOv2-small gömme + mahalle vektör veritabanı | 20 MB model + ~5 MB/mahalle | Transformers.js |
| Gökyüzü / bulut | Güneş tespiti (parlaklık zirvesi) + bulut sınıflandırıcı (MobileNet ince ayar) | 5 MB | TF.js |

**Kademeli model stratejisi:** Her telefon her modeli çalıştıramaz. Uygulama cihaz kapasitesini ölçer (`navigator.gpu`, `deviceMemory`) ve üç profilden birini seçer: **Tam** (WebGPU, LLM), **Hafif** (WASM, küçük modeller) veya **Kural** (LLM yok). En düşük profilde bile SOS triage ve ilk yardım ağacı çalışır. Böylece eski telefonlar dışlanmaz.

### Modül entegrasyon haritası (her şey birbirini besler)

```
 Ses komutu ─► Whisper ─► Triage LLM ─► SOS paketi ◄─ Visual GPS / Güneş pusulası
                                            │            ◄─ Gökyüzü: yağmur/soğuk riski
                                            ▼
                          Öncelik kuyruğu (K2) ─► BLE │ LAN │ FSK │ Flaş
                                            │
          Data Mule telefonları ◄──────────┘──► Muhtarlık düğümü (CRDT)
                                                     │
                                  Akıllı TV konsolu ◄┘──► AFAD'a internet dönünce aktarım
 Kurtarıcı RSSI / düdük algısı ─► enkazdaki telefon: flaş Mors + 3 kHz yanıt düdüğü
                                   + akustik mesafe ölçümü
```

### Ev ekolojisi ve eski cihazlar (Modül 8)

| Cihaz | Yeni rolü | Nasıl |
|---|---|---|
| Çekmecedeki eski Android | **Sabit mesh rölesi** (pencere kenarı, şarj aletine takılı) | Capacitor kabuğunda "Röle Modu": foreground service, ekran kapalı, yalnızca yönlendirme. Android 6+ yeterli. Powerbank veya araç aküsüyle günlerce çalışır. |
| Bluetooth hoparlör | **Akustik güçlendirici** | Telefonun ses çıkışı A2DP ile hoparlöre yönlendirilir. Düdük ve FSK yayını 10–20 dB daha yüksek olur. *Not:* A2DP gecikmesi (100–300 ms) FSK'yı bozmaz ama mesafe ölçümünde kalibrasyon gerektirir. |
| İnternetsiz eski modem | **Apartman yerel ağı** | Modem sadece Wi-Fi AP olarak açılır (çoğu modem internetsiz de DHCP dağıtır). Prizdeki eski telefon veya Raspberry/eski laptop yerel düğüm sunucusu olur. Komşular aynı Wi-Fi'ye bağlanıp Mbps hızında senkronize olur. Elektrik yoksa 12 V akü + DC dönüştürücü kullanılır. |
| Akıllı TV | **Mahalle afet durum konsolu** (muhtarlık, çadır kent) | TV tarayıcısı muhtarlık düğümünün yerel adresini açar (`/konsol`): canlı SOS haritası, kaynak panosu, resmi duyurular, kayıp listesi. Kiosk modu, uzaktan kumanda ile gezinme. |
| Muhtarlık PC | **Ana düğüm** | Node.js tabanlı tek tık kurulum (`mahalle-dugum.exe`). Yerel HTTPS sunucusu, CRDT deposu, BLE dongle'ı veya bağlı Android ile mesh köprüsü, internet dönünce AFAD'a toplu aktarım. |

---

## 2. Çalışma Senaryoları

### Senaryo A — Afet Anı (T+0 → T+6 saat)

**Durum:** Sabah 04:17, 7,2 büyüklüğünde deprem. Başakşehir'de baz istasyonları ve elektrik kesildi.

1. **T+0 dk:** Telefonlar ivmeölçerden güçlü sarsıntıyı algılar (DeviceMotion). Uygulama otomatik "Afet Modu"na geçer: ekran parlaklığı düşer, gereksiz servisler kapanır, mesh radyosu açılır.
2. **T+3 dk — Ayşe Hanım (5. kat, kısmi çökme):** Panikle konuşur: *"Bacağım dolabın altında, çok kanıyor, yanımda 4 yaşında oğlum var, nefes alıyor."*
   - Whisper metne çevirir. Triage LLM bunu ~40 baytlık pakete sıkıştırır: `acil=5, kişi=2, sıkışma+kanama+çocuk, konum=GPS(son bilinen)`.
   - İlk yardım koçu sesli ve adım adım yönlendirir: *"Kanayan yere elinizdeki kumaşı bastırın. Sıkıca bastırmaya devam edin…"* (onaylı protokolden).
3. **T+4 dk:** Paket, BLE mesh'te komşu telefonlardan hop-hop ilerler. 3. kattaki eski telefon rölesi, karşı apartmanın modem LAN'ı ve sokaktaki dördüncü telefon üzerinden muhtarlık düğümüne ulaşır (6 hop).
4. **T+5 dk:** Muhtarlık imzalı ACK gönderir. Ayşe Hanım'ın ekranında şu yazar: **"Mesajınız muhtarlığa ulaştı. Sıranız: Kritik-3."** Bu bilgi panik yönetiminde kritik bir psikolojik etki yaratır.
5. **T+40 dk:** Hava kararmış, GPS binalar arasında 60 m sapıyor. Başka bir kullanıcı sokağın fotoğrafını çeker. Visual GPS fotoğrafı önceden yüklenmiş mahalle referans vektörleriyle eşleştirir ve ~10 m doğrulukla konum üretir. Konum kaynağı bayrağı `Visual-GPS` olur.
6. **T+2 sa:** Gökyüzü analizi yaklaşan yağmur bulutlarını ve gece soğuğunu tespit eder. Açıkta bekleyen SOS'lara `yağmur+soğuk riski` bayrağı eklenir ve muhtarlık konsolunda bu kişiler öne çıkar.

### Senaryo B — Arama-Kurtarma Anı (T+6 → T+72 saat)

1. **Muhtarlık konsolu (akıllı TV):** Isı haritası 37 kritik SOS gösterir. Kümeler sıralanır (acil × kişi sayısı × çevre riski × süre). Kurtarma ekibi liderine **en yüksek öncelikli 5 bina** listesi verilir.
2. **Ekip binaya yaklaşır:** Kurtarıcı telefonu "Kurtarıcı Modu"nda özel bir BLE işaret paketi yayar. Enkazdaki Ayşe Hanım'ın telefonu RSSI'yı izler:
   - RSSI −90 dBm'den −70'e çıkınca (yaklaşma), telefon otomatik **flaş Mors SOS** (···−−−···) çakmaya ve **3–4 kHz yanıt düdüğü** çalmaya başlar. İnsan kulağının en hassas olduğu bu aralık beton içinden daha iyi geçer.
   - Kurtarıcı **düdük çalarsa**: mikrofon FFT ile düdük bandını algılar ve telefon "eko yanıt" verir. Bu, AFAD'ın "sessiz dinleme" protokolüyle uyumludur.
3. **Akustik mesafe ölçümü:** Kurtarıcının telefonu ve enkazdaki telefon karşılıklı chirp atar (BeepBeep algoritması) ve "~4,5 m, sol-aşağı yönde" tahmini üretir. Birkaç farklı noktadan ölçüm yapılınca trilaterasyonla yer daraltılır.
4. **Radyo yoksa FSK:** BLE beton nedeniyle bağlanamıyorsa enkazdaki telefon SOS paketini FSK ile çalar. Kurtarıcının mikrofonu bunu çözer ve kişi sayısı, yaralanma türü ve çocuk varlığı ekipte görünür. Ekip doğru ekipman ve sağlık personeliyle girer.
5. **Batarya koruma:** Enkazdaki telefon her 10 dakikada 30 saniyelik "dinleme penceresi" açar ve kalan sürede uyur. Böylece %30 batarya 3 gün dayanır.

### Senaryo C — Afet Sonrası (T+72 saat → haftalar)

1. **Çadır kent:** Akıllı TV konsolu ortak alanda duyuru panosu olur. İmzalı resmi duyurular sahte haberlerden görsel olarak ayrılır.
2. **Kaynak paylaşım panosu (CRDT):** "Bende 20 L su var", "İnsülin lazım, Tip-1, çocuk", "Jeneratörüm var, şarj istasyonu kurabilirim". İlanlar data mule'lerle çadır kentler arasında yayılır.
3. **Post-Survival Edge AI rehberi:**
   - *Su arıtma:* kaynatma süresi, çamaşır suyu dozu (L başına damla), güneşle dezenfeksiyon (SODIS). Hepsi DSÖ kaynaklı.
   - *Salgın erken uyarı:* Kullanıcılar anonim belirti bildirir (ishal, ateş, döküntü). Muhtarlık düğümü bunları toplar ve aynı bölgede 48 saatte eşik aşılırsa **küme alarmı** üretir (sendromik sürveyans). AI teşhis koymaz, sağlık ekibine sinyal verir.
   - *Hijyen ve yara bakımı:* Enfeksiyon belirtileri için karar ağaçları ve fotoğrafla yara takibi (yalnızca cihazda).
4. **Haşere:** Kanıta dayalı korunma rehberi öne çıkar. Ultrasonik mod "deneysel" etiketiyle bulunur (bkz. §0).
5. **İnternet döndüğünde:** Muhtarlık düğümü tüm CRDT verisini AFAD/AYDES uyumlu formatta (JSON/CSV) dışa aktarır. Böylece afet sırasında toplanan veri kurumsal sisteme kayıpsız aktarılır.

---

## 3. Jüriyi Etkileyecek Yenilikçi Yönler

1. **Gerçek sıfır altyapı:** Sunucu, baz istasyonu, uydu veya yeni donanım gerekmez. Maliyet kalemi yalnızca yazılım ve eğitimdir. Belediye için kişi başı maliyet ≈ 0 TL.
2. **Çoklu fiziksel kanal yedekliliği:** Radyo → ışık → ses → QR. Bilinen afet uygulamalarının çoğu tek kanala bağımlıdır. Mahalle Ağı'nda **SOS bilgisi beton içinden ses olarak bile çıkabilir.**
3. **İnsan hareketini ağ altyapısına çevirmek (Data Mule):** Mahallede yürüyen her gönüllü bir "veri kuryesi"dir. Toplumsal dayanışma teknik altyapıya dönüşür ve bu ölçülebilir bir değerdir ("bugün 1.240 SOS taşındı").
4. **Muhtarlığı dijital afet merkezine dönüştürmek:** Mevcut kurumsal yapıyı (muhtarlık) ve mevcut donanımı (PC, TV) kullanır. Yeni bir kurum yaratmaz, Türkiye'nin idari yapısına özgüdür ve ölçeklenebilir.
5. **Cihazda yapay zekâ ile triage:** Panik metni 64 baytlık standart bir pakete dönüşür. Bant genişliği 100 kat azalır ve kurtarma ekibi okunamaz mesaj yığını yerine sıralı bir liste görür.
6. **Konum kesintisine karşı üç katmanlı yedek:** GPS → Visual GPS → güneş pusulası + adım sayar (PDR).
7. **Aktif kurtarma etkileşimi:** Enkazdaki telefon *pasif bir cihaz* değil, kurtarıcıya **kendi kendine cevap veren bir işaret fişeği**dir.
8. **Çekmece ekonomisi:** Türkiye'de milyonlarca atıl eski telefon var. Proje e-atığı afet altyapısına dönüştürür (sürdürülebilirlik ve döngüsel ekonomi kriterleri).
9. **Dezenformasyona karşı kriptografik güven:** İmzalı resmi duyurular. 2023 depremlerinde sahte haber ve dolandırıcılık büyük bir sorundu.
10. **Açık kaynak ve birlikte çalışabilirlik:** bitchat protokolüyle uyumlu olduğu için mevcut bitchat kullanıcıları da ağın parçasıdır. Kod açık lisansla yayımlanır, diğer belediyeler de benimseyebilir.
11. **Ölçülebilir Living Lab pilotu:** Başakşehir'de 1 mahalle, 1 muhtarlık ve 200 gönüllüyle "internet kesik" tatbikatı yapılır. KPI'lar: SOS'un muhtarlığa ulaşma süresi (hedef < 10 dk), teslim oranı (> %95), Visual GPS hatası (< 15 m), batarya ömrü.

---

## 4. MVP Teknik Yol Haritası (adım adım)

### Teknoloji yığını

| Alan | Kütüphane / API | Lisans |
|---|---|---|
| Çatı | **Vite + Preact/React + TypeScript**, `vite-plugin-pwa` (Workbox) | MIT |
| Yerel kabuk | **Capacitor 6** + `@capacitor-community/bluetooth-le`. Peripheral/advertise için küçük özel eklenti (Kotlin `BluetoothLeAdvertiser`, Swift `CBPeripheralManager`) | MIT |
| Mesh protokolü | **bitchat** paket formatı ve Noise XX: referans `permissionlesstech/bitchat` (Swift) ve `bitchat-android` (Kotlin) | Unlicense |
| Kripto | `@noble/curves` (Ed25519, X25519), `@noble/ciphers` (ChaCha20-Poly1305), `@noble/hashes` | MIT |
| Depolama / senk. | **Dexie.js** (IndexedDB), **Automerge** veya **Yjs** (CRDT) | MIT/Apache |
| Edge LLM | **@mlc-ai/web-llm** (WebGPU), **@huggingface/transformers** (Transformers.js v3, WASM/WebGPU) | Apache-2.0 |
| Ses tanıma | Transformers.js ile `whisper-tiny`/`whisper-base` | MIT |
| Ses olayı | `@tensorflow/tfjs` + YAMNet | Apache-2.0 |
| Akustik modem | **Web Audio API** (OscillatorNode, AudioWorklet, AnalyserNode). Referans: **ggwave** (WASM, MIT) | MIT |
| Güneş hesabı | **SunCalc** (azimut/yükseklik) | BSD |
| Harita (çevrimdışı) | **MapLibre GL JS** + **PMTiles** (tek dosyalık mahalle haritası) | BSD |
| Kamera / flaş | `getUserMedia` + `ImageCapture` / `track.applyConstraints({advanced:[{torch:true}]})` (Android Chrome) | — |
| Sensörler | DeviceOrientation, DeviceMotion, Generic Sensor API, Wake Lock API, Vibration API | — |
| Muhtarlık düğümü | Node.js + **Fastify**, `@abandonware/noble` (PC BLE), **mkcert** (yerel HTTPS), `pkg` ile tek exe | MIT |
| QR | `qrcode` + `jsQR` / `zxing-wasm`. Büyük veri için çok kareli animasyonlu QR | MIT/Apache |

### Faz 0 — Temel (1. hafta)
- [ ] Monorepo: `apps/pwa`, `apps/node-muhtarlik`, `packages/protocol`, `packages/ai`, `packages/acoustic`.
- [ ] `vite-plugin-pwa` ile `injectManifest` stratejisi. Tüm kabuk, protokol dosyaları ve küçük modeller önbelleğe alınır. Büyük modeller **Cache Storage / OPFS**'e isteğe bağlı indirilir ("Afete Hazırlan" düğmesi, ~500 MB, Wi-Fi'de).
- [ ] `navigator.storage.persist()` çağrısı yapılır. Böylece tarayıcı önbelleği silmez.

### Faz 1 — Protokol ve SOS paketi (2. hafta)
- [ ] `packages/protocol`: SOS ikili kodlayıcı/çözücü, Ed25519 imza, Bloom filtresi, TTL ve öncelik kuyruğu. Birim testlerle (Vitest).
- [ ] bitchat paket başlığıyla uyumluluk katmanı (tip, TTL, gönderen kimliği, zaman damgası).

```ts
// packages/protocol/sos.ts (özet)
export function encodeSOS(s: SOS): Uint8Array {
  const b = new DataView(new ArrayBuffer(28));
  b.setUint8(0, (1 << 4) | PacketType.SOS);
  crypto.getRandomValues(new Uint8Array(b.buffer, 1, 8));   // paket kimliği
  b.setInt32(9,  Math.round(s.lat * 1e7));
  b.setInt32(13, Math.round(s.lon * 1e7));
  b.setUint8(17, (s.urgency << 5) | Math.min(s.people, 31));
  b.setUint16(18, s.flags);                                  // sıkışma|kanama|çocuk…
  b.setUint8(20, s.env);                                     // yağmur|soğuk|gaz…
  b.setUint32(21, Math.floor(Date.now() / 1000));
  b.setUint8(25, s.locSource);
  return new Uint8Array(b.buffer);                           // + imza eklenir
}
```

### Faz 2 — Taşıma katmanı (3–5. hafta)
- [ ] **TAI arayüzü:** `interface Transport { send(p): Promise<void>; onPacket(cb); kind; }`
- [ ] **LAN taşıması (ilk çalışan mesh):** Muhtarlık düğümüne WebSocket bağlantısı. En kolay ve en güvenilir demo budur.
- [ ] **BLE taşıması:** Capacitor eklentisi. Android'de `BluetoothLeAdvertiser` + GATT server, tarama ise `bluetooth-le` ile yapılır. bitchat'in servis UUID'si ve karakteristik yapısı birebir uygulanır.
- [ ] **Saf PWA geri dönüşü:** Web Bluetooth ile yalnızca *röle cihazlarına bağlanma* (central). Bu, Chrome/Android'de çalışır.
- [ ] **QR taşıması:** Data Mule için "paketlerimi QR'la ver / tara".

### Faz 3 — Akustik sistem (5–6. hafta)
- [ ] **FSK modem:** ggwave WASM ile başlanır (sağlam, Reed-Solomon hata düzeltmeli). Kendi uygulaması gerekirse 4-FSK, 1,8–3,6 kHz bandı kullanılır (telefon hoparlörünün en verimli olduğu, betondan iyi geçen bant).

```ts
// packages/acoustic/fsk.ts (çekirdek fikir)
const F = [1875, 2250, 2625, 3000];       // 4-FSK, sembol başına 2 bit
function playSymbols(ctx: AudioContext, bytes: Uint8Array, symMs = 40) {
  let t = ctx.currentTime + 0.1;
  for (const byte of bytes) for (let i = 6; i >= 0; i -= 2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = F[(byte >> i) & 3];
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.004);
    g.gain.setValueAtTime(1, t + symMs/1000 - 0.004); g.gain.linearRampToValueAtTime(0, t + symMs/1000);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + symMs/1000);
    t += symMs / 1000;
  }
}
// Alıcı: AudioWorklet içinde Goertzel filtresi ile 4 frekansın enerjisi → sembol
```
- [ ] **Düdük detektörü:** AnalyserNode FFT ile 2–4 kHz bandında dar ve sürekli tepe aranır (>300 ms) → olay.
- [ ] **Akustik mesafe (BeepBeep):** İki cihaz sırayla doğrusal chirp çalar, her biri hem kendi hem karşı chirp'in varış zamanını çapraz korelasyonla bulur. `d = c/2 · ((tA2−tA1) − (tB2−tB1))`. Saat senkronu gerekmez.
- [ ] **Flaş Mors:** `torch` kısıtı ile ···−−−··· çakılır. iOS'ta tarayıcıdan torch çalışmaz, bu yüzden Capacitor `Torch` eklentisi kullanılır. Ekran beyaz/siyah yanıp sönmesi her yerde çalışan yedektir.
- [ ] **RSSI tetikleyici:** Kurtarıcı işaret paketinin RSSI'sı kayan ortalamayla izlenir. Eşik aşılınca flaş + düdük + titreşim tetiklenir.

### Faz 4 — Edge AI (6–8. hafta)
- [ ] `packages/ai/capability.ts`: Tam / Hafif / Kural profil seçimi.
- [ ] **Triage:** WebLLM + `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`. JSON şema ile kısıtlı çıktı (`response_format: {type:"json_object", schema}`). Kural tabanlı yedek: Türkçe kök/eş anlamlı sözlüğü ("kanıyor, kan, yaralı" → kanama).

```ts
import { CreateMLCEngine } from "@mlc-ai/web-llm";
const engine = await CreateMLCEngine("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
const r = await engine.chat.completions.create({
  messages: [{ role: "system", content: TRIAGE_PROMPT }, { role: "user", content: panicText }],
  response_format: { type: "json_object", schema: JSON.stringify(SOS_SCHEMA) },
  temperature: 0,
});
const sos = validateSOS(JSON.parse(r.choices[0].message.content)); // her zaman doğrula
```
- [ ] **İlk yardım koçu:** JSON karar ağaçları (CPR, kanama, kırık, ezilme sendromu uyarısı, şok). LLM yalnızca kullanıcının serbest sorusunu doğru düğüme eşler ve onaylı metni okur. Sesli okuma için `speechSynthesis` (tr-TR) kullanılır.
- [ ] **Sesli komut:** Transformers.js `pipeline("automatic-speech-recognition", "onnx-community/whisper-base")`. Uyandırma için basit enerji + anahtar kelime ("yardım") kullanılır.
- [ ] Değerlendirme seti: 200 gerçekçi Türkçe panik metni (afet sonrası sosyal medya mesajlarından anonimleştirilmiş). Ölçütler: alan doğruluğu ve kritik bayrak duyarlılığı (> %95 hedef, kanama/çocuk asla kaçmamalı).

### Faz 5 — Konum: Visual GPS + Güneş pusulası (8–9. hafta)
- [ ] **Referans veri hazırlığı (afetten önce):** Pilot mahallede her 15–20 m'de 4 yönde fotoğraf çekilir (gönüllü + belediye). Kaynak olarak Mapillary açık lisanslı görüntüleri de kullanılabilir. Her fotoğrafın gömmesi çıkarılır → `{vektör(384), lat, lon, yön}`. Int8 nicemlenmiş haliyle ~5 MB/mahalle, PWA ile önbelleğe alınır.
- [ ] **Sorgu:** Kullanıcı fotoğrafı → Transformers.js `pipeline("image-feature-extraction", "Xenova/dinov2-small")` → kosinüs benzerliğiyle top-k → son GPS'e yakınlık ve pusula yönüyle yeniden sıralama → ağırlıklı ortalama konum + güven puanı.
- [ ] **Güneş pusulası:** SunCalc ile güneş azimutu hesaplanır. Kamera görüntüsünde güneşin (en parlak bölge) yatay konumu ve kamera yatay görüş açısı birlikte gerçek kuzey yönünü verir. Manyetometre sapmalarını (enkaz demiri) düzeltir. Gece için Polaris kılavuzu eklenir.

```ts
import SunCalc from "suncalc";
const { azimuth } = SunCalc.getPosition(new Date(), lat, lon); // rad, güneyden batıya
const sunAz = (azimuth * 180 / Math.PI + 180) % 360;           // kuzeyden saat yönü
const heading = (sunAz - pixelOffsetDeg + 360) % 360;          // telefonun baktığı yön
```
- [ ] **Gökyüzü/hava analizi:** Bulut örtüsü oranı (mavi/beyaz piksel oranı) + kümülonimbüs/nimbostratüs sınıflandırıcısı (açık bulut veri setleriyle ince ayar) + basınç sensörü (varsa barometre düşüşü güçlü yağış sinyalidir) + saat/mevsim → `yağmur riski`, `soğuk riski` bayrakları.

### Faz 6 — Muhtarlık düğümü ve Data Mule (9–10. hafta)
- [ ] Fastify + mkcert HTTPS + WebSocket + Automerge senk. sunucusu. Konsol sayfası `/konsol` (akıllı TV için büyük font, uzaktan kumanda gezintisi).
- [ ] Bloom filtresi tabanlı özet takası ve delta senkron. ACK yayını.
- [ ] Tek tık Windows kurulumu (`pkg` ile exe) ve otomatik başlatma.
- [ ] AFAD'a aktarım dışa aktarıcısı (CSV/GeoJSON).

### Faz 7 — Eski cihaz ve ev ekolojisi (10–11. hafta)
- [ ] "Röle Modu" APK (Capacitor, Android 6+): yönlendirme dışında her şey kapalı. Pil/şarj optimizasyonu.
- [ ] Modem-LAN keşfi: mDNS / sabit adres (`mahalle.local`) ve QR ile bağlanma.
- [ ] Bluetooth hoparlör: çıkış cihazı seçimi (`setSinkId`) + gecikme kalibrasyonu.

### Faz 8 — Afet sonrası modüller (11–12. hafta)
- [ ] CRDT kaynak panosu, kayıp-bulundu, sendromik belirti bildirimi ve muhtarlıkta küme eşik alarmı.
- [ ] Su/hijyen/salgın içerik paketleri (DSÖ, Sağlık Bakanlığı, Kızılay kaynakları, sürümlü ve imzalı).

### Faz 9 — Pilot ve ölçüm (13. hafta → Living Lab)
- [ ] Başakşehir'de 1 mahallede "İnternetsiz Sabah" tatbikatı: 200 gönüllü, 20 eski telefon rölesi, 1 muhtarlık.
- [ ] Telemetri (yalnızca cihazda, tatbikat sonunda gönüllü paylaşım): teslim süresi/oranı, hop sayısı, batarya, Visual GPS hatası, triage doğruluğu.
- [ ] AFAD gönüllüleri ve arama-kurtarma ekipleriyle kurtarıcı modu saha testi.

### MVP demo kapsamı (jüri önünde 5 dakika)
1. Uçak modundaki 5 telefon + 1 laptop (muhtarlık) + 1 TV/monitör.
2. Telefon A'ya panikle sesli mesaj söylenir → triage → paket 3 hop üzerinden muhtarlığa gider → TV haritasında belirir → A'ya ACK gelir.
3. Telefon B "enkazda" (kutunun içinde), BLE kapalı → FSK ile SOS çalar → kurtarıcı telefonu çözer.
4. Kurtarıcı telefon yaklaşır → B otomatik flaş Mors + yanıt düdüğü üretir → akustik mesafe "≈2,1 m" gösterir.
5. Bir fotoğraf çekilir → Visual GPS konumu haritada gösterilir.

---

## 5. Riskler ve Azaltma

| Risk | Azaltma |
|---|---|
| Afet öncesi kurulum oranı düşük kalır | Okul, cami, muhtarlık QR kampanyaları; e-Devlet/belediye uygulaması içine gömme; tatbikat günleri |
| iOS kısıtları (arka plan BLE, Web Bluetooth yok) | iOS için yerel kabuk zorunlu; iOS kullanıcıları en az LAN, FSK ve QR ile katılır |
| Mesh tıkanması (broadcast storm) | TTL, Bloom tekilleştirme, öncelik kuyruğu, olasılıksal yeniden yayın (yoğunluğa göre p) |
| Kötü niyetli sahte SOS / spam | İmzalı paketler, hız sınırlama, muhtarlık "doğrulanmış sakin" ağırlığı, triage anomali kontrolü |
| Tıbbi sorumluluk | LLM yalnızca onaylı içerikten alıntı yapar; açık uyarılar; Sağlık Bakanlığı / Kızılay içerik ortaklığı |
| KVKK | Veri cihazda kalır; konum yalnızca SOS anında paylaşılır; muhtarlık verisi afet sonrası belirli sürede silinir |

---

## 6. bitchat ile ilişki

`permissionlesstech/bitchat`, BLE mesh üzerinde Noise protokolüyle uçtan uca şifreli, sunucusuz mesajlaşma yapan açık kaynak (Unlicense) bir uygulamadır. Store-and-forward, TTL'li çoklu hop ve internet varken Nostr köprüsü özelliklerine sahiptir. Mahalle Ağı'nın yaklaşımı **tekerleği yeniden icat etmemek**tir:

- **Doğrudan alınan:** BLE taşıma katmanı ve paket formatı, Noise XX el sıkışması, TTL/tekilleştirme mantığı (yeniden yazmak yerine birlikte çalışabilirlik).
- **Mahalle Ağı'nın eklediği:** Yapılandırılmış SOS/triage paketi ve öncelik kuyruğu, muhtarlık hiyerarşisi + imzalı resmi kanal, Data Mule ACK protokolü, CRDT tabanlı mahalle veri katmanı, akustik/ışık/QR taşımaları, Edge AI, Visual GPS ve kurtarıcı etkileşim modu.
- **Strateji:** bitchat-android çatallanır (fork) ve mesh katmanı bir Capacitor eklentisi olarak dışarı açılır. PWA arayüzü bu eklenti üzerinden konuşur. Böylece bitchat kullanıcılarıyla aynı ağda bulunulur ve geliştirme süresi aylarca kısalır.

> *Not:* bitchat'in güncel paket formatı ve servis UUID'leri uygulamaya başlamadan önce depodaki son sürümden (`BitchatProtocol` / `BinaryProtocol` dosyaları) doğrulanmalıdır. Protokol aktif olarak geliştiriliyor.
