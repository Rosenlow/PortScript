/* Peptit Analiz — tek sayfalı arşiv. Adresler: #raporlar, #markalar, #yayin-ilkeleri,
   #rapor-<kayıt>, #marka-<marka>, #belge-<kayıt>, #dogrulama-<kayıt>. */
(function () {
  'use strict';

  var DATA = window.PA_DATA;
  var TOL = DATA.tolerans;
  var NOTICE = 'Peptit Analiz’de ürün satışı yapılmaz. Burada farklı kaynaklardan derlenen laboratuvar raporlarını inceleyebilirsiniz.';
  var app = document.getElementById('app');
  var filters = { q: '', marka: '', lab: '', bulgu: '' };

  var markaBySlug = {};
  DATA.markalar.forEach(function (m) { markaBySlug[m.slug] = m; });
  var RAPORLAR = DATA.raporlar.slice().sort(function (a, b) { return a.tarih < b.tarih ? 1 : -1; });
  var raporBySlug = {};
  RAPORLAR.forEach(function (r) { raporBySlug[r.slug] = r; });

  /* ---------- yardımcılar ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 }); }
  var dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  function date(iso) { return dateFmt.format(new Date(iso + 'T00:00:00Z')); }
  function time(iso) { return '<time datetime="' + iso + '">' + date(iso) + '</time>'; }
  function markaAd(r) { return markaBySlug[r.marka].ad; }
  function urunAd(r) { return r.urun + ' ' + num(r.beyan) + ' ' + r.birim; }
  function taraf(r, p) {
    if (!p) return 'Belirtilmemiş';
    if (p.tur === 'platform') return 'Peptit Analiz';
    if (p.tur === 'marka') return markaAd(r) + ' (marka)';
    if (p.tur === 'okuyucu') return 'Okuyucu';
    return 'Belirtilmemiş';
  }
  function labAd(r) { return r.lab || 'Belirtilmemiş'; }
  function sapma(r) { return r.miktar == null ? null : Math.round((r.miktar - r.beyan) / r.beyan * 100); }
  function yuzde(d) { return (d < 0 ? '−' : d > 0 ? '+' : '') + '%' + Math.abs(d); }

  var BULGULAR = {
    sapma: 'Miktar sapması',
    kimlik: 'Kimlik doğrulanamadı',
    uyumlu: 'Miktar beyanla uyumlu',
    olculmedi: 'Miktar ölçülmedi'
  };
  /* Bulgu yalnızca raporda ölçülen değerlerden türetilir; ölçülmeyen alan için hüküm verilmez. */
  function bulgu(r) {
    var d = sapma(r);
    if (r.kimlik === 'dogrulanamadi') {
      return { key: 'kimlik', alert: true, kisa: 'Beyan edilen madde doğrulanamadı',
        cumle: 'Raporda, etikette beyan edilen madde doğrulanamadı.' };
    }
    if (d != null && Math.abs(d) > TOL) {
      return { key: 'sapma', alert: true, kisa: num(r.miktar) + ' / ' + num(r.beyan) + ' ' + r.birim + ' (' + yuzde(d) + ')',
        cumle: 'Ölçülen miktar etiket beyanının %' + Math.abs(d) + (d < 0 ? ' altında.' : ' üstünde.') };
    }
    if (d != null) {
      return { key: 'uyumlu', alert: false, kisa: num(r.miktar) + ' / ' + num(r.beyan) + ' ' + r.birim + ' (' + yuzde(d) + ')',
        cumle: 'Ölçülen miktar etiket beyanının ±%' + TOL + ' aralığında.' };
    }
    return { key: 'olculmedi', alert: false,
      kisa: r.saflik != null ? 'Yalnızca saflık: %' + num(r.saflik) : 'Miktar sonucu yok',
      cumle: (r.saflik != null ? 'Bu raporda yalnızca saflık ölçüldü. ' : 'Bu raporda miktar ölçülmedi. ') + 'Miktar açısından değerlendirme yapılmadı.' };
  }

  /* Türkçe harfleri ve ayraçları yok sayan arama: "tg 2410", "TG2410B157", "kirlangic" eşleşir. */
  function norm(s) {
    return String(s).toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function compact(s) { return norm(s).replace(/[^a-z0-9]/g, ''); }
  RAPORLAR.forEach(function (r) { r._hay = compact(markaAd(r) + urunAd(r) + r.lot); });
  function matchesQuery(r, q) {
    var tokens = norm(q).split(/\s+/).map(compact).filter(Boolean);
    return tokens.every(function (t) { return r._hay.indexOf(t) !== -1; });
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
  function link(url, text, cls) {
    var ext = url.charAt(0) !== '#';
    return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
  }
  function olcum(value, unit, cls) {
    return '<span class="v' + (cls ? ' ' + cls : '') + '">' + num(value) + '<small>' + esc(unit) + '</small></span>';
  }
  function pair(r) {
    var b = bulgu(r), d = sapma(r);
    return '<div class="pair">' +
      '<div><span class="k">Etiket beyanı</span>' + olcum(r.beyan, r.birim) + '</div>' +
      '<div><span class="k">Ölçülen miktar</span>' +
        (r.miktar == null ? '<span class="v none">Ölçülmedi</span>'
          : olcum(r.miktar, r.birim, b.key === 'sapma' ? 'alert' : '') +
            '<span class="delta' + (b.key === 'sapma' ? ' alert' : ' muted') + '">Beyana göre ' + yuzde(d) + '</span>') +
      '</div></div>';
  }
  function table(list, opts) {
    opts = opts || {};
    return '<table class="rows"><thead><tr>' +
      '<th scope="col">' + (opts.hideBrand ? 'Ürün' : 'Marka ve ürün') + '</th><th scope="col">Lot</th><th scope="col">Laboratuvar</th><th scope="col">Bulgu</th><th scope="col">Rapor tarihi</th>' +
      '</tr></thead><tbody>' + list.map(function (r) {
        var b = bulgu(r);
        return '<tr data-href="#rapor-' + r.slug + '">' +
          '<td class="c-name">' + (opts.hideBrand ? '' : '<span class="brand">' + esc(markaAd(r)) + '</span>') +
            '<a href="#rapor-' + r.slug + '">' + esc(urunAd(r)) + '</a>' + (r.demo ? demoTag : '') + '</td>' +
          '<td class="c-lot">' + esc(r.lot) + '</td>' +
          '<td class="c-lab">' + esc(labAd(r)) + '</td>' +
          '<td class="c-find' + (b.alert ? ' alert' : '') + '"><b>' + BULGULAR[b.key] + '</b><span>' + esc(b.kisa) + '</span></td>' +
          '<td class="c-date">' + time(r.tarih) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- ana sayfa ---------- */
  function viewHome() {
    var sapanlar = RAPORLAR.filter(function (r) { return bulgu(r).alert; });
    var one = sapanlar.filter(function (r) { return bulgu(r).key === 'sapma'; })[0];
    var labs = [];
    RAPORLAR.forEach(function (r) { if (labs.indexOf(labAd(r)) === -1) labs.push(labAd(r)); });
    labs.sort(function (a, b) { return a.localeCompare(b, 'tr'); });
    function options(pairs, sel) {
      return pairs.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (p[0] === sel ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('');
    }
    var html =
      '<section class="hero">' +
        '<h1>Elindeki ürünün analiz raporunu bul.</h1>' +
        '<form class="search" id="hero-form" role="search" autocomplete="off">' +
          '<label class="sr" for="hero-q">Marka, ürün adı veya lot numarasıyla ara</label>' +
          '<input id="hero-q" type="search" inputmode="search" enterkeyhint="search" placeholder="Marka, ürün adı veya lot numarası" value="' + esc(filters.q) + '">' +
          '<div class="suggest" id="hero-suggest" hidden></div>' +
        '</form>' +
        '<p class="notice">' + NOTICE + '</p>' +
      '</section>';
    if (one) {
      html += '<section class="section" aria-labelledby="h-sapan"><h2 id="h-sapan">Etiket beyanından sapan sonuçlar</h2>' +
        '<article class="finding">' +
          '<div class="finding-top"><span class="eyebrow">En güncel belgelenmiş bulgu · ' + date(one.tarih) + '</span>' + (one.demo ? demoTag : '') + '</div>' +
          pair(one) +
          '<div class="finding-foot"><div class="what"><strong>' + esc(markaAd(one)) + ' · ' + esc(urunAd(one)) + '</strong>' +
            '<span class="mono">Lot ' + esc(one.lot) + '</span>' +
            '<span class="muted">' + esc(kaynakCumle(one)) + '</span></div>' +
            '<a class="go" href="#rapor-' + one.slug + '">Raporu incele →</a></div>' +
        '</article>' +
        '<ul class="also">' + sapanlar.filter(function (r) { return r !== one; }).map(function (r) {
          var b = bulgu(r);
          return '<li><span><a href="#rapor-' + r.slug + '">' + esc(markaAd(r)) + ' · ' + esc(urunAd(r)) + '</a> ' + (r.demo ? demoTag : '') + '</span>' +
            '<span class="mono">Lot ' + esc(r.lot) + '</span><span class="mono alert">' + esc(b.key === 'sapma' ? b.kisa : BULGULAR[b.key]) + '</span></li>';
        }).join('') + '</ul></section>';
    }
    html += '<section class="section" id="arsiv" aria-labelledby="h-arsiv"><h2 id="h-arsiv">Tüm raporlar</h2>' +
      '<div class="toolbar">' +
        '<label class="t-q" for="f-q">Arşivde ara<input id="f-q" type="search" placeholder="Marka, ürün veya lot" value="' + esc(filters.q) + '"></label>' +
        '<label for="f-marka">Marka<select id="f-marka">' + options([['', 'Tüm markalar']].concat(DATA.markalar.map(function (m) { return [m.slug, m.ad]; })), filters.marka) + '</select></label>' +
        '<label for="f-lab">Laboratuvar<select id="f-lab">' + options([['', 'Tüm laboratuvarlar']].concat(labs.map(function (l) { return [l, l]; })), filters.lab) + '</select></label>' +
        '<label class="t-find" for="f-bulgu">Bulgu türü<select id="f-bulgu">' + options([['', 'Tüm bulgular']].concat(Object.keys(BULGULAR).map(function (k) { return [k, BULGULAR[k]]; })), filters.bulgu) + '</select></label>' +
      '</div>' +
      '<div id="results" aria-live="polite"></div></section>';
    app.innerHTML = html;

    var heroQ = document.getElementById('hero-q'), fQ = document.getElementById('f-q'), sug = document.getElementById('hero-suggest');
    function suggest() {
      var q = heroQ.value.trim();
      if (q.length < 2) { sug.hidden = true; return; }
      var hits = RAPORLAR.filter(function (r) { return matchesQuery(r, q); });
      sug.innerHTML = hits.length
        ? '<ul>' + hits.slice(0, 5).map(function (r) {
            var b = bulgu(r);
            return '<li><a href="#rapor-' + r.slug + '"><span class="s-name">' + esc(markaAd(r)) + ' · ' + esc(urunAd(r)) + '</span>' +
              '<span class="s-meta"><span class="mono">Lot ' + esc(r.lot) + '</span><span' + (b.alert ? ' class="alert"' : '') + '>' + BULGULAR[b.key] + '</span><span>' + date(r.tarih) + '</span></span></a></li>';
          }).join('') + '</ul>' + (hits.length > 5 ? '<p class="s-all">' + hits.length + ' kayıt eşleşti. Tümü için Enter’a bas.</p>' : '')
        : '<p class="s-none">“' + esc(q) + '” ile eşleşen kayıt yok. Lot numarasını etikette yazdığı gibi dene.</p>';
      sug.hidden = false;
    }
    heroQ.addEventListener('input', function () { filters.q = heroQ.value; fQ.value = heroQ.value; suggest(); renderResults(); });
    heroQ.addEventListener('focus', suggest);
    heroQ.addEventListener('keydown', function (e) { if (e.key === 'Escape') sug.hidden = true; });
    document.getElementById('hero-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var hits = filters.q.trim() ? RAPORLAR.filter(function (r) { return matchesQuery(r, filters.q); }) : [];
      sug.hidden = true;
      if (hits.length === 1) { location.hash = 'rapor-' + hits[0].slug; return; }
      heroQ.blur();
      document.getElementById('arsiv').scrollIntoView();
    });
    document.addEventListener('click', function onDoc(e) {
      if (!document.body.contains(sug)) { document.removeEventListener('click', onDoc); return; }
      if (!e.target.closest('#hero-form')) sug.hidden = true;
    });
    fQ.addEventListener('input', function () { filters.q = fQ.value; heroQ.value = fQ.value; renderResults(); });
    ['marka', 'lab', 'bulgu'].forEach(function (k) {
      document.getElementById('f-' + k).addEventListener('change', function (e) { filters[k] = e.target.value; renderResults(); });
    });
    renderResults();
  }

  function renderResults() {
    var box = document.getElementById('results');
    if (!box) return;
    var list = filtered(RAPORLAR), q = filters.q.trim();
    var active = q || filters.marka || filters.lab || filters.bulgu;
    var clear = '<button type="button" class="btn small" data-clear>Filtreleri temizle</button>';
    if (!list.length) {
      box.innerHTML = '<div class="empty"><strong>' + (q ? '“' + esc(q) + '” için kayıt bulunamadı.' : 'Seçili filtrelerle eşleşen kayıt yok.') + '</strong>' +
        '<p class="muted">' + (q ? 'Lot numarasını etikette yazdığı gibi yazmayı ya da yalnızca marka adıyla aramayı dene. ' : '') +
        'Arşivde bu ürünün raporu henüz olmayabilir.</p>' + clear + '</div>';
    } else {
      box.innerHTML = '<div class="status"><span>' + (active ? list.length + ' / ' + RAPORLAR.length + ' kayıt gösteriliyor' : RAPORLAR.length + ' kayıt, en yeni rapor üstte') + '</span>' + (active ? clear : '') + '</div>' + table(list);
    }
  }
  function clearFilters() {
    filters = { q: '', marka: '', lab: '', bulgu: '' };
    ['hero-q', 'f-q', 'f-marka', 'f-lab', 'f-bulgu'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    renderResults();
  }

  /* ---------- rapor ---------- */
  function kaynakCumle(r) {
    var lab = r.lab ? 'Analizi ' + r.lab + ' gerçekleştirdi.' : 'Analizi yapan laboratuvar belirtilmemiş.';
    if (!r.gonderen) return 'Numuneyi kimin gönderdiği belirtilmemiş. ' + lab;
    if (r.gonderen.tur === 'platform') return 'Numuneyi Peptit Analiz gönderdi. ' + lab;
    if (r.gonderen.tur === 'marka') return 'Numuneyi ' + markaAd(r) + ' gönderdi. ' + lab;
    return 'Numuneyi bir okuyucu gönderdi. ' + lab;
  }
  function viewRapor(r) {
    var b = bulgu(r), d = sapma(r);
    var kimlik = r.kimlik === 'dogrulandi' ? ['Doğrulandı', '', 'Beyan edilen madde: ' + r.urun]
      : r.kimlik === 'dogrulanamadi' ? ['Doğrulanamadı', 'alert', 'Beyan edilen madde: ' + r.urun]
      : ['Ölçülmedi', 'none', 'Raporda kimlik analizi yok'];
    var miktar = r.miktar != null ? [num(r.miktar) + ' ' + r.birim, b.key === 'sapma' ? 'alert' : '', 'Etiket beyanı ' + num(r.beyan) + ' ' + r.birim + ' · ' + yuzde(d)]
      : ['Ölçülmedi', 'none', 'Etiket beyanı ' + num(r.beyan) + ' ' + r.birim];
    var saflik = r.saflik != null ? ['%' + num(r.saflik), '', 'Etikette saflık beyanı yok'] : ['Ölçülmedi', 'none', 'Raporda saflık sonucu yok'];
    function field(name, f) {
      return '<div><dt>' + name + '</dt><dd class="val ' + f[1] + '">' + esc(f[0]) + '</dd><dd class="note">' + esc(f[2]) + '</dd></div>';
    }
    var log = [];
    if (r.yanit) log.push({ tarih: r.yanit.tarih, kim: 'Marka yanıtı · ' + markaAd(r), metin: r.yanit.metin });
    (r.duzeltmeler || []).forEach(function (x) { log.push({ tarih: x.tarih, kim: 'Düzeltme · Peptit Analiz', metin: x.metin }); });
    log.sort(function (a, c) { return a.tarih < c.tarih ? -1 : 1; });

    app.innerHTML =
      '<p class="crumb"><a href="#raporlar">Raporlar</a> / <a href="#marka-' + r.marka + '">' + esc(markaAd(r)) + '</a></p>' +
      '<header class="page-head">' +
        '<h1><span class="brand"><a href="#marka-' + r.marka + '">' + esc(markaAd(r)) + '</a></span>' + esc(urunAd(r)) + '</h1>' +
        '<div class="lot"><span class="k">Lot</span><code id="lot-no">' + esc(r.lot) + '</code>' +
          '<button type="button" class="btn small" data-copy="' + esc(r.lot) + '">Kopyala</button>' + (r.demo ? demoTag : '') + '</div>' +
        '<p class="verdict"><b' + (b.alert ? ' class="alert"' : '') + '>' + BULGULAR[b.key] + '.</b> ' + esc(b.cumle) + '</p>' +
      '</header>' +
      '<section class="report-block" aria-label="Ölçüm sonuçları">' + pair(r) +
        '<dl class="fields">' + field('Kimlik', kimlik) + field('Miktar', miktar) + field('Saflık', saflik) + '</dl></section>' +
      '<section class="section" aria-labelledby="h-belge"><h2 id="h-belge">Belge</h2><div class="actions">' +
        (r.belgeUrl ? link(r.belgeUrl, 'Orijinal raporu aç', 'btn primary')
          : '<p class="nodoc"><b>Orijinal belge yok.</b> Bu kayıt için rapor belgesi Peptit Analiz’e iletilmedi. Değerler raporu sağlayanın beyanına dayanıyor.</p>') +
        (r.dogrulamaUrl ? '<p>' + link(r.dogrulamaUrl, 'Laboratuvarın doğrulama sayfası') + ' <span class="muted">· ' + esc(labAd(r)) + '</span></p>'
          : '<p class="muted">Bu rapor için laboratuvar doğrulama bağlantısı yok.</p>') +
      '</div></section>' +
      '<section class="section" aria-labelledby="h-kaynak"><h2 id="h-kaynak">Kaynak</h2>' +
        '<p>' + esc(kaynakCumle(r)) + '</p>' +
        '<dl class="source">' +
          '<div><dt>Numuneyi gönderen</dt><dd>' + esc(taraf(r, r.gonderen)) + '</dd></div>' +
          '<div><dt>Raporu sağlayan</dt><dd>' + esc(taraf(r, r.saglayan)) + '</dd></div>' +
          '<div><dt>Analizi yapan laboratuvar</dt><dd>' + esc(labAd(r)) + '</dd></div>' +
          '<div><dt>Rapor tarihi</dt><dd class="mono">' + time(r.tarih) + '</dd></div>' +
        '</dl></section>' +
      '<section class="section" aria-labelledby="h-log"><h2 id="h-log">Marka yanıtı ve düzeltmeler</h2>' +
        (log.length ? '<ol class="log">' + log.map(function (x) {
          return '<li>' + time(x.tarih) + '<p><span class="who">' + esc(x.kim) + '</span>' + esc(x.metin) + '</p></li>';
        }).join('') + '</ol>' : '<p class="muted">Bu rapor için marka yanıtı ya da düzeltme kaydı yok.</p>') +
      '</section>' +
      '<section class="section"><p class="notice">' + NOTICE + '</p></section>';
    return markaAd(r) + ' ' + urunAd(r) + ' · Lot ' + r.lot;
  }

  /* ---------- markalar ---------- */
  function raporlarOf(slug) { return RAPORLAR.filter(function (r) { return r.marka === slug; }); }
  function viewMarkalar() {
    app.innerHTML = '<header class="page-head" style="padding-top:2.5rem"><h1>Markalar</h1>' +
      '<p class="lede">Arşivde en az bir raporu bulunan markalar. Bir markanın burada yer alması olumlu ya da olumsuz bir değerlendirme anlamına gelmez.</p></header>' +
      '<section class="section"><ul class="brand-list">' + DATA.markalar.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); }).map(function (m) {
        var rs = raporlarOf(m.slug), n = rs.filter(function (r) { return bulgu(r).alert; }).length;
        return '<li><a href="#marka-' + m.slug + '"><strong>' + esc(m.ad) + ' ' + demoTag + '</strong><span class="last">' + (rs[0] ? date(rs[0].tarih) : '') + '</span>' +
          '<span>' + rs.length + ' rapor · ' + (n ? '<span class="alert">' + n + ' raporda beyandan sapma</span>' : 'beyandan sapma kaydı yok') + '</span><span class="last">son rapor</span></a></li>';
      }).join('') + '</ul></section>';
    return 'Markalar';
  }
  function viewMarka(m) {
    var rs = raporlarOf(m.slug);
    var n = rs.filter(function (r) { return bulgu(r).alert; }).length;
    var lots = rs.length;
    app.innerHTML = '<p class="crumb"><a href="#markalar">Markalar</a></p>' +
      '<header class="page-head"><h1>' + esc(m.ad) + '</h1><div>' + demoTag + '</div>' +
        '<dl class="facts"><div><dt>Rapor</dt><dd>' + rs.length + '</dd></div><div><dt>Lot</dt><dd>' + lots + '</dd></div>' +
        '<div><dt>Beyandan sapan</dt><dd' + (n ? ' class="alert"' : '') + '>' + n + '</dd></div></dl></header>' +
      '<section class="section" aria-labelledby="h-mr"><h2 id="h-mr">Raporlar, en yeni üstte</h2>' +
        '<p class="muted">Her bulgu yalnızca yanında yazan lota ve o numuneye aittir; markanın diğer ürünleri için sonuç sayılmaz.</p>' +
        table(rs, { hideBrand: true }) + '</section>' +
      '<section class="section"><p class="notice">' + NOTICE + '</p></section>';
    return m.ad;
  }

  /* ---------- yayın ilkeleri ---------- */
  function viewIlkeler() {
    app.innerHTML = '<header class="page-head" style="padding-top:2.5rem"><h1>Yayın İlkeleri</h1>' +
      '<p class="lede">Peptit Analiz, peptit ürünlerine ait laboratuvar raporlarını toplar ve kamuya açık yayımlar. Analizleri dış laboratuvarlar yapar.</p></header>' +
      '<div class="prose">' +
      '<section><h2>Raporlar nereden gelir</h2><p>Arşivdeki raporların üç kaynağı vardır. Her kayıtta numuneyi gönderen, raporu sağlayan ve analizi yapan laboratuvar ayrı ayrı yazılır.</p><ul>' +
        '<li><b>Peptit Analiz’in gönderdiği numuneler.</b> Numuneyi platform temin eder ve Janoshik gibi bir dış laboratuvara gönderir.</li>' +
        '<li><b>Markaların ilettiği raporlar.</b> Numuneyi markanın seçtiği ve gönderdiği kayıtta açıkça belirtilir.</li>' +
        '<li><b>Okuyucuların ilettiği raporlar.</b> Numunenin nasıl temin edildiği ve saklandığı doğrulanamaz.</li>' +
        '</ul><p>Bilinmeyen her alana “Belirtilmemiş” yazılır.</p></section>' +
      '<section><h2>Sonuçlar nasıl özetlenir</h2><ul>' +
        '<li>Kimlik, miktar ve saflık ayrı alanlardır. Raporda bulunmayan ölçüme “Ölçülmedi” yazılır.</li>' +
        '<li>Etiket beyanı ve ölçülen miktar aynı birimle yan yana gösterilir.</li>' +
        '<li>Ölçülen miktar etiket beyanından %' + TOL + '’dan fazla saparsa kayıt “Miktar sapması” olarak işaretlenir. Bu eşik yalnızca özetleme içindir; laboratuvarın ölçüm belirsizliği için orijinal rapora bakılmalıdır.</li>' +
        '<li>Yalnızca saflık sonucu olan bir kayıt, miktar açısından “uyumlu” sayılmaz.</li>' +
        '<li>Her sonuç tek bir numuneye ve tek bir lota aittir. Markanın başka lotları ya da ürünleri için genelleme yapılmaz.</li>' +
        '</ul></section>' +
      '<section><h2>Belgeler</h2><p>Her kayıtta orijinal rapor belgesi ve varsa laboratuvarın doğrulama bağlantısı yer alır. Belge ya da bağlantı yoksa bu açıkça yazılır.</p></section>' +
      '<section><h2>Marka yanıtları</h2><p>Etiket beyanından sapan bir sonuç yayımlandığında ilgili marka yanıt verebilir. Yanıt, tarihiyle birlikte ve içeriği değiştirilmeden rapor sayfasında yayımlanır. Markanın ilettiği yeni rapor ayrı bir kayıt olarak eklenir; önceki kayıt silinmez.</p></section>' +
      '<section><h2>Düzeltmeler</h2><p>Yanlış girilen bir değer, tarih ya da kaynak bilgisi düzeltilir. Her düzeltme, neyin değiştiği ve tarihiyle birlikte rapor sayfasında kalır. Yayımlanan kayıtlar sessizce değiştirilmez ya da kaldırılmaz.</p></section>' +
      '<section><h2>Satış ve tavsiye</h2><p class="notice">' + NOTICE + '</p><p>Sitede fiyat, satıcı bağlantısı ya da ürün tavsiyesi bulunmaz. Raporlar kullanım önerisi değildir.</p></section>' +
      '</div>';
    return 'Yayın İlkeleri';
  }

  /* Demo kayıtlarda gerçek belge yoktur; bağlantılar bu açıklama sayfasına gider. */
  function viewDemoBelge(r, tur) {
    app.innerHTML = '<p class="crumb"><a href="#rapor-' + r.slug + '">← ' + esc(markaAd(r)) + ' ' + esc(urunAd(r)) + ' raporuna dön</a></p>' +
      '<div class="sheet"><div>' + demoTag + '</div><h1>' + (tur === 'belge' ? 'Bu kayıt için gerçek bir rapor belgesi yok.' : 'Bu kayıt için gerçek bir doğrulama sayfası yok.') + '</h1>' +
      '<p>Bu bir prototip kaydıdır. ' + (tur === 'belge'
        ? 'Gerçek kayıtlarda bu düğme, laboratuvarın düzenlediği orijinal rapor belgesini yeni sekmede açar.'
        : 'Gerçek kayıtlarda bu bağlantı, laboratuvarın kendi sitesindeki doğrulama sayfasına gider.') + '</p>' +
      '<p class="mono">' + esc(markaAd(r)) + ' · ' + esc(urunAd(r)) + ' · Lot ' + esc(r.lot) + '</p></div>';
    return 'Demo belge';
  }
  function viewNotFound() {
    app.innerHTML = '<header class="page-head" style="padding-top:2.5rem"><h1>Bu adreste bir kayıt yok.</h1>' +
      '<p class="lede">Rapor kaldırılmamış olabilir; adres eksik kopyalanmış olabilir. Lot numarasıyla arşivde arayabilirsin.</p>' +
      '<p><a class="btn" href="#raporlar">Tüm raporlara git</a></p></header>';
    return 'Kayıt bulunamadı';
  }

  /* ---------- yönlendirme ---------- */
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var title = null, nav = '', scrollTo = null, m;
    if (!h || h === 'ana-sayfa' || h === 'raporlar' || h === 'arsiv') {
      viewHome(); if (h === 'raporlar' || h === 'arsiv') { nav = 'raporlar'; scrollTo = 'arsiv'; }
    } else if (h === 'markalar') { title = viewMarkalar(); nav = 'markalar'; }
    else if (h === 'yayin-ilkeleri') { title = viewIlkeler(); nav = 'yayin-ilkeleri'; }
    else if ((m = /^rapor-(.+)$/.exec(h)) && raporBySlug[m[1]]) { title = viewRapor(raporBySlug[m[1]]); nav = 'raporlar'; }
    else if ((m = /^marka-(.+)$/.exec(h)) && markaBySlug[m[1]]) { title = viewMarka(markaBySlug[m[1]]); nav = 'markalar'; }
    else if ((m = /^(belge|dogrulama)-(.+)$/.exec(h)) && raporBySlug[m[2]]) { title = viewDemoBelge(raporBySlug[m[2]], m[1]); nav = 'raporlar'; }
    else { title = viewNotFound(); }
    document.title = title ? title + ' · Peptit Analiz' : 'Peptit Analiz';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var target = scrollTo && document.getElementById(scrollTo);
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var copy = e.target.closest('[data-copy]');
    if (copy) {
      var done = function () { copy.textContent = 'Kopyalandı'; setTimeout(function () { copy.textContent = 'Kopyala'; }, 1800); };
      var fallback = function () {
        var el = document.getElementById('lot-no'), range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        try { if (document.execCommand('copy')) { done(); return; } } catch (err) { /* seçim kullanıcıya kalır */ }
        copy.textContent = 'Seçildi, kopyalayabilirsin';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copy.getAttribute('data-copy')).then(done, fallback);
      else fallback();
      return;
    }
    if (e.target.closest('[data-clear]')) { clearFilters(); return; }
    var row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.hash = row.getAttribute('data-href');
  });
  window.addEventListener('hashchange', route);
  route();
})();
