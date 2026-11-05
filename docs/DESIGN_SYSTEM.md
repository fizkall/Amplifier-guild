# Tasarım Sistemi — Threads tarzı, koyu tema öncelikli

Logo: siyah zemin üzerinde beyaz, mimari (amfi/çatı) silüet + ses dalgası çubukları
(`assets/brand/logo-dark.png`, `assets/brand/logo-light.png`). Arayüz logonun dilini taşır:
**siyah-beyaz, keskin geometri, renk sadece anlam taşıdığında.**

## İlkeler

1. **İçerik sahnede, arayüz geri planda.** Tek sütun akış (max 620px), kenarlık yerine ince ayraç çizgileri.
2. **Monokrom + tek vurgu.** Renk yalnızca durum için: ✔ doğrulanmış, başvuru durumları, beğeni.
3. **Mobil önce.** Alt navigasyon (mobil) → sol ikon rayı (≥ 768px). Modal yerine alt sheet.
4. **Hız hissi.** İyimser güncellemeler, skeleton'lar, 150–200ms geçişler.

## Tokenlar

| Token | Koyu (varsayılan) | Açık |
|---|---|---|
| `--bg` | `#000000` | `#FFFFFF` |
| `--surface` | `#101010` | `#FAFAFA` |
| `--surface-raised` | `#181818` | `#FFFFFF` |
| `--border` | `#2A2A2A` | `#E5E5E5` |
| `--text` | `#F3F5F7` | `#000000` |
| `--text-muted` | `#777777` | `#737373` |
| `--accent` (marka) | `#FFFFFF` | `#000000` |
| `--verified` | `#0095F6` | `#0095F6` |
| `--like` | `#FF3040` | `#FF3040` |
| `--success` / `--warning` / `--danger` | `#2ECC71` / `#F5A524` / `#FF453A` | aynı |

- **Yazı:** `Inter` (veya sistem fontu `-apple-system, "Segoe UI", Roboto`). 15px gövde, 1.4 satır yüksekliği;
  kullanıcı adı 15px/600; meta 13px muted. Logo yanındaki wordmark için geometrik bir grotesk (ör. `Space Grotesk`).
- **Köşe:** Avatar tam yuvarlak; kartlar/sheet 16px; butonlar pill (999px).
- **Boşluk:** 4px ızgara (4, 8, 12, 16, 24, 32).
- **İkonlar:** 1.75px çizgili, 24px (Lucide). Aktif sekme = dolu ikon.

## İskelet

```
Mobil (<768)                      Desktop (≥768)
┌──────────────────────┐          ┌────┬──────────────────────┬──────────┐
│  [logo]          ⚙   │          │logo│  Senin için | Takip  │ Önerilen │
│ Senin için | Takip   │          │ ⌂  │──────────────────────│ projeler │
│──────────────────────│          │ 🔍 │  PostCard            │ & açık   │
│ PostCard             │          │ ＋ │──────────────────────│ ilanlar  │
│──────────────────────│          │ 💼 │  PostCard            │ (≥1200)  │
│ PostCard             │          │ ♡  │                      │          │
│                      │          │ 👤 │                      │          │
│ ⌂   🔍   ＋   💼   👤 │          └────┴──────────────────────┴──────────┘
└──────────────────────┘
⌂ Akış · 🔍 Keşfet · ＋ Yeni gönderi · 💼 İlanlar · ♡ Bildirimler · 👤 Profil
```

## Bileşen notları

- **PostCard:** avatar (36px) sol sütunda; yanıt varsa avatarın altından dikey thread çizgisi (`--border`).
  Proje adına paylaşımda yazar satırının altında küçük proje logosu + "Volt Robotics adına".
- **OpportunityCard:** proje logosu, başlık, çipler (Gönüllü · 5 sa/hafta · Uzaktan), eşleşme rozeti
  (`%80+` beyaz dolu, `%50–79` çerçeveli, altı gösterilmez), sağda pill "Başvur" butonu.
  Başvurulduysa buton → "Başvuruldu ✓" (disabled).
- **Durum çipleri:** Gönderildi (muted) · İnceleniyor (warning) · Kısa liste (verified) · Kabul (success) · Ret (danger, sadece başvurana yumuşak dil: "Bu sefer olmadı").
- **Doğrulanmış deneyim:** CV kaleminde başlığın yanında `--verified` renkli ✔ ve "Amplifier Guild tarafından doğrulandı" tooltip'i.
- **Kanban (panel):** desktop'ta yatay sütunlar, mobilde durum sekmeleri + liste.
