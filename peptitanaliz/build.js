/* Peptit Analiz — siteyi üretir. Bağımlılık yok: `node build.js`
   - dist/                     yayımlanacak statik site (her rapor, marka ve yazı kendi adresinde)
   - `node build.js --tek-dosya <yol>`  ayrıca # adresli tek dosyalık önizleme üretir */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');
const SITE = 'https://peptitanaliz.com';
const FONTS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@500&family=Instrument+Sans:wght@400;500;600;700&display=swap';
const NOTICE = 'Peptit Analiz’de ürün satışı yapılmaz. Platform, farklı kaynaklardan derlenen laboratuvar raporlarını yayımlar.';
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function load(isStatic) {
  ['data.js', 'blog.js', 'app.js'].forEach((f) => delete require.cache[require.resolve(path.join(SRC, f))]);
  global.window = global;
  global.PA_STATIC = isStatic;
  require(path.join(SRC, 'data.js'));
  require(path.join(SRC, 'blog.js'));
  return require(path.join(SRC, 'app.js'));
}

function body(PA, view) {
  const nav = [['raporlar', 'Raporlar'], ['markalar', 'Markalar'], ['blog', 'Blog'], ['yayin-ilkeleri', 'Yayın ilkeleri']];
  return `<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="${PA.href('')}" aria-label="Peptit Analiz, ana sayfa">PEPTİT<i>/</i>ANALİZ</a>
    <nav aria-label="Ana menü">
      ${nav.map(([n, t]) => `<a href="${PA.href(n)}" data-nav="${n}"${view && view.nav === n ? ' aria-current="page"' : ''}>${t}</a>`).join('\n      ')}
    </nav>
    <button type="button" class="search-toggle" id="search-toggle" aria-expanded="false" aria-controls="site-search">Ara</button>
    <form class="site-search" id="site-search" role="search" autocomplete="off">
      <label class="sr" for="q">Marka, ürün veya lot numarasıyla ara</label>
      <input id="q" type="search" enterkeyhint="search" placeholder="Marka, ürün veya lot ara">
      <div class="search-results" id="search-results" hidden></div>
    </form>
  </div>
</header>
<main id="app" tabindex="-1">${view ? view.html : ''}</main>
<footer class="site-foot">
  <div class="wrap foot-row">
    <span class="logo small">PEPTİT<i>/</i>ANALİZ</span>
    <span>${NOTICE}</span>
    <span>“Demo veri” etiketli kayıtlar hayalîdir.</span>
    <a href="${PA.href('blog')}">Blog</a>
    <a href="${PA.href('yayin-ilkeleri')}">Yayın ilkeleri</a>
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
<meta property="og:url" content="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/styles.css">
${ld}</head>
<body>
${body(PA, view)}<script>window.PA_STATIC = true;</script>
<script src="/data.js"></script>
<script src="/app.js"></script>
</body>
</html>
`;
}

/* ---------- statik site ---------- */
const PA = load(true);
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
['styles.css', 'data.js', 'app.js'].forEach((f) => fs.copyFileSync(path.join(SRC, f), path.join(OUT, f)));
fs.cpSync(path.join(SRC, 'belgeler'), path.join(OUT, 'belgeler'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.htaccess'), 'ErrorDocument 404 /404.html\nOptions -Indexes\n');
console.log(`dist/: ${PA.routes().length} sayfa, site haritasında ${sitemap.length} adres`);

/* ---------- tek dosyalık önizleme (# adresli) ---------- */
const i = process.argv.indexOf('--tek-dosya');
if (i !== -1 && process.argv[i + 1]) {
  const SPA = load(false);
  fs.writeFileSync(process.argv[i + 1], `<title>Peptit Analiz</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="${FONTS}">
<style>
${read('styles.css')}</style>
${body(SPA, null)}<script>
${read('data.js')}</script>
<script>
${read('blog.js')}</script>
<script>
${read('app.js')}</script>
`);
  console.log('tek dosya: ' + process.argv[i + 1]);
}
