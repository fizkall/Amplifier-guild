// Tarayıcı ses ve ışık katmanı: FSK yayın/dinleme, bulunma sinyali, düdük algılama, flaşla Mors.

import { WhistleDetector, demodulate, modulate, whistleFrame } from "./modem";

let ctx: AudioContext | null = null;
export function audioCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ---------- FSK yayın ----------

export function playData(data: Uint8Array, volume = 0.9): Promise<void> {
  const ac = audioCtx();
  const samples = modulate(data, ac.sampleRate, volume);
  const buf = ac.createBuffer(1, samples.length, ac.sampleRate);
  buf.copyToChannel(samples, 0);
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  return new Promise((res) => {
    src.onended = () => res();
    src.start();
  });
}

// ---------- Mikrofon ----------

async function micStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
}

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor('ma-tap', Tap);`;
let workletLoaded = false;

/** Mikrofonu dinler, FSK çerçevelerini çözer. Durdurmak için dönen fonksiyonu çağır. */
export async function listenData(onData: (d: Uint8Array) => void, onLevel?: (rms: number) => void): Promise<() => void> {
  const ac = audioCtx();
  const stream = await micStream();
  if (!workletLoaded) {
    await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
    workletLoaded = true;
  }
  const src = ac.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ac, "ma-tap");
  const sink = ac.createGain();
  sink.gain.value = 0;
  src.connect(node).connect(sink).connect(ac.destination);

  const sr = ac.sampleRate;
  const cap = Math.round(sr * 12);
  let ring = new Float32Array(cap);
  let len = 0;
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const ch = e.data;
    if (len + ch.length > cap) {
      ring.copyWithin(0, len + ch.length - cap, len);
      len = cap - ch.length;
    }
    ring.set(ch, len);
    len += ch.length;
  };
  const timer = setInterval(() => {
    const view = ring.subarray(0, len);
    if (onLevel) {
      let s = 0;
      const tail = view.subarray(Math.max(0, len - 4800));
      for (const v of tail) s += v * v;
      onLevel(Math.sqrt(s / Math.max(1, tail.length)));
    }
    const found = demodulate(view, sr);
    if (found.length) {
      const last = found[found.length - 1].endSample;
      found.forEach((f) => onData(f.data));
      ring.copyWithin(0, last, len); // çözülen kısmı at
      len -= last;
    }
  }, 1000);
  return () => {
    clearInterval(timer);
    node.port.onmessage = null;
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
  };
}

// ---------- Bulunma sinyali ----------
// Ekiplerin dinleme cihazlarının iyi duyduğu 2–4 kHz bandında, doğal seslerden ayrılan sabit ritim:
// 3 kısa ton (3 kHz, 0,25 sn) + 1,5 sn sessizlik. Ölçüm ve yer tespiti yetkili ekiptedir.

export function startBeacon(opts: { saver?: boolean } = {}): () => void {
  const ac = audioCtx();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const burst = () => {
    const t0 = ac.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 3000;
      const s = t0 + i * 0.5;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(1, s + 0.01);
      g.gain.setValueAtTime(1, s + 0.24);
      g.gain.linearRampToValueAtTime(0, s + 0.25);
      o.connect(g).connect(ac.destination);
      o.start(s);
      o.stop(s + 0.26);
    }
  };
  // Tasarruf modu: 30 sn çal, 2 dk sus (pil günlerce dayansın)
  const cycle = (elapsed: number) => {
    if (stopped) return;
    const on = !opts.saver || elapsed % 150 < 30;
    if (on) burst();
    timer = setTimeout(() => cycle(elapsed + 3), 3000);
  };
  cycle(0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

// ---------- Düdük / dış ses algılama ----------

export async function listenWhistle(onWhistle: (hz: number) => void): Promise<() => void> {
  const ac = audioCtx();
  const stream = await micStream();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 2048;
  an.smoothingTimeConstant = 0;
  src.connect(an);
  const db = new Float32Array(an.frequencyBinCount);
  const det = new WhistleDetector(6);
  let cool = 0;
  const timer = setInterval(() => {
    an.getFloatFrequencyData(db);
    const hz = whistleFrame(db, ac.sampleRate, an.fftSize);
    if (det.push(hz) && Date.now() > cool) {
      cool = Date.now() + 4000;
      onWhistle(hz ?? 0);
    }
  }, 50);
  return () => {
    clearInterval(timer);
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
  };
}

// ---------- Işık: flaş veya ekranla Mors SOS ----------

const UNIT = 200; // ms
const SOS_PATTERN = [1, 1, 1, 3, 3, 3, 1, 1, 1]; // ··· ––– ···

export async function startMorseSOS(overlay: HTMLElement): Promise<() => void> {
  let track: MediaStreamTrack | null = null;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    track = s.getVideoTracks()[0];
    const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (!caps.torch) {
      track.stop();
      track = null;
    }
  } catch {
    track = null;
  }
  const light = async (on: boolean) => {
    overlay.classList.toggle("on", on);
    if (track) {
      try {
        await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      } catch {
        /* fener yok; ekran yanıp sönmeye devam */
      }
    }
  };
  overlay.hidden = false;
  let stopped = false;
  (async () => {
    while (!stopped) {
      for (const u of SOS_PATTERN) {
        if (stopped) break;
        await light(true);
        await sleep(u * UNIT);
        await light(false);
        await sleep(UNIT);
      }
      await sleep(7 * UNIT);
    }
  })();
  return () => {
    stopped = true;
    void light(false);
    overlay.hidden = true;
    track?.stop();
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Ekranı açık tut ----------

let lock: WakeLockSentinel | null = null;
export async function keepAwake(on: boolean) {
  try {
    if (on && !lock && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    /* desteklenmiyor */
  }
}

// ---------- Sesli okuma ----------

export function speak(text: string) {
  if (!("speechSynthesis" in self)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "tr-TR";
  u.rate = 0.95;
  const tr = speechSynthesis.getVoices().find((v) => v.lang.startsWith("tr"));
  if (tr) u.voice = tr;
  speechSynthesis.speak(u);
}
