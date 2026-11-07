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
- SFX/müzik yerel üretim (build/sound.py): cam tık (0,06 sn), etiket geçişinde hafif hava, rapor açılırken kâğıt; sessiz pad, sesin altında sidechain. Miks −14,2 LUFS, tepe −1,5 dBFS.
- **Fotoğraflar:** Higgsfield üretimi bu oturumda izin denetiminde reddedildi → p1–p4 yer tutucu (build/placeholders.py). Gerçek fotoğraflar assets/photos/p1..p4.jpg olarak konup build/setup.sh + render yeniden çalıştırılınca yerine geçer. Brif: build/photo-prompts.md.
