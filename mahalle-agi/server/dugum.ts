// Muhtarlık ana düğümü: mahalledeki herhangi bir bilgisayarda çalışır (Node 22.18+, internet gerekmez).
//  - PWA'yı yerel ağa sunar (eski modemin Wi-Fi'si yeterli)
//  - Telefonlardan gelen paketleri doğrular, saklar, diğer telefonlara yayar (veri katırı senkronu)
//  - Her yeni SOS için imzalı alındı (ACK) ve kurtarma sırası üretir
//  - Resmi duyuruları muhtarlık anahtarıyla imzalar
//  - İnternet dönünce AFAD'a aktarım için CSV / GeoJSON verir
//
// Çalıştırma: npm run build && npm start   (PORT, DUGUM_ADI, DUGUM_PIN, DUGUM_VERI, TLS_CERT, TLS_KEY)

import { createServer as createHttp, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttps } from "node:https";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { randomInt } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import {
  ENV_LABELS, FLAG_LABELS, LOC_SRC, T, buildPacket, decodePacket, decodeSOS, encodeAck, encodeText, flagList,
  fromHex, hex, packetIdHex, priorityScore, pubFromPriv, toB64u, fromB64u, urgencyLabel, verifyPacket,
  withDecrementedTtl, type KeyPair,
} from "../src/protocol.ts";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const DATA = resolve(process.env.DUGUM_VERI ?? join(ROOT, "veri"));
const PORT = Number(process.env.PORT ?? 8080);
const NAME = process.env.DUGUM_ADI ?? "Muhtarlık Düğümü";

mkdirSync(DATA, { recursive: true });

// ---------- Anahtar ve PIN ----------

const keyFile = join(DATA, "anahtar.json");
let keys: KeyPair;
let pin: string;
if (existsSync(keyFile)) {
  const k = JSON.parse(readFileSync(keyFile, "utf8"));
  keys = { priv: fromHex(k.priv), pub: pubFromPriv(fromHex(k.priv)) };
  pin = k.pin;
} else {
  const priv = new Uint8Array(32);
  crypto.getRandomValues(priv);
  keys = { priv, pub: pubFromPriv(priv) };
  pin = String(randomInt(100000, 999999));
  writeFileSync(keyFile, JSON.stringify({ priv: hex(priv), pin }), { mode: 0o600 });
}
if (process.env.DUGUM_PIN) pin = process.env.DUGUM_PIN;
const nodePub = hex(keys.pub);

// ---------- Paket deposu (salt-ekleme günlüğü) ----------

const logFile = join(DATA, "paketler.log");
const packets = new Map<string, Uint8Array>();
if (existsSync(logFile)) {
  for (const line of readFileSync(logFile, "utf8").split("\n")) {
    if (!line) continue;
    try {
      const raw = fromB64u(line);
      if (verifyPacket(raw)) packets.set(packetIdHex(raw), raw);
    } catch {
      /* bozuk satırı atla */
    }
  }
}

function store(raw: Uint8Array) {
  packets.set(packetIdHex(raw), raw);
  appendFileSync(logFile, toB64u(raw) + "\n");
}

function sosRanking() {
  const now = Date.now() / 1000;
  return [...packets.values()]
    .map((raw) => decodePacket(raw)!)
    .filter((p) => p.type === T.SOS)
    .map((p) => ({ p, d: decodeSOS(p.payload)! }))
    .filter((x) => x.d)
    .map((x) => ({ ...x, score: priorityScore(x.d, now - x.p.ts) }))
    .sort((a, b) => b.score - a.score);
}

// ---------- WebSocket: senkron ve yayın ----------

const clients = new Set<WebSocket>();
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

function broadcast(raw: Uint8Array, except?: WebSocket) {
  for (const c of clients) if (c !== except && c.readyState === c.OPEN) c.send(raw);
}

function ingest(raw: Uint8Array, from?: WebSocket): boolean {
  if (!verifyPacket(raw)) return false;
  const p = decodePacket(raw)!;
  const id = hex(p.id);
  if (packets.has(id)) return false;
  if ((p.type === T.ANNOUNCE || p.type === T.ACK) && hex(p.pub) !== nodePub) return false; // yalnızca bu düğüm imzalar
  store(raw);
  broadcast(withDecrementedTtl(raw) ?? raw, from);
  if (p.type === T.SOS) {
    const ranking = sosRanking();
    const rank = ranking.findIndex((x) => hex(x.p.id) === id) + 1;
    const ack = buildPacket(T.ACK, encodeAck({ ackedId: id, rank, total: ranking.length }), keys);
    store(ack);
    broadcast(ack);
    const d = decodeSOS(p.payload)!;
    console.log(`[SOS] ${id} · ${d.people} kişi · ${urgencyLabel(ranking[rank - 1].score)} · sıra ${rank}/${ranking.length}`);
  }
  return true;
}

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ t: "hello", name: NAME, pub: nodePub }));
  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      ingest(new Uint8Array(data as Buffer));
      return;
    }
    try {
      const m = JSON.parse(String(data));
      if (m.t === "have" && Array.isArray(m.ids)) {
        const theirs = new Set<string>(m.ids.filter((x: unknown) => typeof x === "string").slice(0, 100000));
        for (const [id, raw] of packets) if (!theirs.has(id)) ws.send(raw); // onlarda olmayanı gönder
        const want = [...theirs].filter((id) => !packets.has(id));
        if (want.length) ws.send(JSON.stringify({ t: "want", ids: want })); // bizde olmayanı iste
      }
    } catch {
      /* geçersiz mesaj */
    }
  });
  ws.on("close", () => clients.delete(ws));
});

// ---------- HTTP ----------

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".ico": "image/x-icon",
};

function send(res: ServerResponse, code: number, body: string | Buffer, type = "text/plain; charset=utf-8", extra: Record<string, string> = {}) {
  res.writeHead(code, { "content-type": type, "cache-control": "no-cache", ...extra });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let s = "";
    req.on("data", (c) => {
      s += c;
      if (s.length > 10000) req.destroy();
    });
    req.on("end", () => ok(s));
    req.on("error", fail);
  });
}

function csv() {
  const head = "kimlik,zaman,enlem,boylam,kisi,aciliyet,oncelik,duzey,durum,cevre,konum_kaynagi";
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = sosRanking().map(({ p, d, score }) =>
    [hex(p.id), new Date(p.ts * 1000).toISOString(), d.lat, d.lon, d.people, d.urgency, score, urgencyLabel(score),
      q(flagList(d.flags, FLAG_LABELS).join("; ")), q(flagList(d.env, ENV_LABELS).join("; ")), q(LOC_SRC[d.locSrc] ?? "")].join(","),
  );
  return "﻿" + [head, ...lines].join("\n");
}

function geojson() {
  return JSON.stringify({
    type: "FeatureCollection",
    features: sosRanking().filter((x) => x.d.lat).map(({ p, d, score }) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [d.lon, d.lat] },
      properties: { kimlik: hex(p.id), zaman: new Date(p.ts * 1000).toISOString(), kisi: d.people, oncelik: score, duzey: urgencyLabel(score),
        durum: flagList(d.flags, FLAG_LABELS), cevre: flagList(d.env, ENV_LABELS), konumKaynagi: LOC_SRC[d.locSrc] },
    })),
  });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/dugum-bilgi") return send(res, 200, JSON.stringify({ name: NAME, pub: nodePub, paket: packets.size }), "application/json");
  if (url.pathname === "/disa-aktar.csv") return send(res, 200, csv(), "text/csv; charset=utf-8", { "content-disposition": 'attachment; filename="sos.csv"' });
  if (url.pathname === "/disa-aktar.geojson") return send(res, 200, geojson(), "application/geo+json", { "content-disposition": 'attachment; filename="sos.geojson"' });
  if (url.pathname === "/duyuru" && req.method === "POST") {
    try {
      const { text, pin: given } = JSON.parse(await readBody(req));
      if (given !== pin) return send(res, 403, "PIN yanlış");
      if (typeof text !== "string" || !text.trim()) return send(res, 400, "Metin boş");
      const raw = buildPacket(T.ANNOUNCE, encodeText(text.trim()), keys);
      ingest(raw);
      console.log(`[DUYURU] ${text.trim()}`);
      return send(res, 200, "ok");
    } catch {
      return send(res, 400, "Geçersiz istek");
    }
  }

  // Statik dosyalar (dist/)
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path === "/" || path === "\\") path = "/index.html";
  if (path === "/konsol") path = "/konsol.html";
  const file = join(DIST, path);
  if (!file.startsWith(DIST)) return send(res, 403, "Yasak");
  if (existsSync(file) && statSync(file).isFile()) {
    return send(res, 200, readFileSync(file), MIME[extname(file)] ?? "application/octet-stream", path.startsWith("/assets/") ? { "cache-control": "public, max-age=31536000, immutable" } : {});
  }
  if (!existsSync(DIST)) return send(res, 500, "Önce 'npm run build' çalıştırın.");
  return send(res, 200, readFileSync(join(DIST, "index.html")), MIME[".html"]);
}

const tls = process.env.TLS_CERT && process.env.TLS_KEY
  ? { cert: readFileSync(process.env.TLS_CERT), key: readFileSync(process.env.TLS_KEY) }
  : null;
const server = tls ? createHttps(tls, handle) : createHttp(handle);
server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url ?? "/", "http://x").pathname !== "/ws") return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

server.listen(PORT, () => {
  const proto = tls ? "https" : "http";
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i!.address);
  console.log(`\n${NAME} çalışıyor · ${packets.size} paket yüklendi`);
  console.log(`  Telefonlar:  ${[`localhost:${PORT}`, ...ips.map((ip) => `${ip}:${PORT}`)].map((h) => `${proto}://${h}`).join("  ")}`);
  console.log(`  Konsol (TV): ${proto}://${ips[0] ?? "localhost"}:${PORT}/konsol`);
  console.log(`  Duyuru PIN'i: ${pin}`);
  console.log(`  Düğüm anahtarı: ${nodePub.slice(0, 16)}…\n`);
  if (!tls) console.log("  Not: Telefonların çevrimdışı kurulumu için HTTPS gerekir (bkz. README: mkcert).\n");
});
