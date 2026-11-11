# Peptit Analiz

peptitanaliz.com için analiz raporu arşivi prototipi. Derleme adımı yok; statik dosyalardan oluşur.

- `index.html` — sayfa iskeleti
- `styles.css` — görsel dil
- `data.js` — kayıtlar (`demo: true` olanlar hayalî; Young Pharma kaydı gerçek rapordan)
- `belgeler/` — gerçek kayıtların rapor belgeleri
- `app.js` — arama, filtreler, sayfalar

Çalıştırmak için `index.html` dosyasını tarayıcıda açmak ya da klasörü herhangi bir statik sunucuyla yayımlamak yeterli.

Adresler: `#raporlar`, `#markalar`, `#yayin-ilkeleri`, `#rapor-<kayıt>`, `#marka-<marka>`.

Gerçek kayıt eklerken `data.js` başındaki alan açıklamalarına uyun. Bilinmeyen kaynak alanları `null` bırakılır ve sitede “Belirtilmemiş” olarak görünür; ölçülmeyen değerler `null` bırakılır ve “Ölçülmedi” olarak görünür.
