/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  alternates: { canonical: '/kvkk' },
  title: 'KVKK · Gizlilik · Çerezler',
  description: 'Amplifier Guild KVKK aydınlatma metni, gizlilik politikası ve çerez politikası.',
};

const CONTACT = 'fizkall34en@gmail.com';
const UPDATED = '7 Kasım 2026';

export default function KvkkPage() {
  return (
    <main>
      <header className="about-top">
        <Link href="/" aria-label="Ana sayfaya dön"><img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={40} height={40} /></Link>
        <h1 className="h1">Yasal Bilgilendirme</h1>
      </header>

      <div className="about legal">
        <nav className="chips" aria-label="Bölümler" style={{ marginBottom: 8 }}>
          <a className="chip" href="#kvkk">KVKK</a>
          <a className="chip" href="#gizlilik">Gizlilik</a>
          <a className="chip" href="#cerezler">Çerezler</a>
        </nav>
        <p className="meta">Son güncelleme: {UPDATED}</p>

        <section className="about-sec" id="kvkk">
          <h2>1. KVKK Aydınlatma Metni</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında <b>veri sorumlusu</b>:
            Amplifier Guild, İstanbul / Türkiye, e-posta: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>

          <h3>İşlenen kişisel veriler</h3>
          <ul>
            <li><b>Kimlik ve iletişim:</b> ad soyad, kullanıcı adı, e-posta adresi, profil fotoğrafı (Google ile girişte Google hesabından alınır).</li>
            <li><b>Profil (CV) bilgileri:</b> kısa başlık, okul, şehir, mezuniyet yılı, program/takım geçmişi (ör. FRC takım numarası ve rol), yetenekler, haftalık müsaitlik, projelere açıklık tercihi.</li>
            <li><b>Yaş ve veli bilgileri:</b> doğum tarihi; 14 yaşından küçük kullanıcılar için veli adı, veli e-postası ve veli onayının tarihi.</li>
            <li><b>Başvuru verileri:</b> başvurduğun ilanlar, başvuru notun ve ek soru cevapların, uyum skoru, başvuru durumu ve geçmişi, kabul edildiğin projeler ve doğrulanmış deneyimler.</li>
            <li><b>Onay kayıtları:</b> bu aydınlatma metnini kabul ettiğin tarih.</li>
            <li><b>İletişim formu:</b> iletişim sayfasından gönderdiğin ad, e-posta, konu ve mesaj (yalnızca sana dönüş yapmak için).</li>
            <li><b>Teknik veriler:</b> oturum bilgisi, tarayıcı tercihleri ve hata kayıtları.</li>
          </ul>

          <h3>İşleme amaçları ve hukuki sebepler</h3>
          <ul>
            <li>Hesap oluşturma, giriş ve platformun sunulması — sözleşmenin kurulması ve ifası (KVKK m.5/2-c).</li>
            <li>Profilinin ilanlarla eşleştirilmesi, uyum skorunun hesaplanması ve başvurunun ilgili projeye iletilmesi — sözleşmenin ifası (m.5/2-c).</li>
            <li>Kabul edildiğin projelerin profiline doğrulanmış deneyim olarak eklenmesi — sözleşmenin ifası ve meşru menfaat (m.5/2-f).</li>
            <li>14 yaş altı kullanıcılar için veli onayının alınması ve saklanması — hukuki yükümlülük ve meşru menfaat (m.5/2-ç, m.5/2-f).</li>
            <li>Güvenlik, kötüye kullanımın önlenmesi ve şikâyet yönetimi — meşru menfaat ve hukuki yükümlülük (m.5/2-ç, m.5/2-f).</li>
            <li>Profilinin herkese açık görünmesi — açık rıza (m.5/1).</li>
          </ul>

          <h3>Kimlerle paylaşılır?</h3>
          <ul>
            <li><b>Başvurduğun projenin yöneticileri:</b> başvuru anındaki profil özetini (ad, kullanıcı adı, fotoğraf, başlık, okul, yetenekler, program geçmişi), başvuru notunu ve cevaplarını görür.</li>
            <li><b>İletişim bilgilerin</b> (e-posta, telefon) projelerle <b>yalnızca başvurun kabul edildiğinde</b> paylaşılır.</li>
            <li>Doğum tarihin ve veli bilgilerin hiçbir projeyle paylaşılmaz.</li>
            <li>Yetkili adli veya idari mercilerin resmi talebi olması hâlinde, kanunen zorunlu olduğu ölçüde paylaşılır.</li>
          </ul>

          <h3>Yurt dışına aktarım</h3>
          <p>
            Veriler; kimlik doğrulama, veritabanı ve barındırma için <b>Google Firebase (Google LLC)</b> ve
            <b> Vercel Inc.</b> altyapısında işlenir. Bu nedenle yurt dışına aktarım söz konusudur. Aktarım,
            KVKK m.9 kapsamında açık rızan ile yapılır.
          </p>

          <h3>Saklama süresi</h3>
          <p>
            Veriler hesabın açık kaldığı süre boyunca ve yasal saklama süreleri boyunca tutulur. Hesap silme
            talebinde makul süre içinde silinir veya anonimleştirilir. Kabul edildiğin projelerin kayıtları,
            projenin ekip geçmişi için anonimleştirilerek tutulabilir.
          </p>

          <h3>Haklarınız (KVKK m.11)</h3>
          <p>
            Verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını öğrenme, düzeltme,
            silme/yok etme, aktarılan üçüncü kişileri öğrenme, itiraz etme ve zararın giderilmesini talep etme
            haklarına sahipsin. Başvuru: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Yanıt süresi en geç 30
            gündür. Şikâyet için Kişisel Verileri Koruma Kurumu&apos;na başvurabilirsin.
          </p>
        </section>

        <section className="about-sec" id="gizlilik">
          <h2>2. Gizlilik Politikası</h2>
          <p>
            Amplifier Guild yalnızca platformu çalıştırmak, seni projelerle eşleştirmek ve başvurularını
            yönetmek için gereken verileri toplar. <b>Verilerini satmayız</b> ve reklam amacıyla kullanmayız.
          </p>
          <p>
            <b>Hassas veriler ayrı tutulur:</b> e-posta, telefon, doğum tarihi ve veli bilgileri profilinden ayrı,
            yalnızca senin (ve platform yöneticilerinin) erişebildiği bir alanda saklanır.
          </p>
          <p>
            <b>Yaş sınırı:</b> 13 yaşından küçükler platformu kullanamaz. 13 yaşını doldurmuş ancak 14 yaşından küçük kullanıcılar için
            kayıt sırasında veli bilgisi ve onayı alınır.
          </p>
          <p>
            <b>Doğrulanmış deneyimler:</b> Guild projesine kabul edildiğinde profiline eklenen ✔ işaretli deneyim
            kayıtları yalnızca sistem tarafından oluşturulur; güvenilirliklerini korumak için kullanıcılar
            tarafından düzenlenemez.
          </p>
          <p>
            <b>Güvenlik:</b> Bağlantılar HTTPS üzerinden kurulur; veritabanı erişimi Firebase güvenlik kurallarıyla
            sınırlandırılır. Bir güvenlik sorununu <a href={`mailto:${CONTACT}`}>{CONTACT}</a> adresine
            bildirebilirsin.
          </p>
          <p>
            <b>Hesabı devre dışı bırakma ve silme:</b> <b>Ayarlar → Hesabı devre dışı bırak veya sil</b> bölümünden
            profilini gizleyebilir ya da hesabını ve verilerini kalıcı olarak kendin silebilirsin. Dilersen
            <a href={`mailto:${CONTACT}`}> {CONTACT}</a> adresine yazarak da talep edebilirsin.
          </p>
        </section>

        <section className="about-sec" id="cerezler">
          <h2>3. Çerez ve Yerel Depolama Politikası</h2>
          <p>Platform <b>reklam çerezi kullanmaz</b>. Aşağıdakiler zorunlu/işlevsel olup tarayıcı depolamasında tutulur:</p>
          <ul>
            <li><b>Oturum (Firebase Authentication):</b> giriş yapmış kalmanı sağlar.</li>
            <li><b>Tercihler (localStorage):</b> &quot;Uygulamayı ana ekrana ekle&quot; kartını kapatma tercihin gibi küçük ayarlar.</li>
            <li><b>Uygulama önbelleği (service worker):</b> sitenin ana ekrandan uygulama olarak açılabilmesi ve daha hızlı yüklenmesi için sayfa dosyalarını cihazında saklar; kişisel verilerini içermez.</li>
          </ul>
          <p>
            <b>Analitik çerezler (yalnızca onay verirsen):</b> Çerez bildiriminde &quot;Kabul et&quot; dersen, siteyi geliştirmek için
            Google Analytics (Firebase Analytics, Google LLC) ile anonim kullanım istatistikleri (ziyaret edilen sayfalar, cihaz türü,
            yaklaşık konum) toplanır; bu kapsamda veriler yurt dışına aktarılabilir. &quot;Sadece zorunlu&quot; dersen analitik
            çalışmaz. Tercihini her sayfanın altındaki <b>Çerez tercihleri</b> bağlantısından değiştirebilirsin.
          </p>
          <p>Tarayıcı ayarlarından depolamayı silebilirsin; bu durumda oturumun kapanır ve tercihlerin sıfırlanır.</p>
        </section>

        <p className="meta" style={{ textAlign: 'center' }}>
          © 2027 Amplifier Guild. Tüm hakları saklıdır. İletişim: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
      </div>
      <Footer />
    </main>
  );
}
