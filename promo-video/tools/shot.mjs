// usage: node tools/shot.mjs t1 t2 ...  -> output/frames/shot_<t>.jpg
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path'; import fs from 'fs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
fs.mkdirSync(`${root}/output/frames`, { recursive: true });
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + root + '/src/index.html'); await p.evaluate(() => document.fonts.ready);
for (const t of process.argv.slice(2).map(Number)) {
  await p.evaluate(t => window.renderFrame(t), t);
  await p.screenshot({ path: `${root}/output/frames/shot_${t.toFixed(1)}.jpg`, type: 'jpeg', quality: 80 });
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'ok'); await b.close();
