// Muhtarlık / akıllı TV konsolu: düğümdeki tüm SOS'ları önceliğe göre gösterir.
import "./style.css";
import {
  ENV_LABELS, FLAG_LABELS, LOC_SRC, T, decodePacket, decodeSOS, decodeSymptom, flagList, hex, priorityScore,
  symptomClusters, urgencyLabel, verifyPacket, type Packet,
} from "./protocol";

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const packets = new Map<string, Packet>();
const COLORS: Record<string, string> = { Kritik: "#e5383b", Acil: "#f2b134", "Öncelikli": "#5aa9ff", Bekleyebilir: "#9aa1ad" };

function rows() {
  const now = Date.now() / 1000;
  return [...packets.values()]
    .filter((p) => p.type === T.SOS)
    .map((p) => ({ p, d: decodeSOS(p.payload)! }))
    .filter((x) => x.d)
    .map((x) => ({ ...x, score: priorityScore(x.d, now - x.p.ts) }))
    .sort((a, b) => b.score - a.score);
}

function render() {
  const r = rows();
  $("k-sos").textContent = String(r.length);
  $("k-crit").textContent = String(r.filter((x) => urgencyLabel(x.score) === "Kritik").length);
  $("k-people").textContent = String(r.reduce((n, x) => n + x.d.people, 0));
  $("k-list").innerHTML = r.slice(0, 40).map(({ p, d, score }, i) => {
    const l = urgencyLabel(score);
    const tags = [...flagList(d.flags, FLAG_LABELS), ...flagList(d.env, ENV_LABELS)].join(", ");
    const mins = Math.round((Date.now() / 1000 - p.ts) / 60);
    return `<li><div class="h"><span>${i + 1}. ${d.people} kişi · ${esc(tags || "işaret yok")}</span><span class="pill" style="color:${COLORS[l]}">${l} · ${score}</span></div>
      <div class="m mono">${d.lat ? `${d.lat.toFixed(5)}, ${d.lon.toFixed(5)} · ${LOC_SRC[d.locSrc] ?? ""}` : "konum yok"} · ${mins} dk önce${d.env & 128 ? " · sesten çözüldü" : ""}</div></li>`;
  }).join("") || `<li class="muted">Henüz SOS yok.</li>`;

  const reports = [...packets.values()].filter((p) => p.type === T.SYMPTOM).map((p) => ({ ...decodeSymptom(p.payload), ts: p.ts }));
  $("k-alarms").innerHTML = symptomClusters(reports, Date.now() / 1000)
    .map((c) => `<div class="alarm">Salgın erken uyarısı: son 48 saatte ${c.count} kişi "${c.label}" bildirdi. Sağlık ekibini bilgilendirin.</div>`)
    .join("");
  drawMap(r);
}

function drawMap(r: ReturnType<typeof rows>) {
  const cv = $("k-map") as HTMLCanvasElement;
  const g = cv.getContext("2d")!;
  g.fillStyle = getComputedStyle(document.body).getPropertyValue("--panel") || "#1d2026";
  g.fillRect(0, 0, cv.width, cv.height);
  const pts = r.filter((x) => x.d.lat);
  if (!pts.length) {
    g.fillStyle = "#9aa1ad";
    g.font = "22px system-ui";
    g.fillText("Konumlu SOS geldiğinde burada görünecek", 30, 50);
    return;
  }
  const lats = pts.map((x) => x.d.lat), lons = pts.map((x) => x.d.lon);
  const pad = 0.0005;
  const [a, b] = [Math.min(...lats) - pad, Math.max(...lats) + pad];
  const [c, d] = [Math.min(...lons) - pad, Math.max(...lons) + pad];
  const X = (lon: number) => 40 + ((lon - c) / (d - c)) * (cv.width - 80);
  const Y = (lat: number) => cv.height - 40 - ((lat - a) / (b - a)) * (cv.height - 80);
  g.strokeStyle = "#2c3039";
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo(40, 40 + (i * (cv.height - 80)) / 4); g.lineTo(cv.width - 40, 40 + (i * (cv.height - 80)) / 4); g.stroke();
    g.beginPath(); g.moveTo(40 + (i * (cv.width - 80)) / 4, 40); g.lineTo(40 + (i * (cv.width - 80)) / 4, cv.height - 40); g.stroke();
  }
  [...pts].reverse().forEach((x, i) => {
    const rank = pts.length - i;
    g.fillStyle = COLORS[urgencyLabel(x.score)];
    g.beginPath(); g.arc(X(x.d.lon), Y(x.d.lat), 14 + Math.min(x.d.people, 10), 0, Math.PI * 2); g.fill();
    if (rank <= 9) { g.fillStyle = "#fff"; g.font = "bold 16px system-ui"; g.textAlign = "center"; g.fillText(String(rank), X(x.d.lon), Y(x.d.lat) + 5); }
  });
  const meters = ((d - c) * 111320 * Math.cos((a * Math.PI) / 180)) | 0;
  g.fillStyle = "#9aa1ad"; g.font = "16px system-ui"; g.textAlign = "left";
  g.fillText(`Genişlik ≈ ${meters} m · K ↑`, 40, 28);
}

function connect() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?rol=konsol`);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => { $("k-badge").textContent = "Canlı"; $("k-badge").classList.add("on"); ws.send(JSON.stringify({ t: "have", ids: [] })); };
  ws.onmessage = (e) => {
    if (typeof e.data === "string") {
      const m = JSON.parse(e.data);
      if (m.t === "hello") $("k-name").textContent = `${m.name} · Afet Konsolu`;
      return;
    }
    const raw = new Uint8Array(e.data);
    if (!verifyPacket(raw)) return;
    const p = decodePacket(raw)!;
    packets.set(hex(p.id), p);
    scheduleRender();
  };
  ws.onclose = () => { $("k-badge").textContent = "Bağlantı yok"; $("k-badge").classList.remove("on"); setTimeout(connect, 2000); };
}

let pending = false;
function scheduleRender() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; render(); });
}

$("k-send").addEventListener("click", async () => {
  const text = ($("k-ann") as HTMLTextAreaElement).value.trim();
  const pin = ($("k-pin") as HTMLInputElement).value.trim();
  if (!text) return;
  const r = await fetch("/duyuru", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, pin }) });
  if (r.ok) { ($("k-ann") as HTMLTextAreaElement).value = ""; alertBox("Duyuru imzalandı ve yayınlandı."); }
  else alertBox(r.status === 403 ? "PIN yanlış. PIN, düğüm başlatılırken ekranda yazar." : "Duyuru gönderilemedi.");
});
function alertBox(msg: string) {
  const d = document.createElement("div");
  d.className = "alarm";
  d.textContent = msg;
  $("k-alarms").prepend(d);
  setTimeout(() => d.remove(), 5000);
}

connect();
render();
setInterval(render, 30000);
