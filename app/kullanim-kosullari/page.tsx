/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  alternates: { canonical: '/kullanim-kosullari' },
  title: 'Kullanım Koşulları',
  description: 'Amplifier Guild platformunun kullanım koşulları: üyelik, ilanlar, başvurular, içerik ve sorumluluklar.',
};

const CONTACT = 'fizkall34en@gmail.com';

export default function KullanimKosullariPage() {
  return (
    <main>
      <header className="about-top">
        <Link href="/" aria-label="Ana sayfaya dön"><img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={40} height={40} /></Link>
        <h1 className="h1">Kullanım Koşulları</h1>
      </header>
      <div className="about legal">
        <p className="meta">Son güncelleme: 7 Kasım 2026</p>

        <section className="about-sec">
          <h2>1. Taraflar ve kapsam</h2>
          <p>
            Bu koşullar, <b>amplifierguild.online</b> adresindeki Amplifier Guild platformunu (&quot;Platform&quot;) kullanan
            herkes için geçerlidir. Platformu kullanarak bu koşulları ve <Link href="/kvkk">KVKK · Gizlilik · Çerez politikasını</Link> kabul etmiş olursun.
          </p>
        </section>

        <section className="about-sec">
          <h2>2. Üyelik</h2>
          <ul>
            <li>Platformu kullanmak için en az <b>13 yaşında</b> olmalısın. 14 yaşından küçükler veli bilgisi ve onayıyla kayıt olur.</li>
            <li>Profilindeki bilgilerin (okul, takım geçmişi, yetenekler, deneyimler) doğru ve güncel olmasından sen sorumlusun.</li>
            <li>Hesabının güvenliğinden ve hesabınla yapılan işlemlerden sen sorumlusun; şifreni kimseyle paylaşma.</li>
            <li>Hesabını istediğin zaman Ayarlar&apos;dan devre dışı bırakabilir veya silebilirsin.</li>
          </ul>
        </section>

        <section className="about-sec">
          <h2>3. Girişimler, projeler ve ilanlar</h2>
          <ul>
            <li>Projeler Platform&apos;da Amplifier Guild yönetiminin onayıyla yayınlanır; proje sayfaları ve ilanlar proje yöneticilerinin sorumluluğundadır.</li>
            <li>İlanlar gerçek bir ihtiyaca dayanmalı; yanıltıcı, ayrımcı, yasa dışı veya reşit olmayanların güvenliğini tehlikeye atan ilanlar yayınlanamaz ve kaldırılır.</li>
            <li>Proje yöneticileri, başvuranların verilerini yalnızca değerlendirme ve ekip çalışması için kullanabilir; üçüncü kişilerle paylaşamaz.</li>
            <li>Amplifier Guild bir eşleştirme platformudur; proje ile katılımcı arasındaki çalışma koşulları (süre, sorumluluk, varsa ücret) taraflar arasında belirlenir. 18 yaş altı katılımcılar için ilgili mevzuata ve veli onayına uyulması projenin sorumluluğundadır.</li>
          </ul>
        </section>

        <section className="about-sec">
          <h2>4. Başvurular ve doğrulanmış deneyimler</h2>
          <ul>
            <li>Başvurduğunda profilinin o anki özeti ve form cevapların ilgili projenin yöneticileriyle paylaşılır.</li>
            <li>Kabul edildiğin projeler profiline <b>✔ doğrulanmış deneyim</b> olarak eklenir. Doğrulanmış deneyimler düzenlenemez; gerçeğe aykırı olduğu anlaşılırsa kaldırılır.</li>
            <li>Başvuruların karara bağlanmadan önce geri çekilebilir.</li>
          </ul>
        </section>

        <section className="about-sec">
          <h2>5. Yasaklı davranışlar</h2>
          <ul>
            <li>Başkası adına hesap açmak, sahte bilgi veya sahte deneyim eklemek,</li>
            <li>Taciz, nefret söylemi, spam, dolandırıcılık veya yasa dışı içerik paylaşmak,</li>
            <li>Platformun güvenliğini aşmaya, verileri toplu şekilde çekmeye veya hizmeti aksatmaya çalışmak,</li>
            <li>Başkalarının fikri mülkiyet haklarını ihlal eden görsel, logo veya metin yüklemek.</li>
          </ul>
          <p>Bu davranışlarda hesap uyarı yapılmadan askıya alınabilir veya silinebilir.</p>
        </section>

        <section className="about-sec">
          <h2>6. İçerik ve fikri mülkiyet</h2>
          <p>
            Yüklediğin içeriklerin (profil fotoğrafı, logo, ilan görseli, metinler) haklarına sahip olduğunu kabul edersin ve bu içerikleri
            Platform&apos;da gösterilmesi amacıyla Amplifier Guild&apos;e ücretsiz, münhasır olmayan bir kullanım izni verirsin. Amplifier Guild
            adı, logosu ve tasarımı Amplifier Guild&apos;e aittir.
          </p>
        </section>

        <section className="about-sec">
          <h2>7. Sorumluluğun sınırı</h2>
          <p>
            Platform &quot;olduğu gibi&quot; sunulur. Amplifier Guild kesintisiz hizmet, bir ilana kabul edilme veya bir projenin başarılı
            olacağı konusunda garanti vermez; projelerin ve kullanıcıların kendi eylemlerinden doğan zararlardan, yasal olarak izin verilen
            ölçüde sorumlu tutulamaz.
          </p>
        </section>

        <section className="about-sec">
          <h2>8. Değişiklikler ve iletişim</h2>
          <p>
            Bu koşullar güncellenebilir; önemli değişiklikler Platform üzerinden duyurulur. Sorular için{' '}
            <Link href="/iletisim">iletişim sayfasını</Link> kullanabilir veya <a href={`mailto:${CONTACT}`}>{CONTACT}</a> adresine yazabilirsin.
            Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
