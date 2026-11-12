/* Peptit Analiz — örnek kayıtlar.
   Buradaki bütün marka, lot, laboratuvar ve sonuçlar hayalîdir (demo: true).
   Gerçek kayıt eklerken:
   - gonderen / saglayan: { tur: 'platform' | 'marka' | 'okuyucu' } ya da null (Belirtilmemiş)
   - lab: laboratuvar adı ya da null (Belirtilmemiş)
   - kimlik: 'dogrulandi' | 'dogrulanamadi' | null (Ölçülmedi)
   - miktar / saflik: sayı ya da null (Raporda belirtilmemiş).
   - miktarBirim: rapor miktarı etiketten farklı bir birimle veriyorsa (ör. 'mg/ml'). Bu durumda
     beyanla karşılaştırma yapılmaz, grafik çizilmez.
   - belgeUrl / dogrulamaUrl: gerçek belge adresi ya da null. Görsel bir belge sayfada büyütülerek açılır.
   - gorsel / gorselAlt: numune fotoğrafı ya da rapor önizlemesi. Demo kayıtlarda yoksa temsili çizim kullanılır.
   - foto / fotoAlt: numune fotoğrafı; liste satırlarında ve kaynak bölümünde kullanılır.
   - hacimMl / hacimKaynak: miktar mg/ml ise ve hacim belgelenmişse toplam miktar hesaplanıp beyanla karşılaştırılır.
   - kapak: true olan kayıt ana sayfa kapağında yer alır. */
window.PA_DATA = {
  tolerans: 10, // etiket beyanından ±% kaç sapma "miktar sapması" sayılır
  markalar: [
    { slug: 'young-pharma', ad: 'Young Pharma' },
    { slug: 'tarn-gate-peptides', ad: 'Tarn Gate Peptides', demo: true },
    { slug: 'kestrel-bio', ad: 'Kestrel Bio', demo: true },
    { slug: 'yarrow-glen-labs', ad: 'Yarrow Glen Labs', demo: true },
    { slug: 'prizm-research', ad: 'Prizm Research', demo: true }
  ],
  raporlar: [
    /* Gerçek kayıt. Değerler Janoshik'in 29 Ekim 2026 tarihli, #248063 görev numaralı raporundan alındı. */
    { slug: 'young-pharma-n-acetyl-semax-248063', demo: false, marka: 'young-pharma', urun: 'N-Acetyl Semax',
      lot: null, beyan: 10, birim: 'mg', kimlik: null, miktar: 0.45, miktarBirim: 'mg/ml', saflik: 99.237,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: 'Janoshik', raporNo: '#248063', tarih: '2026-10-29',
      belgeUrl: 'belgeler/janoshik-248063.webp', gorsel: 'belgeler/janoshik-248063.webp',
      gorselAlt: 'Janoshik test raporu, görev numarası #248063',
      foto: 'belgeler/young-pharma-n-acetyl-semax-numune.jpg',
      fotoAlt: 'Numune fotoğrafı: Young Pharma N-Acetyl Semax burun spreyi, etikette 10 mg (50 mcg/sprey). Fotoğraf: Janoshik',
      etiketNotu: 'Burun spreyi. Etikette 10 mg ve sprey başına 50 mcg yazıyor.',
      hacimMl: 25, hacimKaynak: 'Şişe üzerinde yazan hacim',
      dogrulamaUrl: 'https://www.janoshik.com/verify/', dogrulamaAnahtari: 'U8YE4DJ1CMX2',
      yanit: null, duzeltmeler: [] },
    { slug: 'tarn-gate-peptides-bpc-157-tg-2410-b157', demo: true, marka: 'tarn-gate-peptides', urun: 'BPC-157',
      lot: 'TG-2410-B157', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 2.8, saflik: 97.9,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Lab North', tarih: '2026-10-28',
      belgeUrl: '#belge-tarn-gate-peptides-bpc-157-tg-2410-b157', dogrulamaUrl: '#dogrulama-tarn-gate-peptides-bpc-157-tg-2410-b157',
      yanit: { tarih: '2026-11-03', metin: 'Aynı lottan ayırdığımız saklama numunesini bağımsız bir laboratuvara gönderdik. Sonuç geldiğinde raporu Peptit Analiz’e ileteceğiz.' },
      duzeltmeler: [ { tarih: '2026-11-05', metin: 'Rapor tarihi 27 Ekim 2026 olarak girilmişti; belgedeki tarihe göre 28 Ekim 2026 olarak düzeltildi.' } ] },
    { slug: 'kestrel-bio-ipamorelin-kb-ipa-0926', demo: true, marka: 'kestrel-bio', urun: 'Ipamorelin',
      lot: 'KB-IPA-0926', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 5.1, saflik: 99.1,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Lab West', tarih: '2026-10-14',
      belgeUrl: '#belge-kestrel-bio-ipamorelin-kb-ipa-0926', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'yarrow-glen-labs-tb-500-yg-tb-1182', demo: true, marka: 'yarrow-glen-labs', urun: 'TB-500',
      lot: 'YG-TB-1182', beyan: 10, birim: 'mg', kimlik: 'dogrulandi', miktar: null, saflik: 98.6,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: 'Demo Lab West', tarih: '2026-09-30',
      belgeUrl: '#belge-yarrow-glen-labs-tb-500-yg-tb-1182', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'prizm-research-ghk-cu-prz-0917-g', demo: true, marka: 'prizm-research', urun: 'GHK-Cu',
      lot: 'PRZ-0917-G', beyan: 50, birim: 'mg', kimlik: 'dogrulandi', miktar: 41.5, saflik: 96.2,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Lab North', tarih: '2026-09-22',
      belgeUrl: '#belge-prizm-research-ghk-cu-prz-0917-g', dogrulamaUrl: '#dogrulama-prizm-research-ghk-cu-prz-0917-g',
      yanit: null, duzeltmeler: [] },
    { slug: 'tarn-gate-peptides-tb-500-tg-2408-tb5', demo: true, marka: 'tarn-gate-peptides', urun: 'TB-500',
      lot: 'TG-2408-TB5', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.9, saflik: 98.8,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Lab North', tarih: '2026-09-09',
      belgeUrl: '#belge-tarn-gate-peptides-tb-500-tg-2408-tb5', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'kestrel-bio-semax-kb-smx-0811', demo: true, marka: 'kestrel-bio', urun: 'Semax',
      lot: 'KB-SMX-0811', beyan: 10, birim: 'mg', kimlik: 'dogrulanamadi', miktar: null, saflik: null,
      gonderen: null, saglayan: { tur: 'okuyucu' }, lab: 'Demo Lab West', tarih: '2026-08-27',
      belgeUrl: '#belge-kestrel-bio-semax-kb-smx-0811', dogrulamaUrl: null,
      yanit: { tarih: '2026-09-02', metin: 'Numunenin bize ait olduğunu doğrulayamıyoruz. Lot numarası kayıtlarımızda var; ancak ürünün hangi koşullarda saklandığını bilmiyoruz.' },
      duzeltmeler: [] },
    { slug: 'yarrow-glen-labs-cjc-1295-yg-cjc-0774', demo: true, marka: 'yarrow-glen-labs', urun: 'CJC-1295',
      lot: 'YG-CJC-0774', beyan: 2, birim: 'mg', kimlik: null, miktar: null, saflik: 99.0,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: null, tarih: '2026-08-12',
      belgeUrl: null, dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'prizm-research-bpc-157-prz-0802-b', demo: true, marka: 'prizm-research', urun: 'BPC-157',
      lot: 'PRZ-0802-B', beyan: 10, birim: 'mg', kimlik: 'dogrulandi', miktar: 10.6, saflik: 98.1,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Lab North', tarih: '2026-08-04',
      belgeUrl: '#belge-prizm-research-bpc-157-prz-0802-b', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'yarrow-glen-labs-selank-yg-slk-0690', demo: true, kapak: true, marka: 'yarrow-glen-labs', urun: 'Selank',
      lot: 'YG-SLK-0690', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 5.9, saflik: 97.4,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Lab West', tarih: '2026-07-19',
      belgeUrl: '#belge-yarrow-glen-labs-selank-yg-slk-0690', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'kestrel-bio-bpc-157-kb-b157-0655', demo: true, marka: 'kestrel-bio', urun: 'BPC-157',
      lot: 'KB-B157-0655', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.7, saflik: 99.3,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Lab North', tarih: '2026-07-02',
      belgeUrl: '#belge-kestrel-bio-bpc-157-kb-b157-0655', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'tarn-gate-peptides-ipamorelin-tg-2405-ipa', demo: true, marka: 'tarn-gate-peptides', urun: 'Ipamorelin',
      lot: 'TG-2405-IPA', beyan: 2, birim: 'mg', kimlik: 'dogrulandi', miktar: 2.0, saflik: 98.9,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: 'Demo Lab West', tarih: '2026-06-15',
      belgeUrl: '#belge-tarn-gate-peptides-ipamorelin-tg-2405-ipa', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'prizm-research-semax-prz-0521-s', demo: true, marka: 'prizm-research', urun: 'Semax',
      lot: 'PRZ-0521-S', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.6, saflik: null,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Lab West', tarih: '2026-05-21',
      belgeUrl: '#belge-prizm-research-semax-prz-0521-s', dogrulamaUrl: null, yanit: null, duzeltmeler: [] }
  ]
};
