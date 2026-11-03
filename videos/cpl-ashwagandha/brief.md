- **Hedef:** İzleyici CPL Ashwagandha'yı (KSM-66, adaptojen, 60 servis) tanısın ve ürünü incelemeye/satın almaya gitsin.
- **Kitle:** Takviye kullanan ya da kullanmayı düşünen, etiket okuyan 20–40 yaş Türkçe konuşan kullanıcılar.
- **Platform + format:** Instagram Reels / TikTok / Shorts, 9:16, 1080×1920, 30 fps, Türkçe altyazı gömülü.
- **Süre:** 20–30 sn; kesin süre Higgsfield seslendirmesinin uzunluğuna göre.
- **Ton + marka:** Temiz, güven veren, "sen" dili; CPL renkleri (teal + akçaağaç kırmızısı, beyaz zemin), ambalajdaki logo.

## Kararlar
- Dil: tr. Ana format 9:16.
- Hikâye formatı (v2): sorun → bitki → ürün → rutin → CTA; animasyonlu anlatım.
- G1/G2/G4 onaylandı: kanca A, senaryo v2, stil wellness-sage (CPL renklerine uyarlanmış: gece → şafak → gündüz).
- G3 onaylandı: Higgsfield text2speech_v2 / elevenlabs, kadın ses "Emily", ~1,1 kredi. Üretildi (job 82e1c51a…).
- Telaffuz: CPL → "Si Pi El", Ashwagandha → "Aşvaganda", KSM-66 → "Ke Se Me altmış altı" (audio/lexicon.json).
- Ses dosyası CDN'i (d8j0ntlcm91z4.cloudfront.net) ağ politikasınca engellendi; sahneler geçici zamanlamayla (audio/words.scratch.json) kuruldu.
- Kelime zamanlaması: Whisper modeli (huggingface) indirilemiyor → word_timings --engine segments --text (sessizlik + senaryo).
- Müzik: Higgsfield'da müzik modeli yok → build/bed.py ile yerel, deterministik pad (lisans gerekmez), sesin 21 dB altında, sidechain.
