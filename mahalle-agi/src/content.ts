// Çevrimdışı ilk yardım ve afet sonrası rehber içeriği.
// Kural: Bu metinler sabit ve sürümlüdür; yapay zekâ bilgi üretmez, yalnızca bu metinleri bulur ve okur.
// Kaynak çerçevesi: temel ilk yardım ve hijyen için yaygın kabul görmüş kılavuzlar (Kızılay, DSÖ).
// Pilot öncesi bir hekim / Kızılay eğitmeni tarafından gözden geçirilmelidir.

export const CONTENT_VERSION = "2026-11-taslak-1";

export interface Step {
  text: string;
  warn?: boolean;
}
export interface Topic {
  id: string;
  title: string;
  when: string;
  steps: Step[];
}

export const FIRST_AID: Topic[] = [
  {
    id: "enkaz",
    title: "Enkaz altındaysan",
    when: "Sıkıştın veya bir boşlukta mahsur kaldın",
    steps: [
      { text: "Sakin ol, gereksiz hareket etme. Tozu kaldırmamaya çalış." },
      { text: "Ağzını ve burnunu bir kumaşla kapat." },
      { text: "Çakmak veya kibrit yakma: gaz kaçağı olabilir.", warn: true },
      { text: "Bu uygulamada SOS gönder; sonra Enkaz sekmesinden bulunma sinyalini başlat." },
      { text: "Boruya veya duvara düzenli aralıklarla üçer kez vur. Bağırmayı en son çare olarak kullan; enerji ve toz yutar." },
      { text: "Ekipler sessizlik istediğinde sinyal ve vuruşlarla yerini belli et." },
      { text: "Pilini koru: ekran parlaklığını düşür, tasarruf modunu aç." },
    ],
  },
  {
    id: "kanama",
    title: "Şiddetli kanama",
    when: "Yaradan yoğun kan geliyor",
    steps: [
      { text: "Yaraya temiz bir bez veya giysiyle doğrudan ve sıkıca bastır." },
      { text: "Bastırmayı en az 10 dakika bırakmadan sürdür. Bez kanla dolarsa çıkarma, üstüne yenisini ekle." },
      { text: "Kırık yoksa yaralı uzvu kalp seviyesinin üstüne kaldır." },
      { text: "Kol veya bacakta baskıyla durmayan hayati kanamada: yaranın 5–7 cm üstünden, kanama durana kadar sıkı bir bağ (turnike) uygula ve saatini not et.", warn: true },
      { text: "Turnikeyi kendin gevşetme; saati kurtarma ekibine söyle." },
    ],
  },
  {
    id: "ezilme",
    title: "Uzun süre sıkışmış uzuv (ezilme)",
    when: "Kol veya bacak saatlerdir bir yükün altında",
    steps: [
      { text: "Uzun süre sıkışmış bir uzvun üzerindeki yükü tıbbi ekip olmadan aniden kaldırmak hayati risk oluşturabilir.", warn: true },
      { text: "Sıkışmanın ne zamandır sürdüğünü not et ve kurtarma ekibine mutlaka söyle." },
      { text: "Bilinç açıksa ve yutabiliyorsa küçük yudumlarla su içmek faydalı olabilir." },
      { text: "SOS'unda 'Sıkışma' işaretli olduğundan emin ol." },
    ],
  },
  {
    id: "cpr",
    title: "Bilinci kapalı, nefes almıyor",
    when: "Seslenince ve omzuna dokununca tepki yok, normal nefes yok",
    steps: [
      { text: "Çevrende yardım çağır; SOS'ta 'Bilinç kapalı' ve 'Nefes' işaretle." },
      { text: "Kişiyi sert bir zemine sırtüstü yatır." },
      { text: "Ellerini göğsün ortasına üst üste koy, kollarını düz tut." },
      { text: "Dakikada 100–120 hızla, yaklaşık 5–6 cm derinliğe bastır. Her basıdan sonra göğsün geri gelmesine izin ver." },
      { text: "Eğitimliysen 30 basıya 2 kurtarıcı nefes ver; değilsen yalnızca basılara devam et." },
      { text: "Kişi nefes almaya başlayana veya ekip gelene kadar bırakma." },
    ],
  },
  {
    id: "kirik",
    title: "Kırık şüphesi",
    when: "Şekil bozukluğu, şiddetli ağrı, hareket edemiyor",
    steps: [
      { text: "Kırık bölgeyi hareket ettirme, düzeltmeye çalışma." },
      { text: "Bulunduğu şekilde sabitle: tahta, karton veya katlanmış giysiyle destekle." },
      { text: "Açık yara varsa üstünü temiz bezle ört, bastırma." },
      { text: "Boyun veya sırt yaralanması şüphesinde kişiyi zorunlu olmadıkça kımıldatma.", warn: true },
    ],
  },
  {
    id: "soguk",
    title: "Üşüme ve hipotermi",
    when: "Titreme, uyuşukluk, konuşma bozukluğu",
    steps: [
      { text: "Islak giysileri çıkar, kuru giysi veya battaniyeye sar. Başı ve boynu da ört." },
      { text: "Yerle arana karton, köpük veya kumaş koy: zemin ısıyı hızla çeker." },
      { text: "Önce gövdeyi ısıt; kol ve bacakları ovalama." },
      { text: "Bilinç açıksa ılık, şekerli içecek ver. Alkol verme.", warn: true },
      { text: "SOS'una 'Soğuk riski' ekle." },
    ],
  },
];

export const POST_SURVIVAL: Topic[] = [
  {
    id: "su",
    title: "İçme suyunu güvenli hale getirme",
    when: "Şebeke suyu kesik veya güvenilir değil",
    steps: [
      { text: "Bulanık suyu önce temiz bir bezden süz ve tortunun dibe çökmesini bekle." },
      { text: "En güvenli yol kaynatmak: su fokurdayarak kaynadıktan sonra en az 1 dakika kaynamaya devam etsin." },
      { text: "Kaynatamıyorsan: kokusuz, katkısız çamaşır suyundan (%5–6) litre başına 2 damla ekle, karıştır, 30 dakika bekle. Hafif klor kokusu olmalı." },
      { text: "Güneşle arıtma: temiz, şeffaf PET şişeyi doldur, 6 saat doğrudan güneşte beklet (çok bulutluysa 2 gün)." },
      { text: "Arıtılmış suyu kapalı ve temiz kapta sakla; kabın içine el sokma." },
    ],
  },
  {
    id: "hijyen",
    title: "Hijyen ve tuvalet",
    when: "Çadır kent, toplu yaşam alanı",
    steps: [
      { text: "Yemekten önce ve tuvaletten sonra elleri sabunla en az 20 saniye yıka; sabun yoksa kül de işe yarar." },
      { text: "Geçici tuvaleti su kaynaklarından ve çadırlardan en az 30 metre uzağa, eğimin aşağısına kur." },
      { text: "Çöpü kapalı torbada topla, yemek alanından uzak tut." },
      { text: "Bebek bezi ve tıbbi atıkları ayrı torbaya koy." },
    ],
  },
  {
    id: "ishal",
    title: "İshal ve sıvı kaybı",
    when: "Günde 3'ten fazla sulu dışkılama",
    steps: [
      { text: "Sıvı kaybını yerine koy: hazır ORS paketi varsa onu kullan." },
      { text: "Yoksa evde hazırlanan çözelti: 1 litre temiz suya 6 silme çay kaşığı şeker ve yarım silme çay kaşığı tuz." },
      { text: "Küçük ve sık yudumlarla içir; bebekler emzirilmeye devam etsin." },
      { text: "Kanlı ishal, yüksek ateş, idrarın kesilmesi veya bebekte uyuşukluk varsa sağlık ekibine hemen ulaş.", warn: true },
      { text: "Pano sekmesinden belirti bildir: aynı bölgede vakalar artarsa muhtarlık sağlık ekibini uyarır." },
    ],
  },
  {
    id: "sivrisinek",
    title: "Sivrisinek ve haşere",
    when: "Açık alan, sıcak hava, durgun su",
    steps: [
      { text: "Çadır çevresindeki durgun suyu (kova, lastik, kap) boşalt: sivrisinek orada ürer." },
      { text: "Mümkünse cibinlik kullan; uzun kollu, açık renkli giysi giy." },
      { text: "Varsa böcek kovucu losyonu ürün talimatına göre sür." },
      { text: "Ultrasonik ses yayan 'kovucu' uygulamaların sivrisineklere etkili olduğu bilimsel olarak gösterilmemiştir; onlara güvenme.", warn: true },
      { text: "Ateş, titreme ve baş ağrısı birlikte görülürse sağlık ekibine başvur ve belirti bildir." },
    ],
  },
  {
    id: "yara",
    title: "Yara bakımı ve enfeksiyon",
    when: "Kesik, sıyrık, ezik",
    steps: [
      { text: "Yarayı arıtılmış veya kaynatılıp soğutulmuş suyla bol bol yıka." },
      { text: "Temiz bir bezle ört, her gün değiştir." },
      { text: "Kızarıklık yayılıyor, şişlik, kötü koku, irin veya ateş varsa enfeksiyon olabilir: sağlık ekibine göster.", warn: true },
      { text: "Paslı veya kirli cisimle yaralandıysan tetanoz aşısı için sağlık ekibine danış." },
    ],
  },
];

export function searchTopics(q: string): Topic[] {
  const n = q.toLocaleLowerCase("tr");
  return [...FIRST_AID, ...POST_SURVIVAL].filter((t) =>
    [t.title, t.when, ...t.steps.map((s) => s.text)].some((x) => x.toLocaleLowerCase("tr").includes(n)),
  );
}
