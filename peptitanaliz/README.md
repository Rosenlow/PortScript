# Peptit Analiz

peptitanaliz.com için analiz raporu arşivi ve blog. Bağımlılık yok; site tek komutla üretilir:

```bash
node build.js
```

Çıktı `dist/` klasörüne yazılır: her rapor, marka ve yazı kendi adresinde hazır HTML sayfasıdır (`/rapor/<kayıt>/`, `/marka/<marka>/`, `/blog/<yazı>/`), yanında `sitemap.xml` ve `robots.txt` bulunur. Yayımlanacak klasör `dist/`'tir.

- `data.js` — rapor kayıtları (`demo: true` olanlar hayalî; Young Pharma kaydı gerçek rapordan)
- `yazilar/` — rehber yazıları; her yazı bir dosya (`<adres>.html`), başta `---` arasında başlık, özet, tarih, kategori ve sıra. Kapak görseli için `kapak: gorseller/<dosya>` ve `kapakAlt: <açıklama>` satırları eklenir; kapaklı yazılar 16:10 kart olarak gösterilir
- `gorseller/` — rehber kapak görselleri (yapay zekâyla üretilmiş temsili fotoğraflar; bir ürünü ya da raporu göstermez)
- `paylasim/` — rapor bağlantısı paylaşıldığında görünen görseller; `node og.js` ile üretilir (Playwright gerekir)
- `app.js` — sayfa üretimi ve tarayıcıdaki etkileşim (arama, filtreler, kopyalama, belge büyütme)
- `styles.css` — görsel dil
- `belgeler/` — gerçek kayıtların rapor belgeleri ve numune fotoğrafları
- `build.js` — siteyi üretir

Demo kayıtların sayfaları arama motorlarına kapalıdır (`noindex`) ve site haritasına girmez.

Gerçek kayıt eklerken `data.js` başındaki alan açıklamalarına uyun. Bilinmeyen kaynak alanları `null` bırakılır ve sitede “Belirtilmemiş” olarak görünür; raporda olmayan ölçümler `null` bırakılır ve “Raporda belirtilmemiş” olarak görünür.
