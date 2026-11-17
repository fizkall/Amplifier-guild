# Mahalle Ağı — MVP

İnternet ve baz istasyonları çöktüğünde halkın telefonlarını ve muhtarlıktaki bilgisayarı bir mahalle afet ağına dönüştüren PWA.
Mimari ve senaryolar: [`../docs/afet-mesh-platformu.md`](../docs/afet-mesh-platformu.md).

## Hızlı başlangıç

Muhtarlık bilgisayarında (Windows, macOS veya Linux; **Node.js 22.18+**):

```bash
cd mahalle-agi
npm install
npm run build
npm start          # PORT=8080 varsayılan
```

Ekranda üç şey yazar:

- **Telefonlar için adres**, ör. `http://192.168.1.10:8080`: aynı Wi-Fi'deki telefonlar bunu açar. İnternetsiz eski bir modem bu iş için yeterli.
- **Konsol adresi** `…/konsol`: muhtarlıktaki ekran veya akıllı TV tarayıcısında açılır.
- **Duyuru PIN'i**: konsoldan imzalı resmi duyuru yayınlamak için gerekir.

Ayarlar ortam değişkeniyle verilir: `PORT`, `DUGUM_ADI` (ör. "Ziya Gökalp Mahallesi"), `DUGUM_PIN`, `DUGUM_VERI` (veri klasörü), `TLS_CERT` ve `TLS_KEY`.

### Telefonlara çevrimdışı kurulum (HTTPS)

Tarayıcılar çevrimdışı önbelleği (service worker) yalnızca HTTPS'te veya `localhost`'ta açar. Bunun için iki yol var:

1. **Afetten önce, internet varken (önerilen):** Uygulamayı HTTPS'li herhangi bir statik barındırmaya koyun (`npm run build` → `dist/`). Vatandaşlar bir kez açıp "Ana ekrana ekle"ye bassın. Uygulama bundan sonra internetsiz açılır, afette de yalnızca düğüme bağlanır.
2. **Muhtarlıkta yerel HTTPS:** [mkcert](https://github.com/FiloSottile/mkcert) ile yerel sertifika üretin:
   ```bash
   mkcert -install && mkcert 192.168.1.10 mahalle.local
   TLS_CERT=192.168.1.10+1.pem TLS_KEY=192.168.1.10+1-key.pem npm start
   ```
   Telefonların mkcert kök sertifikasına güvenmesi gerekir; bu adım afetten önce yapılır.

## Bu sürümde çalışanlar

| Özellik | Durum | Not |
|---|---|---|
| Çevrimdışı PWA, ana ekrana kurulum | ✅ | Workbox önbelleği; ağsız yeniden açılış test edildi |
| SOS paketi (13 bayt yük, Ed25519 imzalı) | ✅ | Tekilleştirme, TTL, 7 gün saklama |
| Türkçe kural tabanlı triage | ✅ | Panik metni → işaretler, kişi sayısı, aciliyet; model indirmez |
| Muhtarlık düğümü + alındı (ACK) + kurtarma sırası | ✅ | "Mesajın muhtarlığa ulaştı, sıran 2/7" |
| Veri katırı senkronu | ✅ | Telefon ağsızken üretilen veya topladığı paketler, bir düğüme bağlandığı an aktarılır; "X kişinin sesini taşıdın" |
| QR ile telefondan telefona paket aktarımı | ✅ | Hiçbir radyo yokken; çok kareli animasyonlu QR |
| Sesle SOS (4-FSK, 1,8–3,6 kHz, CRC-16) | ✅ | Yayın ~7 sn; dinleyen telefon çözüp kendi imzasıyla ağa aktarır |
| Bulunma sinyali (3 kHz ritim), pil tasarruf modu | ✅ | Telefon ölçüm yapmaz; yer tespiti yetkili ekiptedir |
| Düdüğe otomatik yanıt | ✅ | 1,5–4,5 kHz sürekli tepe → 15 sn sinyal |
| Işıkla Mors SOS | ✅ | Fener destekleyen Android'de flaş, her yerde ekran |
| GPS + güneş pusulası | ✅ | Güneş azimutuyla pusula düzeltmesi |
| İlk yardım ve afet sonrası rehber, sesli okuma | ✅ | Sabit, sürümlü içerik; pilot öncesi hekim onayı gerekir |
| Kaynak panosu, imzalı resmi duyurular | ✅ | İmzasız "duyuru" telefonlarda gösterilmez |
| Belirti bildirimi + salgın küme alarmı | ✅ | 48 saatte aynı belirti ≥ 5 kişi → konsolda uyarı |
| Konsol (TV): öncelik listesi, konum haritası, CSV/GeoJSON | ✅ | AFAD'a aktarım için |

## Henüz yok (sonraki adımlar)

| Özellik | Neden ayrı | Yol |
|---|---|---|
| Telefondan telefona Bluetooth mesh | Tarayıcı BLE reklamı yapamaz, iOS'ta Web Bluetooth yok | Capacitor kabuğu + bitchat-android tabanlı eklenti; `mesh.receive()` arayüzüne takılır |
| Kurtarıcı yaklaşınca RSSI ile otomatik tetikleme | BLE gerektirir | Aynı yerel eklenti |
| Yapay zekâ triage (WebLLM) | ~400 MB model; kural tabanlı sürüm her telefonda çalışıyor | `triage.ts` yedek ve doğrulayıcı olarak kalır |
| Görsel konum (Visual GPS) | Mahalle referans fotoğrafları toplanmalı | Transformers.js + DINOv2 gömmeleri |
| Çevrimdışı harita | Mahalle PMTiles dosyası hazırlanmalı | MapLibre GL + PMTiles |
| Birden fazla muhtarlık düğümünün birbirini tanıması | Şu an her düğüm yalnızca kendi ACK/duyurusunu kabul ediyor | Düğüm anahtarlarının önceden dağıtılması |

## Geliştirme

```bash
npm run dev        # Vite geliştirme sunucusu (düğüm olmadan arayüz)
npm test           # protokol, modem, triage birim testleri
npm run typecheck
```

| Dosya | İçerik |
|---|---|
| `src/protocol.ts` | Paket biçimi, imza, SOS/ACK/duyuru/kaynak/belirti yükleri, öncelik puanı, QR demetleri |
| `src/modem.ts` | 4-FSK modülatör/demodülatör, CRC-16, düdük algılayıcı (tarayıcıdan bağımsız) |
| `src/triage.ts` | Türkçe kural tabanlı triage |
| `src/mesh.ts` | Saklama, tekilleştirme, yayma, düğüm senkronu (veri katırı) |
| `src/audio.ts` | Mikrofon/hoparlör, bulunma sinyali, ışıkla Mors, ekran kilidi, sesli okuma |
| `src/sun.ts` | GPS, güneş konumu, cihaz yönü |
| `src/content.ts` | İlk yardım ve afet sonrası rehber metinleri |
| `src/main.ts`, `index.html` | Telefon arayüzü |
| `src/konsol.ts`, `konsol.html` | Muhtarlık / TV konsolu |
| `server/dugum.ts` | Muhtarlık düğümü (HTTP + WebSocket, Node tip ayıklamayla doğrudan çalışır) |

Önemli uyarı: Rehberdeki ilk yardım metinleri genel kabul görmüş temel adımlardır ve profesyonel tıbbi yardımın yerini tutmaz. Sahaya çıkmadan önce bir hekim veya Kızılay eğitmeni tarafından gözden geçirilmelidir.
