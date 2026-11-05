// node build/stills.mjs <out-dir> t1 t2 ...   — seek the timeline and screenshot (1080x1920)
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)(process.env.PW || "playwright");
import path from "node:path";
const [out, ...ts] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
await p.goto("file://" + path.resolve("scenes/main/index.html")); await p.evaluate(() => document.fonts.ready);
for (const t of ts) { await p.evaluate(t => { window.__timelines.main.seek(+t, false); }, t); await p.waitForTimeout(60);
  await p.screenshot({ path: `${out}/t${String(t).padStart(5, "0")}.png` }); }
console.log(errs.length ? errs.join("\n") : "no page errors"); await b.close();
