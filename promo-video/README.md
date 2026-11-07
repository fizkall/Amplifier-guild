# BumperMedia — Tanıtım Videosu (Reels 9:16)

`bumpermedia.online` (FRC Super App) tanıtım videosu. 1080×1920, 30 fps, ~3 dk, Instagram Reels / TikTok / Shorts formatında.

**Çıktılar**
- `output/bumpermedia_reels.mp4`: final video (seslendirme + müzik + efektler + gömülü altyazı)
- `output/bumpermedia_altyazi.srt`: ayrı altyazı dosyası (orijinal metin, platforma ayrıca yüklemek için)

## Ses ve altyazı nasıl eşleşiyor
| Katman | Kaynak |
|---|---|
| Seslendirme | ElevenLabs `eleven_multilingual_v2`, ses: *Mustafa – Energetic Turkish Commercial*. Metin olarak **fonetik** sürüm verildi (Efarsi, BumperMidiya, Skouting İnterl…) |
| Kelime zamanlaması | Üretilen ses ElevenLabs Scribe ile yazıya döküldü, kelime başına başlangıç/bitiş süresi alındı (`assets/words.json`) |
| Altyazı ve ekran yazıları | `tools/build_timeline.py` fonetik kelimeleri **orijinal yazıma** çevirir (FRC, BumperMedia, Scouting Intel, The Blue Alliance…) ve sonucun `script/orijinal_metin.txt` ile birebir aynı olduğunu doğrular |

Altyazı karaoke tarzındadır: konuşulan kelime anlık olarak vurgulanır. Sahnelerdeki animasyonlar da aynı kelime zamanlarına bağlıdır (ör. "SOĞUK" damgası tam *soğuk* kelimesinde düşer).

## Görsel dil
Görsel dil, bumpermedia.online'ın kendi CSS'indeki Threads tarzı koyu temaya dayanır: zemin `#101010`, kartlar `#181818`, kenarlıklar `rgba(243,245,247,.15)`, yazı rengi `#f3f5f7`, fontlar Space Grotesk / JetBrains Mono. `glass-card` ve `glowing-border` bileşenleri bu temada yeniden yorumlandı. Renk yalnızca anlam taşıdığı yerde kullanılır: kırmızı/mavi ittifak, yeşil onay, altın kupa.

## Sahne akışı
| # | Süre | Sahne |
|---|---|---|
| 01 | 0:00 | Sezon başladı: atölye ışıkları, matkap kıvılcımları, geri sayım, çoğalan sekmeler |
| 02 | 0:14 | Dağınık kaynaklar: veri / forum / İngilizce kural kitabı kartları |
| 03 | 0:24 | Nokta küre: Türkiye'den dünyaya FRC ağı |
| 04 | 0:32 | Sistem açılışı: sınırlar kırılır, SUPER APP, BumperMedia logosu |
| 05 | 0:41 | "Blog değil" → dikey sezon zaman çizelgesi → operasyonel beyin → tek çatı |
| 06 | 1:01 | Chief Delphi & The Blue Alliance: soğuk / karmaşık / dil bariyeri |
| 07 | 1:08 | Scouting Intel paneli: canlı skor, performans, radar, strateji, picklist |
| 08 | 1:28 | Game Manual AI: kural kitabı dağılır, soru → Türkçe yanıt |
| 09 | 1:52 | Pit alanı & hakem masası: "Asla yalnız kalmazsın." |
| 10 | 1:59 | Yaşayan sistem: haftalık büyüyen modül peteği, güç barı |
| 11 | 2:18 | Anlık haber akışı |
| 12 | 2:28 | Sahnenin tam kalbinde |
| 13 | 2:34 | Excel / sekmeler / notlar çöpe → tek merkez → veri zafere |
| 14 | 2:45 | Final: BumperMedia sunar; tek platform, sınırsız güç, anlık veri, efsane sonuçlar |

## Yeniden üretme
```bash
python3 tools/build_timeline.py      # words.json + orijinal metin → src/timeline.js + SRT
python3 tools/make_music.py          # kodla sentezlenen müzik + SFX → assets/*.wav
./tools/mix.sh                       # ses + müzik (ducking) + SFX, -14 LUFS → output/mix.wav
node tools/render.mjs 30 4           # Playwright ile kare kare render → output/video_silent.mp4
ffmpeg -i output/video_silent.mp4 -i output/mix.wav -c:v copy -c:a aac -b:a 192k -shortest output/bumpermedia_reels.mp4
node tools/shot.mjs 12.5 40 88       # belirli saniyelerden önizleme kareleri
```
Sahne motoru: `src/index.html` + `src/style.css` + `src/scenes.js`. `window.renderFrame(t)` her kareyi deterministik olarak çizer, tarayıcıda açıp konsoldan `renderFrame(37)` ile herhangi bir anı inceleyebilirsin.

Müzik bir ElevenLabs bağlayıcısıyla üretilmedi (bağlı bağlayıcı yalnızca ses/konuşma destekliyor). Müzik ve efektler `tools/make_music.py` ile kodla sentezlendi. İstenirse `assets/music.wav` başka bir parçayla değiştirilip `mix.sh` tekrar çalıştırılabilir.
