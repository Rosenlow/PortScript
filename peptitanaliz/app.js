/* Peptit Analiz — tek sayfalı yayın. Adresler: #raporlar, #markalar, #yayin-ilkeleri,
   #rapor-<kayıt>, #marka-<marka>, #belge-<kayıt>, #dogrulama-<kayıt>. */
(function () {
  'use strict';

  var DATA = window.PA_DATA;
  var TOL = DATA.tolerans;
  var NOTICE = 'Peptit Analiz’de ürün satışı yapılmaz. Platform, farklı kaynaklardan derlenen laboratuvar raporlarını yayımlar.';
  var YOK = 'Raporda belirtilmemiş';
  var app = document.getElementById('app');
  var filters = { q: '', marka: '', lab: '', bulgu: '' };

  var markaBySlug = {};
  DATA.markalar.forEach(function (m) { markaBySlug[m.slug] = m; });
  var RAPORLAR = DATA.raporlar.slice().sort(function (a, b) { return a.tarih < b.tarih ? 1 : -1; });
  var raporBySlug = {};
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
  function beyanAd(r) { return num(r.beyan) + ' ' + r.birim; }
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
    sapma: 'Miktar sapması',
    kimlik: 'Kimlik doğrulanamadı',
    uyumlu: 'Beyanın ±%' + TOL + ' içinde',
    karsilastirilamadi: 'Beyanla karşılaştırılamadı',
    olculmedi: 'Miktar raporda yok'
  };
  /* Bulgu yalnızca raporda yazan değerlerden türetilir ve o numune ile lotu anlatır.
     Ölçüm farkından "sahte", "güvenli" gibi bir hüküm üretilmez. */
  function bulgu(r) {
    var d = sapma(r);
    if (r.kimlik === 'dogrulanamadi') {
      return { key: 'kimlik', alert: true, lines: ['Beyan edilen madde', 'doğrulanamadı.'],
        kisa: 'Beyan edilen madde: ' + r.urun,
        satir: 'Raporda beyan edilen madde doğrulanamadı.',
        dek: lotOncesi(r) + ', etikette beyan edilen ' + r.urun + ' doğrulanamadı.' };
    }
    if (d != null) {
      var fark = Math.round(Math.abs(r.miktar - r.beyan) * 100) / 100;
      var olc = num(r.miktar) + ' ' + r.birim;
      return { key: Math.abs(d) > TOL ? 'sapma' : 'uyumlu', alert: Math.abs(d) > TOL,
        lines: ['Etikette ' + beyanAd(r) + '.', 'Raporda ' + olc + '.'],
        kisa: num(r.miktar) + ' / ' + beyanAd(r) + ' (' + yuzde(d) + ')',
        satir: 'Etikette ' + beyanAd(r) + ', raporda ' + olc + ' ölçüldü.', delta: yuzde(d),
        dek: lotOncesi(r) + (fark === 0 ? ', etikette belirtilen miktar ölçüldü.'
          : ', etikette belirtilenden ' + num(fark) + ' ' + r.birim + (r.miktar > r.beyan ? ' fazla' : ' az') + ' ölçüldü.') };
    }
    if (r.miktar != null) {
      var der = num(r.miktar) + ' ' + r.miktarBirim;
      return { key: 'karsilastirilamadi', alert: false,
        lines: ['Raporda ' + der + '.'].concat(r.saflik != null ? ['Saflık %' + num(r.saflik) + '.'] : []),
        kisa: der + (r.saflik != null ? ' · saflık %' + num(r.saflik) : ''),
        satir: 'Raporda ' + der + ' derişim' + (r.saflik != null ? ' ve %' + num(r.saflik) + ' saflık' : '') + ' bildirildi.',
        dek: 'Rapor miktarı derişim olarak veriyor. Etikette ' + beyanAd(r) + ' beyan ediliyor; şişe hacmi belgelenmediği için iki değer karşılaştırılmadı.' };
    }
    return { key: 'olculmedi', alert: false,
      lines: ['Miktar raporda yok.'].concat(r.saflik != null ? ['Saflık %' + num(r.saflik) + '.'] : []),
      kisa: r.saflik != null ? 'Yalnızca saflık: %' + num(r.saflik) : 'Miktar sonucu yok',
      satir: r.saflik != null ? 'Raporda miktar yok; saflık %' + num(r.saflik) + ' bildirildi.' : 'Raporda miktar sonucu yok.',
      dek: lotOncesi(r) + (r.saflik != null ? ' yalnızca saflık ölçüldü.' : ' miktar ölçülmedi.') + ' Miktar açısından değerlendirme yapılmadı.' };
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
    if (r.foto || r.gorsel) return '<img src="' + esc(r.foto || r.gorsel) + '" alt="" loading="lazy">';
    return r.demo ? vial(r) : '';
  }

  /* Yatay ölçüm grafiği: ölçek sıfırdan başlar, beyan ince çizgi, ölçülen dolu çubuk. */
  function chart(r) {
    var d = sapma(r);
    if (d == null) return '';
    var max = Math.max(r.beyan, r.miktar) * 1.12;
    var ref = r.beyan / max * 100, val = r.miktar / max * 100;
    var lo = Math.min(ref, val), w = Math.abs(val - ref);
    var minor = Math.abs(d) <= TOL ? ' minor' : '';
    var mid = Math.min(Math.max(lo + w / 2, 8), 92);
    return '<figure class="chart" role="img" aria-label="Etiket beyanı ' + esc(beyanAd(r)) + ', ölçülen ' + num(r.miktar) + ' ' + esc(r.birim) + ', fark ' + yuzde(d) + '">' +
      '<div class="chart-plot">' +
        (d !== 0 ? '<span class="chart-delta' + minor + '" style="left:' + mid + '%">' + yuzde(d) + '</span>' : '') +
        '<div class="chart-track">' +
          '<div class="chart-bar" style="width:' + lo + '%"></div>' +
          (w > 0 ? '<div class="chart-diff ' + (val > ref ? 'over' : 'under') + minor + '" style="left:' + lo + '%;width:' + w + '%"></div>' : '') +
          '<div class="chart-ref" style="left:' + ref + '%"></div>' +
        '</div>' +
        '<div class="chart-axis"><span>0</span><span class="a-ref" style="left:' + ref + '%">Etiket beyanı ' + esc(beyanAd(r)) + '</span></div>' +
      '</div>' +
      '<figcaption class="chart-key"><span><i class="k-ref"></i>Etiket beyanı <b>' + esc(beyanAd(r)) + '</b></span>' +
        '<span><i></i>Ölçülen miktar <b>' + num(r.miktar) + ' ' + esc(r.birim) + '</b></span></figcaption></figure>';
  }

  function headline(r) {
    var b = bulgu(r);
    return '<h1>' + b.lines.map(function (l, i) {
      return '<span' + (b.alert && i === b.lines.length - 1 ? ' class="hot"' : '') + '>' + esc(l) + '</span>';
    }).join('') + '</h1>';
  }
  /* Kapağın sağ yanı: gerçek fotoğraf ya da belge önizlemesi, yoksa demo için temsili görsel, o da yoksa grafik. */
  function coverMedia(r, zoom) {
    if (r.gorsel) {
      var img = '<img src="' + esc(r.gorsel) + '" alt="' + esc(r.gorselAlt || '') + '">';
      return '<figure class="cover-media">' +
        (zoom ? '<button type="button" data-zoom="' + esc(r.gorsel) + '" aria-label="Belgeyi büyüt">' + img + '</button>' : img) +
        '<figcaption>' + esc(r.gorselAlt || '') + (zoom ? '. Büyütmek için dokun.' : '') + '</figcaption></figure>';
    }
    if (r.demo) {
      return '<figure class="cover-media">' + vial(r) + '<figcaption>Temsili görsel · ' + esc(markaAd(r) + ' ' + urunAd(r)) + (r.lot ? ', lot ' + esc(r.lot) : '') + '</figcaption></figure>';
    }
    var c = chart(r);
    return c ? '<div class="cover-media is-chart">' + c + '</div>' : '';
  }
  function kicker(r, urun) {
    return '<p class="kicker"><a href="#marka-' + r.marka + '">' + esc(markaAd(r)) + '</a><span class="sep">/</span><span>' + esc(urun) + '</span>' +
      (r.demo ? '<span class="sep">/</span>' + demoTag : '') + '</p>';
  }
  function kaynakCumle(r) {
    var lab = r.lab ? 'Analizi ' + r.lab + ' gerçekleştirdi.' : 'Analizi yapan laboratuvar belirtilmemiş.';
    if (!r.gonderen) return 'Numuneyi kimin gönderdiği belirtilmemiş. ' + lab;
    if (r.gonderen.tur === 'platform') return 'Numuneyi Peptit Analiz gönderdi. ' + lab;
    if (r.gonderen.tur === 'marka') return 'Numuneyi ' + markaAd(r) + ' gönderdi. ' + lab;
    return 'Numuneyi bir okuyucu gönderdi. ' + lab;
  }

  /* ---------- ana sayfa ---------- */
  function fileRow(r) {
    var b = bulgu(r);
    return '<li><a class="file" href="#rapor-' + r.slug + '"><span class="thumb">' + thumb(r) + '</span>' +
      '<span class="name">' + esc(markaAd(r)) + ' – ' + esc(urunAd(r)) + (r.demo ? demoTag : '') + '</span>' +
      '<span class="what">' + esc(b.satir) + (b.alert && b.delta ? ' <span class="hot-text">' + b.delta + '</span>' : '') + '</span>' +
      time(r.tarih) + '</a></li>';
  }
  function viewHome() {
    var one = RAPORLAR.filter(function (r) { return r.kapak; })[0] || RAPORLAR[0];
    app.innerHTML =
      '<section class="cover"><div class="wrap cover-grid"><div class="cover-text">' +
        kicker(one, one.urun) + headline(one) +
        '<p class="dek">' + esc(bulgu(one).dek) + '</p>' +
        '<div class="cover-actions"><a class="btn go" href="#rapor-' + one.slug + '">Dosyayı incele ↗</a></div>' +
      '</div>' + coverMedia(one, false) + '</div></section>' +
      '<div class="wrap notice-strip"><p class="notice">' + NOTICE + '</p></div>' +
      '<section class="wrap band" aria-labelledby="h-son"><div class="band-head"><h2 id="h-son">Son yayımlanan raporlar</h2>' +
        '<a class="more" href="#raporlar">Tüm raporlar →</a></div>' +
        '<ul class="files">' + RAPORLAR.slice(0, 6).map(fileRow).join('') + '</ul>' +
        '<p class="muted">Demo kayıtlardaki ürün görselleri temsilidir. <a href="#raporlar">' + RAPORLAR.length + ' raporun tümünü filtrele</a>.</p>' +
      '</section>';
  }

  /* ---------- arşiv ---------- */
  function table(list, opts) {
    opts = opts || {};
    return '<table class="rows"><thead><tr>' +
      '<th scope="col">' + (opts.hideBrand ? 'Ürün' : 'Marka ve ürün') + '</th><th scope="col">Lot</th><th scope="col">Laboratuvar</th><th scope="col">Bulgu</th><th scope="col">Rapor tarihi</th>' +
      '</tr></thead><tbody>' + list.map(function (r) {
        var b = bulgu(r);
        return '<tr data-href="#rapor-' + r.slug + '">' +
          '<td class="c-name">' + (opts.hideBrand ? '' : '<span class="brand">' + esc(markaAd(r)) + '</span>') +
            '<a href="#rapor-' + r.slug + '">' + esc(urunAd(r)) + '</a>' + (r.demo ? demoTag : '') + '</td>' +
          '<td class="c-lot' + (r.lot ? '' : ' none') + '">' + esc(r.lot || 'Lot belirtilmemiş') + '</td>' +
          '<td class="c-lab">' + esc(labAd(r)) + '</td>' +
          '<td class="c-find' + (b.alert ? ' alert' : '') + '"><b>' + BULGULAR[b.key] + '</b><span>' + esc(b.kisa) + '</span></td>' +
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
    app.innerHTML = '<div class="wrap"><header class="page-head"><h1>Tüm raporlar</h1></header>' +
      '<section class="band" aria-label="Arşiv"><div class="toolbar">' +
        '<label class="t-q" for="f-q">Arşivde ara<input id="f-q" type="search" placeholder="Marka, ürün veya lot" value="' + esc(filters.q) + '"></label>' +
        '<label for="f-marka">Marka<select id="f-marka">' + options([['', 'Tüm markalar']].concat(DATA.markalar.map(function (m) { return [m.slug, m.ad]; })), filters.marka) + '</select></label>' +
        '<label for="f-lab">Laboratuvar<select id="f-lab">' + options([['', 'Tüm laboratuvarlar']].concat(labs.map(function (l) { return [l, l]; })), filters.lab) + '</select></label>' +
        '<label class="t-find" for="f-bulgu">Bulgu türü<select id="f-bulgu">' + options([['', 'Tüm bulgular']].concat(Object.keys(BULGULAR).map(function (k) { return [k, BULGULAR[k]]; })), filters.bulgu) + '</select></label>' +
      '</div><div id="results" aria-live="polite"></div></section></div>';
    document.getElementById('f-q').addEventListener('input', function (e) { filters.q = e.target.value; renderResults(); });
    ['marka', 'lab', 'bulgu'].forEach(function (k) {
      document.getElementById('f-' + k).addEventListener('change', function (e) { filters[k] = e.target.value; renderResults(); });
    });
    renderResults();
    return 'Tüm raporlar';
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
    ['f-q', 'f-marka', 'f-lab', 'f-bulgu'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    renderResults();
  }

  /* ---------- rapor ---------- */
  function viewRapor(r) {
    var b = bulgu(r);
    var isImg = r.belgeUrl && /\.(webp|png|jpe?g|gif)$/i.test(r.belgeUrl);
    var belge = !r.belgeUrl ? '<p class="nodoc">Bu kayıt için kaynak belge iletilmedi. Değerler raporu sağlayanın beyanına dayanıyor.</p>'
      : isImg ? '<a class="btn go" href="' + esc(r.belgeUrl) + '" data-zoom="' + esc(r.belgeUrl) + '">Orijinal raporu aç ↗</a>'
      : '<a class="btn go" href="' + esc(r.belgeUrl) + '"' + (r.belgeUrl.charAt(0) === '#' ? '' : ' target="_blank" rel="noopener"') + '>Orijinal raporu aç ↗</a>';
    var dogrulama = '';
    if (r.dogrulamaUrl) {
      var ext = r.dogrulamaUrl.charAt(0) !== '#';
      dogrulama = '<p class="verify"><a href="' + esc(r.dogrulamaUrl) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(labAd(r)) + ' doğrulama sayfası ↗</a>' +
        (r.dogrulamaAnahtari ? '<span>Anahtar</span><code id="dogrulama-anahtari">' + esc(r.dogrulamaAnahtari) + '</code>' + copyBtn('dogrulama-anahtari', 'Doğrulama anahtarını kopyala') : '') + '</p>';
    }
    var olcumler = [
      ['Kimlik', r.kimlik === 'dogrulandi' ? 'Doğrulandı' : r.kimlik === 'dogrulanamadi' ? 'Doğrulanamadı' : null, 'Beyan edilen madde: ' + r.urun]
    ];
    if (!comparable(r)) olcumler.push(['Miktar', r.miktar != null ? num(r.miktar) + ' ' + r.miktarBirim : null, r.miktar != null ? 'Derişim olarak verilmiş; etiket beyanı ' + beyanAd(r) : 'Etiket beyanı ' + beyanAd(r)]);
    if (r.derisim != null) olcumler.push(['Derişim', num(r.derisim) + ' mg/ml', 'Toplam miktar = derişim × ' + num(r.hacimMl) + ' ml']);
    olcumler.push(['Saflık', r.saflik != null ? '%' + num(r.saflik) : null, '']);
    var log = [];
    if (r.yanit) log.push({ tarih: r.yanit.tarih, kim: 'Marka yanıtı · ' + markaAd(r), metin: r.yanit.metin });
    (r.duzeltmeler || []).forEach(function (x) { log.push({ tarih: x.tarih, kim: 'Düzeltme · Peptit Analiz', metin: x.metin }); });
    log.sort(function (a, c) { return a.tarih < c.tarih ? -1 : 1; });
    var c = chart(r);

    app.innerHTML =
      '<section class="cover"><div class="wrap cover-grid"><div class="cover-text">' +
        kicker(r, urunAd(r)) + headline(r) +
        '<p class="dek">' + esc(b.dek) + '</p>' +
        '<p class="lotline"><span>Lot</span>' + (r.lot ? '<code id="lot-no">' + esc(r.lot) + '</code>' + copyBtn('lot-no', 'Lot numarasını kopyala') : '<span>' + YOK + '</span>') + '</p>' +
        '<div class="cover-actions">' + belge + dogrulama + '</div>' +
      '</div>' + coverMedia(r, isImg) + '</div></section>' +
      (c ? '<section class="wrap band" aria-labelledby="h-olcum"><h2 id="h-olcum">Etiket beyanı ve ölçülen miktar</h2>' + c + '</section>' : '') +
      '<div class="wrap band"><div class="cols">' +
        '<section aria-labelledby="h-kaynak"><h2 id="h-kaynak">Numune ve kaynak</h2>' +
          '<p>' + esc(kaynakCumle(r)) + '</p>' +
          '<dl class="facts">' +
            '<div><dt>Numuneyi gönderen</dt><dd>' + esc(taraf(r, r.gonderen)) + '</dd></div>' +
            '<div><dt>Raporu sağlayan</dt><dd>' + esc(taraf(r, r.saglayan)) + '</dd></div>' +
            '<div><dt>Analizi yapan laboratuvar</dt><dd>' + esc(labAd(r)) + (r.raporNo ? '<small>Görev numarası ' + esc(r.raporNo) + '</small>' : '') + '</dd></div>' +
            '<div><dt>Rapor tarihi</dt><dd>' + time(r.tarih) + '</dd></div>' +
          '</dl>' + (r.etiketNotu ? '<p class="muted">' + esc(r.etiketNotu) + '</p>' : '') +
          (r.foto ? '<figure class="sample"><img src="' + esc(r.foto) + '" alt="' + esc(r.fotoAlt || '') + '" loading="lazy"><figcaption>' + esc(r.fotoAlt || '') + '</figcaption></figure>' : '') +
          '<p class="notice">' + NOTICE + '</p></section>' +
        '<section aria-labelledby="h-diger"><h2 id="h-diger">Diğer ölçümler</h2><dl class="facts">' +
          olcumler.map(function (o) {
            return '<div><dt>' + o[0] + '</dt><dd' + (o[1] ? '' : ' class="none"') + '>' + esc(o[1] || YOK) + (o[2] && o[1] ? '<small>' + esc(o[2]) + '</small>' : '') + '</dd></div>';
          }).join('') + '</dl>' +
          '<p class="muted">Sonuçlar yalnızca bu numuneye' + (r.lot ? ' ve ' + esc(r.lot) + ' lotuna' : '') + ' aittir.</p></section>' +
      '</div></div>' +
      (log.length ? '<section class="wrap band" aria-labelledby="h-log"><h2 id="h-log">Marka yanıtı ve düzeltmeler</h2><ol class="log">' + log.map(function (x) {
        return '<li>' + time(x.tarih) + '<p><b>' + esc(x.kim) + '</b>' + esc(x.metin) + '</p></li>';
      }).join('') + '</ol></section>' : '') +
      '<div class="band"></div>';
    return markaAd(r) + ' ' + urunAd(r) + (r.lot ? ' · Lot ' + r.lot : '');
  }

  /* ---------- markalar ---------- */
  function raporlarOf(slug) { return RAPORLAR.filter(function (r) { return r.marka === slug; }); }
  function viewMarkalar() {
    app.innerHTML = '<div class="wrap"><header class="page-head"><h1>Markalar</h1>' +
      '<p class="lede">Arşivde en az bir raporu bulunan markalar. Bir markanın burada yer alması olumlu ya da olumsuz bir değerlendirme anlamına gelmez.</p></header>' +
      '<section class="band"><ul class="brand-list">' + DATA.markalar.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); }).map(function (m) {
        var rs = raporlarOf(m.slug), n = rs.filter(function (r) { return bulgu(r).alert; }).length;
        return '<li><a href="#marka-' + m.slug + '"><strong>' + esc(m.ad) + (m.demo ? ' ' + demoTag : '') + '</strong><span class="last">' + (rs[0] ? date(rs[0].tarih) : '') + '</span>' +
          '<span>' + rs.length + ' rapor' + (n ? ' · <span class="hot-text">' + n + ' raporda beyandan sapma</span>' : '') + '</span><span class="last">son rapor</span></a></li>';
      }).join('') + '</ul></section></div>';
    return 'Markalar';
  }
  function viewMarka(m) {
    var rs = raporlarOf(m.slug);
    app.innerHTML = '<div class="wrap"><header class="page-head"><p class="crumb"><a href="#markalar">Markalar</a></p>' +
      '<h1>' + esc(m.ad) + '</h1>' + (m.demo ? '<div>' + demoTag + '</div>' : '') +
      '<p class="lede">' + rs.length + ' rapor, en yeni üstte. Her bulgu yalnızca yanında yazan numuneye ve lota aittir; markanın diğer ürünleri için sonuç sayılmaz.</p></header>' +
      '<section class="band" aria-label="Raporlar">' + table(rs, { hideBrand: true }) + '<p class="notice">' + NOTICE + '</p></section></div>';
    return m.ad;
  }

  /* ---------- yayın ilkeleri ---------- */
  function viewIlkeler() {
    app.innerHTML = '<div class="wrap"><header class="page-head"><h1>Yayın ilkeleri</h1>' +
      '<p class="lede">Peptit Analiz, peptit ürünlerine ait laboratuvar raporlarını derler ve kamuya açık yayımlar. Analizleri dış laboratuvarlar yapar.</p></header>' +
      '<div class="prose">' +
      '<section><h2>Raporlar nereden gelir</h2><p>Arşivdeki raporların üç kaynağı vardır. Her kayıtta numuneyi gönderen, raporu sağlayan ve analizi yapan laboratuvar ayrı ayrı yazılır.</p><ul>' +
        '<li><b>Peptit Analiz’in gönderdiği numuneler.</b> Numuneyi platform temin eder ve Janoshik gibi bir dış laboratuvara gönderir.</li>' +
        '<li><b>Markaların ilettiği raporlar.</b> Numuneyi markanın seçtiği ve gönderdiği kayıtta açıkça belirtilir.</li>' +
        '<li><b>Okuyucuların ilettiği raporlar.</b> Numunenin nasıl temin edildiği ve saklandığı doğrulanamaz.</li>' +
        '</ul><p>Bilinmeyen her alana “Belirtilmemiş” yazılır.</p></section>' +
      '<section><h2>Sonuçlar nasıl özetlenir</h2><ul>' +
        '<li>Her başlık, raporda yazan değeri aktarır ve yalnızca o numune ile lot için geçerlidir. Markanın başka lotları ya da ürünleri için genelleme yapılmaz.</li>' +
        '<li>Ölçüm farkından “sahte”, “tehlikeli” ya da “güvenli” gibi bir hüküm çıkarılmaz.</li>' +
        '<li>Etiket beyanı ve ölçülen miktar aynı birimdeyse aynı grafikte, sıfırdan başlayan ölçekte gösterilir. Fark %' + TOL + '’u aşarsa kayıt “Miktar sapması” olarak işaretlenir. Bu eşik yalnızca özetleme içindir; ölçüm belirsizliği için orijinal rapora bakılmalıdır.</li>' +
        '<li>Rapor miktarı başka bir birimle veriyorsa (örneğin mg/ml derişim) etiket beyanıyla karşılaştırma yapılmaz.</li>' +
        '<li>Raporda bulunmayan ölçüme “Raporda belirtilmemiş” yazılır. Yalnızca saflık sonucu olan bir kayıt miktar açısından değerlendirilmez.</li>' +
        '</ul></section>' +
      '<section><h2>Belgeler ve görseller</h2><p>Her kayıtta orijinal rapor belgesi ve varsa laboratuvarın kendi doğrulama bağlantısı yer alır. Belge yoksa bu açıkça yazılır. Demo kayıtlardaki ürün görselleri temsilidir ve böyle işaretlenir.</p></section>' +
      '<section><h2>Marka yanıtları</h2><p>Etiket beyanından sapan bir sonuç yayımlandığında ilgili marka yanıt verebilir. Yanıt, tarihiyle birlikte ve içeriği değiştirilmeden rapor sayfasında yayımlanır. Markanın ilettiği yeni rapor ayrı bir kayıt olarak eklenir; önceki kayıt silinmez.</p></section>' +
      '<section><h2>Düzeltmeler</h2><p>Yanlış girilen bir değer, tarih ya da kaynak bilgisi düzeltilir. Her düzeltme, neyin değiştiği ve tarihiyle birlikte rapor sayfasında kalır. Yayımlanan kayıtlar sessizce değiştirilmez ya da kaldırılmaz.</p></section>' +
      '<section><h2>Satış ve tavsiye</h2><p class="notice">' + NOTICE + '</p><p>Sitede satıcı bağlantısı ya da ürün tavsiyesi bulunmaz. Raporlar kullanım önerisi değildir.</p></section>' +
      '</div></div>';
    return 'Yayın ilkeleri';
  }

  /* Demo kayıtlarda gerçek belge yoktur; bağlantılar bu açıklama sayfasına gider. */
  function viewDemoBelge(r, tur) {
    app.innerHTML = '<div class="wrap"><div class="sheet"><div>' + demoTag + '</div>' +
      '<h1>' + (tur === 'belge' ? 'Bu kayıt için gerçek bir rapor belgesi yok.' : 'Bu kayıt için gerçek bir doğrulama sayfası yok.') + '</h1>' +
      '<p>Bu bir prototip kaydıdır. ' + (tur === 'belge'
        ? 'Gerçek kayıtlarda bu düğme, laboratuvarın düzenlediği orijinal rapor belgesini açar.'
        : 'Gerçek kayıtlarda bu bağlantı, laboratuvarın kendi sitesindeki doğrulama sayfasına gider.') + '</p>' +
      '<p>' + esc(markaAd(r)) + ' · ' + esc(urunAd(r)) + (r.lot ? ' · Lot <span class="lotcode">' + esc(r.lot) + '</span>' : '') + '</p>' +
      '<a class="btn" href="#rapor-' + r.slug + '">← Rapora dön</a></div></div>';
    return 'Demo belge';
  }
  function viewNotFound() {
    app.innerHTML = '<div class="wrap"><header class="page-head"><h1>Bu adreste bir kayıt yok.</h1>' +
      '<p class="lede">Adres eksik kopyalanmış olabilir. Lot numarasıyla arşivde arayabilirsin.</p>' +
      '<p><a class="btn" href="#raporlar">Tüm raporlara git</a></p></header><div class="band"></div></div>';
    return 'Kayıt bulunamadı';
  }

  /* ---------- yönlendirme ---------- */
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var title = null, nav = '', m;
    if (!h || h === 'ana-sayfa') viewHome();
    else if (h === 'raporlar') { title = viewArsiv(); nav = 'raporlar'; }
    else if (h === 'markalar') { title = viewMarkalar(); nav = 'markalar'; }
    else if (h === 'yayin-ilkeleri') { title = viewIlkeler(); nav = 'yayin-ilkeleri'; }
    else if ((m = /^rapor-(.+)$/.exec(h)) && raporBySlug[m[1]]) { title = viewRapor(raporBySlug[m[1]]); nav = 'raporlar'; }
    else if ((m = /^marka-(.+)$/.exec(h)) && markaBySlug[m[1]]) { title = viewMarka(markaBySlug[m[1]]); nav = 'markalar'; }
    else if ((m = /^(belge|dogrulama)-(.+)$/.exec(h)) && raporBySlug[m[2]]) { title = viewDemoBelge(raporBySlug[m[2]], m[1]); nav = 'raporlar'; }
    else title = viewNotFound();
    document.title = title ? title + ' · Peptit Analiz' : 'Peptit Analiz';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    closeSearch(true);
    window.scrollTo(0, 0);
  }

  /* ---------- üst arama ---------- */
  var sForm = document.getElementById('site-search'), sInput = document.getElementById('q');
  var sBox = document.getElementById('search-results'), sToggle = document.getElementById('search-toggle');
  function closeSearch(collapse) {
    sBox.hidden = true;
    if (collapse) { sForm.classList.remove('open'); sToggle.setAttribute('aria-expanded', 'false'); }
  }
  function suggest() {
    var q = sInput.value.trim();
    if (q.length < 2) { sBox.hidden = true; return; }
    var hits = RAPORLAR.filter(function (r) { return matchesQuery(r, q); });
    sBox.innerHTML = hits.length
      ? '<ul>' + hits.slice(0, 5).map(function (r) {
          return '<li><a href="#rapor-' + r.slug + '"><b>' + esc(markaAd(r)) + ' – ' + esc(urunAd(r)) + '</b>' +
            '<span>' + (r.lot ? 'Lot <span class="lotcode">' + esc(r.lot) + '</span> · ' : '') + esc(bulgu(r).satir) + '</span></a></li>';
        }).join('') + '</ul>' + (hits.length > 5 ? '<p>' + hits.length + ' kayıt eşleşti. Tümü için Enter’a bas.</p>' : '')
      : '<p>“' + esc(q) + '” ile eşleşen kayıt yok. Lot numarasını etikette yazdığı gibi dene.</p>';
    sBox.hidden = false;
  }
  sInput.addEventListener('input', suggest);
  sInput.addEventListener('focus', suggest);
  sInput.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(false); });
  sForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = sInput.value.trim();
    if (!q) return;
    var hits = RAPORLAR.filter(function (r) { return matchesQuery(r, q); });
    sInput.blur();
    if (hits.length === 1) { location.hash = 'rapor-' + hits[0].slug; return; }
    filters = { q: q, marka: '', lab: '', bulgu: '' };
    if (location.hash === '#raporlar') route(); else location.hash = 'raporlar';
  });
  sToggle.addEventListener('click', function () {
    var open = !sForm.classList.contains('open');
    sForm.classList.toggle('open', open);
    sToggle.setAttribute('aria-expanded', String(open));
    if (open) sInput.focus(); else closeSearch(false);
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
    if (!e.target.closest('#site-search') && !e.target.closest('#search-toggle')) closeSearch(false);
    var row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.hash = row.getAttribute('data-href');
  });
  window.addEventListener('hashchange', route);
  route();
})();
