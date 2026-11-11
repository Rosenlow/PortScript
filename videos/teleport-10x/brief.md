# What If Every Teleport Took You 10× Farther?

- **Format:** 10:00, 16:9, 1920×1080, 30 fps, birinci şahıs 3D simülasyon.
- **Kural:** Her sıçrama bakılan yönde, bir öncekinin tam 10 katı. 1 m → 10²⁷ m (≈106 milyar ışık yılı), 28 sıçrama.
- **İki soru:** İlk yarı “Evime dönebilir miyim?”, ikinci yarı “Bir sonraki mesafede neyi hedefleyebilirim?”
- **HUD:** sol altta `NEXT JUMP` + mesafe, ortada hedef noktası, finalde `HOME` işareti. Başka yazı yok.

## Nasıl üretildi
Her şey kodla üretilir; hazır video/3D model yok.

| Parça | Dosya |
|---|---|
| Zaman çizelgesi, 28 sıçrama, kamera anahtarları, durak konumları | `src/timeline.js` |
| İstanbul: salon, balkon + kırmızı atkı, sokak, yamaç, Boğaz, vapur | `src/istanbul.js`, `src/textures.js`, `src/builder.js` |
| Karşı yakadaki sırt sokağı (10 km durağı) | `src/ridge.js` |
| Dünya, Ay, Güneş, yıldız kataloğu, galaksiler, kozmik ağ haritası | `src/space.js`, `src/web.js` |
| Samanyolu/galaksi panoramaları (ışın yürütme, çevrimdışı) | `bake/bake.js` → `bake/out/` |
| El, HUD, son işlem | `src/hand.js`, `src/hud.js`, `src/post.js` |
| Durak başına panorama pişirme (kamera yalnızca döner) | `src/pano.js` |
| Kare render + ses + birleştirme | `build/render.mjs`, `build/sound.py`, `build/final.sh` |

Konumlar gerçek bir hesapla ilerler: durak *k* = durak *k−1* + 10^(k−1) m × (basış anındaki bakış yönü). Atkıya nişan alıp 1 km basınca
evi 900 m aşmak, HOME'a nişan alıp 106 milyar ışık yılı basınca evi 94 milyar ışık yılı aşmak bu hesabın sonucudur.

## Yeniden üretim
```
npm ci
node build/bake.mjs            # galaksi panoramaları (~40 dk, yazılım GL)
node build/render.mjs          # 600 s, 30 s'lik parçalar, kaldığı yerden devam eder
python3 build/sound.py audio/mix.wav
bash build/final.sh
```

## Kaynaklar
- Dünya dokuları: NASA Blue Marble / Black Marble (three-globe npm paketindeki örnek görseller).
- Kıyı çizgisi: Natural Earth 1:10m (world-atlas npm paketi).
- Yıldızlar, galaksiler ve kozmik ağ prosedürel; gerçek katalog değildir. Yerel Grup üyelerinin yön ve uzaklıkları gerçeğe yakındır.
- 106 milyar ışık yıllık son varış simülasyonun kurmaca uzantısıdır.
