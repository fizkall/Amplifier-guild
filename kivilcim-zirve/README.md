# Kıvılcım Zirvesi'26 — Web Sitesi

Tek sayfalık, Tailwind CSS (CDN) ile yazılmış statik site. Derleme gerekmez; klasörü olduğu gibi yayınlayın.

## Hızlı ayarlar (`index.html` → `CONFIG`)
| Alan | Açıklama |
|---|---|
| `delegeFormUrl` / `delegasyonFormUrl` | Google Forms linkleri (dolu) |
| `siteUrl` | Yayındaki adres — QR kod bunu kullanır |
| `gaId` | Google Analytics 4 kimliği (`G-…`). Boşsa analitik yüklenmez |
| `adminPin` | Yönetici paneli şifresi — **yayından önce değiştirin** |

Konuşmacı, ekip, sponsor ve hediye listeleri de aynı `<script>` içindeki dizilerde.
Konuşmacıya fotoğraf eklemek için: `{ name, topic, photo: 'konusmacilar/ad.jpg' }`.

## Çekiliş ve yönetici paneli
- Katılımcılar QR'ı okutur (`/#katil`) ya da "Çekilişe Katıl" butonuyla kayıt olur.
- Panel: alt bilgideki küçük nokta, `Ctrl+Shift+A` ya da `/#admin`.
- **Önemli:** Veriler `localStorage`'da, yani **yalnızca kaydın yapıldığı tarayıcıda** tutulur.
  Katılımcılar kendi telefonlarından kayıt olursa bu kayıtlar sahnedeki bilgisayara ulaşmaz.
  localStorage ile güvenilir kullanım: kayıtları sahnedeki/stanttaki **tek bir cihazdan** (tablet/laptop) alın,
  paneli aynı cihazda başka sekmede açın (liste canlı güncellenir).
  Telefonlardan QR ile kayıt için ortak bir veritabanı (ör. Firebase Firestore) gerekir.
- PIN istemci tarafında kontrol edilir; gerçek bir güvenlik katmanı değildir.

## "Gerçek site" kontrol listesi
404 sayfası (`404.html`) · ilk ekranda CTA · meta title/description · Open Graph görseli (`og-image.png`) ·
favicon seti · `robots.txt` · `sitemap.xml` · alt metinler · mobil uyum · mobilde sabit CTA · yükleniyor ekranı ·
form hata mesajları · teşekkürler ekranı · gizlilik politikası (`#gizlilik`) · kullanım koşulları (`#kosullar`) ·
çerez bildirimi · analitik (onaya bağlı) · gerçek iletişim bilgileri · **HTTPS + alan adı: sizde**.

Alan adı belli olunca `index.html`, `robots.txt` ve `sitemap.xml` içindeki `https://kivilcimzirve.com` adresini değiştirin.
GitHub Pages / Netlify / Vercel / Firebase Hosting ücretsiz HTTPS sağlar.
