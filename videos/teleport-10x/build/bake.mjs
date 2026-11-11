// node build/bake.mjs [ids=all] [size]   -> bake/out/<id>_<face>.jpg
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { serve, CHROME_ARGS } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const srv = await serve(root);
const ids = (process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : 'sun,s20,s21,s22,s23,s25').split(','); const sizeArg = +(process.argv[3] || 0);
const outDir = path.join(root, process.env.OUT || 'bake/out'); fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: CHROME_ARGS }); const p = await b.newPage({ viewport: { width: 600, height: 600 } });
p.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 900)); }); p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:${srv.port}/bake/bake.html`); await p.waitForFunction('window.ready');
for (const id of ids) for (let f = 0; f < 6; f++) {
  const size = sizeArg || (id === 's22' || id === 's25' ? 3072 : 2048); const t0 = Date.now();
  const d = await p.evaluate(([id, f, size]) => window.bakeFace(id, f, size), [id, f, size]);
  fs.writeFileSync(path.join(outDir, `${id}_${f}.jpg`), Buffer.from(d.split(',')[1], 'base64')); console.log(id, f, size, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await b.close(); srv.close();
