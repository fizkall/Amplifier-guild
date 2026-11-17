// Mesh çekirdeği: paketleri doğrular, tekilleştirir, saklar (store-and-forward) ve tüm taşıma kanallarına yayar.
// Taşımalar: muhtarlık düğümüne WebSocket (LAN / eski modem), aynı cihazdaki sekmeler (BroadcastChannel),
// QR ve ses (FSK). Bluetooth mesh yerel kabuk (Capacitor) eklentisiyle aynı arayüze takılacak.

import { createStore, del, entries, get, set } from "idb-keyval";
import {
  ACOUSTIC_SOS_LEN, ENV, T, buildPacket, decodeAck, decodePacket, encodeSOS, hex, newKeyPair, packetIdHex,
  pubFromPriv, unpackAcousticSOS, verifyPacket, withDecrementedTtl, type KeyPair, type Packet,
} from "./protocol";

const packetsDb = createStore("mahalle-agi-paketler", "paketler");
const metaDb = createStore("mahalle-agi-meta", "meta");

const KEEP_SEC = 7 * 24 * 3600;

export interface Stored {
  raw: Uint8Array;
  p: Packet;
  via: string;
  seenAt: number;
}

export interface MeshStats {
  carried: number; // bu telefonun başkaları adına düğüme taşıdığı paket
  mine: string[]; // bu cihazın oluşturduğu paketler
  acks: Record<string, { rank: number; total: number; at: number }>;
  trusted: string[]; // güvenilen muhtarlık düğümü anahtarları (hex)
}

type Listener = (s: Stored, isNew: boolean) => void;

export class Mesh {
  keys!: KeyPair;
  packets = new Map<string, Stored>();
  stats: MeshStats = { carried: 0, mine: [], acks: {}, trusted: [] };
  ws: WebSocket | null = null;
  wsState: "kapalı" | "bağlanıyor" | "bağlı" = "kapalı";
  nodeName = "";
  private bc = "BroadcastChannel" in self ? new BroadcastChannel("mahalle-agi") : null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<() => void>();
  private wsUrl = "";
  private retry = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  async init() {
    let priv = (await get<Uint8Array>("priv", metaDb)) ?? null;
    if (!priv) {
      const kp = newKeyPair();
      priv = kp.priv;
      await set("priv", priv, metaDb);
    }
    this.keys = { priv, pub: pubFromPriv(priv) };
    this.stats = { ...this.stats, ...((await get<MeshStats>("stats", metaDb)) ?? {}) };

    const now = Date.now() / 1000;
    for (const [k, v] of await entries<string, { raw: Uint8Array; via: string; seenAt: number }>(packetsDb)) {
      const p = decodePacket(v.raw);
      if (!p || now - p.ts > KEEP_SEC) {
        await del(k, packetsDb);
        continue;
      }
      this.packets.set(k, { raw: v.raw, p, via: v.via, seenAt: v.seenAt });
    }
    if (this.bc) this.bc.onmessage = (e) => this.receive(new Uint8Array(e.data), "sekme");
  }

  get myIdHex() {
    return hex(this.keys.pub).slice(0, 8);
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  onStatus(fn: () => void) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }
  private emitStatus() {
    this.statusListeners.forEach((f) => f());
  }

  private async saveStats() {
    await set("stats", this.stats, metaDb);
    this.emitStatus();
  }

  list(type?: number): Stored[] {
    return [...this.packets.values()].filter((s) => type === undefined || s.p.type === type);
  }

  isTrustedNode(pub: Uint8Array) {
    return this.stats.trusted.includes(hex(pub));
  }

  /** Yeni paket oluştur, imzala, sakla ve yay. */
  async publish(type: (typeof T)[keyof typeof T], payload: Uint8Array, opts: { id?: Uint8Array; ts?: number } = {}) {
    const raw = buildPacket(type, payload, this.keys, opts);
    const id = packetIdHex(raw);
    this.stats.mine.push(id);
    await this.saveStats();
    await this.receive(raw, "ben");
    return id;
  }

  /** Sesle (FSK) alınan imzasız SOS özetini kendi imzamızla ağa aktar; kimlik korunur, tekrarlar elenir. */
  async relayAcoustic(data: Uint8Array) {
    if (data.length !== ACOUSTIC_SOS_LEN) return null;
    const u = unpackAcousticSOS(data);
    if (!u) return null;
    const id = hex(u.id);
    if (this.packets.has(id)) return id;
    const raw = buildPacket(T.SOS, encodeSOS({ ...u.sos, env: u.sos.env | ENV.SESLE_ALINDI }), this.keys, { id: u.id, ts: u.ts });
    await this.receive(raw, "ses");
    return id;
  }

  /** Herhangi bir kanaldan gelen ham paket. true = yeni paket. */
  async receive(raw: Uint8Array, via: string): Promise<boolean> {
    if (!verifyPacket(raw)) return false;
    const p = decodePacket(raw)!;
    if (Date.now() / 1000 - p.ts > KEEP_SEC) return false;
    if (p.type === T.ANNOUNCE && !this.isTrustedNode(p.pub)) return false; // sahte duyuruya karşı
    const id = hex(p.id);
    const existing = this.packets.get(id);
    if (existing) {
      this.listeners.forEach((f) => f(existing, false));
      return false;
    }
    const s: Stored = { raw, p, via, seenAt: Date.now() };
    this.packets.set(id, s);
    await set(id, { raw, via, seenAt: s.seenAt }, packetsDb);

    if (p.type === T.ACK && this.isTrustedNode(p.pub)) {
      const a = decodeAck(p.payload);
      if (a) {
        this.stats.acks[a.ackedId] = { rank: a.rank, total: a.total, at: Date.now() };
        await this.saveStats();
      }
    }
    this.listeners.forEach((f) => f(s, true));
    this.forward(raw, via);
    return true;
  }

  private forward(raw: Uint8Array, via: string) {
    const next = via === "ben" ? raw : withDecrementedTtl(raw);
    if (!next) return;
    if (via !== "sekme") this.bc?.postMessage(next);
    if (via !== "düğüm" && this.ws?.readyState === WebSocket.OPEN) this.ws.send(next);
  }

  // ---------- Muhtarlık düğümü bağlantısı (veri katırı senkronu) ----------

  connect(url: string) {
    this.wsUrl = url;
    this.openWs();
  }

  private openWs() {
    if (!this.wsUrl) return;
    clearTimeout(this.retryTimer);
    if (this.ws) {
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        /* yoksay */
      }
    }
    this.wsState = "bağlanıyor";
    this.emitStatus();
    const ws = new WebSocket(this.wsUrl);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => {
      this.wsState = "bağlı";
      this.retry = 1000;
      ws.send(JSON.stringify({ t: "have", ids: [...this.packets.keys()] }));
      this.emitStatus();
    };
    ws.onmessage = async (e) => {
      if (typeof e.data === "string") {
        const m = JSON.parse(e.data);
        if (m.t === "hello") {
          this.nodeName = m.name;
          if (!this.stats.trusted.includes(m.pub)) {
            this.stats.trusted.push(m.pub); // ilk bağlantıda güven (muhtarlıkta QR ile doğrulanır)
            await this.saveStats();
          }
        }
        if (m.t === "want") {
          let carried = 0;
          for (const id of m.ids as string[]) {
            const s = this.packets.get(id);
            if (!s) continue;
            ws.send(s.raw);
            if (!this.stats.mine.includes(id) && s.p.type !== T.ACK) carried++;
          }
          if (carried) {
            this.stats.carried += carried;
            await this.saveStats();
            this.onCarried?.(carried);
          }
        }
        return;
      }
      await this.receive(new Uint8Array(e.data), "düğüm");
    };
    ws.onclose = () => {
      this.wsState = "kapalı";
      this.emitStatus();
      this.retryTimer = setTimeout(() => this.openWs(), this.retry);
      this.retry = Math.min(this.retry * 2, 30000);
    };
    ws.onerror = () => ws.close();
  }

  onCarried?: (n: number) => void;
}

export const mesh = new Mesh();
