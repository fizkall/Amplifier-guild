// Mahalle Ağı paket protokolü — tarayıcı ve muhtarlık düğümü (Node) ortak kullanır.
//
// Kablo biçimi (tüm sayılar big-endian):
//   [0]      sürüm(4 bit) | tip(4 bit)
//   [1..8]   paket kimliği (8 bayt, rastgele)
//   [9..12]  zaman (unix saniye)
//   [13]     TTL (her atlamada 1 azalır, imzaya dahil değildir)
//   [14..15] yük uzunluğu
//   [..]     yük
//   [+32]    gönderenin Ed25519 açık anahtarı
//   [+64]    Ed25519 imzası (TTL sıfırlanmış başlık + yük + açık anahtar üzerinden)

import { ed25519 } from "@noble/curves/ed25519";

export const VERSION = 1;
export const DEFAULT_TTL = 7;
export const HEADER_LEN = 16;
export const PUB_LEN = 32;
export const SIG_LEN = 64;

export const T = {
  SOS: 1,
  ACK: 2,
  RESOURCE: 3,
  ANNOUNCE: 4,
  SYMPTOM: 5,
} as const;
export type PacketType = (typeof T)[keyof typeof T];

export interface Packet {
  ver: number;
  type: PacketType;
  id: Uint8Array;
  ts: number;
  ttl: number;
  payload: Uint8Array;
  pub: Uint8Array;
  sig: Uint8Array;
}

// ---------- Yardımcılar ----------

export const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));

export function toB64u(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64u(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function randomId(): Uint8Array {
  const id = new Uint8Array(8);
  crypto.getRandomValues(id);
  return id;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- Anahtarlar ----------

export interface KeyPair {
  priv: Uint8Array;
  pub: Uint8Array;
}
export function newKeyPair(): KeyPair {
  const priv = ed25519.utils.randomPrivateKey();
  return { priv, pub: ed25519.getPublicKey(priv) };
}
export function pubFromPriv(priv: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(priv);
}

// ---------- Paket kodlama ----------

function signedBytes(raw: Uint8Array): Uint8Array {
  const body = raw.slice(0, raw.length - SIG_LEN);
  body[13] = 0; // TTL imzaya dahil değil: aktaranlar değiştirir
  return body;
}

export function buildPacket(
  type: PacketType,
  payload: Uint8Array,
  keys: KeyPair,
  opts: { id?: Uint8Array; ts?: number; ttl?: number } = {},
): Uint8Array {
  const raw = new Uint8Array(HEADER_LEN + payload.length + PUB_LEN + SIG_LEN);
  const dv = new DataView(raw.buffer);
  raw[0] = (VERSION << 4) | type;
  raw.set(opts.id ?? randomId(), 1);
  dv.setUint32(9, opts.ts ?? Math.floor(Date.now() / 1000));
  raw[13] = opts.ttl ?? DEFAULT_TTL;
  dv.setUint16(14, payload.length);
  raw.set(payload, HEADER_LEN);
  raw.set(keys.pub, HEADER_LEN + payload.length);
  const sig = ed25519.sign(signedBytes(raw), keys.priv);
  raw.set(sig, raw.length - SIG_LEN);
  return raw;
}

export function decodePacket(raw: Uint8Array): Packet | null {
  if (raw.length < HEADER_LEN + PUB_LEN + SIG_LEN) return null;
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const ver = raw[0] >> 4;
  const type = (raw[0] & 15) as PacketType;
  if (ver !== VERSION) return null;
  const len = dv.getUint16(14);
  if (raw.length !== HEADER_LEN + len + PUB_LEN + SIG_LEN) return null;
  return {
    ver,
    type,
    id: raw.slice(1, 9),
    ts: dv.getUint32(9),
    ttl: raw[13],
    payload: raw.slice(HEADER_LEN, HEADER_LEN + len),
    pub: raw.slice(HEADER_LEN + len, HEADER_LEN + len + PUB_LEN),
    sig: raw.slice(raw.length - SIG_LEN),
  };
}

export function verifyPacket(raw: Uint8Array): boolean {
  const p = decodePacket(raw);
  if (!p) return false;
  try {
    return ed25519.verify(p.sig, signedBytes(raw), p.pub);
  } catch {
    return false;
  }
}

/** Aktarım için TTL'i bir azaltılmış kopya; TTL bitmişse null. */
export function withDecrementedTtl(raw: Uint8Array): Uint8Array | null {
  if (raw[13] <= 1) return null;
  const c = raw.slice();
  c[13] -= 1;
  return c;
}

export const packetIdHex = (raw: Uint8Array) => hex(raw.slice(1, 9));

// ---------- SOS yükü (13 bayt) ----------

export const FLAGS = {
  SIKISMA: 1 << 0,
  KANAMA: 1 << 1,
  KIRIK: 1 << 2,
  NEFES: 1 << 3,
  BILINC: 1 << 4,
  COCUK: 1 << 5,
  YASLI: 1 << 6,
  HAMILE: 1 << 7,
  KRONIK_ILAC: 1 << 8,
  ENGELLI: 1 << 9,
  EVCIL: 1 << 10,
} as const;

export const FLAG_LABELS: Record<number, string> = {
  [FLAGS.SIKISMA]: "Sıkışma",
  [FLAGS.KANAMA]: "Kanama",
  [FLAGS.KIRIK]: "Kırık",
  [FLAGS.NEFES]: "Nefes güçlüğü",
  [FLAGS.BILINC]: "Bilinç kapalı",
  [FLAGS.COCUK]: "Çocuk",
  [FLAGS.YASLI]: "Yaşlı",
  [FLAGS.HAMILE]: "Hamile",
  [FLAGS.KRONIK_ILAC]: "Kronik ilaç",
  [FLAGS.ENGELLI]: "Engelli",
  [FLAGS.EVCIL]: "Evcil hayvan",
};

export const ENV = {
  YAGMUR: 1 << 0,
  SOGUK: 1 << 1,
  GAZ: 1 << 2,
  YANGIN: 1 << 3,
  SU: 1 << 4,
  SESLE_ALINDI: 1 << 7, // bu SOS'u başka biri sesten çözüp ağa aktardı
} as const;

export const ENV_LABELS: Record<number, string> = {
  [ENV.YAGMUR]: "Yağmur riski",
  [ENV.SOGUK]: "Soğuk riski",
  [ENV.GAZ]: "Gaz kokusu",
  [ENV.YANGIN]: "Yangın/duman",
  [ENV.SU]: "Su baskını",
};

export const LOC_SRC = ["Bilinmiyor", "GPS", "Görsel konum", "Güneş + adım", "Elle girildi"] as const;

export interface SOS {
  lat: number;
  lon: number;
  urgency: number; // 1-5
  people: number; // 0-31
  flags: number;
  env: number;
  locSrc: number;
}

export const SOS_LEN = 13;

export function encodeSOS(s: SOS): Uint8Array {
  const b = new Uint8Array(SOS_LEN);
  const dv = new DataView(b.buffer);
  dv.setInt32(0, Math.round(s.lat * 1e7));
  dv.setInt32(4, Math.round(s.lon * 1e7));
  b[8] = (Math.max(1, Math.min(5, s.urgency)) << 5) | Math.max(0, Math.min(31, s.people));
  dv.setUint16(9, s.flags & 0xffff);
  b[11] = s.env & 0xff;
  b[12] = s.locSrc & 0xff;
  return b;
}

export function decodeSOS(b: Uint8Array): SOS | null {
  if (b.length !== SOS_LEN) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return {
    lat: dv.getInt32(0) / 1e7,
    lon: dv.getInt32(4) / 1e7,
    urgency: b[8] >> 5,
    people: b[8] & 31,
    flags: dv.getUint16(9),
    env: b[11],
    locSrc: b[12],
  };
}

export function flagList(flags: number, labels: Record<number, string>): string[] {
  return Object.entries(labels)
    .filter(([bit]) => flags & Number(bit))
    .map(([, l]) => l);
}

/** Kurtarma önceliği: yüksek = önce. Muhtarlık konsolu ve ACK sırası bunu kullanır. */
export function priorityScore(s: SOS, ageSec: number): number {
  let score = s.urgency * 20 + Math.min(s.people, 10) * 3;
  if (s.flags & FLAGS.NEFES) score += 15;
  if (s.flags & FLAGS.BILINC) score += 15;
  if (s.flags & FLAGS.KANAMA) score += 12;
  if (s.flags & FLAGS.SIKISMA) score += 8;
  if (s.flags & (FLAGS.COCUK | FLAGS.HAMILE | FLAGS.YASLI)) score += 6;
  if (s.flags & FLAGS.KRONIK_ILAC) score += 4;
  if (s.env & (ENV.GAZ | ENV.YANGIN | ENV.SU)) score += 10;
  if (s.env & (ENV.SOGUK | ENV.YAGMUR)) score += 5;
  score += Math.min(ageSec / 3600, 24); // bekleyen her saat +1 (en çok 24)
  return Math.round(score);
}

export function urgencyLabel(score: number): string {
  if (score >= 110) return "Kritik";
  if (score >= 80) return "Acil";
  if (score >= 50) return "Öncelikli";
  return "Bekleyebilir";
}

// ---------- ACK yükü: alındı bildirimi (11 bayt) ----------

export interface Ack {
  ackedId: string;
  rank: number;
  total: number;
}
export function encodeAck(a: Ack): Uint8Array {
  const b = new Uint8Array(12);
  b.set(fromHex(a.ackedId), 0);
  const dv = new DataView(b.buffer);
  dv.setUint16(8, a.rank);
  dv.setUint16(10, a.total);
  return b;
}
export function decodeAck(b: Uint8Array): Ack | null {
  if (b.length !== 12) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { ackedId: hex(b.slice(0, 8)), rank: dv.getUint16(8), total: dv.getUint16(10) };
}

// ---------- Metin yükleri ----------

export const MAX_TEXT = 280;

export interface Resource {
  kind: 0 | 1; // 0 = var / veriyorum, 1 = lazım
  text: string;
}
export function encodeResource(r: Resource): Uint8Array {
  const t = enc.encode(r.text.slice(0, MAX_TEXT));
  const b = new Uint8Array(1 + t.length);
  b[0] = r.kind;
  b.set(t, 1);
  return b;
}
export function decodeResource(b: Uint8Array): Resource {
  return { kind: b[0] === 1 ? 1 : 0, text: dec.decode(b.slice(1)) };
}

export const encodeText = (s: string) => enc.encode(s.slice(0, 1000));
export const decodeText = (b: Uint8Array) => dec.decode(b);

// ---------- Belirti bildirimi (salgın erken uyarı) ----------

export const SYMPTOMS = {
  ISHAL: 1 << 0,
  ATES: 1 << 1,
  KUSMA: 1 << 2,
  DOKUNTU: 1 << 3,
  OKSURUK: 1 << 4,
  YARA_ENFEKSIYON: 1 << 5,
} as const;
export const SYMPTOM_LABELS: Record<number, string> = {
  [SYMPTOMS.ISHAL]: "İshal",
  [SYMPTOMS.ATES]: "Ateş",
  [SYMPTOMS.KUSMA]: "Kusma",
  [SYMPTOMS.DOKUNTU]: "Döküntü",
  [SYMPTOMS.OKSURUK]: "Öksürük",
  [SYMPTOMS.YARA_ENFEKSIYON]: "Yara iltihabı",
};
export function encodeSymptom(mask: number, people: number): Uint8Array {
  return new Uint8Array([mask & 0xff, Math.max(1, Math.min(255, people))]);
}
export function decodeSymptom(b: Uint8Array): { mask: number; people: number } {
  return { mask: b[0] ?? 0, people: b[1] ?? 1 };
}

/** Son 48 saatte aynı belirtiyi bildiren kişi sayısı eşiği aşarsa küme alarmı. */
export function symptomClusters(
  reports: { mask: number; people: number; ts: number }[],
  nowSec: number,
  threshold = 5,
): { label: string; count: number }[] {
  const out: { label: string; count: number }[] = [];
  for (const [bit, label] of Object.entries(SYMPTOM_LABELS)) {
    const count = reports
      .filter((r) => nowSec - r.ts < 48 * 3600 && r.mask & Number(bit))
      .reduce((n, r) => n + r.people, 0);
    if (count >= threshold) out.push({ label, count });
  }
  return out;
}

// ---------- Akustik (FSK) kısa çerçeve: imzasız SOS özeti ----------
// kimlik(8) + zaman(4) + SOS(13) = 25 bayt; CRC'yi modem ekler.

export const ACOUSTIC_SOS_LEN = 8 + 4 + SOS_LEN;

export function packAcousticSOS(raw: Uint8Array): Uint8Array {
  const p = decodePacket(raw);
  if (!p || p.type !== T.SOS) throw new Error("SOS paketi değil");
  const b = new Uint8Array(ACOUSTIC_SOS_LEN);
  b.set(p.id, 0);
  new DataView(b.buffer).setUint32(8, p.ts);
  b.set(p.payload, 12);
  return b;
}

export function unpackAcousticSOS(b: Uint8Array): { id: Uint8Array; ts: number; sos: SOS } | null {
  if (b.length !== ACOUSTIC_SOS_LEN) return null;
  const sos = decodeSOS(b.slice(12));
  if (!sos) return null;
  return { id: b.slice(0, 8), ts: new DataView(b.buffer, b.byteOffset).getUint32(8), sos };
}

// ---------- QR paket demeti ----------

export const QR_PREFIX = "MA1:";

export function bundlePackets(packets: Uint8Array[]): Uint8Array {
  const total = packets.reduce((n, p) => n + 2 + p.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let o = 0;
  for (const p of packets) {
    dv.setUint16(o, p.length);
    out.set(p, o + 2);
    o += 2 + p.length;
  }
  return out;
}

export function unbundlePackets(b: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 0;
  while (o + 2 <= b.length) {
    const len = dv.getUint16(o);
    if (o + 2 + len > b.length) break;
    out.push(b.slice(o + 2, o + 2 + len));
    o += 2 + len;
  }
  return out;
}

/** Paketleri QR karelerine böler: her kare en fazla ~maxBytes ham veri taşır. */
export function packetsToQrFrames(packets: Uint8Array[], maxBytes = 1100): string[] {
  const frames: string[] = [];
  let cur: Uint8Array[] = [];
  let size = 0;
  for (const p of packets) {
    if (size + p.length + 2 > maxBytes && cur.length) {
      frames.push(QR_PREFIX + toB64u(bundlePackets(cur)));
      cur = [];
      size = 0;
    }
    cur.push(p);
    size += p.length + 2;
  }
  if (cur.length) frames.push(QR_PREFIX + toB64u(bundlePackets(cur)));
  return frames;
}

export function qrFrameToPackets(text: string): Uint8Array[] {
  if (!text.startsWith(QR_PREFIX)) return [];
  try {
    return unbundlePackets(fromB64u(text.slice(QR_PREFIX.length)));
  } catch {
    return [];
  }
}
