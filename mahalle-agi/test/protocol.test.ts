import { describe, expect, it } from "vitest";
import {
  ACOUSTIC_SOS_LEN, ENV, FLAGS, T, buildPacket, decodePacket, decodeSOS, encodeSOS, newKeyPair,
  packAcousticSOS, packetsToQrFrames, priorityScore, qrFrameToPackets, unpackAcousticSOS,
  verifyPacket, withDecrementedTtl,
} from "../src/protocol";

const sos = { lat: 41.0938123, lon: 28.8021456, urgency: 5, people: 2, flags: FLAGS.SIKISMA | FLAGS.KANAMA | FLAGS.COCUK, env: ENV.SOGUK, locSrc: 1 };

describe("protokol", () => {
  it("SOS yükü 13 bayt ve kayıpsız", () => {
    const b = encodeSOS(sos);
    expect(b.length).toBe(13);
    const d = decodeSOS(b)!;
    expect(d.lat).toBeCloseTo(sos.lat, 6);
    expect(d.lon).toBeCloseTo(sos.lon, 6);
    expect(d).toMatchObject({ urgency: 5, people: 2, flags: sos.flags, env: ENV.SOGUK, locSrc: 1 });
  });

  it("imzalı paket doğrulanır, TTL değişince imza bozulmaz, içerik değişince bozulur", () => {
    const k = newKeyPair();
    const raw = buildPacket(T.SOS, encodeSOS(sos), k);
    expect(verifyPacket(raw)).toBe(true);
    const hop = withDecrementedTtl(raw)!;
    expect(hop[13]).toBe(6);
    expect(verifyPacket(hop)).toBe(true);
    const bad = raw.slice(); bad[20] ^= 1;
    expect(verifyPacket(bad)).toBe(false);
    expect(decodePacket(raw)!.type).toBe(T.SOS);
  });

  it("akustik özet 25 bayt ve geri açılır", () => {
    const raw = buildPacket(T.SOS, encodeSOS(sos), newKeyPair());
    const a = packAcousticSOS(raw);
    expect(a.length).toBe(ACOUSTIC_SOS_LEN);
    const u = unpackAcousticSOS(a)!;
    expect(u.sos.people).toBe(2);
    expect(Array.from(u.id)).toEqual(Array.from(decodePacket(raw)!.id));
  });

  it("QR demetleri paketleri korur", () => {
    const k = newKeyPair();
    const ps = Array.from({ length: 30 }, () => buildPacket(T.SOS, encodeSOS(sos), k));
    const frames = packetsToQrFrames(ps);
    expect(frames.length).toBeGreaterThan(1);
    const back = frames.flatMap(qrFrameToPackets);
    expect(back.length).toBe(30);
    expect(back.every(verifyPacket)).toBe(true);
  });

  it("kanamalı çocuklu sıkışma, iyi durumdaki kişiden önce gelir", () => {
    const calm = { ...sos, urgency: 1, people: 1, flags: 0, env: 0 };
    expect(priorityScore(sos, 0)).toBeGreaterThan(priorityScore(calm, 0));
  });
});
