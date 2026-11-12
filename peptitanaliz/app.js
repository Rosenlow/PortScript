/* Peptit Analiz — sayfa üretimi ve etkileşim. Aynı dosya iki yerde çalışır:
   - build.js içinde (Node): her adres için hazır HTML üretir (/rapor/<kayıt>/, /blog/<yazı>/ ...).
   - tarayıcıda: arama, filtreler, kopyalama ve belge büyütme. Tek dosyalık önizlemede adresler #ad biçimindedir. */
(function (root) {
  'use strict';

  var HAS_DOM = typeof document !== 'undefined';
  var DATA = root.PA_DATA, BLOG = (root.PA_BLOG || []).slice().sort(function (a, b) {
    return a.tarih !== b.tarih ? (a.tarih < b.tarih ? 1 : -1) : (a.sira || 99) - (b.sira || 99);
  });
  var KATEGORILER = ['Rapor okuma', 'Peptit profilleri', 'Temel bilgiler', 'Mevzuat ve spor'];
  var STATIC = !!root.PA_STATIC, BASE = root.PA_BASE || '/';
  /* Adres adı ('rapor-x', 'blog', 'marka-y') → bağlantı. */
  function href(name) {
    if (!STATIC) return '#' + (name || 'ana-sayfa');
    if (!name || name === 'ana-sayfa') return BASE;
    var m = /^(rapor|marka|blog|belge|dogrulama)-(.+)$/.exec(name);
    return BASE + (m ? m[1] + '/' + m[2] : name) + '/';
  }
  function asset(p) { return STATIC && !/^(https?:|\/)/.test(p) ? BASE + p : p; }
  function target(url) { return url.charAt(0) === '#' ? href(url.slice(1)) : asset(url); }
  var TOL = DATA.tolerans;
  var NOTICE = 'Burada ürün satışı yapılmaz. Farklı laboratuvarların raporlarını bir araya getiriyoruz.';
  var YOK = 'Raporda belirtilmemiş';
  var app = HAS_DOM ? document.getElementById('app') : { innerHTML: '' };
  var filters = { q: '', marka: '', lab: '', bulgu: '' };

  var markaBySlug = {};
  DATA.markalar.forEach(function (m) { markaBySlug[m.slug] = m; });
  var RAPORLAR = DATA.raporlar.slice().sort(function (a, b) { return a.tarih < b.tarih ? 1 : -1; });
  var raporBySlug = {};
  var HAS_DEMO = RAPORLAR.some(function (r) { return r.demo; });
  RAPORLAR.forEach(function (r) {
    raporBySlug[r.slug] = r;
    /* Derişim + belgelenmiş hacim varsa toplam miktar hesaplanır; hacim yoksa karşılaştırma yapılmaz. */
    if (r.miktarBirim === 'mg/ml' && r.birim === 'mg' && r.hacimMl && r.miktar != null) {
      r.derisim = r.miktar; r.miktar = Math.round(r.derisim * r.hacimMl * 100) / 100; r.miktarBirim = null;
    }
  });

  /* ---------- yardımcılar ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return n.toLocaleString('tr-TR', { maximumFractionDigits: 3 }); }
  var dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  function date(iso) { return dateFmt.format(new Date(iso + 'T00:00:00Z')); }
  function time(iso) { return '<time datetime="' + iso + '">' + date(iso) + '</time>'; }
  function markaAd(r) { return markaBySlug[r.marka].ad; }
  function birimli(n, birim) { return num(n) + '\u00a0' + birim; } // sayı ile birim aynı satırda kalır
  function beyanAd(r) { return birimli(r.beyan, r.birim); }
  function urunAd(r) { return r.urun + ' ' + beyanAd(r); }
  function taraf(r, p) {
    if (!p) return 'Belirtilmemiş';
    if (p.tur === 'platform') return 'Peptit Analiz';
    if (p.tur === 'marka') return markaAd(r) + ' (marka)';
    if (p.tur === 'okuyucu') return 'Okuyucu';
    return 'Belirtilmemiş';
  }
  function labAd(r) { return r.lab || 'Belirtilmemiş'; }
  /* Miktar yalnızca etiketle aynı birimdeyse karşılaştırılır. */
  function comparable(r) { return r.miktar != null && (!r.miktarBirim || r.miktarBirim === r.birim); }
  function sapma(r) { return comparable(r) ? Math.round((r.miktar - r.beyan) / r.beyan * 100) : null; }
  function yuzde(d) { return (d < 0 ? '−' : d > 0 ? '+' : '') + '%' + Math.abs(d); }
  function lotOncesi(r) { return r.lot ? r.lot + ' lotundan incelenen numunede' : 'Lot numarası belirtilmemiş numunede'; }

  var BULGULAR = {
    sapma: 'Etiketten %' + TOL + '’dan fazla fark',
    uyumlu: 'Etikete yakın (±%' + TOL + ')',
    kimlik: 'Kimlik doğrulanamadı',
    karsilastirilamadi: 'Etiketle karşılaştırılamadı',
    olculmedi: 'Miktar raporda yok'
  };
  /* Bir kaydın sonucunu gündelik dille özetler. Laboratuvarın ölçtüğü değer ile ondan hesaplanan
     değer ayrı tutulur; fark bir hükme ya da uyarıya çevrilmez. */
  function bulgu(r) {
    var b = { key: 'olculmedi', etiket: 'Laboratuvarın ölçtüğü', deger: null, aciklama: '', fark: null };
    if (r.kimlik === 'dogrulanamadi') {
      b.key = 'kimlik'; b.etiket = 'Kimlik'; b.deger = 'Doğrulanamadı';
      b.aciklama = 'Laboratuvar bu numunede etikette yazan maddeyi (' + r.urun + ') doğrulayamadı.';
    } else if (comparable(r)) {
      var olc = birimli(r.miktar, r.birim), d = r.miktar - r.beyan;
      var pct = Math.round(Math.abs(d) / r.beyan * 1000) / 10;
      b.key = pct > TOL ? 'sapma' : 'uyumlu';
      b.deger = olc;
      if (r.derisim != null) {
        b.etiket = num(r.hacimMl) + ' ml için hesaplanan';
        b.aciklama = 'Laboratuvar her 1 ml’de ' + birimli(r.derisim, r.birim) + ' ölçtü. Şişe üzerinde yazan ' + num(r.hacimMl) + ' ml üzerinden hesaplandığında toplam ' + olc + ' ediyor.';
      } else {
        b.aciklama = 'Laboratuvar bu numunede ' + olc + ' ölçtü.';
      }
      b.fark = d === 0 ? 'Etiketle aynı'
        : 'Etiketten ' + birimli(Math.round(Math.abs(d) * 100) / 100, r.birim) + (d > 0 ? ' fazla' : ' az') + ' (%' + num(pct) + ')';
    } else if (r.miktar != null) {
      b.key = 'karsilastirilamadi'; b.deger = birimli(r.miktar, r.miktarBirim);
      b.aciklama = 'Laboratuvar her 1 ml’de ' + birimli(r.miktar, r.birim) + ' ölçtü. Şişe hacmi bilinmediği için etiketteki toplam miktarla karşılaştırılamıyor.';
    } else {
      b.aciklama = r.saflik != null ? 'Bu raporda yalnızca saflık ölçüldü (%' + num(r.saflik) + '). Miktar ölçülmediği için etiketle karşılaştırılamıyor.'
        : 'Bu raporda miktar ölçülmedi.';
    }
    b.satir = b.key === 'kimlik' ? 'Etikette yazan madde doğrulanamadı.'
      : b.deger ? 'Etikette ' + beyanAd(r) + ', ' + b.etiket.toLocaleLowerCase('tr') + ' ' + b.deger + '.'
      : (r.saflik != null ? 'Yalnızca saflık ölçüldü: %' + num(r.saflik) + '.' : 'Miktar ölçülmedi.');
    return b;
  }
  /* İki sade ölçüm, altında açıklama ve varsa fark. */
  function sonuc(r) {
    var b = bulgu(r);
    return '<dl class="measures"><div><dt>Etikette yazan</dt><dd>' + esc(beyanAd(r)) + '</dd></div>' +
      '<div><dt>' + esc(b.etiket) + '</dt><dd' + (b.deger ? '' : ' class="none"') + '>' + esc(b.deger || 'Raporda yok') + '</dd></div></dl>' +
      '<p class="explain">' + esc(b.aciklama) + '</p>' + (b.fark ? '<p class="diff">' + esc(b.fark) + '</p>' : '');
  }

  /* Türkçe harfleri ve ayraçları yok sayan arama: "yg slk", "YGSLK0690", "kestrel" eşleşir. */
  function norm(s) {
    return String(s).toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function compact(s) { return norm(s).replace(/[^a-z0-9]/g, ''); }
  RAPORLAR.forEach(function (r) { r._hay = compact(markaAd(r) + urunAd(r) + (r.lot || '') + (r.raporNo || '')); });
  function matchesQuery(r, q) {
    var tokens = norm(q).split(/\s+/).map(compact).filter(Boolean);
    return tokens.length > 0 && tokens.every(function (t) { return r._hay.indexOf(t) !== -1; });
  }
  function filtered(list) {
    return list.filter(function (r) {
      return (!filters.q.trim() || matchesQuery(r, filters.q)) &&
        (!filters.marka || r.marka === filters.marka) &&
        (!filters.lab || labAd(r) === filters.lab) &&
        (!filters.bulgu || bulgu(r).key === filters.bulgu);
    });
  }

  var demoTag = '<span class="demo">Demo veri</span>';
  var ICONS = '<svg class="i-copy" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/></svg>' +
    '<svg class="i-ok" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';
  function copyBtn(targetId, label) {
    return '<button type="button" class="icon-btn" data-copy-el="' + targetId + '" aria-label="' + label + '">' + ICONS + '</button>';
  }

  /* Demo kayıtlar için temsili flakon çizimi; etiket metni kayıttan gelir. */
  function vial(r) {
    return '<svg class="vial" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Temsili görsel: ' + esc(markaAd(r) + ' ' + urunAd(r)) + ' flakonu">' +
      '<rect class="bg" width="400" height="400"/>' +
      '<g transform="rotate(-9 200 200) translate(-10 -20) scale(1.15)">' +
        '<rect class="cap" x="140" y="18" width="120" height="50" rx="7"/>' +
        '<rect class="crimp" x="135" y="66" width="130" height="18"/>' +
        '<rect class="glass" x="158" y="84" width="84" height="30"/>' +
        '<rect class="glass" x="96" y="112" width="208" height="360" rx="30"/>' +
        '<rect class="cake" x="104" y="372" width="192" height="92" rx="20"/>' +
        '<rect class="shine" x="110" y="134" width="9" height="34" rx="4"/>' +
        '<rect class="label" x="96" y="176" width="208" height="170"/>' +
        '<text x="112" y="208" font-size="19">' + esc(markaAd(r)) + '</text>' +
        '<text x="112" y="250" font-size="36">' + esc(r.urun) + '</text>' +
        '<rect class="dose" x="112" y="266" width="' + (beyanAd(r).length * 12 + 18) + '" height="30"/>' +
        '<text x="121" y="289" font-size="24">' + esc(beyanAd(r)) + '</text>' +
        '<text class="t-lot" x="112" y="328" font-size="13">LOT ' + esc(r.lot || '') + '</text>' +
      '</g></svg>';
  }
  function thumb(r) {
    if (r.foto || r.gorsel) return '<img src="' + esc(asset(r.foto || r.gorsel)) + '" alt="" loading="lazy">';
    return r.demo ? vial(r) : '';
  }

  /* Yatay ölçüm grafiği: ölçek sıfırdan başlar, beyan ince çizgi, ölçülen dolu çubuk. */
  function kaynakCumle(r) {
    var lab = r.lab ? 'Analizi ' + r.lab + ' gerçekleştirdi.' : 'Analizi yapan laboratuvar belirtilmemiş.';
    if (!r.gonderen) return 'Numuneyi kimin gönderdiği belirtilmemiş. ' + lab;
    if (r.gonderen.tur === 'platform') return 'Numuneyi Peptit Analiz gönderdi. ' + lab;
    if (r.gonderen.tur === 'marka') return 'Numuneyi ' + markaAd(r) + ' gönderdi. ' + lab;
    return 'Numuneyi bir okuyucu gönderdi. ' + lab;
  }

  /* ---------- ana sayfa ---------- */
  function searchBox(id, cls) {
    return '<form class="searchbox ' + cls + '" id="' + id + '" role="search" autocomplete="off">' +
      '<label class="sr" for="' + id + '-q">Marka, ürün veya lot numarası ara</label>' +
      '<input id="' + id + '-q" type="search" enterkeyhint="search" placeholder="Marka, ürün veya lot numarası ara">' +
      '<div class="search-results" hidden></div></form>';
  }
  function fileRow(r) {
    var t = thumb(r);
    return '<li><a class="file' + (t ? '' : ' no-thumb') + '" href="' + href('rapor-' + r.slug) + '">' + (t ? '<span class="thumb">' + t + '</span>' : '') +
      '<span class="name">' + esc(r.urun) + (r.demo ? demoTag : '') + '</span>' +
      '<span class="what">' + esc(markaAd(r)) + ' · ' + esc(bulgu(r).satir) + '</span>' + time(r.tarih) + '</a></li>';
  }
  function reportCard(r) {
    var foto = r.foto ? '<img src="' + esc(asset(r.foto)) + '" alt="' + esc(r.fotoAlt || '') + '">' : (r.demo ? vial(r) : '');
    return '<article class="report-card' + (foto ? '' : ' no-photo') + '">' +
      (foto ? '<a class="rc-photo" href="' + href('rapor-' + r.slug) + '" tabindex="-1" aria-hidden="true">' + foto + '</a>' : '') +
      '<div class="rc-head"><h3><a href="' + href('rapor-' + r.slug) + '">' + esc(r.urun) + '</a></h3>' +
        '<p class="rc-brand">' + esc(markaAd(r)) + (r.demo ? ' ' + demoTag : '') + '</p>' +
        '<p class="rc-meta">' + esc(labAd(r)) + ' raporu · ' + time(r.tarih) + '</p></div>' +
      '<div class="rc-result">' + sonuc(r) + '<a class="btn primary" href="' + href('rapor-' + r.slug) + '">Raporu gör</a></div></article>';
  }
  function viewHome() {
    var one = RAPORLAR[0], rest = RAPORLAR.slice(1);
    var kapakli = BLOG.filter(function (p) { return p.kapak; }).slice(0, 2);
    var diger = BLOG.filter(function (p) { return kapakli.indexOf(p) === -1; }).slice(0, kapakli.length ? 4 : 6);
    app.innerHTML =
      '<section class="wrap hero"><h1>Peptit analiz raporları</h1>' + searchBox('hero-search', 'big') +
        '<p class="note">' + NOTICE + '</p></section>' +
      (one ? '<section class="wrap block" aria-labelledby="h-son"><div class="block-head"><h2 id="h-son">Son rapor</h2>' +
        '<a class="more" href="' + href('raporlar') + '">Tüm raporlar</a></div>' + reportCard(one) +
        (rest.length ? '<h2 class="sub">Önceki raporlar</h2><ul class="files">' + rest.slice(0, 8).map(fileRow).join('') + '</ul>' : '') +
        (HAS_DEMO ? '<p class="muted small">Demo kayıtlardaki ürün görselleri temsilidir.</p>' : '') + '</section>' : '') +
      (BLOG.length ? '<section class="wrap block" aria-labelledby="h-rehber"><div class="block-head"><h2 id="h-rehber">Rehber</h2>' +
        '<a class="more" href="' + href('blog') + '">Tüm yazılar</a></div>' +
        (kapakli.length ? '<ul class="guide-cards">' + kapakli.map(guideCard).join('') + '</ul>' : '') +
        '<ul class="posts">' + diger.map(postRow).join('') + '</ul></section>' : '') +
      '<div class="tail"></div>';
  }

  /* ---------- arşiv ---------- */
  function table(list, opts) {
    opts = opts || {};
    return '<table class="rows"><thead><tr>' +
      '<th scope="col">' + (opts.hideBrand ? 'Ürün' : 'Ürün ve marka') + '</th><th scope="col">Lot</th><th scope="col">Laboratuvar</th><th scope="col">Sonuç</th><th scope="col">Rapor tarihi</th>' +
      '</tr></thead><tbody>' + list.map(function (r) {
        var b = bulgu(r);
        return '<tr data-href="' + href('rapor-' + r.slug) + '">' +
          '<td class="c-name"><a href="' + href('rapor-' + r.slug) + '">' + esc(r.urun) + '</a>' + (r.demo ? demoTag : '') +
            '<span class="brand">' + (opts.hideBrand ? '' : esc(markaAd(r)) + ' · ') + 'etikette ' + esc(beyanAd(r)) + '</span></td>' +
          '<td class="c-lot' + (r.lot ? '' : ' none') + '">' + esc(r.lot || 'Belirtilmemiş') + '</td>' +
          '<td class="c-lab">' + esc(labAd(r)) + '</td>' +
          '<td class="c-find"><b>' + esc(b.deger ? b.etiket + ': ' + b.deger : BULGULAR[b.key]) + '</b>' + (b.fark ? '<span>' + esc(b.fark) + '</span>' : '') + '</td>' +
          '<td class="c-date">' + time(r.tarih) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function viewArsiv() {
    var labs = [];
    RAPORLAR.forEach(function (r) { if (labs.indexOf(labAd(r)) === -1) labs.push(labAd(r)); });
    labs.sort(function (a, b) { return a.localeCompare(b, 'tr'); });
    function options(pairs, sel) {
      return pairs.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (p[0] === sel ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('');
    }
    app.innerHTML = '<div class="wrap page"><header class="page-head"><h1>Tüm raporlar</h1>' +
      '<p class="lede">Marka, laboratuvar ve sonuca göre süzebilirsiniz.</p></header>' +
      '<section class="block" aria-label="Arşiv"><div class="toolbar">' +
        '<label class="t-q" for="f-q">Arşivde ara<input id="f-q" type="search" placeholder="Marka, ürün veya lot" value="' + esc(filters.q) + '"></label>' +
        '<label for="f-marka">Marka<select id="f-marka">' + options([['', 'Tüm markalar']].concat(DATA.markalar.map(function (m) { return [m.slug, m.ad]; })), filters.marka) + '</select></label>' +
        '<label for="f-lab">Laboratuvar<select id="f-lab">' + options([['', 'Tüm laboratuvarlar']].concat(labs.map(function (l) { return [l, l]; })), filters.lab) + '</select></label>' +
        '<label class="t-find" for="f-bulgu">Sonuç<select id="f-bulgu">' + options([['', 'Tüm sonuçlar']].concat(Object.keys(BULGULAR).map(function (k) { return [k, BULGULAR[k]]; })), filters.bulgu) + '</select></label>' +
      '</div><div id="results" aria-live="polite">' + resultsHtml() + '</div></section></div>';
    return 'Tüm raporlar';
  }
  function bindArsiv() {
    var fq = document.getElementById('f-q');
    if (!fq || fq._bound) return;
    fq._bound = true;
    fq.addEventListener('input', function (e) { filters.q = e.target.value; renderResults(); });
    ['marka', 'lab', 'bulgu'].forEach(function (k) {
      document.getElementById('f-' + k).addEventListener('change', function (e) { filters[k] = e.target.value; renderResults(); });
    });
  }
  function resultsHtml() {
    var list = filtered(RAPORLAR), q = filters.q.trim();
    var active = q || filters.marka || filters.lab || filters.bulgu;
    var clear = '<button type="button" class="btn small" data-clear>Filtreleri temizle</button>';
    if (!list.length) {
      return '<div class="empty"><strong>' + (q ? '“' + esc(q) + '” için kayıt bulunamadı.' : 'Seçili filtrelerle eşleşen kayıt yok.') + '</strong>' +
        '<p class="muted">' + (q ? 'Lot numarasını etikette yazdığı gibi yazmayı ya da yalnızca marka adıyla aramayı dene. ' : '') +
        'Arşivde bu ürünün raporu henüz olmayabilir.</p>' + clear + '</div>';
    }
    return '<div class="status"><span>' + (active ? list.length + ' / ' + RAPORLAR.length + ' kayıt gösteriliyor' : RAPORLAR.length + ' kayıt, en yeni rapor üstte') + '</span>' + (active ? clear : '') + '</div>' + table(list);
  }
  function renderResults() {
    var box = document.getElementById('results');
    if (box) box.innerHTML = resultsHtml();
  }
  function clearFilters() {
    filters = { q: '', marka: '', lab: '', bulgu: '' };
    ['f-q', 'f-marka', 'f-lab', 'f-bulgu'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    renderResults();
  }

  /* ---------- rapor ---------- */
  function viewRapor(r) {
    var isImg = r.belgeUrl && /\.(webp|png|jpe?g|gif)$/i.test(r.belgeUrl);
    var belgeBtn = !r.belgeUrl ? ''
      : isImg ? '<a class="btn primary" href="' + esc(target(r.belgeUrl)) + '" data-zoom="' + esc(target(r.belgeUrl)) + '">Orijinal raporu aç</a>'
      : '<a class="btn primary" href="' + esc(target(r.belgeUrl)) + '"' + (r.belgeUrl.charAt(0) === '#' ? '' : ' target="_blank" rel="noopener"') + '>Orijinal raporu aç</a>';
    var dogrulama = '';
    if (r.dogrulamaUrl) {
      var ext = r.dogrulamaUrl.charAt(0) !== '#';
      dogrulama = '<p class="verify"><a href="' + esc(target(r.dogrulamaUrl)) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(labAd(r)) + ' doğrulama sayfası</a>' +
        (r.dogrulamaAnahtari ? '<span class="key">Anahtar <code id="dogrulama-anahtari">' + esc(r.dogrulamaAnahtari) + '</code>' + copyBtn('dogrulama-anahtari', 'Doğrulama anahtarını kopyala') + '</span>' : '') + '</p>';
    }
    var diger = [
      ['Saflık', r.saflik != null ? '%' + num(r.saflik) : null],
      ['Kimlik', r.kimlik === 'dogrulandi' ? 'Doğrulandı' : r.kimlik === 'dogrulanamadi' ? 'Doğrulanamadı' : null]
    ];
    var log = [];
    if (r.yanit) log.push({ tarih: r.yanit.tarih, kim: 'Marka yanıtı · ' + markaAd(r), metin: r.yanit.metin });
    (r.duzeltmeler || []).forEach(function (x) { log.push({ tarih: x.tarih, kim: 'Düzeltme · Peptit Analiz', metin: x.metin }); });
    log.sort(function (a, c) { return a.tarih < c.tarih ? -1 : 1; });

    app.innerHTML = '<div class="wrap page report">' +
      '<p class="crumb"><a href="' + href('raporlar') + '">Raporlar</a> / <a href="' + href('marka-' + r.marka) + '">' + esc(markaAd(r)) + '</a></p>' +
      '<header class="r-head"><h1>' + esc(r.urun) + '</h1>' +
        '<p class="r-brand"><a href="' + href('marka-' + r.marka) + '">' + esc(markaAd(r)) + '</a>' + (r.demo ? ' ' + demoTag : '') + '</p>' +
        '<p class="lotline"><span>Lot</span>' + (r.lot ? '<code id="lot-no">' + esc(r.lot) + '</code>' + copyBtn('lot-no', 'Lot numarasını kopyala') : '<span class="none">' + YOK + '</span>') + '</p></header>' +
      '<section class="card" aria-labelledby="h-sonuc"><h2 id="h-sonuc">Sonuç ne söylüyor?</h2>' + sonuc(r) +
        '<dl class="facts tight">' + diger.map(function (o) {
          return '<div><dt>' + o[0] + '</dt><dd' + (o[1] ? '' : ' class="none"') + '>' + esc(o[1] || YOK) + '</dd></div>';
        }).join('') + '</dl>' +
        '<p class="muted small">Bu sonuç yalnızca analiz edilen numuneye' + (r.lot ? ' ve ' + esc(r.lot) + ' lotuna' : '') + ' aittir.</p></section>' +
      '<section class="card doc" aria-labelledby="h-belge"><h2 id="h-belge">Orijinal rapor</h2><div class="doc-row">' +
        (isImg ? '<button type="button" class="doc-thumb" data-zoom="' + esc(target(r.belgeUrl)) + '" aria-label="Raporu büyüt"><img src="' + esc(target(r.belgeUrl)) + '" alt="' + esc(r.gorselAlt || 'Rapor belgesi') + '" loading="lazy"></button>' : '') +
        '<div class="doc-info">' +
          (r.belgeUrl ? '<p>' + esc(labAd(r)) + ' tarafından düzenlenen raporun kendisi.' + (r.raporNo ? ' Görev numarası ' + esc(r.raporNo) + '.' : '') + '</p>' + belgeBtn
            : '<p>Bu kayıt için rapor belgesi iletilmedi. Değerler raporu sağlayanın beyanına dayanıyor.</p>') +
          (dogrulama || (r.belgeUrl ? '<p class="muted small">Bu rapor için laboratuvar doğrulama bağlantısı yok.</p>' : '')) +
        '</div></div></section>' +
      '<section class="card" aria-labelledby="h-kaynak"><h2 id="h-kaynak">Numune ve kaynak bilgileri</h2>' +
        '<p>' + esc(kaynakCumle(r)) + '</p><div class="source-row">' +
        '<dl class="facts">' +
          '<div><dt>Analizi yapan laboratuvar</dt><dd>' + esc(labAd(r)) + '</dd></div>' +
          '<div><dt>Numuneyi gönderen</dt><dd>' + esc(taraf(r, r.gonderen)) + '</dd></div>' +
          '<div><dt>Raporu sağlayan</dt><dd>' + esc(taraf(r, r.saglayan)) + '</dd></div>' +
          '<div><dt>Rapor tarihi</dt><dd>' + time(r.tarih) + '</dd></div>' +
          (r.hacimMl ? '<div><dt>Şişe hacmi</dt><dd>' + num(r.hacimMl) + ' ml' + (r.hacimKaynak ? '<small>' + esc(r.hacimKaynak) + '</small>' : '') + '</dd></div>' : '') +
        '</dl>' +
        (r.foto ? '<figure class="sample"><img src="' + esc(asset(r.foto)) + '" alt="' + esc(r.fotoAlt || '') + '" loading="lazy"><figcaption>' + esc(r.fotoAlt || '') + '</figcaption></figure>'
          : r.demo ? '<figure class="sample">' + vial(r) + '<figcaption>Temsili görsel. Demo kayıt.</figcaption></figure>' : '') +
        '</div>' + (r.etiketNotu ? '<p class="muted small">' + esc(r.etiketNotu) + '</p>' : '') +
        '<p class="note">' + NOTICE + ' Peptit Analiz analiz yapmaz; dış laboratuvarların raporlarını derler ve yayımlar.</p></section>' +
      (log.length ? '<section class="card" aria-labelledby="h-log"><h2 id="h-log">Marka yanıtı ve düzeltmeler</h2><ol class="log">' + log.map(function (x) {
        return '<li>' + time(x.tarih) + '<p><b>' + esc(x.kim) + '</b>' + esc(x.metin) + '</p></li>';
      }).join('') + '</ol></section>' : '') +
      '</div><div class="tail"></div>';
    return markaAd(r) + ' ' + urunAd(r).replace(/ /g, ' ') + (r.lot ? ' · Lot ' + r.lot : '');
  }

  /* ---------- markalar ---------- */
  function raporlarOf(slug) { return RAPORLAR.filter(function (r) { return r.marka === slug; }); }
  function viewMarkalar() {
    app.innerHTML = '<div class="wrap page"><header class="page-head"><h1>Markalar</h1>' +
      '<p class="lede">Arşivde en az bir raporu bulunan markalar. Bir markanın burada yer alması olumlu ya da olumsuz bir değerlendirme anlamına gelmez.</p></header>' +
      '<section class="block"><ul class="brand-list">' + DATA.markalar.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); }).map(function (m) {
        var rs = raporlarOf(m.slug);
        return '<li><a href="' + href('marka-' + m.slug) + '"><strong>' + esc(m.ad) + (m.demo ? ' ' + demoTag : '') + '</strong>' +
          '<span>' + rs.length + ' rapor' + (rs[0] ? ' · son rapor ' + date(rs[0].tarih) : '') + '</span></a></li>';
      }).join('') + '</ul></section></div><div class="tail"></div>';
    return 'Markalar';
  }
  function viewMarka(m) {
    var rs = raporlarOf(m.slug);
    app.innerHTML = '<div class="wrap page"><header class="page-head"><p class="crumb"><a href="' + href('markalar') + '">Markalar</a></p>' +
      '<h1>' + esc(m.ad) + '</h1>' + (m.demo ? '<div>' + demoTag + '</div>' : '') +
      '<p class="lede">' + rs.length + ' rapor, en yenisi üstte. Her sonuç yalnızca yanında yazan numuneye ve lota aittir; markanın diğer ürünleri için sonuç sayılmaz.</p></header>' +
      '<section class="block" aria-label="Raporlar">' + table(rs, { hideBrand: true }) + '<p class="note">' + NOTICE + '</p></section></div><div class="tail"></div>';
    return m.ad;
  }

  /* ---------- yayın ilkeleri ---------- */
  function viewIlkeler() {
    app.innerHTML = '<div class="wrap page"><header class="page-head"><h1>Yayın İlkeleri</h1>' +
      '<p class="lede">Peptit Analiz, peptit ürünlerine ait laboratuvar raporlarını derler ve herkese açık yayımlar. Analizleri Peptit Analiz yapmaz; dış laboratuvarlar yapar.</p></header>' +
      '<div class="prose">' +
      '<section><h2>Raporlar nereden gelir</h2><p>Arşivdeki raporların üç kaynağı vardır. Her kayıtta numuneyi gönderen, raporu sağlayan ve analizi yapan laboratuvar ayrı ayrı yazılır.</p><ul>' +
        '<li><b>Peptit Analiz’in gönderdiği numuneler.</b> Numuneyi platform temin eder ve Janoshik gibi bir dış laboratuvara gönderir.</li>' +
        '<li><b>Markaların ilettiği raporlar.</b> Numuneyi markanın seçtiği ve gönderdiği kayıtta açıkça belirtilir.</li>' +
        '<li><b>Okuyucuların ilettiği raporlar.</b> Numunenin nasıl temin edildiği ve saklandığı doğrulanamaz.</li>' +
        '</ul><p>Bilinmeyen her alana “Belirtilmemiş” yazılır.</p></section>' +
      '<section><h2>Sonuçlar nasıl özetlenir</h2><ul>' +
        '<li>Her başlık, raporda yazan değeri aktarır ve yalnızca o numune ile lot için geçerlidir. Markanın başka lotları ya da ürünleri için genelleme yapılmaz.</li>' +
        '<li>Ölçüm farkından “sahte”, “tehlikeli” ya da “güvenli” gibi bir hüküm çıkarılmaz.</li>' +
        '<li>Etikette yazan miktar ile laboratuvarın ölçtüğü miktar yan yana gösterilir; fark miligram ve yüzde olarak yazılır. Fark kendiliğinden bir uyarıya çevrilmez. Arşivde %' + TOL + '’u aşan farklar ayrıca süzülebilir.</li>' +
        '<li>Rapor derişim (mg/ml) veriyorsa ve şişe hacmi biliniyorsa toplam miktar hesaplanır ve “hesaplanan” olarak belirtilir. Laboratuvarın ölçtüğü değer derişimdir; toplam, hacme dayanan bir hesaptır. Hacim bilinmiyorsa karşılaştırma yapılmaz.</li>' +
        '<li>Raporda bulunmayan ölçüme “Raporda belirtilmemiş” yazılır. Yalnızca saflık sonucu olan bir kayıt miktar açısından değerlendirilmez.</li>' +
        '</ul></section>' +
      '<section><h2>Belgeler ve görseller</h2><p>Her kayıtta orijinal rapor belgesi ve varsa laboratuvarın kendi doğrulama bağlantısı yer alır. Belge yoksa bu açıkça yazılır.' + (HAS_DEMO ? ' Demo kayıtlardaki ürün görselleri temsilidir ve böyle işaretlenir.' : '') + '</p></section>' +
      '<section><h2>Marka yanıtları</h2><p>Etiket beyanından sapan bir sonuç yayımlandığında ilgili marka yanıt verebilir. Yanıt, tarihiyle birlikte ve içeriği değiştirilmeden rapor sayfasında yayımlanır. Markanın ilettiği yeni rapor ayrı bir kayıt olarak eklenir; önceki kayıt silinmez.</p></section>' +
      '<section><h2>Düzeltmeler</h2><p>Yanlış girilen bir değer, tarih ya da kaynak bilgisi düzeltilir. Her düzeltme, neyin değiştiği ve tarihiyle birlikte rapor sayfasında kalır. Yayımlanan kayıtlar sessizce değiştirilmez ya da kaldırılmaz.</p></section>' +
      '<section><h2>Satış ve tavsiye</h2><p class="notice">' + NOTICE + '</p><p>Sitede satıcı bağlantısı ya da ürün tavsiyesi bulunmaz. Raporlar kullanım önerisi değildir.</p></section>' +
      '</div></div>';
    return 'Yayın İlkeleri';
  }

  /* Demo kayıtlarda gerçek belge yoktur; bağlantılar bu açıklama sayfasına gider. */
  function viewDemoBelge(r, tur) {
    app.innerHTML = '<div class="wrap page"><div class="sheet"><div>' + demoTag + '</div>' +
      '<h1>' + (tur === 'belge' ? 'Bu kayıt için gerçek bir rapor belgesi yok.' : 'Bu kayıt için gerçek bir doğrulama sayfası yok.') + '</h1>' +
      '<p>Bu bir prototip kaydıdır. ' + (tur === 'belge'
        ? 'Gerçek kayıtlarda bu düğme, laboratuvarın düzenlediği orijinal rapor belgesini açar.'
        : 'Gerçek kayıtlarda bu bağlantı, laboratuvarın kendi sitesindeki doğrulama sayfasına gider.') + '</p>' +
      '<p>' + esc(markaAd(r)) + ' · ' + esc(urunAd(r)) + (r.lot ? ' · Lot <span class="lotcode">' + esc(r.lot) + '</span>' : '') + '</p>' +
      '<a class="btn" href="' + href('rapor-' + r.slug) + '">← Rapora dön</a></div></div>';
    return 'Demo belge';
  }
  function viewNotFound() {
    app.innerHTML = '<div class="wrap page"><header class="page-head"><h1>Bu adreste bir kayıt yok.</h1>' +
      '<p class="lede">Adres eksik kopyalanmış olabilir. Lot numarasıyla arşivde arayabilirsin.</p>' +
      '<p><a class="btn" href="' + href('raporlar') + '">Tüm raporlara git</a></p></header></div><div class="tail"></div>';
    return 'Kayıt bulunamadı';
  }

  /* ---------- rehber ---------- */
  function postRow(p) {
    return '<li><a class="post" href="' + href('blog-' + p.slug) + '"><span class="name">' + esc(p.baslik) + '</span>' +
      '<span class="what">' + esc(p.ozet) + '</span></a></li>';
  }
  /* Kapak görseli olan yazılar için 16:10 kart; başlık görselin altında durur. */
  function guideCard(p) {
    return '<li><a class="guide-card" href="' + href('blog-' + p.slug) + '"><img src="' + esc(asset(p.kapak)) + '" alt="' + esc(p.kapakAlt || '') + '" loading="lazy">' +
      '<span class="name">' + esc(p.baslik) + '</span><span class="what">' + esc(p.ozet) + '</span></a></li>';
  }
  function viewBlog() {
    var kapakli = BLOG.filter(function (p) { return p.kapak; });
    var gruplar = KATEGORILER.concat(BLOG.map(function (p) { return p.kategori; }).filter(function (k, i, a) { return k && KATEGORILER.indexOf(k) === -1 && a.indexOf(k) === i; }));
    app.innerHTML = '<div class="wrap page"><header class="page-head"><h1>Rehber</h1>' +
      '<p class="lede">Peptitler ve analiz raporları üzerine açıklayıcı yazılar. Yazılar bilgilendirme amaçlıdır; doz ya da kullanım önerisi içermez.</p></header>' +
      (kapakli.length ? '<section class="block"><ul class="guide-cards">' + kapakli.map(guideCard).join('') + '</ul></section>' : '') +
      gruplar.map(function (k, i) {
        var list = BLOG.filter(function (p) { return p.kategori === k; }).sort(function (a, b) { return (a.sira || 99) - (b.sira || 99); });
        return list.length ? '<section class="block" aria-labelledby="h-kat-' + i + '"><h2 id="h-kat-' + i + '">' + esc(k) + '</h2><ul class="posts">' + list.map(postRow).join('') + '</ul></section>' : '';
      }).join('') + '</div><div class="tail"></div>';
    return 'Rehber';
  }
  function viewYazi(p) {
    var ilgili = RAPORLAR.filter(function (r) { return (p.urun && r.urun === p.urun) || (p.ilgili || []).indexOf(r.slug) !== -1; });
    var ayni = BLOG.filter(function (x) { return x !== p && x.kategori === p.kategori; });
    var benzer = ayni.concat(BLOG.filter(function (x) { return x !== p && ayni.indexOf(x) === -1; })).slice(0, 3);
    var govde = p.html.replace(/\{\{([a-z0-9-]+)\}\}/g, function (_, name) { return href(name); });
    app.innerHTML = '<div class="wrap page"><article class="article"><header class="page-head"><p class="crumb"><a href="' + href('blog') + '">Rehber</a> / ' + esc(p.kategori || '') + '</p>' +
      '<h1>' + esc(p.baslik) + '</h1><p class="lede">' + esc(p.ozet) + '</p>' +
      '<p class="byline">' + time(p.tarih) + (p.guncelleme && p.guncelleme !== p.tarih ? ' · Güncelleme ' + time(p.guncelleme) : '') + ' · Peptit Analiz</p></header>' +
      (p.kapak ? '<img class="article-cover" src="' + esc(asset(p.kapak)) + '" alt="' + esc(p.kapakAlt || '') + '">' : '') +
      '<div class="prose">' + govde +
      '<p class="note">Bu yazı bilgilendirme amaçlıdır; tıbbi tavsiye ya da kullanım önerisi değildir. ' + NOTICE + '</p></div></article>' +
      (ilgili.length ? '<section class="block" aria-labelledby="h-ilgili"><h2 id="h-ilgili">Arşivdeki ilgili raporlar</h2><ul class="files">' + ilgili.map(fileRow).join('') + '</ul></section>' : '') +
      (benzer.length ? '<section class="block" aria-labelledby="h-benzer"><h2 id="h-benzer">Diğer yazılar</h2><ul class="posts">' + benzer.map(postRow).join('') + '</ul></section>' : '') +
      '</div><div class="tail"></div>';
    return p.baslik;
  }

  /* ---------- yönlendirme ---------- */
  var blogBySlug = {};
  BLOG.forEach(function (p) { blogBySlug[p.slug] = p; });
  /* Adres adından sayfayı üretir: { title, html, nav, desc, noindex, post }. */
  function render(h) {
    var v = { title: null, nav: '', desc: 'Peptit ürünlerine ait laboratuvar raporlarının kamuya açık arşivi. Peptit Analiz’de ürün satışı yapılmaz.', noindex: false }, m, r;
    if (!h || h === 'ana-sayfa') { viewHome(); v.home = true; }
    else if (h === 'raporlar') { v.title = viewArsiv(); v.nav = 'raporlar'; v.desc = 'Marka, laboratuvar ve bulgu türüne göre filtrelenebilen peptit analiz raporları arşivi.'; }
    else if (h === 'markalar') { v.title = viewMarkalar(); v.nav = 'markalar'; }
    else if (h === 'blog') { v.title = viewBlog(); v.nav = 'blog'; v.desc = 'Peptitler ve analiz raporları üzerine açıklayıcı rehber yazıları.'; }
    else if (h === 'yayin-ilkeleri') { v.title = viewIlkeler(); v.nav = 'yayin-ilkeleri'; v.desc = 'Peptit Analiz rapor kaynaklarını, sonuçları nasıl özetlediğini, marka yanıtlarını ve düzeltme sürecini açıklar.'; }
    else if ((m = /^rapor-(.+)$/.exec(h)) && (r = raporBySlug[m[1]])) { v.title = viewRapor(r); v.nav = 'raporlar'; v.noindex = !!r.demo; v.desc = (markaAd(r) + ' ' + r.urun + ' analiz raporu. ' + bulgu(r).satir + ' Laboratuvar: ' + labAd(r) + '.').replace(/\u00a0/g, ' '); }
    else if ((m = /^marka-(.+)$/.exec(h)) && markaBySlug[m[1]]) { v.title = viewMarka(markaBySlug[m[1]]); v.nav = 'markalar'; v.noindex = !!markaBySlug[m[1]].demo; v.desc = markaBySlug[m[1]].ad + ' ürünlerine ait laboratuvar analiz raporları.'; }
    else if ((m = /^blog-(.+)$/.exec(h)) && blogBySlug[m[1]]) { v.post = blogBySlug[m[1]]; v.title = viewYazi(v.post); v.nav = 'blog'; v.desc = v.post.ozet; }
    else if ((m = /^(belge|dogrulama)-(.+)$/.exec(h)) && raporBySlug[m[2]]) { v.title = viewDemoBelge(raporBySlug[m[2]], m[1]); v.nav = 'raporlar'; v.noindex = true; }
    else { v.title = viewNotFound(); v.noindex = true; v.notFound = true; }
    v.html = app.innerHTML;
    return v;
  }
  /* build.js için: üretilecek bütün adres adları. */
  function routes() {
    var list = ['', 'raporlar', 'markalar', 'blog', 'yayin-ilkeleri'];
    RAPORLAR.forEach(function (r) {
      list.push('rapor-' + r.slug);
      ['belgeUrl', 'dogrulamaUrl'].forEach(function (k) { if (r[k] && r[k].charAt(0) === '#') list.push(r[k].slice(1)); });
    });
    DATA.markalar.forEach(function (m) { list.push('marka-' + m.slug); });
    BLOG.forEach(function (p) { list.push('blog-' + p.slug); });
    return list;
  }
  if (!HAS_DOM) { module.exports = { render: render, routes: routes, href: href, hasDemo: HAS_DEMO }; return; }

  function route() {
    var v = render(decodeURIComponent(location.hash.replace(/^#/, '')));
    document.title = v.title ? v.title + ' · Peptit Analiz' : 'Peptit Analiz';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === v.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('is-home', !!v.home);
    bindArsiv();
    bindSearch();
    closeSearch(true);
    window.scrollTo(0, 0);
  }

  /* ---------- arama: üst menüdeki ve ana sayfadaki kutu aynı davranır ---------- */
  var sToggle = document.getElementById('search-toggle'), sHeader = document.getElementById('site-search');
  function closeSearch(collapse) {
    document.querySelectorAll('.search-results').forEach(function (b) { b.hidden = true; });
    if (collapse) { sHeader.classList.remove('open'); sToggle.setAttribute('aria-expanded', 'false'); }
  }
  function bindSearch() {
    document.querySelectorAll('form.searchbox').forEach(function (form) {
      if (form._bound) return;
      form._bound = true;
      var input = form.querySelector('input'), box = form.querySelector('.search-results');
      function suggest() {
        var q = input.value.trim();
        if (q.length < 2) { box.hidden = true; return; }
        var hits = RAPORLAR.filter(function (r) { return matchesQuery(r, q); });
        box.innerHTML = hits.length
          ? '<ul>' + hits.slice(0, 6).map(function (r) {
              return '<li><a href="' + href('rapor-' + r.slug) + '"><b>' + esc(r.urun) + '</b>' +
                '<span>' + esc(markaAd(r)) + (r.lot ? ' · Lot <span class="lotcode">' + esc(r.lot) + '</span>' : ' · Lot belirtilmemiş') + '</span></a></li>';
            }).join('') + '</ul>' + (hits.length > 6 ? '<p>' + hits.length + ' kayıt eşleşti. Tümü için Enter’a basın.</p>' : '')
          : '<p>“' + esc(q) + '” ile eşleşen rapor yok. Lot numarasını etikette yazdığı gibi deneyin ya da yalnızca marka adını yazın.</p>';
        box.hidden = false;
      }
      input.addEventListener('input', suggest);
      input.addEventListener('focus', suggest);
      input.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(false); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (!q) return;
        var hits = RAPORLAR.filter(function (r) { return matchesQuery(r, q); });
        input.blur();
        if (hits.length === 1) { location.href = href('rapor-' + hits[0].slug); return; }
        filters = { q: q, marka: '', lab: '', bulgu: '' };
        if (STATIC) { location.href = href('raporlar') + '?q=' + encodeURIComponent(q); return; }
        if (location.hash === '#raporlar') route(); else location.hash = 'raporlar';
      });
    });
  }
  sToggle.addEventListener('click', function () {
    var open = !sHeader.classList.contains('open');
    sHeader.classList.toggle('open', open);
    sToggle.setAttribute('aria-expanded', String(open));
    if (open) sHeader.querySelector('input').focus(); else closeSearch(false);
  });

  /* ---------- belge büyütme, kopyalama, satır tıklama ---------- */
  var lightbox = document.getElementById('lightbox');
  function openDoc(src, alt) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-img').alt = alt || 'Rapor belgesi';
    document.getElementById('lightbox-link').href = src;
    if (lightbox.showModal) lightbox.showModal(); else window.open(src, '_blank');
  }
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close(); });

  document.addEventListener('click', function (e) {
    var zoom = e.target.closest('[data-zoom]');
    if (zoom) { e.preventDefault(); var im = zoom.querySelector('img'); openDoc(zoom.getAttribute('data-zoom'), im && im.alt); return; }
    var copy = e.target.closest('[data-copy-el]');
    if (copy) {
      var el = document.getElementById(copy.getAttribute('data-copy-el'));
      var done = function () { copy.classList.add('done'); setTimeout(function () { copy.classList.remove('done'); }, 1600); };
      var fallback = function () {
        var range = document.createRange(); range.selectNodeContents(el);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        try { if (document.execCommand('copy')) done(); } catch (err) { /* metin seçili kalır */ }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.textContent).then(done, fallback);
      else fallback();
      return;
    }
    if (e.target.closest('[data-clear]')) { clearFilters(); return; }
    if (!e.target.closest('form.searchbox') && !e.target.closest('#search-toggle')) closeSearch(false);
    var row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.href = row.getAttribute('data-href');
  });
  if (STATIC) {
    /* Sayfa hazır HTML olarak geldi; yalnızca etkileşim bağlanır. /raporlar/?q=… üst aramadan gelen sorgudur. */
    var qs = /[?&]q=([^&]*)/.exec(location.search), fq = document.getElementById('f-q');
    bindArsiv();
    bindSearch();
    if (qs && fq) { filters.q = decodeURIComponent(qs[1].replace(/\+/g, ' ')); fq.value = filters.q; renderResults(); }
  } else {
    window.addEventListener('hashchange', route);
    route();
  }
})(typeof window !== 'undefined' ? window : globalThis);
