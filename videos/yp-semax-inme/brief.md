- **Hedef:** "Semaks verilen insanlarda ne değişti?" sorusunu 110 hastalık inme çalışmasıyla, tıbbi terim bilmeyen izleyiciye anlatmak; sonda bu numunenin Janoshik raporu.
- **Kitle:** Peptit araştırmalarıyla ilgilenen, kaynak ve analiz raporuna bakan izleyiciler.
- **Platform + format:** Instagram Reels, 9:16, 1080×1920, 30 fps, Türkçe altyazı gömülü.
- **Süre:** 36,05 sn (ses 33,96 sn + 2,2 sn kapanış). Brifteki ~30 sn'yi ses uzunluğu belirledi.
- **Ton + marka:** Kısa bilim belgeseli; pencere ışığı, nötr beyaz/gri + tek kırmızı vurgu (kan, Young Pharma kırmızısı).

## Kaynak
- Gusev EI, Martynov MY ve ark. 2018, Zh Nevrol Psikhiatr Im S S Korsakova, PMID 29798983 — https://pubmed.ncbi.nlm.nih.gov/29798983/
- Özetten (arama ile teyit; PubMed bu ortamdan doğrudan açılmadı): iskemik inme, 110 hasta (43 E / 67 K), 5 ay izlem,
  erken ve geç rehabilitasyon grupları; Semax plazma BDNF düzeyini yükseltti, yüksek kaldı.
- Çalışmadaki madde **Semax**; N-Acetyl Semax bu çalışmada test edilmedi (açıklamada belirtilir).

## Kararlar
- Klinik sahnelerde ad "Semax", ürün sahnesinde "N-Acetyl Semax" (altyazı eşlemesi build/make_cues.py).
- Araştırma fotoğrafları temsili: sol üstte kalıcı "Temsili görüntü". Ürün sahnesi: "Gerçek ürün · Yalnızca araştırma amaçlıdır".
- Bulgu cümlesi ekranda okunurken kadraj sabit (itme hareketi tam C.finding'de biter); bu sürede altyazı gizli, kart altyazının yerini alır.
- Rapor: kullanıcının yüklediği Janoshik raporu #248063 (assets/report.png), 2× lanczos ile büyütülerek. Son kare: Rapor #248063 + "Parti numarası belirtilmemiştir" (Batch: Unknown) + "Raporu inceleyebilirsin."
- Ses: kullanıcının ElevenLabs kaydı (Çiçek), 33,96 sn. Kelime zamanları build/align_voice.py (sessizlik haritası + /s/ başlangıç kontrolü; ASR modeli indirilemedi).
- SFX/müzik yerel üretim (build/sound.py): etiket geçişinde hafif hava, rapor açılırken kâğıt; sessiz pad, sesin altında sidechain. Miks −14,2 LUFS, tepe −1,5 dBFS.
- **Fotoğraflar:** Higgsfield gpt_image_2_6 (kullanıcı onayıyla), 4 adet 752×1344, assets/photos/p1–p4 (orijinal PNG'ler *-higgsfield.png; sahne için 2× lanczos JPEG). Tarifler: build/photo-prompts.md. Job: p1 d47df5f7 (v3; ilk p1 5721dd91), p2 ae21c5f9, p3 3857d0ea, p4 271c7992.
- Higgsfield CDN (d8j0ntlcm91z4.cloudfront.net) Default ortamda engelliydi → yalnızca bu hostu açan kişisel "PortScript" ortamı oluşturuldu.
- Eşleşmeli kesme: p2 eli (0,497; 0,553) ve p3 yumruğu (0,38; 0,277) kesmede aynı ekran noktası (540, 740) ve aynı ölçekte (1,50).
- Fotoğraflar 752 px genişlikte; ~2× büyütülüyor. Daha keskin sonuç için Higgsfield upscale ile yeniden render edilebilir.
- v3: açılıştaki kan tüpü (kullanıcı isteği) → pencere kenarında tekerlekli sandalyede hasta (job d47df5f7); tüp olmadığı için açılıştaki cam sesi kaldırıldı.
