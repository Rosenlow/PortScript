/* Peptit Analiz — siteyi üretir. Bağımlılık yok: `node build.js`
   - dist/                     yayımlanacak statik site (her rapor, marka ve yazı kendi adresinde)
   - demo kayıtlar yayına girmez; `--demo` ile dist/ içinde de tutulur
   - `node build.js --tek-dosya <yol>`  ayrıca # adresli tek dosyalık önizleme üretir */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');
const SITE = 'https://peptitanaliz.com';
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@600;700;800&display=swap';
const NOTICE = 'Peptit Analiz’de ürün satışı yapılmaz. Dış laboratuvarların raporlarını burada bir araya getiriyoruz.';
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const KEEP_DEMO = process.argv.includes('--demo');
let dataJs = '';
/* yazilar/<adres>.html: başta '---' arasında alanlar (baslik, ozet, tarih, kategori, sira, urun, ilgili), sonra gövde. */
function posts() {
  const dir = path.join(SRC, 'yazilar');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort().map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    if (!m) throw new Error('Başlık bölümü eksik: yazilar/' + f);
    const p = { slug: f.replace(/\.html$/, ''), html: m[2].trim() };
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) p[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    p.sira = p.sira ? Number(p.sira) : 99;
    if (p.kapak && !fs.existsSync(path.join(SRC, p.kapak))) throw new Error('Kapak görseli yok: ' + p.kapak + ' (yazilar/' + f + ')');
    p.ilgili = p.ilgili ? p.ilgili.split(',').map((s) => s.trim()).filter(Boolean) : [];
    ['baslik', 'ozet', 'tarih', 'kategori'].forEach((k) => { if (!p[k]) throw new Error(k + ' eksik: yazilar/' + f); });
    return p;
  });
}
function load(isStatic, keepDemo) {
  ['data.js', 'app.js'].forEach((f) => delete require.cache[require.resolve(path.join(SRC, f))]);
  global.window = global;
  global.PA_STATIC = isStatic;
  require(path.join(SRC, 'data.js'));
  if (!keepDemo) {
    global.PA_DATA.raporlar = global.PA_DATA.raporlar.filter((r) => !r.demo);
    global.PA_DATA.markalar = global.PA_DATA.markalar.filter((m) => !m.demo);
  }
  dataJs = 'window.PA_DATA = ' + JSON.stringify(global.PA_DATA) + ';\n';
  global.PA_BLOG = posts();
  return require(path.join(SRC, 'app.js'));
}

function body(PA, view) {
  const nav = [['raporlar', 'Raporlar'], ['markalar', 'Markalar'], ['blog', 'Rehber'], ['yayin-ilkeleri', 'Yayın İlkeleri']];
  return `<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="${PA.href('')}" aria-label="Peptit Analiz, ana sayfa">PEPTİT<i>/</i>ANALİZ</a>
    <nav aria-label="Ana menü">
      ${nav.map(([n, t]) => `<a href="${PA.href(n)}" data-nav="${n}"${view && view.nav === n ? ' aria-current="page"' : ''}>${t}</a>`).join('\n      ')}
    </nav>
    <form class="searchbox" id="site-search" role="search" autocomplete="off">
      <label class="sr" for="q">Marka, ürün veya lot ara</label>
      <input id="q" type="search" enterkeyhint="search" placeholder="Marka, ürün veya lot ara">
      <div class="search-results" hidden></div>
    </form>
  </div>
</header>
<main id="app" tabindex="-1">${view ? view.html : ''}</main>
<footer class="site-foot">
  <div class="wrap foot-row">
    <span class="logo small">PEPTİT<i>/</i>ANALİZ</span>
    <span>${NOTICE}</span>
${PA.hasDemo ? '    <span>“Demo veri” etiketli kayıtlar hayalîdir.</span>\n' : ''}    <a href="${PA.href('blog')}">Rehber</a>
    <a href="${PA.href('yayin-ilkeleri')}">Yayın İlkeleri</a>
  </div>
</footer>
<dialog class="lightbox" id="lightbox" aria-label="Rapor belgesi">
  <div class="lightbox-bar"><a id="lightbox-link" href="#" target="_blank" rel="noopener">Yeni sekmede aç ↗</a><button type="button" class="btn small" data-close>Kapat</button></div>
  <img id="lightbox-img" alt="">
</dialog>
`;
}

function page(PA, name, view) {
  const url = SITE + PA.href(name);
  const title = view.title ? `${view.title} · Peptit Analiz` : 'Peptit Analiz – Peptit analiz raporları arşivi';
  const ld = view.post ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article', headline: view.post.baslik, description: view.post.ozet,
    datePublished: view.post.tarih, dateModified: view.post.guncelleme || view.post.tarih, inLanguage: 'tr',
    mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Peptit Analiz' }, publisher: { '@type': 'Organization', name: 'Peptit Analiz' }
  })}</script>\n` : '';
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(view.desc)}">
${view.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:site_name" content="Peptit Analiz">
<meta property="og:type" content="${view.post ? 'article' : 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(view.desc)}">
<meta property="og:url" content="${url}">${view.rapor && fs.existsSync(path.join(SRC, 'paylasim', view.rapor + '.png')) ? `\n<meta property="og:image" content="${SITE}/paylasim/${view.rapor}.png">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/styles.css?v=${VER}">
${ld}</head>
<body${view.home ? ' class="is-home"' : ''}>
${body(PA, view)}<script>window.PA_STATIC = true;</script>
<script src="/data.js?v=${VER}"></script>
<script src="/app.js?v=${VER}"></script>
</body>
</html>
`;
}

/* ---------- statik site ---------- */
const PA = load(true, KEEP_DEMO);
const distData = dataJs;
/* Stil ve betik adreslerine içerik özeti eklenir; dosya değişince tarayıcılar eski kopyayı kullanamaz. */
const VER = require('crypto').createHash('sha1').update(read('styles.css') + read('app.js') + distData).digest('hex').slice(0, 10);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const sitemap = [];
for (const name of PA.routes()) {
  const view = PA.render(name);
  const dir = path.join(OUT, PA.href(name));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(PA, name, view));
  if (!view.noindex) sitemap.push(SITE + PA.href(name));
}
fs.writeFileSync(path.join(OUT, '404.html'), page(PA, 'bulunamadi', PA.render('bulunamadi')));
['styles.css', 'app.js'].forEach((f) => fs.copyFileSync(path.join(SRC, f), path.join(OUT, f)));
fs.writeFileSync(path.join(OUT, 'data.js'), distData);
fs.cpSync(path.join(SRC, 'belgeler'), path.join(OUT, 'belgeler'), { recursive: true });
['gorseller', 'paylasim'].forEach((d) => { if (fs.existsSync(path.join(SRC, d))) fs.cpSync(path.join(SRC, d), path.join(OUT, d), { recursive: true }); });
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.htaccess'), 'ErrorDocument 404 /404.html\nOptions -Indexes\n');
console.log(`dist/: ${PA.routes().length} sayfa, site haritasında ${sitemap.length} adres`);

/* ---------- tek dosyalık önizleme (# adresli) ---------- */
const i = process.argv.indexOf('--tek-dosya');
if (i !== -1 && process.argv[i + 1]) {
  const SPA = load(false, true);
  fs.writeFileSync(process.argv[i + 1], `<title>Peptit Analiz</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
${read('styles.css')}</style>
${body(SPA, null)}<script>
${read('data.js')}</script>
<script>
window.PA_BLOG = ${JSON.stringify(posts()).replace(/</g, '\\u003c')};</script>
<script>
${read('app.js')}</script>
`);
  console.log('tek dosya: ' + process.argv[i + 1]);
}
