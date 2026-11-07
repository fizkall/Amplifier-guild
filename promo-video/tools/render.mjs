// Render the motion page frame-by-frame into MP4 segments (parallel workers), then concat.
// usage: node tools/render.mjs [fps=30] [workers=4] [start=0] [end=DURATION]
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'child_process'; import path from 'path'; import fs from 'fs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [fps = 30, workers = 4] = process.argv.slice(2, 4).map(Number);
const seg = `${root}/output/segments`; fs.mkdirSync(seg, { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const probe = await browser.newPage(); await probe.goto('file://' + root + '/src/index.html');
const DUR = await probe.evaluate(() => window.DURATION); await probe.close();
const t0 = Number(process.argv[4] ?? 0), t1 = Number(process.argv[5] ?? DUR);
const F0 = Math.round(t0 * fps), F1 = Math.round(t1 * fps), N = F1 - F0;
const per = Math.ceil(N / workers); const started = Date.now(); let done = 0;
async function work(w) {
  const a = F0 + w * per, b = Math.min(F1, a + per); if (a >= b) return null;
  const out = `${seg}/seg_${String(w).padStart(2, '0')}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto('file://' + root + '/src/index.html'); await p.evaluate(() => document.fonts.ready);
  for (let f = a; f < b; f++) {
    await p.evaluate(t => window.renderFrame(t), f / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % 150 === 0) { const el = (Date.now() - started) / 1000; console.log(`${done}/${N} frames · ${el.toFixed(0)}s · ETA ${(el / done * (N - done)).toFixed(0)}s`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await p.close(); return out;
}
const outs = (await Promise.all([...Array(workers).keys()].map(work))).filter(Boolean);
await browser.close();
fs.writeFileSync(`${seg}/list.txt`, outs.map(o => `file '${o}'`).join('\n'));
await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${seg}/list.txt`, '-c', 'copy', `${root}/output/video_silent.mp4`], { stdio: 'inherit' }).on('close', r));
console.log('done in', ((Date.now() - started) / 1000).toFixed(0), 's');
