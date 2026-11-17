import "./style.css";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { registerSW } from "virtual:pwa-register";
import { mesh, type Stored } from "./mesh";
import {
  ENV_LABELS, FLAG_LABELS, LOC_SRC, SYMPTOM_LABELS, T, decodeResource, decodeSOS, decodeText, encodeResource,
  encodeSOS, encodeSymptom, flagList, hex, packAcousticSOS, packetsToQrFrames, priorityScore, qrFrameToPackets,
  urgencyLabel, type SOS,
} from "./protocol";
import { triage } from "./triage";
import { keepAwake, listenData, listenWhistle, playData, speak, startBeacon, startMorseSOS } from "./audio";
import { FIRST_AID, POST_SURVIVAL, searchTopics, type Topic } from "./content";
import { askOrientationPermission, dirName, getGps, sunPosition, watchHeading } from "./sun";

registerSW({ immediate: true });

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* yoksay */ } },
};

let toastTimer: ReturnType<typeof setTimeout>;
function toast(msg: string) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

function ago(tsSec: number) {
  const m = Math.max(0, Math.round((Date.now() / 1000 - tsSec) / 60));
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.floor(h / 24)} gün önce`;
}

// ---------- Sekmeler ----------

document.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.v!)),
);
function showView(v: string) {
  document.querySelectorAll<HTMLElement>(".view").forEach((s) => (s.hidden = s.id !== `v-${v}`));
  document.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  window.scrollTo(0, 0);
  if (v === "ag") renderNet();
  if (v === "pano") renderBoard();
}

// ---------- SOS ----------

const last = JSON.parse(ls.get("ma-loc") ?? "null") as { lat: number; lon: number; src: number } | null;
const sos: SOS = { lat: last?.lat ?? 0, lon: last?.lon ?? 0, urgency: 3, people: 1, flags: 0, env: 0, locSrc: last?.src ?? 0 };

function chipGroup(el: HTMLElement, labels: Record<number, string>, key: "flags" | "env") {
  el.innerHTML = Object.entries(labels)
    .map(([bit, l]) => `<button type="button" data-b="${bit}" aria-pressed="false">${l}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    sos[key] ^= Number(b.dataset.b);
    renderSosForm();
  });
}
chipGroup($("sos-flags"), FLAG_LABELS, "flags");
chipGroup($("sos-env"), ENV_LABELS, "env");

$("sos-urg").innerHTML = [1, 2, 3, 4, 5].map((u) => `<button type="button" data-u="${u}" aria-label="Aciliyet ${u}">${u}</button>`).join("");
$("sos-urg").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (b) { sos.urgency = Number(b.dataset.u); renderSosForm(); }
});
$("sos-form").querySelector(".stepper")!.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (b) { sos.people = Math.max(1, Math.min(31, sos.people + Number(b.dataset.d))); renderSosForm(); }
});

function renderSosForm() {
  $("sos-urg").querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.u) === sos.urgency));
  $("sos-people").textContent = String(sos.people);
  for (const [id, key] of [["sos-flags", "flags"], ["sos-env", "env"]] as const)
    $(id).querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      const on = !!(sos[key] & Number(b.dataset.b));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  ($("loc-lat") as HTMLInputElement).value = sos.lat ? sos.lat.toFixed(6) : "";
  ($("loc-lon") as HTMLInputElement).value = sos.lon ? sos.lon.toFixed(6) : "";
  $("loc-note").textContent = sos.lat ? `Kaynak: ${LOC_SRC[sos.locSrc]}` : "Konum yoksa adresi durum metnine yaz ve 'Konum' sekmesini dene.";
}

$("sos-analyze").addEventListener("click", () => {
  const r = triage(($("sos-text") as HTMLTextAreaElement).value);
  Object.assign(sos, { urgency: r.urgency, people: r.people, flags: r.flags, env: r.env });
  renderSosForm();
  toast(r.reasons.length ? `Algılanan: ${r.reasons.join(", ")}` : "Belirgin bir yaralanma algılanmadı; işaretleri kendin seçebilirsin");
});

function saveLoc(lat: number, lon: number, src: number) {
  Object.assign(sos, { lat, lon, locSrc: src });
  ls.set("ma-loc", JSON.stringify({ lat, lon, src }));
  renderSosForm();
  renderLocation();
}

$("loc-gps").addEventListener("click", async () => {
  toast("Konum alınıyor…");
  try {
    const f = await getGps();
    saveLoc(f.lat, f.lon, 1);
    toast(`Konum alındı (±${Math.round(f.acc)} m)`);
  } catch (e) {
    toast((e as Error).message);
  }
});
for (const id of ["loc-lat", "loc-lon"])
  $(id).addEventListener("change", () => {
    const lat = parseFloat(($("loc-lat") as HTMLInputElement).value.replace(",", "."));
    const lon = parseFloat(($("loc-lon") as HTMLInputElement).value.replace(",", "."));
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) saveLoc(lat, lon, 4);
  });

// Konuşarak yazma: tarayıcının konuşma tanıma özelliği varsa (bazı tarayıcılarda internet gerektirir)
const SR = (self as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec });
type SpeechRec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void };
const Rec = SR.SpeechRecognition ?? SR.webkitSpeechRecognition;
if (Rec) {
  $("sos-mic").hidden = false;
  $("sos-mic").addEventListener("click", () => {
    const r = new Rec();
    r.lang = "tr-TR";
    r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const ta = $("sos-text") as HTMLTextAreaElement;
      ta.value = (ta.value + " " + t).trim();
      $("sos-analyze").click();
    };
    r.onerror = () => toast("Ses tanınamadı; lütfen yazarak devam et");
    r.start();
    toast("Dinliyorum…");
  });
}

$("sos-send").addEventListener("click", async () => {
  if (!sos.flags && !sos.env && ($("sos-text") as HTMLTextAreaElement).value.trim()) $("sos-analyze").click();
  const id = await mesh.publish(T.SOS, encodeSOS(sos));
  ls.set("ma-last-sos", id);
  renderSosStatus();
  toast("SOS yayına alındı");
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
});

function renderSosStatus() {
  const id = ls.get("ma-last-sos");
  const el = $("sos-status");
  if (!id) return (el.innerHTML = "");
  const ack = mesh.stats.acks[id];
  if (ack) {
    el.innerHTML = `<div class="status ok"><b>Mesajın muhtarlığa ulaştı.</b><br>Kurtarma sırası: ${ack.rank} / ${ack.total}. Enerjini koru; Enkaz sekmesinden bulunma sinyalini açabilirsin.</div>`;
  } else {
    const how = mesh.wsState === "bağlı" ? "Düğüme gönderildi, alındı bilgisi bekleniyor." : "Şu an düğüme bağlı değilsin. Paket telefonunda saklanıyor; yakından geçen bir telefon, QR veya ses yoluyla taşınacak.";
    el.innerHTML = `<div class="status"><b>SOS yayında.</b><br>${how}</div>`;
  }
}

// ---------- Enkaz modu ----------

const stops: Record<string, (() => void) | null> = { beacon: null, morse: null, whistle: null, fsk: null };
const enkLog = (m: string) => {
  const d = document.createElement("div");
  d.textContent = `${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}  ${m}`;
  $("enk-log").prepend(d);
};
function toggle(key: string, btn: HTMLElement, start: () => Promise<() => void> | (() => void)) {
  return async () => {
    if (stops[key]) {
      stops[key]!();
      stops[key] = null;
      btn.classList.remove("on");
      if (!Object.values(stops).some(Boolean)) void keepAwake(false);
      return;
    }
    try {
      stops[key] = await start();
      btn.classList.add("on");
      void keepAwake(true);
    } catch (e) {
      toast(`Başlatılamadı: ${(e as Error).message}`);
    }
  };
}
const saver = () => ($("enk-saver") as HTMLInputElement).checked;

$("enk-beacon").addEventListener("click", toggle("beacon", $("enk-beacon"), () => { enkLog("Bulunma sinyali açık"); return startBeacon({ saver: saver() }); }));
$("enk-morse").addEventListener("click", toggle("morse", $("enk-morse"), () => {
  enkLog("Işıkla SOS açık (ekrana dokununca durur)");
  return startMorseSOS($("flash"));
}));
$("flash").addEventListener("click", () => { stops.morse?.(); stops.morse = null; $("enk-morse").classList.remove("on"); });
$("enk-whistle").addEventListener("click", toggle("whistle", $("enk-whistle"), () => {
  enkLog("Düdük dinleniyor");
  return listenWhistle(() => {
    enkLog("Dışarıdan düdük duyuldu → 15 sn yanıt sinyali");
    if (navigator.vibrate) navigator.vibrate(300);
    const stop = startBeacon();
    setTimeout(stop, 15000);
  });
}));
$("enk-fsk").addEventListener("click", toggle("fsk", $("enk-fsk"), () => {
  const id = ls.get("ma-last-sos");
  const s = id ? mesh.packets.get(id) : null;
  if (!s) throw new Error("önce SOS sekmesinden bir SOS oluştur");
  const data = packAcousticSOS(s.raw);
  let on = true;
  const loop = async () => {
    while (on) {
      enkLog("SOS sesle yayınlanıyor (~7 sn)");
      await playData(data);
      await new Promise((r) => setTimeout(r, saver() ? 60000 : 30000));
    }
  };
  void loop();
  return () => { on = false; };
}));

// ---------- Ağ ----------

function sosRows(): { s: Stored; d: SOS; score: number }[] {
  const now = Date.now() / 1000;
  return mesh
    .list(T.SOS)
    .map((s) => ({ s, d: decodeSOS(s.p.payload)! }))
    .filter((x) => x.d)
    .map((x) => ({ ...x, score: priorityScore(x.d, now - x.s.p.ts) }))
    .sort((a, b) => b.score - a.score);
}

const pillClass = (l: string) => ({ Kritik: "p-kritik", Acil: "p-acil", "Öncelikli": "p-oncelikli" })[l] ?? "p-bekle";

function renderNet() {
  const rows = sosRows();
  $("st-sos").textContent = String(rows.length);
  $("st-total").textContent = String(mesh.packets.size);
  $("st-carried").textContent = String(mesh.stats.carried);
  $("sos-list").innerHTML = rows.length
    ? rows.slice(0, 50).map(({ s, d, score }) => {
        const l = urgencyLabel(score);
        const tags = [...flagList(d.flags, FLAG_LABELS), ...flagList(d.env, ENV_LABELS)];
        const acked = mesh.stats.acks[hex(s.p.id)] ? " · muhtarlıkta ✓" : "";
        const loc = d.lat ? `${d.lat.toFixed(5)}, ${d.lon.toFixed(5)} (${LOC_SRC[d.locSrc] ?? ""})` : "konum yok";
        return `<li><div class="h"><span>${d.people} kişi · aciliyet ${d.urgency}</span><span class="pill ${pillClass(l)}">${l}</span></div>
          <div>${esc(tags.join(", ") || "işaret yok")}</div>
          <div class="m mono">${loc}</div>
          <div class="m">${ago(s.p.ts)} · ${esc(s.via)}${d.env & 128 ? " · sesten çözüldü" : ""}${acked}</div></li>`;
      }).join("")
    : `<li class="muted">Henüz SOS yok. Düğüme bağlanınca veya QR/ses ile paket alınca burada görünür.</li>`;
}

function renderBadge() {
  const b = $("netbadge");
  b.textContent = mesh.wsState === "bağlı" ? `Düğüm: ${mesh.nodeName || "bağlı"}` : mesh.wsState === "bağlanıyor" ? "Bağlanıyor…" : "Düğüm yok";
  b.classList.toggle("on", mesh.wsState === "bağlı");
}

$("node-connect").addEventListener("click", () => {
  let u = ($("node-url") as HTMLInputElement).value.trim();
  if (!u) return;
  if (!/^wss?:\/\//.test(u)) u = `ws://${u.replace(/^https?:\/\//, "")}`;
  if (!u.endsWith("/ws")) u = u.replace(/\/?$/, "/ws");
  ls.set("ma-node", u);
  mesh.connect(u);
});

let stopListen: (() => void) | null = null;
$("ag-listen").addEventListener("click", async () => {
  const btn = $("ag-listen");
  if (stopListen) {
    stopListen();
    stopListen = null;
    btn.classList.remove("on");
    btn.textContent = "Sesten SOS dinle";
    $("ag-level").hidden = true;
    return;
  }
  try {
    stopListen = await listenData(
      async (data) => {
        const id = await mesh.relayAcoustic(data);
        if (id) { toast("Sesten bir SOS çözüldü ve ağa aktarıldı"); renderNet(); }
      },
      (rms) => (($("ag-level").firstElementChild as HTMLElement).style.width = `${Math.min(100, rms * 400)}%`),
    );
    btn.classList.add("on");
    btn.textContent = "Dinlemeyi durdur";
    $("ag-level").hidden = false;
    void keepAwake(true);
  } catch (e) {
    toast(`Mikrofon açılamadı: ${(e as Error).message}`);
  }
});

let qrTimer: ReturnType<typeof setInterval> | null = null;
$("ag-qr-show").addEventListener("click", async () => {
  const box = $("ag-qr");
  if (qrTimer) { clearInterval(qrTimer); qrTimer = null; box.hidden = true; return; }
  const pkts = mesh.list().filter((s) => s.p.type !== T.ACK).sort((a, b) => b.p.ts - a.p.ts).slice(0, 200).map((s) => s.raw);
  if (!pkts.length) return toast("Verilecek paket yok");
  const frames = packetsToQrFrames(pkts, 700);
  box.hidden = false;
  box.innerHTML = `<canvas></canvas><div id="qr-cap"></div>`;
  let i = 0;
  const draw = async () => {
    await QRCode.toCanvas(box.querySelector("canvas")!, frames[i], { errorCorrectionLevel: "L", margin: 2, width: 600 });
    $("qr-cap").textContent = `${pkts.length} paket · kare ${i + 1}/${frames.length} · karşı telefon 'QR tara' ile okusun`;
    i = (i + 1) % frames.length;
  };
  await draw();
  if (frames.length > 1) qrTimer = setInterval(draw, 900);
  else qrTimer = setInterval(() => {}, 1e9);
});

$("ag-qr-scan").addEventListener("click", async () => {
  const sc = $("scanner");
  const video = $("scan-video") as HTMLVideoElement;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch (e) {
    return toast(`Kamera açılamadı: ${(e as Error).message}`);
  }
  sc.hidden = false;
  video.srcObject = stream;
  await video.play();
  const cv = document.createElement("canvas");
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  let got = 0;
  let running = true;
  const seen = new Set<string>();
  const close = () => { running = false; stream.getTracks().forEach((t) => t.stop()); sc.hidden = true; renderNet(); };
  $("scan-close").onclick = close;
  const tick = async () => {
    if (!running) return;
    if (video.videoWidth) {
      cv.width = Math.min(800, video.videoWidth);
      cv.height = Math.round((cv.width / video.videoWidth) * video.videoHeight);
      g.drawImage(video, 0, 0, cv.width, cv.height);
      const code = jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
      if (code && !seen.has(code.data)) {
        seen.add(code.data);
        for (const raw of qrFrameToPackets(code.data)) if (await mesh.receive(raw, "qr")) got++;
        $("scan-info").textContent = `${seen.size} kare okundu · ${got} yeni paket`;
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
});

// ---------- Konum ----------

let heading: number | null = null;
let headingOffset = Number(ls.get("ma-head-off") ?? "0");

function renderLocation() {
  $("kn-fix").textContent = sos.lat ? `${sos.lat.toFixed(6)}, ${sos.lon.toFixed(6)} · ${LOC_SRC[sos.locSrc]}` : "—";
  if (!sos.lat) return;
  const s = sunPosition(sos.lat, sos.lon);
  $("kn-sun").textContent = s.altitude > 0
    ? `Güneş şu an ${Math.round(s.azimuth)}° (${dirName(s.azimuth)}), ufuktan ${Math.round(s.altitude)}° yukarıda`
    : "Güneş ufkun altında. Gece Kutup Yıldızı kuzeyi gösterir.";
  if (heading !== null) {
    const h = (heading + headingOffset + 360) % 360;
    $("kn-head").textContent = `Telefonun baktığı yön: ${Math.round(h)}° (${dirName(h)})`;
    $("kn-needle").style.transform = `rotate(${-h}deg)`;
  }
}
$("kn-gps").addEventListener("click", () => $("loc-gps").click());
$("kn-cal").addEventListener("click", async () => {
  if (!sos.lat) return toast("Önce konum al");
  if (!(await askOrientationPermission())) return toast("Yön sensörü izni verilmedi");
  const s = sunPosition(sos.lat, sos.lon);
  if (s.altitude <= 0) return toast("Güneş ufkun altında");
  if (heading === null) return toast("Yön sensörü okunamadı; bir an bekleyip tekrar dene");
  headingOffset = s.azimuth - heading;
  ls.set("ma-head-off", String(headingOffset));
  toast("Pusula güneşe göre düzeltildi");
  renderLocation();
});
watchHeading((h) => { heading = h; renderLocation(); });

// ---------- Rehber ----------

function topicButtons(list: Topic[]) {
  return list.map((t) => `<button type="button" data-t="${t.id}"><b>${esc(t.title)}</b><span>${esc(t.when)}</span></button>`).join("");
}
function renderGuide(q = "") {
  const hits = q ? new Set(searchTopics(q).map((t) => t.id)) : null;
  $("rh-fa").innerHTML = topicButtons(FIRST_AID.filter((t) => !hits || hits.has(t.id)));
  $("rh-ps").innerHTML = topicButtons(POST_SURVIVAL.filter((t) => !hits || hits.has(t.id)));
}
$("rh-search").addEventListener("input", (e) => renderGuide((e.target as HTMLInputElement).value.trim()));
$("v-rehber").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-t]");
  if (b) openTopic(b.dataset.t!);
});
function openTopic(id: string) {
  const t = [...FIRST_AID, ...POST_SURVIVAL].find((x) => x.id === id)!;
  const d = $("rh-detail");
  d.hidden = false;
  d.innerHTML = `<h2>${esc(t.title)}</h2><ol>${t.steps.map((s) => `<li class="${s.warn ? "warn" : ""}">${esc(s.text)}</li>`).join("")}</ol>
    <div class="row"><button class="ghost" id="rh-speak">Sesli oku</button><button class="ghost" id="rh-close">Kapat</button></div>`;
  $("rh-speak").onclick = () => speak(t.steps.map((s, i) => `${i + 1}. ${s.text}`).join(" "));
  $("rh-close").onclick = () => { d.hidden = true; speechSynthesis?.cancel(); };
  d.scrollIntoView({ behavior: "smooth" });
}

// ---------- Pano ----------

let resKind: 0 | 1 = 0;
$("pn-kind").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b) return;
  resKind = Number(b.dataset.k) as 0 | 1;
  $("pn-kind").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
});
$("pn-post").addEventListener("click", async () => {
  const ta = $("pn-text") as HTMLTextAreaElement;
  const text = ta.value.trim();
  if (!text) return;
  await mesh.publish(T.RESOURCE, encodeResource({ kind: resKind, text }));
  ta.value = "";
  renderBoard();
  toast("Panoya eklendi; ağ üzerinden yayılacak");
});

let symMask = 0;
let symN = 1;
$("pn-sym").innerHTML = Object.entries(SYMPTOM_LABELS).map(([b, l]) => `<button type="button" data-b="${b}">${l}</button>`).join("");
$("pn-sym").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!b) return;
  symMask ^= Number(b.dataset.b);
  b.classList.toggle("on", !!(symMask & Number(b.dataset.b)));
});
$("v-pano").querySelector(".stepper")!.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (b) { symN = Math.max(1, Math.min(50, symN + Number(b.dataset.d))); $("pn-sym-n").textContent = String(symN); }
});
$("pn-sym-send").addEventListener("click", async () => {
  if (!symMask) return toast("En az bir belirti seç");
  await mesh.publish(T.SYMPTOM, encodeSymptom(symMask, symN));
  symMask = 0;
  $("pn-sym").querySelectorAll("button").forEach((x) => x.classList.remove("on"));
  toast("Bildirildi. Teşekkürler.");
});

function renderBoard() {
  const ann = mesh.list(T.ANNOUNCE).sort((a, b) => b.p.ts - a.p.ts);
  $("pn-ann").innerHTML = ann.length
    ? ann.map((s) => `<li><div class="h"><span class="verified">✓ İmzalı resmi duyuru</span><span class="m">${ago(s.p.ts)}</span></div><div>${esc(decodeText(s.p.payload))}</div></li>`).join("")
    : `<li class="muted">Henüz resmi duyuru yok. Muhtarlık düğümünün imzasıyla gelen duyurular burada görünür; imzasızlar gösterilmez.</li>`;
  const res = mesh.list(T.RESOURCE).sort((a, b) => b.p.ts - a.p.ts);
  $("pn-res").innerHTML = res.length
    ? res.map((s) => {
        const r = decodeResource(s.p.payload);
        return `<li><div class="h"><span class="pill ${r.kind ? "p-acil" : "p-oncelikli"}">${r.kind ? "Lazım" : "Var"}</span><span class="m">${ago(s.p.ts)}</span></div><div>${esc(r.text)}</div></li>`;
      }).join("")
    : `<li class="muted">Henüz ilan yok.</li>`;
}

// ---------- Başlat ----------

// Uygulama bir düğümden açıldıysa o düğümü hatırla; ağ yokken açıldıysa düğümü aramayı sürdür.
async function autoConnect() {
  const saved = ls.get("ma-node");
  if (saved) {
    ($("node-url") as HTMLInputElement).value = saved;
    return mesh.connect(saved);
  }
  try {
    const r = await fetch("/dugum-bilgi", { cache: "no-store" });
    if (r.ok) {
      const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
      ($("node-url") as HTMLInputElement).value = url;
      ls.set("ma-node", url);
      return mesh.connect(url);
    }
  } catch {
    /* düğüm yok: çevrimdışı mod */
  }
  probeTimer ??= setTimeout(() => { probeTimer = null; if (mesh.wsState === "kapalı") void autoConnect(); }, 15000);
}
let probeTimer: ReturnType<typeof setTimeout> | null = null;
self.addEventListener("online", () => { if (mesh.wsState === "kapalı") void autoConnect(); });

(async () => {
  await mesh.init();
  mesh.on((s, isNew) => {
    if (!isNew) return;
    if (s.p.type === T.ACK) renderSosStatus();
    if (s.p.type === T.ANNOUNCE) toast("Yeni resmi duyuru");
    renderNet();
    if (!$("v-pano").hidden) renderBoard();
  });
  mesh.onStatus(() => { renderBadge(); renderSosStatus(); });
  mesh.onCarried = (n) => toast(`${n} kişinin sesini muhtarlığa taşıdın. Teşekkürler!`);
  renderSosForm();
  renderSosStatus();
  renderGuide();
  renderLocation();
  renderBadge();
  await autoConnect();
  if (navigator.storage?.persist) void navigator.storage.persist();
})();
