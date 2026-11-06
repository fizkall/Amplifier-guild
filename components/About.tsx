import Link from 'next/link';

const STEPS = [
  { n: '1', t: 'Profilini oluştur', d: 'FRC / etkinlik geçmişin, takımın, yeteneklerin ve ayırabileceğin zaman. Profilin senin CV\'n olur.' },
  { n: '2', t: 'Sana uygun ilanları gör', d: 'Guild\'in kurduğu ve anlaştığı girişimler pozisyon açar. Her ilanda yeteneklerine göre bir uyum skoru görürsün.' },
  { n: '3', t: 'Tek tıkla başvur', d: 'Ayrı CV hazırlamana gerek yok; profilin başvurunla birlikte gider. Durumunu "Başvurularım"dan takip edersin.' },
  { n: '4', t: 'Projede yer al, CV\'n büyüsün', d: 'Kabul edildiğinde proje, profiline ✔ doğrulanmış deneyim olarak eklenir. Silinemez, düzenlenemez, güvenilir.' },
];

const PILLARS = [
  {
    t: 'Nitelikli ve hedef odaklı insan kaynağı',
    en: 'Talent Acquisition',
    d: 'Yeni kurulan girişimlerin ve aktif projelerin en büyük zorluklarından biri doğru yetenekleri ekibe dâhil etmektir. İlan ve eşleştirme tahtası sayesinde projeler; yazılım, 3D tasarım, mekanik, elektronik, medya veya pazarlama gibi ihtiyaç duydukları alanlarda nitelikli öğrenci ve genç profesyonellere ulaşır. Uzun işe alım süreçleri yerine doğrudan projeye duyarlı ve üretken bir insan kaynağı havuzuna erişirler.',
  },
  {
    t: 'Güçlü network ve ekosistem iş birlikleri',
    en: 'Network & Partnerships',
    d: 'Bir projenin büyümesi için doğru insanlarla tanışması şarttır. Amplifier Guild, projeleri hem kendi topluluk ağıyla hem de dış dünyadaki paydaşlarla buluşturarak güçlü bir köprü kurar. Girişimler mentorluk alabileceği, ortak projeler yürütebileceği ve stratejik iş birlikleri kurabileceği geniş bir network desteğine sahip olur.',
  },
  {
    t: 'Dijital tanıtım, görünürlük ve marka desteği',
    en: 'Visibility & Branding',
    d: 'Projelerin kitlelere ulaşması büyüme yolculuklarında hayati bir rol oynar. Proje sayfaları, açık pozisyonlar ve topluluk dinamikleri sayesinde projeler; güncellemelerini, duyurularını ve başarı hikâyelerini doğrudan hedef kitleye duyurur. Amplifier Guild, projelerin sesini amfi etkisiyle daha geniş kitlelere ulaştırır.',
  },
  {
    t: 'Operasyonel kolaylık ve dijital altyapı',
    en: 'Operations & Infrastructure',
    d: 'Projeler kendi işlerine odaklanırken arkadaki teknik ve organizasyonel süreçlerin hafiflemesi gerekir. Üye yönetimi, başvuru formları ve başvuru yönetim panelleri sayesinde girişimler operasyonlarını dijitalleştirir. Gelen başvuruların tek bir merkezden yönetilmesi ve taleplerin düzenli takip edilmesi iş yükünü ciddi oranda azaltır.',
  },
  {
    t: 'Sürdürülebilir genç yetenek havuzu',
    en: 'Sustainable Talent Pipeline',
    d: 'Girişimler ve projeler sürekli değişen ve gelişen bir dinamiğe ihtiyaç duyar. Amplifier Guild, sürekli yeni gençlerin katıldığı, öğrendiği ve ürettiği yaşayan bir yapı olduğu için projelere taze kan sağlar. Projeler anlık bir ekip bulmakla kalmaz; uzun vadeli, sürdürülebilir bir insan kaynağı sirkülasyonuna kavuşur.',
  },
];

const FAQ = [
  { q: 'Ücretli mi?', a: 'Hayır. Öğrenciler için Amplifier Guild tamamen ücretsizdir.' },
  { q: 'Kimler katılabilir?', a: 'FRC, FTC, FLL, TEKNOFEST, TÜBİTAK, WRO, MUN gibi topluluklarda yer almış ya da yer almak isteyen lise ve üniversite öğrencileri.' },
  { q: 'Kaç yaşında katılabilirim?', a: 'En az 13 yaşında olmalısın. 14 yaşından küçüksen kayıt sırasında veli bilgisi ve onayı istenir. İletişim bilgilerin yalnızca kabul edildiğin projenin yöneticisiyle paylaşılır.' },
  { q: 'Projeler nereden geliyor?', a: 'Guild\'in kendi kurduğu girişimler, anlaşmalı startup\'lar ve topluluk projeleri. Her proje yayına girmeden önce Guild tarafından onaylanır.' },
  { q: 'Neden "Amplifier"?', a: 'İngilizcede "amplifier", Türkçede kısaca "amfi": sesi yükselten cihaz. Okullardaki "amfi" kültürüne de selam veriyor. İkisi bir arada: amfiden sahneye, potansiyelini yükselt.' },
];

/** Amplifier Guild tanıtım içeriği — karşılama sayfasında ve /hakkinda'da kullanılır. */
export function About({ cta = true }: { cta?: boolean }) {
  return (
    <div className="about">
      <section className="about-sec">
        <h2>Amplifier Guild nedir?</h2>
        <p>
          Amplifier Guild; teknoloji, robotik, yazılım, tasarım ve çeşitli etkinlik alanlarında üreten genç
          yetenekleri, projeler ve girişimlerle buluşturan <b>dinamik bir ekosistemdir</b>.
        </p>
        <p>
          Platform, yalnızca öğrencilere bir topluluk alanı sunmakla kalmaz; bünyesinde yer alan veya dışarıdan
          katılan girişimlere, projelere ve inisiyatiflere <b>büyüme, ölçeklenme</b> ve <b>operasyonel yüklerini
          hafifletme</b> konusunda kritik destekler sağlar.
        </p>
      </section>

      <section className="about-sec">
        <h2>Girişimlere ve projelere ne sağlar?</h2>
        <div className="pillars">
          {PILLARS.map((p, i) => (
            <article key={p.t} className="pillar">
              <span className="pillar-n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.t}</h3>
              <span className="pillar-en" lang="en">{p.en}</span>
              <p>{p.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-sec">
        <h2>Öğrenciler için nasıl çalışır?</h2>
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
