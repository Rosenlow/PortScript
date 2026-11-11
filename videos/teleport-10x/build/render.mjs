// node build/render.mjs [startSec=0] [endSec=600]  -> renders/parts/part_<start>.mp4 (30 s chunks, resumable)
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process'; import { fileURLToPath } from 'url';
import { serve, CHROME_ARGS } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const FPS = 30, CH = 30;
const t0 = +(process.argv[2] || 0), t1 = +(process.argv[3] || 600); const parts = path.join(root, 'renders/parts'); fs.mkdirSync(parts, { recursive: true });
const srv = await serve(root); let b, p;
async function open() {
  b = await chromium.launch({ args: CHROME_ARGS }); p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text().slice(0, 300)); });
  await p.goto(`http://localhost:${srv.port}/src/index.html?w=1920`); await p.waitForFunction('window.ready', null, { timeout: 180000 });
}
await open();
for (let s = Math.floor(t0 / CH) * CH; s < t1; s += CH) {
  const out = path.join(parts, `part_${String(s).padStart(3, '0')}.mp4`); if (fs.existsSync(out)) continue;
  const tmp = out + '.tmp.mp4'; const started = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', (c) => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
      for (let f = s * FPS; f < (s + CH) * FPS; f++) {
        const d = await p.evaluate((t) => window.frameJpeg(t, 0.96), f / FPS); const buf = Buffer.from(d.slice(23), 'base64');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await done; fs.renameSync(tmp, out); break;
    } catch (e) { console.log('retry chunk', s, e.message); try { await b.close(); } catch {} await open(); }
  }
  console.log(`part ${s}s done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
await b.close(); srv.close();
