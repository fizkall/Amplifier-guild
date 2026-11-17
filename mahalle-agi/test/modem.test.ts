import { describe, expect, it } from "vitest";
import { WhistleDetector, crc16, demodulate, frameDurationSec, modulate, whistleFrame } from "../src/modem";

function noisy(x: Float32Array, level: number, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
  return x.map((v) => v + level * rnd());
}

describe("akustik modem", () => {
  it("CRC-16/CCITT bilinen değer", () => {
    expect(crc16(new TextEncoder().encode("123456789"))).toBe(0x29b1);
  });

  for (const sr of [44100, 48000]) {
    it(`${sr} Hz: gürültü ve kaymayla çözülür`, () => {
      const data = Uint8Array.from({ length: 25 }, (_, i) => (i * 37 + 11) & 255);
      const sig = modulate(data, sr, 0.5);
      const pad = new Float32Array(sig.length + 12345 + sr);
      pad.set(sig, 12345); // rastgele başlangıç kayması
      const got = demodulate(noisy(pad, 0.35), sr);
      expect(got.length).toBe(1);
      expect(Array.from(got[0].data)).toEqual(Array.from(data));
    });
  }

  it("art arda iki çerçeve", () => {
    const sr = 48000;
    const a = modulate(new Uint8Array([1, 2, 3]), sr), b = modulate(new Uint8Array([9, 8, 7, 6]), sr);
    const x = new Float32Array(a.length + b.length); x.set(a); x.set(b, a.length);
    expect(demodulate(x, sr).map((d) => Array.from(d.data))).toEqual([[1, 2, 3], [9, 8, 7, 6]]);
  });

  it("saf gürültüde yanlış çerçeve üretmez", () => {
    expect(demodulate(noisy(new Float32Array(48000 * 5), 0.5, 7), 48000)).toEqual([]);
  });

  it("SOS süresi 10 saniyenin altında", () => {
    expect(frameDurationSec(25)).toBeLessThan(10);
  });

  it("düdük tepesini bulur ve süreklilik ister", () => {
    const fft = 2048, sr = 48000, db = new Float32Array(fft / 2).fill(-100);
    db[Math.round(3000 / (sr / fft))] = -30;
    expect(whistleFrame(db, sr, fft)).toBeCloseTo(3000, -2);
    const det = new WhistleDetector(6);
    const hits = [1, 2, 3, 4, 5, 6].map(() => det.push(3000));
    expect(hits.at(-1)).toBe(true);
    expect(whistleFrame(new Float32Array(fft / 2).fill(-50), sr, fft)).toBeNull();
  });
});
