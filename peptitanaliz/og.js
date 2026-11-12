/* Paylaşım görselleri (1200×630): rapor bağlantısı paylaşıldığında görünen "etiket / rapor" kartı.
   Yalnızca yeni bir gerçek kayıt eklendiğinde çalıştırılır; Playwright gerektirir: `node og.js` */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
global.window = global;
require('./data.js');
const num = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 3 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const r of global.PA_DATA.raporlar.filter((x) => !x.demo && x.miktar != null && x.foto)) {
    const marka = global.PA_DATA.markalar.find((m) => m.slug === r.marka).ad;
    const hesap = r.miktarBirim === 'mg/ml' && r.hacimMl;
    if (r.miktarBirim && !hesap) continue;
    const deger = hesap ? Math.round(r.miktar * r.hacimMl * 100) / 100 : r.miktar;
    const foto = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, r.foto)).toString('base64');
    await page.setContent(`<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600&family=Schibsted+Grotesk:wght@700;800&display=swap">
<style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#f3f2ef;color:#1f2226;font:500 26px/1.3 "Instrument Sans",sans-serif;display:grid;grid-template-columns:470px 1fr;gap:56px;padding:64px}
img{width:470px;height:470px;object-fit:cover;border-radius:8px;align-self:center}
.t{display:grid;align-content:space-between;height:502px}.logo{font:800 30px/1 "Schibsted Grotesk",sans-serif}.logo i{font-style:normal;color:#ff593d;margin:0 3px}
.b{color:#5a5f67;font-size:28px}h1{font:800 72px/1 "Schibsted Grotesk",sans-serif;letter-spacing:-2px;margin-top:6px}
.v{display:flex;gap:26px;align-items:stretch}.k{color:#5a5f67;font-size:24px}.n{font:800 62px/1.05 "Schibsted Grotesk",sans-serif;letter-spacing:-2px;white-space:nowrap}
.s{width:12px;background:#ff593d;transform:skewX(-16deg);margin:0 10px}.f{color:#5a5f67;font-size:22px}
</style>
<img src="${foto}" alt=""><div class="t"><div class="logo">PEPTİT<i>/</i>ANALİZ</div>
<div><div class="b">${esc(marka)}</div><h1>${esc(r.urun)}</h1></div>
<div class="v"><div><div class="k">Etikette</div><div class="n">${num(r.beyan)}&nbsp;${r.birim}</div></div><div class="s"></div>
<div><div class="k">${hesap ? num(r.hacimMl) + '&nbsp;ml için hesaplanan' : 'Laboratuvarın ölçtüğü'}</div><div class="n">${num(deger)}&nbsp;${r.birim}</div></div></div>
<div class="f">${esc(r.lab || '')} raporu · peptitanaliz.com</div></div>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(__dirname, 'paylasim', r.slug + '.png') });
    console.log('paylasim/' + r.slug + '.png');
  }
  await browser.close();
})();
