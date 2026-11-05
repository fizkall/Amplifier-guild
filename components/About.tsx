import Link from 'next/link';

const STEPS = [
  { n: '1', t: 'Profilini oluştur', d: 'FRC / etkinlik geçmişin, takımın, yeteneklerin ve ayırabileceğin zaman. Profilin senin CV\'n olur.' },
  { n: '2', t: 'Sana uygun ilanları gör', d: 'Guild\'in kurduğu ve anlaştığı girişimler pozisyon açar. Her ilanda yeteneklerine göre bir uyum skoru görürsün.' },
  { n: '3', t: 'Tek tıkla başvur', d: 'Ayrı CV hazırlamana gerek yok; profilin başvurunla birlikte gider. Durumunu "Başvurularım"dan takip edersin.' },
  { n: '4', t: 'Projede yer al, CV\'n büyüsün', d: 'Kabul edildiğinde proje, profiline ✔ doğrulanmış deneyim olarak eklenir. Silinemez, düzenlenemez, güvenilir.' },
];

const FAQ = [
  { q: 'Ücretli mi?', a: 'Hayır. Öğrenciler için Amfiplier Guild tamamen ücretsizdir.' },
  { q: 'Kimler katılabilir?', a: 'FRC, FTC, FLL, TEKNOFEST, TÜBİTAK, WRO, MUN gibi topluluklarda yer almış ya da yer almak isteyen lise ve üniversite öğrencileri.' },
  { q: '18 yaşından küçüğüm, katılabilir miyim?', a: 'Evet. Kayıt sırasında veli bilgisi ve onayı istenir. İletişim bilgilerin yalnızca kabul edildiğin projenin yöneticisiyle paylaşılır.' },
  { q: 'Projeler nereden geliyor?', a: 'Guild\'in kendi kurduğu girişimler, anlaşmalı startup\'lar ve topluluk projeleri. Her proje yayına girmeden önce Guild tarafından onaylanır.' },
  { q: 'Neden "Amfiplier"?', a: 'Okulların "amfi" kültüründen ve potansiyeli yükselten bir ses "amplifier"ından geliyor: amfiden sahneye, sesini yükselt.' },
];

/** Amfiplier Guild tanıtım içeriği — karşılama sayfasında ve /hakkinda'da kullanılır. */
export function About({ cta = true }: { cta?: boolean }) {
  return (
    <div className="about">
      <section className="about-sec">
        <h2>Amfiplier Guild nedir?</h2>
        <p>
          FRC ve benzeri etkinlik topluluklarındaki öğrencileri, kendi kurduğumuz veya anlaştığımız girişimler
          ve projelerle buluşturan bir <b>lonca</b>. Projelere motive ve yetenekli insan kaynağı, öğrencilere ise
          gerçek proje deneyimi, network ve <b>doğrulanmış CV</b> kazandırır.
        </p>
      </section>

      <section className="about-sec">
        <h2>Nasıl çalışır?</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n" aria-hidden>{s.n}</span>
              <div><b>{s.t}</b><p>{s.d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-sec">
        <h2>Kimin için?</h2>
        <div className="features" style={{ marginTop: 0 }}>
          <div className="feature"><b>Öğrenciler</b><span>Takımda kazandığın tecrübeyi gerçek projelere taşı, CV'ne doğrulanmış deneyim ekle.</span></div>
          <div className="feature"><b>Girişimler & projeler</b><span>Robotik, yazılım, tasarım, medya… İhtiyacın olan genç yeteneği uyum skoruyla bul.</span></div>
          <div className="feature"><b>Mentorlar</b><span>Deneyimini aktar, ekipleri yönlendir, topluluğu büyüt.</span></div>
        </div>
      </section>

      <section className="about-sec">
        <h2>Sık sorulanlar</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {cta && (
        <section className="about-sec" style={{ textAlign: 'center' }}>
          <h2>Hazır mısın?</h2>
          <p>Profilini 2 dakikada oluştur, açık ilanları gör.</p>
          <Link href="/giris" className="btn btn-primary btn-lg">Loncaya katıl</Link>
        </section>
      )}
    </div>
  );
}
