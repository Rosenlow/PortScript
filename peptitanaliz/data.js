/* Peptit Analiz — örnek kayıtlar.
   Buradaki bütün marka, lot, laboratuvar ve sonuçlar hayalîdir (demo: true).
   Gerçek kayıt eklerken:
   - gonderen / saglayan: { tur: 'platform' | 'marka' | 'okuyucu' } ya da null (Belirtilmemiş)
   - lab: laboratuvar adı ya da null (Belirtilmemiş)
   - kimlik: 'dogrulandi' | 'dogrulanamadi' | null (Ölçülmedi)
   - miktar / saflik: sayı ya da null (Ölçülmedi). miktar, beyan ile aynı birimdedir.
   - belgeUrl / dogrulamaUrl: laboratuvarın yayımladığı gerçek adres ya da null. */
window.PA_DATA = {
  tolerans: 10, // etiket beyanından ±% kaç sapma "miktar sapması" sayılır
  markalar: [
    { slug: 'tuzgolu-peptit', ad: 'Tuzgölü Peptit' },
    { slug: 'kirlangic-biyo', ad: 'Kırlangıç Biyo' },
    { slug: 'yedigol-labs', ad: 'Yedigöl Labs' },
    { slug: 'poyraz-arastirma', ad: 'Poyraz Araştırma' }
  ],
  raporlar: [
    { slug: 'tuzgolu-peptit-bpc-157-tg-2410-b157', demo: true, marka: 'tuzgolu-peptit', urun: 'BPC-157',
      lot: 'TG-2410-B157', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 2.8, saflik: 97.9,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Laboratuvar Kuzey', tarih: '2026-10-28',
      belgeUrl: '#belge-tuzgolu-peptit-bpc-157-tg-2410-b157', dogrulamaUrl: '#dogrulama-tuzgolu-peptit-bpc-157-tg-2410-b157',
      yanit: { tarih: '2026-11-03', metin: 'Aynı lottan ayırdığımız saklama numunesini bağımsız bir laboratuvara gönderdik. Sonuç geldiğinde raporu Peptit Analiz’e ileteceğiz.' },
      duzeltmeler: [ { tarih: '2026-11-05', metin: 'Rapor tarihi 27 Ekim 2026 olarak girilmişti; belgedeki tarihe göre 28 Ekim 2026 olarak düzeltildi.' } ] },
    { slug: 'kirlangic-biyo-ipamorelin-kb-ipa-0926', demo: true, marka: 'kirlangic-biyo', urun: 'Ipamorelin',
      lot: 'KB-IPA-0926', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 5.1, saflik: 99.1,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-10-14',
      belgeUrl: '#belge-kirlangic-biyo-ipamorelin-kb-ipa-0926', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'yedigol-labs-tb-500-yg-tb-1182', demo: true, marka: 'yedigol-labs', urun: 'TB-500',
      lot: 'YG-TB-1182', beyan: 10, birim: 'mg', kimlik: 'dogrulandi', miktar: null, saflik: 98.6,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-09-30',
      belgeUrl: '#belge-yedigol-labs-tb-500-yg-tb-1182', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'poyraz-arastirma-ghk-cu-prz-0917-g', demo: true, marka: 'poyraz-arastirma', urun: 'GHK-Cu',
      lot: 'PRZ-0917-G', beyan: 50, birim: 'mg', kimlik: 'dogrulandi', miktar: 41.5, saflik: 96.2,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Laboratuvar Kuzey', tarih: '2026-09-22',
      belgeUrl: '#belge-poyraz-arastirma-ghk-cu-prz-0917-g', dogrulamaUrl: '#dogrulama-poyraz-arastirma-ghk-cu-prz-0917-g',
      yanit: null, duzeltmeler: [] },
    { slug: 'tuzgolu-peptit-tb-500-tg-2408-tb5', demo: true, marka: 'tuzgolu-peptit', urun: 'TB-500',
      lot: 'TG-2408-TB5', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.9, saflik: 98.8,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Laboratuvar Kuzey', tarih: '2026-09-09',
      belgeUrl: '#belge-tuzgolu-peptit-tb-500-tg-2408-tb5', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'kirlangic-biyo-semax-kb-smx-0811', demo: true, marka: 'kirlangic-biyo', urun: 'Semax',
      lot: 'KB-SMX-0811', beyan: 10, birim: 'mg', kimlik: 'dogrulanamadi', miktar: null, saflik: null,
      gonderen: null, saglayan: { tur: 'okuyucu' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-08-27',
      belgeUrl: '#belge-kirlangic-biyo-semax-kb-smx-0811', dogrulamaUrl: null,
      yanit: { tarih: '2026-09-02', metin: 'Numunenin bize ait olduğunu doğrulayamıyoruz. Lot numarası kayıtlarımızda var; ancak ürünün hangi koşullarda saklandığını bilmiyoruz.' },
      duzeltmeler: [] },
    { slug: 'yedigol-labs-cjc-1295-yg-cjc-0774', demo: true, marka: 'yedigol-labs', urun: 'CJC-1295',
      lot: 'YG-CJC-0774', beyan: 2, birim: 'mg', kimlik: null, miktar: null, saflik: 99.0,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: null, tarih: '2026-08-12',
      belgeUrl: null, dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'poyraz-arastirma-bpc-157-prz-0802-b', demo: true, marka: 'poyraz-arastirma', urun: 'BPC-157',
      lot: 'PRZ-0802-B', beyan: 10, birim: 'mg', kimlik: 'dogrulandi', miktar: 10.6, saflik: 98.1,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Laboratuvar Kuzey', tarih: '2026-08-04',
      belgeUrl: '#belge-poyraz-arastirma-bpc-157-prz-0802-b', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'yedigol-labs-selank-yg-slk-0690', demo: true, marka: 'yedigol-labs', urun: 'Selank',
      lot: 'YG-SLK-0690', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 5.9, saflik: 97.4,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-07-19',
      belgeUrl: '#belge-yedigol-labs-selank-yg-slk-0690', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'kirlangic-biyo-bpc-157-kb-b157-0655', demo: true, marka: 'kirlangic-biyo', urun: 'BPC-157',
      lot: 'KB-B157-0655', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.7, saflik: 99.3,
      gonderen: { tur: 'platform' }, saglayan: { tur: 'platform' }, lab: 'Demo Laboratuvar Kuzey', tarih: '2026-07-02',
      belgeUrl: '#belge-kirlangic-biyo-bpc-157-kb-b157-0655', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'tuzgolu-peptit-ipamorelin-tg-2405-ipa', demo: true, marka: 'tuzgolu-peptit', urun: 'Ipamorelin',
      lot: 'TG-2405-IPA', beyan: 2, birim: 'mg', kimlik: 'dogrulandi', miktar: 2.0, saflik: 98.9,
      gonderen: { tur: 'marka' }, saglayan: { tur: 'marka' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-06-15',
      belgeUrl: '#belge-tuzgolu-peptit-ipamorelin-tg-2405-ipa', dogrulamaUrl: null, yanit: null, duzeltmeler: [] },
    { slug: 'poyraz-arastirma-semax-prz-0521-s', demo: true, marka: 'poyraz-arastirma', urun: 'Semax',
      lot: 'PRZ-0521-S', beyan: 5, birim: 'mg', kimlik: 'dogrulandi', miktar: 4.6, saflik: null,
      gonderen: { tur: 'okuyucu' }, saglayan: { tur: 'okuyucu' }, lab: 'Demo Laboratuvar Ege', tarih: '2026-05-21',
      belgeUrl: '#belge-poyraz-arastirma-semax-prz-0521-s', dogrulamaUrl: null, yanit: null, duzeltmeler: [] }
  ]
};
