// node build/still.mjs <out-dir> t1 t2 ...   [W=960] [STAGES=istanbul]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { serve, CHROME_ARGS } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out, ...ts] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const w = +(process.env.W || 960); const srv = await serve(root);
const b = await chromium.launch({ args: CHROME_ARGS }); const p = await b.newPage({ viewport: { width: w, height: w * 9 / 16 } });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || process.env.LOG) console.log('[page]', m.text().slice(0, 600)); }); p.on('pageerror', (e) => console.log('[pageerror]', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')));
await p.goto(`http://localhost:${srv.port}/src/index.html?w=${w}${process.env.STAGES ? '&stages=' + process.env.STAGES : ''}`);
await p.waitForFunction('window.ready', null, { timeout: 120000 });
for (const t of ts) { const t0 = Date.now(); const d = await p.evaluate((t) => window.frameJpeg(t, 0.92), +t); fs.writeFileSync(path.join(out, `t${String(t).padStart(6, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64')); console.log(t, Date.now() - t0, 'ms'); }
await b.close(); srv.close();
