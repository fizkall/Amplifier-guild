// 4-FSK akustik modem: hoparlör → mikrofon. Tarayıcıdan bağımsız saf fonksiyonlar (test edilebilir).
//
// Çerçeve: önsöz [3,0,3,0,3,0,3,0] + işaret [1,2,2,1] + uzunluk(1 bayt) + veri + CRC-16
// Her sembol 2 bit; her bayt 4 sembol (yüksek bitler önce). 50 ms sembol → 25 baytlık SOS ≈ 7 sn.
// 1,8–3,6 kHz bandı: telefon hoparlörünün verimli olduğu, insan sesinden ve uğultudan uzak bölge.

export const TONES = [1800, 2400, 3000, 3600];
export const SYMBOL_SEC = 0.05;
const PREAMBLE = [3, 0, 3, 0, 3, 0, 3, 0];
const MARKER = [1, 2, 2, 1];
const SYNC = [...PREAMBLE, ...MARKER];
const RAMP_SEC = 0.005;
const HOPS_PER_SYMBOL = 5;

export function crc16(data: Uint8Array): number {
  let crc = 0xffff; // CRC-16/CCITT-FALSE
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function bytesToSymbols(bytes: Uint8Array): number[] {
  const out: number[] = [];
  for (const b of bytes) for (let s = 6; s >= 0; s -= 2) out.push((b >> s) & 3);
  return out;
}

export function frameSymbols(data: Uint8Array): number[] {
  if (data.length > 255) throw new Error("Akustik çerçeve en fazla 255 bayt");
  const crc = crc16(data);
  const body = new Uint8Array([data.length, ...data, crc >> 8, crc & 255]);
  return [...SYNC, ...bytesToSymbols(body)];
}

export function frameDurationSec(dataLen: number): number {
  return (SYNC.length + (dataLen + 3) * 4) * SYMBOL_SEC;
}

/** Veriyi ses örneklerine çevirir (genlik 0..amp). */
export function modulate(data: Uint8Array, sampleRate: number, amp = 0.8): Float32Array<ArrayBuffer> {
  const syms = frameSymbols(data);
  const n = Math.round(SYMBOL_SEC * sampleRate);
  const ramp = Math.round(RAMP_SEC * sampleRate);
  const lead = Math.round(0.1 * sampleRate); // başta/sonda kısa sessizlik
  const out = new Float32Array(lead * 2 + syms.length * n);
  let phase = 0;
  syms.forEach((s, k) => {
    const w = (2 * Math.PI * TONES[s]) / sampleRate;
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / ramp, (n - 1 - i) / ramp);
      out[lead + k * n + i] = amp * env * Math.sin(phase);
      phase += w;
    }
  });
  return out;
}

function goertzel(x: Float32Array, start: number, n: number, freq: number, sr: number): number {
  const coeff = 2 * Math.cos((2 * Math.PI * freq) / sr);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const s = x[start + i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

export interface Decoded {
  data: Uint8Array;
  endSample: number;
}

/** Ses örneklerinde geçerli (CRC'si tutan) tüm çerçeveleri bulur. */
export function demodulate(x: Float32Array, sampleRate: number): Decoded[] {
  const n = Math.round(SYMBOL_SEC * sampleRate);
  const hop = Math.max(1, Math.floor(n / HOPS_PER_SYMBOL));
  const hops = Math.floor((x.length - n) / hop) + 1;
  if (hops <= 0) return [];

  // Her atlama konumu için baskın ton ve gücü
  const dom = new Int8Array(hops);
  const strength = new Float32Array(hops);
  let noiseSum = 0;
  for (let h = 0; h < hops; h++) {
    let best = 0;
    let bestE = -1;
    let total = 0;
    for (let k = 0; k < TONES.length; k++) {
      const e = goertzel(x, h * hop, n, TONES[k], sampleRate);
      total += e;
      if (e > bestE) {
        bestE = e;
        best = k;
      }
    }
    dom[h] = best;
    strength[h] = total > 0 ? bestE / total : 0; // 0.25 = gürültü, 1 = saf ton
    noiseSum += total;
  }
  if (noiseSum === 0) return [];

  const sym = (h: number) => (h < hops && strength[h] > 0.45 ? dom[h] : -1);
  const results: Decoded[] = [];
  const S = HOPS_PER_SYMBOL;

  let h = 0;
  while (h + SYNC.length * S < hops) {
    // Önsözde en çok 1 hata, işarette hiç hata yok
    let miss = 0;
    for (let j = 0; j < PREAMBLE.length && miss <= 1; j++) if (sym(h + j * S) !== PREAMBLE[j]) miss++;
    let ok = miss <= 1;
    for (let j = 0; ok && j < MARKER.length; j++) if (sym(h + (PREAMBLE.length + j) * S) !== MARKER[j]) ok = false;
    if (!ok) {
      h++;
      continue;
    }
    // Atlama hizasını iyileştir: sembol ortasına en yakın en güçlü konumu seç
    let base = h;
    let bestScore = -1;
    for (let d = 0; d < S; d++) {
      let sc = 0;
      for (let j = 0; j < SYNC.length; j++) {
        const hh = h + d + j * S;
        if (hh < hops && dom[hh] === SYNC[j]) sc += strength[hh];
      }
      if (sc > bestScore) {
        bestScore = sc;
        base = h + d;
      }
    }
    const readByte = (byteIndex: number): number => {
      let v = 0;
      for (let q = 0; q < 4; q++) {
        const hh = base + (SYNC.length + byteIndex * 4 + q) * S;
        if (hh >= hops) return -1;
        v = (v << 2) | dom[hh];
      }
      return v;
    };
    const len = readByte(0);
    if (len < 0) break;
    const bytes: number[] = [];
    let complete = true;
    for (let i = 0; i < len + 2; i++) {
      const v = readByte(1 + i);
      if (v < 0) {
        complete = false;
        break;
      }
      bytes.push(v);
    }
    if (complete) {
      const data = new Uint8Array(bytes.slice(0, len));
      const crc = (bytes[len] << 8) | bytes[len + 1];
      if (crc16(data) === crc) {
        const endHop = base + (SYNC.length + (len + 3) * 4) * S;
        results.push({ data, endSample: endHop * hop });
        h = endHop;
        continue;
      }
    }
    h++;
  }
  return results;
}

// ---------- Düdük algılama (FFT karesi, dB) ----------

/** AnalyserNode.getFloatFrequencyData çıktısında 1,5–4,5 kHz arası dar ve belirgin bir tepe var mı? */
export function whistleFrame(db: Float32Array, sampleRate: number, fftSize: number): number | null {
  const binHz = sampleRate / fftSize;
  const lo = Math.floor(1500 / binHz);
  const hi = Math.min(db.length - 1, Math.ceil(4500 / binHz));
  let peak = -Infinity;
  let peakBin = lo;
  let sum = 0;
  for (let i = lo; i <= hi; i++) {
    sum += db[i];
    if (db[i] > peak) {
      peak = db[i];
      peakBin = i;
    }
  }
  const mean = sum / (hi - lo + 1);
  // Tepe, bant ortalamasından en az 25 dB yüksek ve mutlak seviye yeterli olmalı
  if (peak > -65 && peak - mean > 25) return peakBin * binHz;
  return null;
}

/** Ardışık karelerde ~aynı frekansta süren tepe → düdük. */
export class WhistleDetector {
  private run = 0;
  private lastHz = 0;
  private needFrames: number;
  constructor(needFrames = 6) {
    this.needFrames = needFrames;
  }
  push(hz: number | null): boolean {
    if (hz !== null && (this.run === 0 || Math.abs(hz - this.lastHz) < 250)) {
      this.run++;
      this.lastHz = hz;
    } else {
      this.run = hz === null ? 0 : 1;
      this.lastHz = hz ?? 0;
    }
    if (this.run >= this.needFrames) {
      this.run = 0;
      return true;
    }
    return false;
  }
}
