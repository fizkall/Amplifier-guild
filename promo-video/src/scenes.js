/* BumperMedia promo — deterministic motion engine.
   window.renderFrame(t) draws the exact frame for time t (seconds).
   All on-screen copy comes from the ORIGINAL script; audio uses the phonetic one. */
(() => {
'use strict';
const W_ = TL.words, CUES = TL.cues;
const END = 180.6;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  out: k => 1 - Math.pow(1 - k, 3),
  out5: k => 1 - Math.pow(1 - k, 5),
  in: k => k * k * k,
  io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  back: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
const P = (t, a, d = .6) => clamp((t - a) / d);          // linear progress
const pe = (t, a, d = .6, e = E.out) => e(P(t, a, d));    // eased progress
const vis = (t, a, b, fi = .45, fo = .45) => Math.min(E.out(P(t, a, fi)), 1 - E.io(P(t, b - fo, fo)));
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const range = n => Array.from({ length: n }, (_, i) => i);
const up = s => s.toLocaleUpperCase('tr-TR');
// word lookup → start time of first word starting with `w` at/after `after`
const W = (w, after = 0) => { const o = W_.find(x => x.s >= after - .01 && x.t.replace(/^'/, '').startsWith(w)); if (!o) throw new Error('word ' + w); return o.s; };

function T(el, p) {
  if (!el) return;
  const st = el.style;
  st.transform = `translate(-50%,-50%) translate3d(${(p.x || 0).toFixed(2)}px,${(p.y || 0).toFixed(2)}px,${(p.z || 0).toFixed(1)}px) rotateX(${(p.rx || 0).toFixed(2)}deg) rotateY(${(p.ry || 0).toFixed(2)}deg) rotateZ(${(p.rz || 0).toFixed(2)}deg) scale(${(p.s ?? 1).toFixed(4)})`;
  if (p.o !== undefined) { st.opacity = clamp(p.o).toFixed(3); st.visibility = p.o <= .002 ? 'hidden' : 'visible'; }
  if (p.b !== undefined) st.filter = p.b > .1 ? `blur(${p.b.toFixed(1)}px)` : '';
}
const at = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;

/* ---------- tiny icon set (stroke SVG) ---------- */
const I = {
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>',
  feed: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  ai: '<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  kanban: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="9.5" y="3" width="5" height="12" rx="1.5"/><rect x="16" y="3" width="5" height="8" rx="1.5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a3 3 0 0 0-2.8-1.5c-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2A3.2 3.2 0 0 1 9 15M12 6v1.5M12 16.5V18"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 5z"/><path d="M3 21l6-6"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
const ico = (n, cls = '') => `<div class="ico ${cls}"><svg viewBox="0 0 24 24">${I[n]}</svg></div>`;

/* =========================================================
   SCENES
   ========================================================= */
const SC = [];
const root = $('#scenes');
function scene(o) { const el = document.createElement('div'); el.className = 'scene'; el.id = o.id; el.innerHTML = o.html; root.appendChild(el); o.el = el; o.init && o.init(el); SC.push(o); }
const FX = $('#fx').getContext('2d');

/* ---------- S1 — Sezon başladı / kaos ---------- */
const S1_TITLES = ['Chief Delphi — Swerve help?', 'TBA · Event Rankings', 'Game Manual.pdf', 'Scouting_v7_FINAL.xlsx', 'Discord · #mekanik', 'YouTube · Qual 42', 'Drive · CAD export', 'Google · bumper kuralı', 'Forum · Re: Re: Re:', 'Sheets · Picklist', 'WPILib Docs', 'Q&A · Rule clarification', 'Mail · Sponsor', 'Calendar · Build', 'Notion · Görevler', 'Stack Overflow'];
scene({
  id: 's1', a: 0, b: 14.0, ch: ['01', 'SEZON MODU'],
  html: `
  <div class="abs" id="s1title" style="text-align:center"><div class="big glow">${up('Sezon')}</div><div class="big grad">${up('başladı')}</div></div>
  <div class="abs glass-card" id="s1timer" style="width:520px;padding:26px 30px">
    <div class="lbl"><span class="dot r"></span>&nbsp; BUILD SEASON · KALAN</div>
    <div class="mono" id="s1tv" style="white-space:nowrap;font:700 76px/1.1 'JetBrains Mono';margin:12px 0 10px;color:#fff;text-shadow:0 0 30px rgba(255,59,92,.6)">00:00:00</div>
    <div class="ttl" style="font-size:24px;color:var(--tx2)">Dakikalar yarışla yarışıyor</div>
  </div>
  <div class="abs mono" id="s1drill" style="font-size:16px;letter-spacing:.2em;color:var(--gold)">◢ MATKAP · 2400 RPM</div>
  <div class="abs glass-card browser" id="s1br"><div class="tabs" id="s1tabs">${range(42).map(i => `<div class="tab ${i === 0 ? 'act' : ''}">${S1_TITLES[i % S1_TITLES.length]}</div>`).join('')}</div>
    <div class="addr mono">https://<span id="s1url">…</span></div>
    <div style="padding:26px 30px">${range(9).map(i => `<div class="sk" style="width:${40 + rnd(i + 3) * 55}%"></div>`).join('')}</div></div>
  <div id="s1wins">${range(16).map(i => `<div class="abs glass-card win"><div class="wb"><i></i><i></i><i></i>&nbsp;${S1_TITLES[(i + 3) % 16]}</div><div class="wc">${range(5).map(k => `<div class="sk" style="width:${30 + rnd(i * 9 + k) * 65}%;height:10px"></div>`).join('')}</div></div>`).join('')}</div>
  <div class="abs kwbig" id="s1q" style="line-height:1.1;font-size:100px"><span class="glow">Kaybolup gitmek</span><br><span class="grad">üzere misin?</span></div>`,
  init(el) { this.tabs = $$('.tab', el); this.wins = $$('#s1wins .win', el); },
  update(t) {
    const tp = pe(t, .05, 1.1, E.out5), mv = pe(t, 4.0, 1.0, E.io);
    T($('#s1title'), { y: lerp(-80, -620, mv) + (1 - tp) * 30, s: lerp(1.25, 1, tp) * lerp(1, .42, mv), b: (1 - tp) * 24, o: tp * (1 - pe(t, 9.2, .5)) });
    // drill sparks HUD
    T($('#s1drill'), { x: 230, y: 380, o: vis(t, 4.25, 6.9, .2, .3) });
    // timer
    const tt = pe(t, 6.55, .6, E.back);
    T($('#s1timer'), { x: 0, y: -60, s: .85 + .15 * tt, o: vis(t, 6.55, 9.6, .3, .5), ry: 18 * (1 - tt) });
    const secs = Math.max(0, 6 * 7 * 24 * 3600 - Math.max(0, t - 6.55) * 41000);
    const h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60, s = Math.floor(secs) % 60;
    $('#s1tv').textContent = `${Math.floor(h / 24)}G ${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    // browser with multiplying tabs
    const bp = pe(t, 9.2, .7, E.back);
    const jit = P(t, 11.9, 1.4) * 10 + P(t, 13.15, .4) * 30;
    const jx = (rnd(Math.floor(t * 30)) - .5) * jit, jy = (rnd(Math.floor(t * 30) + 7) - .5) * jit;
    T($('#s1br'), { x: jx, y: 60 + jy, s: .82 * lerp(.8, 1, bp) * (1 - .1 * P(t, 12, 2)), o: bp * (1 - pe(t, 13.55, .4)), rx: 10 * (1 - bp) });
    const n = 1 + Math.floor(41 * E.io(P(t, 9.4, 3.2)));
    const tw = Math.min(230, Math.max(18, (1088 - n * 4) / n));
    this.tabs.forEach((tb, i) => { tb.style.display = i < n ? 'block' : 'none'; tb.style.width = tw + 'px'; tb.style.color = tw < 70 ? 'transparent' : ''; });
    $('#s1url').textContent = S1_TITLES[(n - 1) % S1_TITLES.length].toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.com';
    this.wins.forEach((w, i) => {
      const ts = 10.0 + i * .19, p = pe(t, ts, .45, E.back);
      const x = (rnd(i * 3.1) - .5) * 820, y = (rnd(i * 7.7) - .5) * 1380;
      const dr = (t - ts) * 18;
      T(w, { x: x + Math.cos(i) * dr + jx * 1.4, y: y + Math.sin(i * 2) * dr + jy * 1.4, z: -200 + rnd(i) * 300, rz: (rnd(i * 5) - .5) * 26 + (t - ts) * (rnd(i) - .5) * 8, s: p * (.8 + rnd(i * 2) * .4), o: p * (1 - pe(t, 13.5, .45)) });
    });
    const q = pe(t, 12.35, .5);
    T($('#s1q'), { y: 40 + jy * .5, x: jx * .5, s: lerp(1.15, 1, q), o: q * (1 - pe(t, 13.7, .3)), b: (1 - q) * 14 });
    $('#s1q').style.textShadow = t > 12.4 ? `${(4 + jit * .3).toFixed(1)}px 0 rgba(255,0,90,.55), ${(-4 - jit * .3).toFixed(1)}px 0 rgba(243,245,247,.6)` : '';
    // sparks
    if (t > 4.2 && t < 7.4) {
      const ox = 820, oy = 1360;
      FX.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 160; k++) {
        const tb = 4.25 + rnd(k) * 2.5, age = t - tb;
        if (age < 0 || age > .75) continue;
        const ang = -Math.PI * (.15 + rnd(k * 3) * .7), sp = 380 + rnd(k * 5) * 620;
        const x = ox + Math.cos(ang) * sp * age, y = oy + Math.sin(ang) * sp * age + 900 * age * age;
        const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp + 1800 * age;
        FX.strokeStyle = k % 3 ? `rgba(255,${180 + (k % 60)},60,${1 - age / .75})` : `rgba(255,255,255,${1 - age / .75})`;
        FX.lineWidth = 2.2; FX.beginPath(); FX.moveTo(x, y); FX.lineTo(x - vx * .02, y - vy * .02); FX.stroke();
      }
      FX.globalCompositeOperation = 'source-over';
    }
  },
});

/* ---------- S2 — Dağınık kaynaklar ---------- */
scene({
  id: 's2', a: 13.95, b: 24.25, ch: ['02', 'DAĞINIK KAYNAKLAR'],
  html: `
  <div class="abs glass-card pane" id="s2a">${ico('db')}<div class="ttl">Veri çekmek için bir yere</div><div class="sub">API, CSV, ekran görüntüsü…</div>
    <div style="margin-top:14px">${range(6).map(i => `<div class="row" style="height:46px;border-bottom:1px solid var(--br)"><span class="mono" style="color:var(--tx3);width:60px">#${1000 + Math.floor(rnd(i) * 8999)}</span><div class="sk" style="flex:1;margin:0"></div><span class="mono s2load" style="color:var(--gold);width:40px;text-align:right">···</span></div>`).join('')}</div></div>
  <div class="abs glass-card pane" id="s2b">${ico('chat', 'p')}<div class="ttl">Teknik tartışmalar için karmaşık forumlara</div>
    <div style="margin-top:14px">${['Re: Re: swerve module drift?', 'Bumper rule interpretation (long)', 'Off-topic: CAD vs. reality', 'Re: [Q&A] contact rule?', 'Why does our arm oscillate'].map((s, i) => `<div class="thread"><div class="av"></div><div>${s}<br><em>${Math.floor(40 + rnd(i) * 300)} replies · page ${1 + Math.floor(rnd(i + 9) * 12)}</em></div></div>`).join('')}</div></div>
  <div class="abs glass-card pane" id="s2c">${ico('book', 'p')}<div class="ttl" style="max-width:420px">Yüzlerce sayfalık İngilizce belgelere</div>
    <div style="position:absolute;right:30px;top:24px;width:380px;height:310px" id="s2pages">${range(6).map(i => `<div class="page"><b></b>${range(11).map(k => `<i style="width:${55 + rnd(i * 11 + k) * 45}%"></i>`).join('')}</div>`).join('')}
      <div class="chip p" id="s2en" style="position:absolute;right:-6px;top:-14px;z-index:5">EN · ENGLISH ONLY</div>
      <div class="mono" id="s2pg" style="position:absolute;right:0;bottom:-6px;z-index:5;background:rgba(8,8,18,.85);padding:6px 10px;border-radius:8px;font-size:22px;color:#d6d6d6">PAGE 1</div></div></div>
  <div class="abs kwbig" id="s2q" style="font-size:110px"><span class="glow">${up('Yorulmadın mı?')}</span></div>`,
  update(t) {
    const cards = ['#s2a', '#s2b', '#s2c'], ts = [W('Veri'), W('teknik'), W('kurallar')];
    const tired = pe(t, W('yorulmadın') - .1, .8, E.io);
    cards.forEach((c, i) => {
      const p = pe(t, ts[i] - .15, .7, E.back);
      const fl = Math.sin(t * 1.3 + i * 2) * 8;
      T($(c), { x: 0, y: [-500, -110, 280][i] + lerp(160, 0, p) + fl * .6 + tired * 40, rx: lerp(35, 0, p) + tired * 16, ry: 0, s: lerp(.85, 1, p) * (1 - tired * .1), o: p * (1 - tired * .55) });
      $(c).style.filter = tired > .01 ? `saturate(${1 - tired * .8}) brightness(${1 - tired * .3})` : '';
    });
    $$('.s2load').forEach((e, i) => e.textContent = ['···', '··', '·', 'ERR'][Math.floor(t * 4 + i) % 4]);
    $$('#s2pages .page').forEach((pg, i) => {
      const fan = pe(t, W('yüzlerce') + i * .06, .6);
      T(pg, { x: 0, y: 0, o: 1 }); pg.style.left = (20 + i * 18 * fan) + 'px'; pg.style.top = (10 + i * 6 * fan) + 'px';
      pg.style.transform = `rotate(${(i - 3) * 4 * fan}deg)`;
    });
    $('#s2pg').textContent = 'PAGE ' + Math.max(1, Math.floor(1 + 147 * E.io(P(t, W('yüzlerce'), 3.2)))) + ' / 148';
    $('#s2en').style.opacity = pe(t, W('İngilizce'), .3);
    $('#s2en').style.transform = `scale(${lerp(1.6, 1, pe(t, W('İngilizce'), .35, E.back))})`;
    const q = pe(t, W('yorulmadın'), .45, E.back);
    T($('#s2q'), { y: -110, s: lerp(1.4, 1, q), o: q * vis(t, 0, 24.2, .1, .3) });
    $('#s2q').style.color = '#ff8ea2';
  },
});

/* ---------- S3 — Küresel ağ ---------- */
const CITIES = [[39, 35, 1], [41, 29, 1], [38, 27, 1], [40, 33, 1], [37, 30, 1], [42, -71], [40, -74], [37, -122], [34, -118], [42, -83], [30, -97], [47, -122], [33, -84], [45, -73], [43, -79], [19, -99], [-23, -46], [32, 35], [31, 121], [-33, 151], [52, 5], [51, 0], [35, 139], [25, -80], [39, -104], [44, -93], [29, -95], [41, -87]];
scene({
  id: 's3', a: 24.2, b: 31.85, ch: ['03', 'KÜRESEL AĞ'],
  html: `
  <div class="abs" id="s3k1" style="text-align:center">
    <div class="lbl" style="margin-bottom:16px">◉ GLOBAL TELEMETRY</div>
    <div class="kw" style="font-size:64px">Türkiye’deki</div>
    <div class="kw" style="font-size:64px;color:var(--tx2)">ve dünyadaki</div>
    <div class="kw grad" style="font-size:64px;margin-top:8px">yüzlerce FRC takımı</div>
    <div class="mono" id="s3count" style="margin-top:22px;font-size:20px;color:var(--cyan2);letter-spacing:.12em"></div>
  </div>
  <div class="abs kwbig" id="s3q" style="font-size:76px;text-align:center;line-height:1.15">O gizli dijital güç<br><span class="grad glow">nerede saklı?</span></div>
  <div class="abs mono" id="s3tr" style="font-size:16px;color:var(--gold);letter-spacing:.2em">▲ TR · İSTANBUL / ANKARA / İZMİR</div>`,
  init() {
    this.pts = range(1100).map(i => { const y = 1 - (i / 1099) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; return [Math.cos(th) * r, y, Math.sin(th) * r]; });
  },
  update(t, lt) {
    const v = vis(t, this.a, this.b, .5, .4);
    const k1 = pe(t, 24.35, .7);
    T($('#s3k1'), { x: 0, y: 260, o: k1 * (1 - pe(t, W('gizli') - .3, .5)) * v, b: (1 - k1) * 10 });
    const cnt = Math.floor(E.io(P(t, W('yüzlerce', 26), 1.6)) * 60);
    $('#s3count').textContent = range(Math.min(6, Math.ceil(cnt / 10))).map(i => 'TEAM ' + String(1000 + Math.floor(rnd(i * 17 + Math.floor(t * 3)) * 8999))).join(' · ');
    const q = pe(t, W('gizli') - .2, .7);
    T($('#s3q'), { y: 0, o: q * v, s: lerp(1.1, 1, q), b: (1 - q) * 12 });
    T($('#s3tr'), { x: 0, y: -680, o: vis(t, W('Türkiye’deki'), W('gizli'), .3, .4) * v });
    // globe
    const dimmed = pe(t, W('gizli') - .3, .8);
    const cx = 540, cy = lerp(700, 960, dimmed), R = lerp(390, 420, dimmed);
    const rot = t * .35 + 2.2, tilt = -.35;
    const proj = (x, y, z) => { const X = x * Math.cos(rot) + z * Math.sin(rot), Z = -x * Math.sin(rot) + z * Math.cos(rot); const Y = y * Math.cos(tilt) - Z * Math.sin(tilt), Z2 = y * Math.sin(tilt) + Z * Math.cos(tilt); return [cx + X * R, cy - Y * R, Z2]; };
    const gin = pe(t, 24.2, 1.2) * v;
    FX.save();
    for (const [x, y, z] of this.pts) {
      const [px, py, pz] = proj(x, y, z); const a = (pz + 1) / 2;
      FX.fillStyle = `rgba(${lerp(120, 245, a) | 0},${lerp(120, 245, a) | 0},${lerp(120, 245, a) | 0},${(.12 + .6 * a) * gin * (1 - dimmed * .65)})`;
      FX.fillRect(px - 1.4, py - 1.4, 2.8 * (.5 + a * .7), 2.8 * (.5 + a * .7));
    }
    const ll = (la, lo) => { const p = la * Math.PI / 180, l = lo * Math.PI / 180; return [Math.cos(p) * Math.cos(l), Math.sin(p), -Math.cos(p) * Math.sin(l)]; };
    const tr = proj(...ll(39, 35));
    const spread = pe(t, W('dünyadaki') - .1, 2.2, E.io);
    FX.globalCompositeOperation = 'lighter';
    CITIES.forEach(([la, lo, isTR], i) => {
      const c = proj(...ll(la, lo)); if (c[2] < -.25) return;
      const show = isTR ? pe(t, W('Türkiye’deki'), .4) : pe(t, W('dünyadaki') + i * .05, .3);
      const pulse = .5 + .5 * Math.sin(t * 5 + i);
      FX.fillStyle = isTR ? `rgba(255,184,0,${show * gin})` : `rgba(255,255,255,${show * gin * (1 - dimmed * .5)})`;
      FX.beginPath(); FX.arc(c[0], c[1], isTR ? 6 : 4, 0, 7); FX.fill();
      FX.strokeStyle = isTR ? `rgba(255,184,0,${show * (1 - pulse) * .8 * gin})` : `rgba(243,245,247,${show * (1 - pulse) * .5 * gin})`;
      FX.lineWidth = 2; FX.beginPath(); FX.arc(c[0], c[1], 6 + pulse * 18, 0, 7); FX.stroke();
      if (!isTR && spread > 0) {
        const k = clamp(spread * 1.6 - i * .03); if (k <= 0) return;
        const mx = (tr[0] + c[0]) / 2, my = (tr[1] + c[1]) / 2 - Math.hypot(c[0] - tr[0], c[1] - tr[1]) * .35;
        FX.strokeStyle = `rgba(243,245,247,${.55 * gin * (1 - dimmed * .6)})`; FX.lineWidth = 1.6; FX.beginPath();
        for (let s = 0; s <= 24 * k; s++) { const u = s / 24, x = (1 - u) * (1 - u) * tr[0] + 2 * (1 - u) * u * mx + u * u * c[0], y = (1 - u) * (1 - u) * tr[1] + 2 * (1 - u) * u * my + u * u * c[1]; s ? FX.lineTo(x, y) : FX.moveTo(x, y); }
        FX.stroke();
      }
    });
    if (dimmed > 0) { // scanning beam
      const a = t * 2.6; FX.fillStyle = `rgba(243,245,247,${.16 * dimmed * v})`;
      FX.beginPath(); FX.moveTo(cx, cy); FX.arc(cx, cy, R * 1.15, a, a + .5); FX.closePath(); FX.fill();
    }
    FX.restore();
  },
});

/* ---------- S4 — Reveal ---------- */
scene({
  id: 's4', a: 31.85, b: 40.9, ch: ['04', 'SİSTEM BAŞLATILIYOR'],
  html: `
  <div class="abs" id="s4box" style="width:900px;height:1240px">${['t', 'r', 'b', 'l'].map(s => `<i class="s4e" data-s="${s}" style="position:absolute;background:linear-gradient(90deg,var(--cyan),var(--violet));box-shadow:0 0 18px var(--cyan);${s === 't' || s === 'b' ? `left:0;right:0;height:3px;${s === 't' ? 'top' : 'bottom'}:0` : `top:0;bottom:0;width:3px;${s === 'l' ? 'left' : 'right'}:0`}"></i>`).join('')}</div>
  <div class="abs lbl" id="s4boot" style="font-size:18px;text-align:center;line-height:1.8">▸ ROBOTİK TOPLULUĞU<br>SINIRLAR KALDIRILIYOR</div>
  <svg class="abs" id="s4rings" width="760" height="760" viewBox="0 0 760 760" style="overflow:visible">
    <circle cx="380" cy="380" r="300" fill="none" stroke="rgba(243,245,247,.55)" stroke-width="2" stroke-dasharray="6 14"/>
    <circle cx="380" cy="380" r="340" fill="none" stroke="rgba(170,170,170,.5)" stroke-width="3" stroke-dasharray="180 60 20 60"/>
    <circle cx="380" cy="380" r="370" fill="none" stroke="rgba(243,245,247,.25)" stroke-width="1"/>
  </svg>
  <div class="abs" id="s4logo" style="width:300px;height:290px;filter:drop-shadow(0 0 30px rgba(255,255,255,.25))"><span class="logo-mark" style="width:100%;height:100%"></span></div>
  <div class="abs chip glowing-border" id="s4chip" style="font-size:26px;padding:14px 28px;position:absolute">SUPER APP</div>
  <div class="abs kw" id="s4word" style="font-size:132px;letter-spacing:-.03em"><span style="color:#fff">Bumper</span><span class="grad">Media</span></div>
  <div class="abs mono" id="s4url" style="font-size:24px;letter-spacing:.3em;color:var(--tx2)">BUMPERMEDIA.ONLINE</div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .2);
    const bx = pe(t, W('Gelin'), .6), br = pe(t, W('sınırları') + .2, 1.1, E.in);
    $$('.s4e').forEach((e, i) => {
      const s = e.dataset.s, d = br * 1300;
      e.style.transform = s === 't' ? `translateY(${-d}px) scaleX(${bx})` : s === 'b' ? `translateY(${d}px) scaleX(${bx})` : s === 'l' ? `translateX(${-d * 1.6}px) scaleY(${bx})` : `translateX(${d * 1.6}px) scaleY(${bx})`;
      e.style.opacity = 1 - br;
    });
    T($('#s4box'), { o: v, y: -40 });
    T($('#s4boot'), { o: vis(t, W('robotik', 31), W('Super'), .3, .3) * v, y: 0 });
    const rg = pe(t, W('Super') - .4, 1.2, E.out5);
    const zoom = pe(t, 40.15, .75, E.in);
    const $r = $('#s4rings'); $r.style.transform = `translate(-50%,-50%) translateY(-60px) scale(${(lerp(.4, 1, rg) * (1 + zoom * 5)).toFixed(3)}) rotate(${t * 22}deg)`; $r.style.opacity = rg * v * (1 - zoom);
    const lg = pe(t, W('BumperMedia’ya') - .2, .9, E.back);
    const push = P(t, W('yakından'), 1.6) * .08;
    T($('#s4logo'), { y: lerp(-60, -150, pe(t, W('BumperMedia’ya') + .5, .7, E.io)), s: lerp(.3, 1, lg) * (1 + push) * (1 + zoom * 6), o: lg * v * (1 - zoom * .9) });
    const ch = pe(t, W('Super') - .05, .5, E.back);
    T($('#s4chip'), { y: lerp(-60, -360, pe(t, W('BumperMedia’ya') - .2, .7, E.io)), s: lerp(1.5, 1, ch) * (1 - zoom * .5), o: ch * v * (1 - zoom) });
    const wd = pe(t, W('BumperMedia’ya') + .3, .8, E.out5);
    T($('#s4word'), { y: 110, s: lerp(.9, 1, wd) * (1 + push) * (1 + zoom * 3), o: wd * v * (1 - zoom), b: (1 - wd) * 16 + zoom * 20 });
    $('#s4word').style.letterSpacing = lerp(.2, -.03, wd) + 'em';
    T($('#s4url'), { y: 225, o: pe(t, W('derinlemesine') - .4, .6) * v * (1 - zoom) });
    if (t > W('BumperMedia’ya') && t < 40.9) { // burst
      const k = P(t, W('BumperMedia’ya') - .1, 1.4); FX.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 90; i++) { const a = rnd(i) * 6.283, d = E.out(k) * (300 + rnd(i * 3) * 700); FX.fillStyle = i % 2 ? `rgba(243,245,247,${1 - k})` : `rgba(170,170,170,${1 - k})`; FX.fillRect(540 + Math.cos(a) * d * .7, 810 + Math.sin(a) * d, 3, 3); }
      FX.globalCompositeOperation = 'source-over';
    }
  },
});

/* ---------- S5 — Ekosistem ---------- */
const MODS = [['feed', 'Sosyal Akış', 'FEED'], ['team', 'Takım Yönetimi', 'TEAM OPS'], ['target', 'Scouting Intel', 'SCOUT'], ['ai', 'AI Asistan', 'GAME MANUAL'], ['compass', 'Takım Keşfi', 'DISCOVER'], ['doc', 'Dokümanlar', 'DOCS'], ['kanban', 'Kanban', 'TASKS'], ['coin', 'Finans', 'BUDGET']];
scene({
  id: 's5', a: 40.85, b: 61.25, ch: ['05', 'EKOSİSTEM'],
  html: `
  <div class="abs kw" id="s5brand" style="font-size:54px"><span style="color:#fff">Bumper</span><span class="grad">Media;</span></div>
  <div class="abs blog" id="s5blog"><div class="bh">My Robotics Blog</div><div class="bb"><div style="font-size:26px;font-weight:700;margin-bottom:10px">Haberler · Sayfa 1</div>${range(10).map(i => `<i style="width:${50 + rnd(i * 4) * 50}%"></i>`).join('')}</div></div>
  <div class="abs kw" id="s5neg" style="font-size:60px;text-align:center;line-height:1.3"><span id="s5strike" style="position:relative;color:var(--tx2)">statik bir blog sitesi<i style="position:absolute;left:-10px;top:52%;height:6px;background:var(--red);box-shadow:0 0 18px var(--red);border-radius:3px"></i></span><br><span style="color:var(--red)">değil.</span></div>
  <div class="abs" id="s5tl" style="width:760px;height:1100px">
    <div style="position:absolute;left:120px;top:150px;width:3px;height:900px;background:rgba(255,255,255,.1)"></div>
    <div id="s5fill" style="position:absolute;left:120px;top:150px;width:3px;background:linear-gradient(180deg,var(--cyan),var(--violet));box-shadow:0 0 16px var(--cyan)"></div>
    <div id="s5badges" style="position:absolute;left:0;right:0;top:20px;display:flex;justify-content:center;gap:18px"><span class="chip" id="s5frc" style="font-size:28px">FRC</span><span class="chip p" id="s5ftc" style="font-size:28px">FTC</span></div>
    ${[['İlk imalat günü', 'ATÖLYE · DAY 1', 0], ['Sahadaki', 'SAHA · MAÇLAR', .36], ['Şampiyonluk', 'ELEME · FİNAL', .66], ['İttifak seçimleri', 'ALLIANCE SELECTION', 1]].map(([a, b, x], i) => `<div class="s5n" style="position:absolute;left:121px;top:${150 + x * 900}px"><div class="tlnode" style="position:absolute;left:-15px;top:-15px"></div><div style="position:absolute;left:50px;top:-22px;text-align:left;white-space:nowrap"><div class="tllabel" style="text-align:left;font-size:40px">${a}</div><div class="tlsub" style="text-align:left">${b}</div></div></div>`).join('')}
    <div id="s5bot" style="position:absolute;left:121px;top:150px;transform:translate(-50%,-50%)"><div class="orb" style="width:30px;height:30px"></div></div>
  </div>
  <div class="abs" id="s5core" style="width:260px;height:260px">
    <div class="orb" style="position:absolute;inset:60px"></div>
    <div class="ring" style="inset:20px"></div><div class="ring" style="inset:0;border-color:rgba(170,170,170,.45);border-style:dashed"></div>
  </div>
  <div class="abs kw" id="s5brain" style="font-size:40px;text-align:center"><div class="lbl" style="margin-bottom:12px">CORE</div>Tüm operasyonel <span class="grad">beyin</span></div>
  <div class="abs glowing-border" id="s5roof" style="width:760px;height:800px;border-radius:30px;background:rgba(10,10,22,.35)"><div class="lbl" style="position:absolute;left:30px;top:-34px">▣ TEK ÇATI ALTINDA</div></div>
  ${MODS.map(([ic, n, s], i) => `<div class="abs glass-card mod s5m">${ico(ic, i % 2 ? 'p' : '')}<div><div class="mn">${n}</div><div class="ms">${s}</div></div></div>`).join('')}
  <div class="abs kw" id="s5eco" style="font-size:76px;text-align:center;line-height:1.1">Devasa bir<br><span class="grad glow">teknoloji ekosistemi</span></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .5);
    // A — not a static blog
    const bA = 1 - pe(t, W('Bir', 45.9) - .2, .5);
    T($('#s5brand'), { y: -560, o: pe(t, 40.95, .5) * v * bA });
    const bl = pe(t, W('statik') - 1.2, .7, E.back), brk = pe(t, W('değil') + .1, .7, E.in);
    T($('#s5blog'), { y: lerp(-180, 900, brk), rz: -4 + brk * 25, rx: 12, s: lerp(.8, .9, bl), o: bl * v * (1 - brk) });
    const ng = pe(t, W('statik') - .1, .45);
    T($('#s5neg'), { y: 260, o: ng * v * bA });
    $('#s5strike i').style.width = `calc(${pe(t, W('değil') - .15, .35) * 100}% + 20px)`;
    // B — season timeline
    const tlIn = pe(t, W('Bir', 45.9), .6), tlOut = pe(t, W('ihtiyaç') - .1, .7, E.io);
    T($('#s5tl'), { x: 90, y: lerp(-40, -500, tlOut), s: lerp(1, .7, tlOut), o: tlIn * v * (1 - tlOut) });
    $('#s5frc').style.opacity = pe(t, W('FRC', 46), .3); $('#s5ftc').style.opacity = pe(t, W('FTC'), .3);
    const fp = E.io(P(t, W('ilk'), W('seçimlerine') + .6 - W('ilk')));
    $('#s5fill').style.height = fp * 900 + 'px';
    $('#s5bot').style.top = (150 + fp * 900) + 'px';
    const nt = [W('ilk'), W('sahadaki'), W('şampiyonluk'), W('ittifakı')];
    $$('.s5n').forEach((n, i) => { const p = pe(t, nt[i] - .1, .5, E.back); n.style.opacity = p; n.style.transform = `translateX(${(1 - p) * 40}px)`; });
    // C — core + modules → one roof
    const co = pe(t, W('operasyonel') - .3, .8, E.back), roof = pe(t, W('tek', 56) - .1, 1.2, E.io);
    T($('#s5core'), { y: lerp(-120, -560, roof), s: lerp(.2, 1, co) * lerp(1, .55, roof), o: co * v });
    T($('#s5brain'), { y: lerp(350, -300, roof), o: co * v * (1 - roof) });
    T($('#s5roof'), { y: 110, s: lerp(1.15, 1, roof), o: roof * v });
    const ecoIn = pe(t, W('devasa') - .1, .7);
    T($('#s5eco'), { y: -470, o: ecoIn * v, s: lerp(1.1, 1, ecoIn), b: (1 - ecoIn) * 10 });
    if (ecoIn > 0) T($('#s5core'), { y: -560 - ecoIn * 60, s: lerp(.55, .38, ecoIn), o: co * v * (1 - ecoIn) });
    $$('.s5m').forEach((m, i) => {
      const a = i / MODS.length * 6.283 + t * .55, ox = Math.cos(a) * 330, oz = Math.sin(a) * 300, oy = Math.sin(a) * 330 - 120;
      const gx = (i % 2 - .5) * 335, gy = 110 + (Math.floor(i / 2) - 1.5) * 180;
      const p = pe(t, W('operasyonel') + i * .07, .6, E.back);
      const sc = lerp(.7 + (oz + 300) / 600 * .45, 1, roof);
      T(m, { x: lerp(ox, gx, roof), y: lerp(oy, gy, roof), z: lerp(oz, 0, roof), s: p * sc, o: p * v * lerp(.55 + (oz + 300) / 600 * .45, 1, roof) });
    });
  },
});

/* ---------- S6 — Eski düzen: Chief Delphi & The Blue Alliance ---------- */
scene({
  id: 's6', a: 61.25, b: 67.7, ch: ['06', 'ESKİ DÜZEN'],
  html: `
  <div class="abs ice" id="s6a"><div class="ih">Chief Delphi <span style="font-size:18px;opacity:.6">❄ FORUM</span></div><div class="ib">${['Swerve module calibration drift after impact', 'Interpretation of G-series contact rules', 'Is this bumper construction legal?', 'Arm PID tuning — what are we missing?', 'Off-season: lessons learned (very long)'].map((s, i) => `<div class="thread" style="color:#b9c4d2"><div class="av" style="background:#45505e"></div><div>${s}<br><em>${Math.floor(50 + rnd(i * 2) * 400)} replies · last post ${Math.floor(1 + rnd(i) * 9)}h</em></div></div>`).join('')}</div></div>
  <div class="abs ice" id="s6b"><div class="ih">The Blue Alliance <span style="font-size:18px;opacity:.6">❄ DATA</span></div><div class="ib"><table><tr><th>MATCH</th><th>RED ALLIANCE</th><th>BLUE ALLIANCE</th><th>SCORE</th></tr>${range(8).map(i => `<tr><td>Qual ${12 + i}</td><td>${range(3).map(k => 1000 + Math.floor(rnd(i * 7 + k) * 8999)).join(' ')}</td><td>${range(3).map(k => 1000 + Math.floor(rnd(i * 5 + k + 50) * 8999)).join(' ')}</td><td>${Math.floor(40 + rnd(i) * 90)}–${Math.floor(40 + rnd(i + 3) * 90)}</td></tr>`).join('')}</table></div></div>
  <div class="abs stamp" id="s6t1" style="color:#e6e6e6">${up('soğuk')}</div>
  <div class="abs stamp" id="s6t2" style="color:#cfcfcf">${up('karmaşık')}</div>
  <div class="abs stamp" id="s6t3" style="color:#ff8ea2">${up('dil bariyeri')}</div>
  <div class="abs kw" id="s6k" style="font-size:72px">Bir kenara <span class="grad glow">bırakın!</span></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .35);
    const away = pe(t, W('kenara') - .2, .9, E.in);
    const ia = pe(t, 61.3, .7, E.out5), ib = pe(t, W('ve', 62.3) - .2, .7, E.out5);
    T($('#s6a'), { x: -30 - away * 1300, y: -360, ry: 12, rz: -2, s: .86 * lerp(.85, 1, ia), o: ia * v, b: away * 12 });
    T($('#s6b'), { x: 30 + away * 1300, y: 160, ry: -12, rz: 2, s: .86 * lerp(.85, 1, ib), o: ib * v, b: away * 12 });
    [['#s6t1', W('soğuk'), -170, -480, -8], ['#s6t2', W('karmaşık', 63.9), 150, -120, 6], ['#s6t3', W('bariyeriyle') - .2, -20, 280, -3]].forEach(([id, ts, x, y, r]) => {
      const p = pe(t, ts - .05, .35, E.back);
      T($(id), { x, y, rz: r, s: lerp(2.2, 1, p) * (1 - away * .3), o: p * v * (1 - away) });
      $(id).style.background = 'rgba(5,6,14,.75)';
    });
    const k = pe(t, W('kenara') - .1, .5);
    T($('#s6k'), { y: -60, o: k * v, s: lerp(.8, 1, k) });
    if (t < 67.6) { // frost particles
      for (let i = 0; i < 70; i++) { const x = (rnd(i) * 1080 + 2160 + t * 20 * (rnd(i * 2) - .5) * 4) % 1080, y = (rnd(i * 3) * 1920 + t * 30) % 1920; FX.fillStyle = `rgba(255,255,255,${.25 * v * (1 - away)})`; FX.fillRect(x, y, 2, 2); }
    }
  },
});

/* ---------- S7 — Scouting Intel ---------- */
const RADAR_AX = ['AUTO', 'TELEOP', 'ENDGAME', 'DEFANS', 'HIZ', 'GÜVEN'];
const RADAR_V = [.92, .85, .9, .38, .78, .7];
const PICK = [['7536', 'Wolftech', 96], ['6838', 'Team A', 88], ['8159', 'Team B', 84], ['9032', 'Team C', 79], ['6014', 'Team D', 71]];
scene({
  id: 's7', a: 67.65, b: 88.05, ch: ['07', 'SCOUTING INTEL'],
  html: `
  <div class="abs" id="s7head" style="display:flex;flex-direction:column;align-items:center;gap:16px">
    <div class="glowing-border chip" style="position:relative;font-size:30px;padding:16px 30px">${'◎'} SCOUTING INTEL</div>
    <div class="lbl">BumperMedia’nın gelişmiş modülleri · <span style="color:var(--green)">● CANLI</span></div>
  </div>
  <div class="abs dash" id="s7dash">
    <div class="dc glass-card" id="s7A" style="${at(0, 0, 460, 370)}"><div class="lbl"><span class="dot r"></span>CANLI MAÇ · QUAL 42</div>
      <div class="row" style="justify-content:space-between;margin-top:26px"><div><div class="lbl" style="color:#ff8ea2">KIRMIZI</div><div class="score" id="s7r" style="color:#ff6b86;font-size:76px">0</div></div><div class="mono" style="font-size:28px;color:var(--tx3)">VS</div><div style="text-align:right"><div class="lbl" style="color:#ffffff">MAVİ</div><div class="score" id="s7b" style="color:#f3f5f7;font-size:76px">0</div></div></div>
      <div class="feed" id="s7feed" style="margin-top:18px;height:90px;overflow:hidden"></div></div>
    <div class="dc glass-card" id="s7B" style="${at(500, 0, 460, 370)}"><div class="lbl"><span class="dot"></span>ANLIK SAHA PERFORMANSI</div>
      <svg viewBox="0 0 552 250" width="412" height="187" style="margin-top:22px"><defs><linearGradient id="lg1" x1="0" x2="1"><stop offset="0" stop-color="#f3f5f7"/><stop offset="1" stop-color="#9a9a9a"/></linearGradient><linearGradient id="lg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgba(243,245,247,.35)"/><stop offset="1" stop-color="rgba(243,245,247,0)"/></linearGradient></defs>
      ${range(5).map(i => `<line x1="0" x2="552" y1="${20 + i * 52}" y2="${20 + i * 52}" stroke="rgba(255,255,255,.06)"/>`).join('')}
      <path id="s7area" fill="url(#lg2)"/><path id="s7line" fill="none" stroke="url(#lg1)" stroke-width="4" stroke-linejoin="round"/><circle id="s7pt" r="7" fill="#fff" style="filter:drop-shadow(0 0 8px #f3f5f7)"/></svg></div>
    <div class="dc glass-card" id="s7C" style="${at(0, 400, 460, 370)}"><div class="lbl"><span class="dot"></span>VERİ İŞLEME</div>
      <svg width="200" height="200" style="display:block;margin:20px auto 0"><circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14"/><circle id="s7ring" cx="100" cy="100" r="80" fill="none" stroke="url(#lg1)" stroke-width="14" stroke-linecap="round" stroke-dasharray="502.6" transform="rotate(-90 100 100)"/>
      <text id="s7pct" x="100" y="112" text-anchor="middle" fill="#fff" style="font:700 40px 'JetBrains Mono'">0%</text></svg>
      <div class="mono" id="s7sec" style="text-align:center;margin-top:6px;font-size:18px;color:var(--green)">saniyeler içinde</div></div>
    <div class="dc glass-card" id="s7D" style="${at(500, 400, 460, 370)}"><div class="lbl"><span class="dot"></span>RAKİP ANALİZİ · #6838</div>
      <svg width="412" height="262" viewBox="0 0 472 300" style="margin-top:6px"><g transform="translate(236 160)">${[1, .66, .33].map(k => `<polygon points="${RADAR_AX.map((_, i) => { const a = i / 6 * 6.283 - 1.5708; return `${Math.cos(a) * 115 * k},${Math.sin(a) * 115 * k}`; }).join(' ')}" fill="none" stroke="rgba(255,255,255,.1)"/>`).join('')}
      ${RADAR_AX.map((n, i) => { const a = i / 6 * 6.283 - 1.5708; return `<text x="${Math.cos(a) * 140}" y="${Math.sin(a) * 140 + 5}" text-anchor="middle" fill="#9d9daa" style="font:600 13px 'JetBrains Mono'">${n}</text>`; }).join('')}
      <polygon id="s7rad" fill="rgba(243,245,247,.22)" stroke="#f3f5f7" stroke-width="3"/>
      <g id="s7cross" stroke="#FFB800" stroke-width="2.5" fill="none"><circle r="26"/><path d="M-40 0h22M18 0h22M0 -40v22M0 18v22"/></g></g></svg>
      <div style="position:absolute;right:14px;top:54px;display:flex;flex-direction:column;gap:8px;align-items:flex-end;transform:scale(.8);transform-origin:top right">
        <span class="chip gr s7tag" style="font-size:15px">GÜÇLÜ · AUTO</span><span class="chip gr s7tag" style="font-size:15px">GÜÇLÜ · ENDGAME</span><span class="chip r s7tag" style="font-size:15px">ZAYIF · DEFANS</span></div>
      <div class="chip g" id="s7rep" style="position:absolute;left:24px;bottom:22px;font-size:16px">◎ NOKTA ATIŞI RAPOR HAZIR</div></div>
    <div class="dc glass-card" id="s7E" style="${at(0, 800, 460, 370)}"><div class="lbl"><span class="dot"></span>STRATEJİ MASASI</div>
      <svg width="412" height="224" viewBox="0 0 552 300" style="margin-top:30px"><rect x="6" y="6" width="540" height="270" rx="16" fill="rgba(243,245,247,.04)" stroke="rgba(255,255,255,.18)" stroke-width="2"/><line x1="276" y1="6" x2="276" y2="276" stroke="rgba(255,255,255,.12)" stroke-dasharray="6 8"/>
      <rect x="10" y="100" width="44" height="80" fill="rgba(255,59,92,.25)"/><rect x="498" y="100" width="44" height="80" fill="rgba(243,245,247,.25)"/>
      ${[['M60 60 C 170 40, 230 130, 330 110', '#f3f5f7'], ['M60 140 C 160 150, 250 200, 420 200', '#9a9a9a'], ['M60 220 C 140 250, 260 250, 300 160', '#FFB800']].map(([d, c], i) => `<path class="s7path" d="${d}" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="520" style="filter:drop-shadow(0 0 6px ${c})"/>`).join('')}
      ${[[60, 60], [60, 140], [60, 220]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="14" fill="#0a0a14" stroke="${['#f3f5f7', '#9a9a9a', '#FFB800'][i]}" stroke-width="3"/>`).join('')}</svg></div>
    <div class="dc glass-card" id="s7F" style="${at(500, 800, 460, 370)}"><div class="lbl"><span class="dot"></span>İTTİFAK SEÇİMİ · PICKLIST</div>
      <div style="position:relative;height:300px;margin-top:16px">${PICK.map(([n, nm, sc], i) => `<div class="prow s7p"><span class="rk">#${i + 1}</span><span style="width:70px">${n}</span><span class="bar"><i style="width:${sc}%"></i></span><span class="mono" style="font-size:17px;width:34px;text-align:right;color:var(--tx2)">${sc}</span></div>`).join('')}</div></div>
  </div>
  <div class="abs kw" id="s7win" style="font-size:110px;text-align:center;line-height:1.05">Mutlak bir<br><span class="grad glow">üstünlük</span></div>`,
  init() { this.pts = range(40).map(i => .3 + .5 * (i / 39) + .18 * Math.sin(i * .9) + .08 * Math.sin(i * 2.3)); },
  update(t) {
    const v = vis(t, this.a, this.b, .45, .45);
    const h = pe(t, W('Scouting') - .3, .6, E.back);
    T($('#s7head'), { y: -655, s: lerp(1.3, 1, h), o: Math.max(pe(t, 67.75, .5) * .6, h) * v });
    const win = pe(t, W('mutlak') - .15, .6);
    T($('#s7dash'), { y: -5, rx: 8 - 4 * P(t, 67.7, 20), ry: lerp(-6, 6, P(t, 67.7, 20)), s: .9 * (1 - win * .06), o: v * (1 - win * .5), b: win * 3 });
    const cards = { s7A: W('sahada') - .3, s7B: W('robotların') - .2, s7C: W('saniyeler', 76) - .3, s7D: W('Rakiplerin') - .2, s7E: W('stratejini') - .3, s7F: W('ittifak', 84) - .3 };
    for (const [id, ts] of Object.entries(cards)) {
      const p = pe(t, ts, .6, E.back), el = $('#' + id);
      el.style.opacity = (.15 + .85 * p).toFixed(3);
      el.style.transform = `translateZ(${lerp(-120, 0, p)}px) scale(${lerp(.92, 1, p)})`;
      const focus = vis(t, ts, ts + 2.4, .2, .6);
      el.style.boxShadow = focus > .01 ? `0 0 0 2px rgba(243,245,247,${.6 * focus}), 0 0 60px rgba(243,245,247,${.35 * focus}), 0 30px 80px rgba(0,0,0,.55)` : '';
    }
    // live scores
    const lt = Math.max(0, t - W('sahada') + .2);
    const ev = range(28).map(i => ({ t: i * .55 + rnd(i) * .3, red: rnd(i * 3) > .5, pts: [2, 3, 5, 2, 4][Math.floor(rnd(i * 7) * 5)], k: ['AUTO', 'TELEOP', 'TELEOP', 'ENDGAME'][Math.floor(rnd(i * 11) * 4)] })).filter(e => e.t <= lt);
    $('#s7r').textContent = ev.filter(e => e.red).reduce((s, e) => s + e.pts, 0);
    $('#s7b').textContent = ev.filter(e => !e.red).reduce((s, e) => s + e.pts, 0);
    $('#s7feed').innerHTML = ev.slice(-3).reverse().map(e => `<div><span style="color:${e.red ? '#ff6b86' : '#f3f5f7'}">+${e.pts}</span> · ${e.k} · ${e.red ? 'KIRMIZI' : 'MAVİ'}</div>`).join('');
    // perf chart
    const dp = E.io(P(t, W('robotların'), 2.4)), n = Math.max(2, Math.floor(dp * 40));
    const pts = this.pts.slice(0, n).map((y, i) => [i / 39 * 540 + 6, 230 - y * 200]);
    $('#s7line').setAttribute('d', 'M' + pts.map(p => p.join(',')).join(' L'));
    $('#s7area').setAttribute('d', 'M' + pts.map(p => p.join(',')).join(' L') + ` L${pts[pts.length - 1][0]},240 L6,240 Z`);
    $('#s7pt').setAttribute('cx', pts[pts.length - 1][0]); $('#s7pt').setAttribute('cy', pts[pts.length - 1][1]);
    // processing
    const pr = E.io(P(t, W('saniyeler', 76), 1.3));
    $('#s7ring').setAttribute('stroke-dashoffset', (502.6 * (1 - pr)).toFixed(1));
    $('#s7pct').textContent = Math.round(pr * 100) + '%';
    $('#s7sec').textContent = pr >= 1 ? '✓ İŞLENDİ · 0.84 sn' : 'saniyeler içinde…';
    // radar
    const rp = pe(t, W('Rakiplerin'), 1.2, E.out5);
    $('#s7rad').setAttribute('points', RADAR_AX.map((_, i) => { const a = i / 6 * 6.283 - 1.5708, r = 115 * RADAR_V[i] * rp; return `${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(' '));
    $$('.s7tag').forEach((e, i) => e.style.opacity = pe(t, W(i < 2 ? 'güçlü' : 'zayıf') + i * .15, .3));
    const lock = pe(t, W('nokta') - .1, .6, E.out5), wp = [3, .38];
    const ang = wp[0] / 6 * 6.283 - 1.5708, rx = Math.cos(ang) * 115 * wp[1], ry = Math.sin(ang) * 115 * wp[1];
    $('#s7cross').setAttribute('transform', `translate(${lerp(120, rx, lock)} ${lerp(-90, ry, lock)}) scale(${lerp(2.4, 1, lock)}) rotate(${(1 - lock) * 90})`);
    $('#s7cross').style.opacity = lock;
    $('#s7rep').style.opacity = pe(t, W('raporlar') - .1, .3);
    // strategy paths
    $$('.s7path').forEach((p, i) => p.setAttribute('stroke-dashoffset', (520 * (1 - E.io(P(t, W('masaya') - .2 + i * .35, 1.2)))).toFixed(1)));
    // picklist reorder → Wolftech climbs to #1 with gold glow
    const ro = pe(t, W('seçimlerinde') - .1, .9, E.io);
    const order = [3, 0, 1, 2, 4]; // start rank index of each row
    $$('.s7p').forEach((r, i) => {
      const from = order[i], to = i;
      r.style.top = (lerp(from, to, ro) * 58) + 'px';
      const g = i === 0 ? pe(t, W('mutlak') - .3, .5) : 0;
      r.style.background = g ? `rgba(255,184,0,${.14 * g})` : 'rgba(255,255,255,.03)';
      r.style.boxShadow = g ? `0 0 0 1.5px rgba(255,184,0,${.7 * g}), 0 0 30px rgba(255,184,0,${.3 * g})` : '';
      r.querySelector('.rk').textContent = '#' + (Math.round(lerp(from, to, ro)) + 1);
    });
    T($('#s7win'), { y: -60, s: lerp(1.3, 1, win), o: win * v, b: (1 - win) * 12 });
  },
});

/* ---------- S8 — Game Manual AI ---------- */
const Q_WORDS = (() => { const a = W_.findIndex(w => w.t.startsWith("'Robotun")); const b = W_.findIndex(w => w.t.startsWith("geliyor?'")); return W_.slice(a, b + 1); })();
const ANSWER = 'Kısaca: Robotun boyut sınırları sezonun Game Manual’ındaki robot yapım kurallarında tanımlıdır ve maç boyunca bu çerçevenin aşılması ihlal sayılır. Temas kuralı ise rakip robota kasıtlı, tehlikeli ya da sistematik müdahaleyi yasaklar; ihlal faul ve kart ile sonuçlanabilir.';
scene({
  id: 's8', a: 88.0, b: 111.65, ch: ['08', 'GAME MANUAL AI'],
  html: `
  <div class="abs kw" id="s8stress" style="font-size:84px;color:#ff8ea2;text-align:center;line-height:1.1">${up('Atölyedeki')}<br>${up('stres anında')}</div>
  <svg class="abs" id="s8ecg" width="1080" height="300" viewBox="0 0 1080 300"><path id="s8ecgp" fill="none" stroke="#ff3b5c" stroke-width="4" style="filter:drop-shadow(0 0 8px #ff3b5c)"/></svg>
  <div id="s8pages" class="abs" style="width:600px;height:600px">${range(10).map(i => `<div class="page" style="left:${150 + i * 6}px;top:${120 + i * 4}px"><b></b>${range(12).map(k => `<i style="width:${50 + rnd(i * 13 + k) * 50}%"></i>`).join('')}</div>`).join('')}
    <div class="glass-card" id="s8search" style="position:absolute;left:60px;top:40px;width:480px;padding:14px 18px;display:flex;gap:12px;align-items:center">${ico('search')}<span class="mono" style="font-size:18px;color:var(--tx2)">Ctrl+F “boyut sınırı” · <span id="s8hits">aranıyor</span></span></div>
    <div class="glass-card" id="s8clock" style="position:absolute;left:390px;top:470px;padding:14px 20px;display:flex;gap:12px;align-items:center">${ico('clock', 'p')}<span class="mono" id="s8hrs" style="font-size:24px">00:00</span></div></div>
  <div class="abs stamp" id="s8end" style="color:var(--green);background:rgba(4,14,10,.8)">${up('Derdine son!')}</div>
  <div class="abs glass-card glowing-border" id="s8ai" style="width:920px;height:840px;border-radius:28px;padding:30px 34px;overflow:hidden">
    <div class="row" style="gap:18px"><div class="orb" id="s8orb" style="width:58px;height:58px"></div><div><div class="ttl">Game Manual Asistanı</div><div class="lbl" style="margin-top:6px">YAPAY ZEKA DESTEKLİ · TÜRKÇE</div></div><span class="chip gr" style="margin-left:auto;font-size:15px">● ÇEVRİMİÇİ</span></div>
    <div style="height:1px;background:var(--br);margin:22px 0"></div>
    <div id="s8chat" style="display:flex;flex-direction:column;gap:18px">
      <div class="bubble u" id="s8q"></div>
      <div class="row" id="s8think" style="gap:8px;padding-left:6px">${range(3).map(() => '<span class="dot" style="width:12px;height:12px"></span>').join('')}<span class="mono" style="margin-left:10px;color:var(--tx2);font-size:16px">Kural kitabı taranıyor…</span></div>
      <div class="bubble a" id="s8a"><span id="s8atext"></span><div class="row" id="s8src" style="margin-top:16px;gap:10px;flex-wrap:wrap"><span class="chip" style="font-size:14px">📄 KAYNAK · GAME MANUAL</span><span class="chip p" style="font-size:14px">TR · TÜRKÇE YANIT</span><span class="chip g" style="font-size:14px">⚡ 1.2 sn</span></div></div>
    </div></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .45);
    const st = vis(t, 88.05, W('yapay') + .2, .4, .4);
    T($('#s8stress'), { y: -380, o: st * v, x: (rnd(Math.floor(t * 20)) - .5) * 8 * st });
    // ECG
    const ecgO = vis(t, 88.05, W('yapay') + .4, .3, .5) * v;
    let d = ''; for (let x = 0; x <= 1080; x += 6) { const ph = (x / 1080 * 2 + t * 1.6) % 1; let y = 150; if (ph > .45 && ph < .5) y = 150 - 110 * Math.sin((ph - .45) / .05 * Math.PI); else if (ph > .5 && ph < .53) y = 150 + 50 * Math.sin((ph - .5) / .03 * Math.PI); d += (x ? 'L' : 'M') + x + ',' + y.toFixed(1); }
    $('#s8ecgp').setAttribute('d', d); T($('#s8ecg'), { y: 60, o: ecgO * .9 });
    $('#stage').style.boxShadow = '';
    // AI panel
    const ai = pe(t, W('yapay') - .1, .8, E.back);
    const aiShift = pe(t, W('Yüzlerce', 94) - .3, .7, E.io) * (1 - pe(t, W('son!', 99) + .2, .7, E.io));
    T($('#s8ai'), { x: 0, y: lerp(-60, 250, aiShift) + 160 * (1 - ai), rx: lerp(25, 0, ai) + 10 * aiShift, s: lerp(.85, 1, ai) * (1 - .3 * aiShift), o: ai * v });
    $('#s8orb').style.transform = `scale(${1 + .08 * Math.sin(t * 6)})`;
    // rulebook pages
    const pg = vis(t, W('Yüzlerce', 94) - .2, W('son!', 99) + .9, .5, .2) * v;
    const blast = pe(t, W('son!', 99) - .05, .8, E.in);
    T($('#s8pages'), { x: 0, y: -400, o: pg, s: .95 });
    $$('#s8pages .page').forEach((p, i) => {
      const a = rnd(i * 4) * 6.283, dx = Math.cos(a) * 900 * blast, dy = Math.sin(a) * 1300 * blast;
      p.style.transform = `translate(${dx}px,${dy}px) rotate(${(i - 5) * 3 * pe(t, W('sayfalık', 94), .8) + blast * (rnd(i) - .5) * 300}deg)`;
    });
    $('#s8hits').textContent = t > W('saatlerce') ? '0 sonuç…' : 'aranıyor' + '.'.repeat(1 + Math.floor(t * 3) % 3);
    const hrs = E.io(P(t, W('saatlerce'), 2)) * 4.6; $('#s8hrs').textContent = `${String(Math.floor(hrs)).padStart(2, '0')}:${String(Math.floor(hrs * 60) % 60).padStart(2, '0')} SAAT`;
    const en = pe(t, W('son!', 99) - .05, .35, E.back);
    T($('#s8end'), { x: 0, y: -330, rz: -6, s: lerp(2.2, 1, en), o: en * vis(t, 0, W('Robotun') + .5, .1, .4) * v });
    // question typed by spoken words
    const qShown = Q_WORDS.filter(w => w.s <= t + .05).map(w => w.t).join(' ');
    $('#s8q').textContent = qShown.replace(/^'|'$/g, '').replace(/'/g, '');
    $('#s8q').style.opacity = qShown ? 1 : 0;
    const th = vis(t, W('sistem', 106) - .1, W('sana', 108) + .1, .2, .2);
    $('#s8think').style.opacity = th; $('#s8think').style.display = th > .01 ? 'flex' : 'none';
    $$('#s8think .dot').forEach((dd, i) => dd.style.transform = `translateY(${Math.sin(t * 9 - i) * 5}px)`);
    const an = P(t, W('sana', 108), W('yapıştırır') + .6 - W('sana', 108));
    $('#s8a').style.display = an > 0 ? 'block' : 'none';
    $('#s8atext').textContent = ANSWER.slice(0, Math.floor(E.out(an) * ANSWER.length));
    $('#s8src').style.opacity = pe(t, W('Türkçe') - .1, .4);
  },
});

/* ---------- S8b — Pit & Hakem ---------- */
scene({
  id: 's8b', a: 111.6, b: 118.8, ch: ['09', 'PIT & HAKEM MASASI'],
  html: `
  <div class="abs glass-card pane" id="s8p1" style="width:640px;height:340px">${ico('wrench')}<div class="ttl">Pit alanında</div><div class="sub">zamanla yarışırken</div>
    <div style="position:absolute;right:30px;top:30px;text-align:right"><div class="lbl">SIRADAKİ MAÇ</div><div class="mono" id="s8cd" style="font:700 72px 'JetBrains Mono';color:var(--gold);margin-top:8px">04:59</div></div>
    <div class="row" style="margin-top:16px;gap:10px"><span class="chip gr" style="font-size:14px">✓ BATARYA</span><span class="chip gr" style="font-size:14px">✓ BUMPER</span><span class="chip" style="font-size:14px">⟳ KOD</span></div></div>
  <div class="abs glass-card pane" id="s8p2" style="width:640px;height:340px">${ico('flag', 'p')}<div class="ttl">Hakem masasında</div><div class="sub">hakkını ararken</div>
    <div class="glass-card" style="margin-top:20px;padding:16px 20px;border-radius:16px"><div class="lbl">KURAL REFERANSI</div><div style="font:600 22px/1.35 'Inter';margin-top:10px">İlgili madde, Türkçe özetiyle hazır.</div><div class="chip gr" style="margin-top:14px;font-size:14px">✓ AI DOĞRULANDI</div></div></div>
  <div class="abs orb" id="s8hub" style="width:120px;height:120px"></div>
  <svg class="abs" width="1300" height="200" viewBox="0 0 1300 200" id="s8link"><path id="s8lp" d="M120 100 H1180" stroke="url(#lgl)" stroke-width="3" stroke-dasharray="10 10" fill="none"/><defs><linearGradient id="lgl"><stop offset="0" stop-color="#f3f5f7"/><stop offset="1" stop-color="#9a9a9a"/></linearGradient></defs></svg>
  <div class="abs kw" id="s8alone" style="font-size:96px;text-align:center;line-height:1.05">Asla yalnız<br><span class="grad glow">kalmazsın.</span></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .4);
    const al = pe(t, W('asla') - .15, .6);
    const p1 = pe(t, W('Pit') - .1, .6, E.back), p2 = pe(t, W('hakem') - .2, .6, E.back);
    T($('#s8p1'), { x: 0, y: lerp(-500, -560, al), rx: 8, s: 1.3 * lerp(.8, 1, p1) * (1 - al * .15), o: p1 * v });
    T($('#s8p2'), { x: 0, y: lerp(20, -40, al), rx: -8, s: 1.3 * lerp(.8, 1, p2) * (1 - al * .15), o: p2 * v });
    const cd = Math.max(0, 299 - (t - 111.6) * 9); $('#s8cd').textContent = `0${Math.floor(cd / 60)}:${String(Math.floor(cd % 60)).padStart(2, '0')}`;
    T($('#s8hub'), { x: 340, y: lerp(-240, -300, al), s: pe(t, W('hakem') + .4, .5, E.back) * (1 + .06 * Math.sin(t * 5)), o: v });
    T($('#s8link'), { x: 340, y: lerp(-240, -300, al), rz: 90, s: .5, o: pe(t, W('hakem') + .4, .5) * v });
    $('#s8lp').setAttribute('stroke-dashoffset', (-t * 60).toFixed(0));
    T($('#s8alone'), { y: 360, o: al * v, s: lerp(1.15, 1, al), b: (1 - al) * 10 });
  },
});

/* ---------- S9 — Yaşayan sistem ---------- */
const HEXN = ['FEED', 'SCOUT', 'AI', 'TEAM', 'DOCS', 'KANBAN', 'FİNANS', 'FORUM', 'KEŞFET', 'STRATEJİ', 'CANLI', 'PİCKLİST', 'HARİTA', 'TAKVİM', 'MAĞAZA', 'MEDYA', 'ANALİZ', 'İSTATİSTİK', 'ROZET'];
const HEXPOS = (() => { const out = [[0, 0]]; for (let ring = 1; ring <= 2; ring++) { for (let k = 0; k < 6 * ring; k++) { const side = Math.floor(k / ring), off = k % ring; const dirs = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; let q = dirs[4][0] * ring, r = dirs[4][1] * ring; for (let s = 0; s < side; s++) { q += dirs[s][0] * ring; r += dirs[s][1] * ring; } q += dirs[side][0] * off; r += dirs[side][1] * off; out.push([q, r]); } } return out; })();
scene({
  id: 's9', a: 118.75, b: 137.85, ch: ['10', 'CANLI SİSTEM'],
  html: `
  <div class="abs" id="s9chips" style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;width:800px"><span class="chip" style="font-size:30px">VERİ</span><span class="chip p" style="font-size:30px">KURALLAR</span><span class="kw" style="font-size:40px;color:var(--tx2);align-self:center">…ve fazlası</span></div>
  <div class="abs kw" id="s9title" style="font-size:64px;text-align:center;line-height:1.12">Yaşayan ve sürekli<br><span class="grad glow">büyüyen bir sistem</span></div>
  <div class="abs" id="s9hex" style="width:900px;height:760px">${HEXPOS.map(([q, r], i) => `<div class="hex s9h" style="left:${450 + q * 116 - 75}px;top:${380 + (r + q / 2) * 134 - 65}px"><b>${HEXN[i % HEXN.length]}</b></div>`).join('')}</div>
  <div class="abs glass-card" id="s9week" style="padding:18px 26px;text-align:center"><div class="lbl">HER HAFTA</div><div class="mono" id="s9wk" style="font:700 52px 'JetBrains Mono';margin-top:8px">H01</div><div class="chip gr" style="font-size:14px;margin-top:10px" id="s9new">+ YENİ MODÜL</div></div>
  <div class="abs chip glowing-border" id="s9c1" style="position:absolute;font-size:22px">Yeni arayüz modülleri</div>
  <div class="abs chip p glowing-border" id="s9c2" style="position:absolute;font-size:22px">Takımlara özel strateji araçları</div>
  <div class="abs chip glowing-border" id="s9c3" style="position:absolute;font-size:22px">İnteraktif sistemler</div>
  <div class="abs glass-card" id="s9pow" style="width:540px;padding:22px 26px"><div class="row" style="justify-content:space-between"><span class="lbl">DİJİTAL ÜS · GÜÇ</span><span class="mono" id="s9pv" style="color:var(--cyan2);font-size:20px">0%</span></div>
    <div style="height:14px;border-radius:7px;background:rgba(255,255,255,.08);margin-top:14px;overflow:hidden"><i id="s9pb" style="display:block;height:100%;background:linear-gradient(90deg,var(--cyan),var(--violet));box-shadow:0 0 20px var(--cyan)"></i></div>
    <div class="ttl" style="margin-top:16px;font-size:24px">Her geçen gün daha da güçlenir.</div></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .45);
    const ch = pe(t, 118.85, .5), chOut = pe(t, W('bitmiyor') - .1, .6, E.in);
    T($('#s9chips'), { y: -40, s: lerp(1.1, 1, ch), o: ch * v * (1 - chOut), x: chOut * -900, b: chOut * 10 });
    const ti = pe(t, W('yaşayan') - .3, .7);
    T($('#s9title'), { y: -640, o: ti * v });
    const grow = P(t, W('yaşayan') - .3, W('güçlenir') - W('yaşayan'));
    const nOn = Math.floor(1 + grow * (HEXPOS.length - 1));
    const power = E.io(P(t, W('dijital', 134) - .1, 2.8));
    T($('#s9hex'), { y: -100, x: 0, s: 1.02 + .04 * Math.sin(t * .8), o: ti * v, rz: t * 1.5 });
    $$('.s9h').forEach((h, i) => {
      const born = W('yaşayan') - .3 + (i / (HEXPOS.length - 1)) * (W('güçlenir') - W('yaşayan'));
      const p = pe(t, born, .5, E.back), fresh = vis(t, born, born + 1.2, .1, .8);
      h.style.opacity = p; h.style.transform = `scale(${p * (1 + fresh * .12)}) rotate(${-t * 1.5}deg)`;
      h.style.filter = `brightness(${1 + fresh * .8 + power * .6}) drop-shadow(0 0 ${8 + power * 18}px rgba(243,245,247,${.3 + power * .4}))`;
    });
    const wk = pe(t, W('Platforma') - .2, .5);
    T($('#s9week'), { x: 330, y: -470, o: wk * v, s: lerp(.8, 1, wk) });
    $('#s9wk').textContent = 'H' + String(1 + Math.floor(Math.max(0, t - W('Platforma')) * 1.3)).padStart(2, '0');
    $('#s9new').style.opacity = .4 + .6 * Math.abs(Math.sin(t * 2.6));
    [['#s9c1', W('yeni', 128), 0, 290], ['#s9c2', W('takımlara') - .1, 0, 370], ['#s9c3', W('interaktif') - .1, 0, 450]].forEach(([id, ts, x, y]) => {
      const p = pe(t, ts, .5, E.back); T($(id), { x: x - (1 - p) * 80, y, s: lerp(.7, 1, p), o: p * v * (1 - pe(t, W('dijital', 134) - .5, .4)) });
    });
    const pw = pe(t, W('dijital', 134) - .3, .5);
    T($('#s9pow'), { x: 0, y: 370, o: pw * v, s: lerp(.9, 1, pw) });
    $('#s9pb').style.width = power * 100 + '%'; $('#s9pv').textContent = Math.round(power * 100) + '%';
  },
});

/* ---------- S9b — Haber akışı ---------- */
const NEWS = [['BÖLGESEL TURNUVA · SON DAKİKA', 'Çeyrek finalde ittifaklar belli oldu'], ['ATÖLYEDEN', 'Yeni swerve şasi ilk testten geçti'], ['CANLI', 'Eleme maçları başladı · Q42 sahada'], ['TOPLULUK', 'FTC takımları için yeni rehber yayında'], ['STRATEJİ', 'Picklist güncellendi: 3 yeni veri seti'], ['SON DAKİKA', 'Hakem toplantısı: kural açıklaması'], ['ATÖLYEDEN', 'Gece vardiyası: kol mekanizması bitti'], ['BÖLGESEL TURNUVA', 'Rookie takımından rekor skor']];
scene({
  id: 's9b', a: 137.8, b: 147.9, ch: ['11', 'HABER AKIŞI'],
  html: `
  <div class="abs glass-card glowing-border" id="s9feed" style="width:860px;height:900px;border-radius:30px;overflow:hidden">
    <div class="row" style="padding:24px 26px;justify-content:space-between;border-bottom:1px solid var(--br)"><div class="row" style="gap:14px">${ico('news')}<div class="ttl">Anlık haber akışı</div></div><span class="chip r" style="font-size:15px"><span class="dot r"></span> CANLI</span></div>
    <div id="s9list" style="position:relative;height:800px;overflow:hidden">${NEWS.concat(NEWS).map(([m, n], i) => `<div class="news s9n"><div class="nm">${m}</div><div class="nt">${n}</div></div>`).join('')}</div></div>
  <div class="abs kw" id="s9k1" style="font-size:56px;text-align:center;line-height:1.15">Bölgesel turnuvalardan<br><span class="grad">son dakika gelişmeleri</span></div>
  <div class="abs kw" id="s9k2" style="font-size:56px;text-align:center;line-height:1.15">Atölyelerden sızan<br><span class="grad glow">o ham enerji</span></div>
  <div class="abs kw" id="s9k3" style="font-size:64px;text-align:center;line-height:1.15">Doğrudan<br><span class="grad glow">senin ekranına akar.</span></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .4);
    const fi = pe(t, 137.85, .7, E.back), zoom = pe(t, W('doğrudan', 145) - .1, 1.6, E.io);
    T($('#s9feed'), { y: -190 - zoom * 40, s: lerp(.85, 1, fi) * (1 + zoom * .06), o: fi * v * (1 - zoom * .3), rx: 8 * (1 - zoom) });
    const sc = (t - 137.8) * 120;
    $$('.s9n').forEach((n, i) => { const y = ((i * 170 - sc) % (NEWS.length * 2 * 170) + NEWS.length * 2 * 170) % (NEWS.length * 2 * 170) - 170; n.style.top = (y + 20) + 'px'; const breaking = n.querySelector('.nm').textContent.includes('SON DAKİKA') && t > W('son', 140) && t < W('son', 140) + 2; n.style.borderColor = breaking ? 'rgba(255,59,92,.7)' : ''; n.style.background = breaking ? 'rgba(255,59,92,.12)' : ''; });
    T($('#s9k1'), { x: 0, y: 420, o: vis(t, W('bölgesel') - .1, W('atölyelerden'), .5, .3) * v, s: 1 });
    T($('#s9k2'), { x: 0, y: 420, o: vis(t, W('atölyelerden') - .1, W('doğrudan', 145), .5, .3) * v });
    const k3 = pe(t, W('doğrudan', 145), .6);
    T($('#s9k3'), { y: 420, o: k3 * v, s: lerp(1.1, 1, k3) });
    // energy streams flowing into the feed
    FX.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1, ph = (t * .45 + rnd(i)) % 1, y0 = rnd(i * 3) * 1080;
      const y0b = rnd(i * 3) * 1920, x = 540 + side * (540 - ph * 330), y = lerp(y0b, 820, ph);
      FX.fillStyle = i % 3 ? `rgba(243,245,247,${(1 - ph) * .9 * v})` : `rgba(170,170,170,${(1 - ph) * .9 * v})`;
      FX.fillRect(x, y, 14 * (1 - ph) + 2, 2.5);
    }
    FX.globalCompositeOperation = 'source-over';
  },
});

/* ---------- S9c — Sahnenin kalbi ---------- */
scene({
  id: 's9c', a: 147.85, b: 154.35, ch: ['12', 'SAHNENİN KALBİ'],
  html: `
  <div class="abs kw" id="s9cA" style="font-size:60px;color:var(--tx2);text-align:center;line-height:1.15">Sadece gelişmeleri<br>takip eden değil,</div>
  <div class="abs" id="s9cone" style="width:900px;height:1500px;background:linear-gradient(to bottom,rgba(255,255,255,.28),rgba(150,150,150,.06) 70%,transparent);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)"></div>
  <div class="abs" id="s9plat" style="width:860px;height:220px">${range(4).map(i => `<div class="ring" style="inset:${i * 28}px ${i * 110}px;border-color:rgba(${i % 2 ? '170,170,170' : '243,245,247'},.6);border-width:3px;box-shadow:0 0 30px rgba(243,245,247,.3)"></div>`).join('')}</div>
  <div class="abs orb" id="s9core" style="width:170px;height:170px"></div>
  <div class="abs kw" id="s9cB" style="font-size:88px;text-align:center;line-height:1.05">Sahnenin tam<br><span class="grad glow">kalbinde</span></div>
  <div class="abs kw" id="s9cC" style="font-size:62px;text-align:center;line-height:1.15">Üreten bir<br><span class="grad glow">güce dönüşürsün.</span></div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .4);
    const a = pe(t, 147.9, .5), heart = pe(t, W('sahnenin') - .2, .9, E.io), gu = pe(t, W('üreten') - .2, .6);
    T($('#s9cA'), { y: -40 - heart * 120, o: a * v * (1 - heart), b: heart * 8 });
    T($('#s9cone'), { y: -300, o: heart * v * (.85 + .15 * Math.sin(t * 7)) });
    T($('#s9plat'), { y: 300, rx: 0, s: lerp(.5, 1, heart), o: heart * v });
    T($('#s9core'), { y: 170, s: heart * (1 + .08 * Math.sin(t * 5)) * (1 + gu * .25), o: heart * v });
    T($('#s9cB'), { y: -560, o: heart * v, s: lerp(1.2, 1, heart) });
    T($('#s9cC'), { y: -300, o: gu * v, b: (1 - gu) * 10 });
    if (gu > 0) { FX.globalCompositeOperation = 'lighter'; const k = P(t, W('üreten') - .1, 1.6); for (let i = 0; i < 120; i++) { const an = rnd(i) * 6.283, d = E.out(k) * (200 + rnd(i * 2) * 800); FX.fillStyle = i % 2 ? `rgba(243,245,247,${(1 - k) * v})` : `rgba(255,184,0,${(1 - k) * v})`; FX.fillRect(540 + Math.cos(an) * d * .7, 1130 + Math.sin(an) * d * .8, 3, 3); } FX.globalCompositeOperation = 'source-over'; }
  },
});

/* ---------- S10 — Tek merkez ---------- */
scene({
  id: 's10', a: 154.3, b: 165.05, ch: ['13', 'TEK MERKEZ'],
  html: `
  <div class="abs xl" id="s10x"><div class="xh">Scouting_FINAL_v7(2).xlsx</div><table>${range(12).map(r => `<tr>${range(7).map(c => `<td>${r === 0 ? 'ABCDEFG'[c] : (rnd(r * 9 + c) > .4 ? Math.floor(rnd(r * 7 + c) * 99) : '')}</td>`).join('')}</tr>`).join('')}</table></div>
  <div class="abs glass-card browser" id="s10b" style="width:700px;height:300px"><div class="tabs">${range(14).map(i => `<div class="tab" style="width:36px"></div>`).join('')}</div><div class="addr mono">https://…</div></div>
  ${['maç 12??', 'pil şarj!', 'kural 7.3?', 'picklist →'].map((s, i) => `<div class="abs note s10n">${s}</div>`).join('')}
  <div class="abs" id="s10trash" style="width:130px;height:130px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(0,0,0,.9),rgba(150,150,150,.3));box-shadow:0 0 60px rgba(150,150,150,.7)"><svg viewBox="0 0 24 24" width="60" height="60" style="stroke:#d6d6d6;fill:none;stroke-width:1.8">${I.trash}</svg></div>
  <div class="abs kw" id="s10k1" style="font-size:80px;color:#ff8ea2">${up('Çöpe atın.')}</div>
  <div class="abs orb" id="s10core" style="width:200px;height:200px"></div>
  <div class="abs kw" id="s10k2" style="font-size:72px;text-align:center;line-height:1.12">Tüm gücü<br><span class="grad glow">tek bir merkezde</span><br>toplayın</div>
  <svg class="abs" id="s10tro" width="300" height="300" viewBox="0 0 24 24" style="stroke:#FFB800;fill:none;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 16px rgba(255,184,0,.8))"><path id="s10trp" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4" pathLength="1" stroke-dasharray="1"/></svg>
  <div class="abs" id="s10bars" style="display:flex;gap:16px;align-items:flex-end;height:220px">${range(6).map(i => `<i style="width:34px;border-radius:8px 8px 2px 2px;background:linear-gradient(to top,var(--cyan),var(--violet));box-shadow:0 0 20px rgba(243,245,247,.5)"></i>`).join('')}</div>
  <div class="abs kw" id="s10k3" style="font-size:84px;text-align:center;line-height:1.1">Veriyi <span style="color:var(--gold);text-shadow:0 0 30px rgba(255,184,0,.6)">zafere</span><br>dönüştürün.</div>`,
  update(t) {
    const v = vis(t, this.a, this.b, .4, .4);
    const suck = pe(t, W('çöpe') - .1, .9, E.in);
    const trashP = vis(t, W('kaybolan') - .3, W('Tüm', 160) + .2, .4, .3);
    T($('#s10trash'), { y: 440, s: trashP * (1 + .1 * Math.sin(t * 8)), o: trashP * v });
    const items = [['#s10x', W('Excel') - .2, -120, -420, -6], ['#s10b', W('karmaşık', 156) - .2, 130, -40, 5]];
    items.forEach(([id, ts, x, y, r]) => {
      const p = pe(t, ts, .6, E.back), j = Math.sin(t * 3 + x) * 10;
      T($(id), { x: lerp(x + j, 0, suck), y: lerp(y, 440, suck), rz: r + suck * 400, s: p * lerp(1, .05, suck) * .95, o: p * v * (1 - P(t, W('çöpe') + .7, .2)) });
    });
    $$('.s10n').forEach((n, i) => {
      const p = pe(t, W('kaybolan') - .2 + i * .15, .5, E.back), x = [-330, -110, 110, 330][i], y = [250, 320, 240, 330][i];
      T(n, { x: lerp(x, 0, suck), y: lerp(y + Math.sin(t * 2 + i) * 12, 440, suck), rz: (i % 2 ? 6 : -5) + suck * 500, s: p * lerp(1, .05, suck), o: p * v * (1 - P(t, W('çöpe') + .7, .2)) });
    });
    const k1 = vis(t, W('çöpe') - .05, W('Tüm', 160) + .1, .3, .3);
    T($('#s10k1'), { y: -660, o: k1 * v, s: lerp(1.3, 1, pe(t, W('çöpe'), .3)) });
    // converge
    const cv = P(t, W('Tüm', 160) - .1, 2.2), cvo = vis(t, W('Tüm', 160) - .1, W('veriyi') + .2, .3, .4);
    T($('#s10core'), { y: 60, s: E.out(cv) * (1 + .07 * Math.sin(t * 6)), o: cvo * v });
    T($('#s10k2'), { y: -480, o: cvo * v, b: (1 - pe(t, W('Tüm', 160), .5)) * 10 });
    if (cvo > 0) { FX.globalCompositeOperation = 'lighter'; for (let i = 0; i < 220; i++) { const an = rnd(i) * 6.283, ph = (rnd(i * 3) + cv * 1.4) % 1, d = (1 - E.in(ph)) * (700 + rnd(i * 5) * 600); FX.fillStyle = i % 3 ? `rgba(243,245,247,${ph * cvo * v})` : `rgba(170,170,170,${ph * cvo * v})`; FX.fillRect(540 + Math.cos(an) * d * .6, 1020 + Math.sin(an) * d, 3, 3); } FX.globalCompositeOperation = 'source-over'; }
    // data → trophy
    const vz = pe(t, W('veriyi') - .2, .5), morph = pe(t, W('zafere') - .1, .9, E.io);
    T($('#s10bars'), { y: 80, o: vz * v * (1 - morph), s: lerp(1, .4, morph) });
    $$('#s10bars i').forEach((b, i) => b.style.height = (40 + 170 * E.out(P(t, W('veriyi') - .2 + i * .06, .6)) * (.4 + i * .12)) + 'px');
    T($('#s10tro'), { y: 60, o: morph * v, s: lerp(.6, 1, morph) * (1 + .03 * Math.sin(t * 4)) });
    $('#s10trp').setAttribute('stroke-dashoffset', (1 - morph).toFixed(3));
    T($('#s10k3'), { y: -440, o: pe(t, W('veriyi') - .1, .5) * v });
  },
});

/* ---------- S11 — Final ---------- */
scene({
  id: 's11', a: 165.0, b: END, ch: ['14', 'BUMPERMEDIA'],
  html: `
  <div class="abs" id="s11logo" style="width:200px;height:194px;filter:drop-shadow(0 0 30px rgba(255,255,255,.25))"><span class="logo-mark" style="width:100%;height:100%"></span></div>
  <div class="abs kw" id="s11because" style="font-size:40px;color:var(--tx2)">Çünkü</div>
  <div class="abs kw" id="s11word" style="font-size:132px;letter-spacing:-.03em"><span style="color:#fff">Bumper</span><span class="grad">Media</span></div>
  <div class="abs kw" id="s11tag" style="font-size:52px;text-align:center;color:#dfe3ee;line-height:1.2">Robotik tutkunlarının<br><span class="grad">yeni nesil dijital devrimi</span></div>
  <div class="abs kw" id="s11sunar" style="font-size:30px;letter-spacing:.3em;color:var(--tx2)">${up('BumperMedia sunar')}</div>
  ${[['Tek platform', 'ONE PLATFORM', 'feed'], ['Sınırsız güç', 'UNLIMITED', 'bolt'], ['Anlık veri', 'REAL-TIME', 'target'], ['Efsane sonuçlar', 'LEGENDARY', 'trophy']].map(([a, b, ic], i) => `<div class="abs glass-card glowing-border feat s11f">${ico(ic, i % 2 ? 'p' : '')}<div class="fn">${up(a)}</div><div class="fs">${b}</div></div>`).join('')}
  <div class="abs chip glowing-border" id="s11url" style="position:absolute;font-size:30px;padding:18px 36px;color:#fff">bumpermedia.online</div>
  <div class="abs mono" id="s11foot" style="white-space:nowrap;font-size:15px;letter-spacing:.2em;color:var(--tx3)">WOLFTECH ROBOTICS · BUMPERMEDIA EKOSİSTEMİ</div>
  <div class="abs" id="s11black" style="width:1080px;height:1920px;background:#000"></div>`,
  update(t) {
    const v = vis(t, this.a, 999, .5, .1);
    const lockUp = pe(t, W('BumperMedia', 170) - .3, .9, E.io);
    const lg = pe(t, W('BumperMedia', 165) - .2, .8, E.back);
    T($('#s11logo'), { y: lerp(-300, -680, lockUp), s: lerp(.4, 1.2, lg) * lerp(1, .5, lockUp), o: lg * v });
    T($('#s11because'), { y: lerp(-110, -270, lockUp), o: pe(t, 165.15, .4) * v * (1 - lockUp) });
    const wd = pe(t, W('BumperMedia', 165) - .1, .8, E.out5);
    T($('#s11word'), { y: lerp(0, -560, lockUp), s: lerp(.9, 1, wd) * lerp(1, .6, lockUp), o: wd * v, b: (1 - wd) * 14 });
    $('#s11word').style.letterSpacing = lerp(.15, -.03, wd) + 'em';
    const tg = pe(t, W('robotik', 166) - .1, .8);
    T($('#s11tag'), { y: lerp(170, -440, lockUp), o: tg * v * (1 - lockUp * .3), s: lerp(1, .8, lockUp) });
    T($('#s11sunar'), { y: -310, o: vis(t, W('BumperMedia', 170) - .1, 999, .5, .1) * v });
    const ft = [W('tek', 172), W('sınırsız'), W('anlık', 174), W('efsane')];
    $$('.s11f').forEach((f, i) => { const p = pe(t, ft[i] - .15, .55, E.back); T(f, { x: (i % 2 - .5) * 370, y: -120 + Math.floor(i / 2) * 200, s: lerp(.6, 1, p), o: p * v, rx: (1 - p) * 40 }); });
    const u = pe(t, W('sonuçlar') + .5, .7, E.back);
    T($('#s11url'), { y: 270, s: lerp(.7, 1, u) * (1 + .02 * Math.sin(t * 4)), o: u * v });
    T($('#s11foot'), { y: 360, o: pe(t, W('sonuçlar') + .9, .7) * v });
    T($('#s11black'), { o: pe(t, END - 1.3, 1.2, E.io) });
  },
});

/* =========================================================
   GLOBAL LAYERS
   ========================================================= */
const BG = $('#bg').getContext('2d');
const meter = $('#hudMeter'); meter.innerHTML = range(14).map(() => '<i></i>').join(''); const mbars = $$('i', meter);
$('#hudSide').textContent = 'BUMPERMEDIA.ONLINE · FRC · FTC · SCOUTING · AI';
const subsIn = $('#subsIn');
let lastCue = -2;

function speaking(t) { return W_.some(w => t >= w.s && t <= w.e); }

function renderFrame(t) {
  document.documentElement.style.setProperty('--ang', (t * 90 % 360).toFixed(1) + 'deg');
  // background blobs + grid
  T($('#bgA'), { x: -500 + 260 * Math.sin(t * .13), y: -200 + 200 * Math.cos(t * .17) }); $('#bgA').style.transform += ' translate(50%,50%)';
  T($('#bgB'), { x: 200 + 220 * Math.cos(t * .11), y: 900 + 260 * Math.sin(t * .15) }); $('#bgB').style.transform += ' translate(50%,50%)';
  T($('#bgC'), { x: -100 + 300 * Math.sin(t * .07 + 2), y: 400 }); $('#bgC').style.transform += ' translate(50%,50%)';
  $('#grid').style.backgroundPosition = `0 ${(t * 60) % 80}px`;
  BG.clearRect(0, 0, 1080, 1920);
  for (let i = 0; i < 140; i++) { const x = (rnd(i) * 1080 + t * (8 + rnd(i * 2) * 18)) % 1080, y = (rnd(i * 3) * 1920 - t * (5 + rnd(i * 5) * 12) + 3840) % 1920, a = .15 + .35 * (.5 + .5 * Math.sin(t * 2 + i)); BG.fillStyle = `rgba(243,245,247,${a * .35})`; BG.fillRect(x, y, 2, 2); }
  FX.clearRect(0, 0, 1080, 1920);
  // scenes
  let cur = SC[0];
  for (const s of SC) {
    const on = t >= s.a - .6 && t <= s.b + .6;
    s.el.style.display = on ? 'block' : 'none';
    if (on) s.update(t, t - s.a);
    if (t >= s.a) cur = s;
  }
  // transition flash at scene boundaries
  let fl = 0; for (const s of SC.slice(1)) { const d = Math.abs(t - s.a); if (d < .35) fl = Math.max(fl, (1 - d / .35) * .55); }
  if (t < .6) fl = Math.max(fl, (1 - t / .6) * .0);
  $('#flash').style.opacity = fl.toFixed(3);
  // HUD
  const hudO = (1 - pe(t, END - 2.2, 1.2)) * pe(t, .3, .8);
  $('#hud').style.opacity = hudO;
  const fr = Math.floor(t * 30); $('#tc').textContent = [Math.floor(fr / 108000), Math.floor(fr / 1800) % 60, Math.floor(fr / 30) % 60, fr % 30].map(n => String(n).padStart(2, '0')).join(':');
  $('#chNum').textContent = cur.ch[0]; $('#chName').textContent = cur.ch[1];
  const chIn = pe(t, cur.a, .5); $('#hudChapter').style.opacity = chIn; $('#hudChapter').style.transform = `translateX(${(1 - chIn) * -30}px)`;
  const sp = speaking(t);
  mbars.forEach((b, i) => { const h = sp ? 6 + 20 * Math.abs(Math.sin(t * (9 + i * 1.7) + i * 2)) : 4; b.style.height = h.toFixed(1) + 'px'; });
  // subtitles (original text, karaoke highlight)
  const ci = CUES.findIndex(c => t >= c.s - .05 && t < c.e);
  if (ci !== lastCue) { subsIn.innerHTML = ci < 0 ? '' : CUES[ci].w.map(i => `<span data-i="${i}">${W_[i].t}</span>`).join(' '); lastCue = ci; }
  if (ci >= 0) {
    $$('span', subsIn).forEach(sp => { const w = W_[+sp.dataset.i]; sp.className = t >= w.s ? (t <= w.e + .05 ? 'cur' : 'on') : ''; });
    const c = CUES[ci], o = Math.min(pe(t, c.s - .05, .15), 1);
    $('#subs').style.opacity = o * (1 - pe(t, END - 2.5, .6));
  } else $('#subs').style.opacity = 0;
}
window.renderFrame = renderFrame;
window.DURATION = END;
window.SCENES = SC.map(s => ({ id: s.id, a: s.a, b: s.b }));
renderFrame(0);
})();
