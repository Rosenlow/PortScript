/* Peptit Analiz — blog yazıları.
   - html: yazı gövdesi. Site içi bağlantılar {{adres-adı}} ile yazılır: {{blog-<yazı>}}, {{rapor-<kayıt>}}, {{raporlar}}.
   - urun: data.js'teki ürün adıyla aynıysa o ürünün raporları yazının altında listelenir.
   - ilgili: ayrıca listelenecek rapor kayıtları.
   Yazılar bilgi verir; doz, kullanım şeması ya da ürün tavsiyesi içermez. */
window.PA_BLOG = [
  {
    slug: 'bpc-157-nedir',
    baslik: 'BPC-157 nedir? Araştırmalar ne gösteriyor, ne göstermiyor',
    ozet: 'BPC-157, 15 amino asitten oluşan sentetik bir peptit. Hakkındaki çalışmaların çoğu hayvan deneyi; insanlarda etkililiği ve güvenliliği gösterilmiş değil.',
    tarih: '2026-11-11', guncelleme: '2026-11-11', urun: 'BPC-157',
    html:
      '<section><h2>Kısaca</h2>' +
      '<p>BPC-157, 15 amino asitten oluşan sentetik bir peptittir. Adı “Body Protection Compound” ifadesinin kısaltmasıdır. Literatürde, mide sıvısında bulunan bir proteinin küçük bir parçasından türetildiği anlatılır. Molekül ağırlığı yaklaşık 1419 daltondur.</p>' +
      '<p>İnternette sık aranan peptitlerden biridir ve çoğunlukla “yalnızca araştırma amaçlıdır” ibaresiyle satılır. Onaylı bir ilaç değildir.</p></section>' +

      '<section><h2>Araştırmalar ne gösteriyor</h2>' +
      '<p>BPC-157 üzerine yayımlanan çalışmaların büyük bölümü sıçanlarda ve hücre kültürlerinde yapılmıştır. Bu çalışmalarda tendon, bağ, kas ve mide-bağırsak dokusundaki hasar modellerinde iyileşmenin hızlandığı bildirilmiştir. Öne sürülen mekanizmalar arasında yeni damar oluşumunun desteklenmesi yer alır.</p>' +
      '<p>Bu bulguları okurken iki şeyi akılda tutmak gerekir. Birincisi, hayvanda görülen bir etki insanda aynı şekilde görülmeyebilir. İkincisi, yayınların önemli bir kısmı aynı araştırma grubundan gelir; sonuçların bağımsız gruplarca tekrarlanması sınırlıdır.</p></section>' +

      '<section><h2>Ne bilinmiyor</h2><ul>' +
      '<li>İnsanlarda etkili olup olmadığı. Yeterli büyüklükte, kontrollü bir klinik çalışma yayımlanmış değil.</li>' +
      '<li>İnsanlarda güvenli olup olmadığı ve uzun dönemde ne olduğu.</li>' +
      '<li>Hangi miktarın ne etki yaptığı. Bu yüzden bu yazıda doz ya da kullanım bilgisi yok.</li>' +
      '</ul></section>' +

      '<section><h2>Hukuki ve sportif durum</h2>' +
      '<p>BPC-157, ABD Gıda ve İlaç Dairesi (FDA) ya da Avrupa İlaç Ajansı (EMA) tarafından onaylanmış bir ilaç değildir. ABD’de eczanelerin bu maddeyle ilaç hazırlayıp hazırlayamayacağı 2026 boyunca değişen bir konu oldu; güncel durum için FDA’nın kendi listesine bakmak gerekir.</p>' +
      '<p>Dünya Dopingle Mücadele Ajansı (WADA) BPC-157’yi yasaklılar listesinde, onaylanmamış maddeler sınıfında (S0) adıyla sayar. Müsabaka içinde de dışında da yasaktır.</p></section>' +

      '<section><h2>Piyasadaki ürünler ve analiz neden önemli</h2>' +
      '<p>“Araştırma amaçlı” satılan peptitler ilaç denetiminden geçmez. Flakonun içinde etikette yazan maddenin, yazan miktarda bulunup bulunmadığını etikete bakarak bilemezsiniz. Bunu yalnızca bir laboratuvar analizi gösterir.</p>' +
      '<p>Bir analiz raporu üç soruya bakar: madde doğru mu (kimlik), ne kadar var (miktar) ve ne kadar saf (saflık). Sonuç yalnızca analiz edilen numune ve o lot için geçerlidir. Rapor, ürünün güvenli ya da etkili olduğunu söylemez.</p>' +
      '<p>Raporların nasıl okunacağını <a href="{{blog-peptit-analiz-raporu-nasil-okunur}}">Peptit analiz raporu nasıl okunur?</a> yazısında anlattık. BPC-157 için arşivde bulunan raporlar bu sayfanın altında listeleniyor.</p></section>' +

      '<section><h2>Kaynaklar</h2><ul>' +
      '<li><a href="https://pubmed.ncbi.nlm.nih.gov/?term=BPC+157" target="_blank" rel="noopener">PubMed’de BPC 157 üzerine yayınlar ↗</a></li>' +
      '<li><a href="https://www.wada-ama.org/en/prohibited-list" target="_blank" rel="noopener">WADA Yasaklılar Listesi ↗</a></li>' +
      '</ul></section>'
  },
  {
    slug: 'peptit-analiz-raporu-nasil-okunur',
    baslik: 'Peptit analiz raporu nasıl okunur?',
    ozet: 'Bir analiz raporunda kimlik, miktar ve saflık ayrı şeylerdir. %99 saflık, flakonda etikette yazan kadar madde olduğu anlamına gelmez.',
    tarih: '2026-11-10', guncelleme: '2026-11-11',
    ilgili: ['young-pharma-n-acetyl-semax-248063'],
    html:
      '<section><h2>Raporun cevapladığı üç soru</h2><ul>' +
      '<li><b>Kimlik:</b> Numunedeki madde, etikette yazan madde mi?</li>' +
      '<li><b>Miktar:</b> Numunede bu maddeden ne kadar var?</li>' +
      '<li><b>Saflık:</b> Ölçülen peptidin ne kadarı hedef madde, ne kadarı safsızlık?</li>' +
      '</ul><p>Her rapor üçünü birden içermez. Raporda olmayan bir ölçüm için sonuç çıkarılamaz.</p></section>' +

      '<section><h2>Saflık, miktar değildir</h2>' +
      '<p>En sık yapılan hata bu ikisini karıştırmaktır. Saflık bir orandır: numunedeki peptidin yüzde kaçının hedef madde olduğunu söyler. Miktar ise flakonda toplam kaç miligram madde bulunduğudur.</p>' +
      '<p>%99 saflıkta bir ürün, etikette 5 mg yazarken 3 mg içerebilir. Tersine, miktarı tam tutan bir üründe saflık düşük olabilir. Yalnızca saflık sonucu veren bir rapor, miktar hakkında bir şey söylemez.</p></section>' +

      '<section><h2>mg ve mg/ml farkı</h2>' +
      '<p>Toz halindeki (liyofilize) ürünlerde miktar çoğunlukla flakon başına miligram olarak verilir ve etiketle doğrudan karşılaştırılır.</p>' +
      '<p>Sıvı ürünlerde, örneğin burun spreylerinde, laboratuvar derişimi ölçer: mililitre başına miligram (mg/ml). Etiket toplam miktarı yazıyorsa karşılaştırmak için şişenin hacmini bilmek gerekir:</p>' +
      '<p class="calc">toplam miktar (mg) = derişim (mg/ml) × hacim (ml)</p>' +
      '<p>Arşivdeki <a href="{{rapor-young-pharma-n-acetyl-semax-248063}}">Young Pharma N-Acetyl Semax raporu</a> buna örnektir. Rapor 0,45 mg/ml derişim veriyor; 25 ml şişe hacmiyle bu 11,25 mg eder. Hacim raporda yazmıyorsa ve başka bir kaynaktan bilinmiyorsa karşılaştırma yapılamaz.</p></section>' +

      '<section><h2>Etiketle karşılaştırırken</h2>' +
      '<p>Ölçülen miktar ile etiket arasında küçük farklar olağandır: dolum toleransı ve ölçüm belirsizliği vardır. Peptit Analiz, farkın %10’u aştığı kayıtları “Miktar sapması” olarak işaretler. Bu eşik yalnızca özetleme içindir; kesin bir sınır değildir.</p>' +
      '<p>Fark iki yönde de olabilir. Etiketten fazla çıkan miktar da bir sapmadır.</p></section>' +

      '<section><h2>Numuneyi kim gönderdi</h2>' +
      '<p>Raporda “Client” (müşteri) alanı, analizi kimin sipariş ettiğini gösterir. Numuneyi markanın kendisi gönderdiyse, hangi flakonun gönderileceğini de marka seçmiştir. Bağımsız bir alıcının ya da bir platformun gönderdiği numune farklı bir kanıttır. Bu yüzden arşivde numuneyi gönderen, raporu sağlayan ve analizi yapan laboratuvar ayrı ayrı yazılır.</p></section>' +

      '<section><h2>Lot numarası</h2>' +
      '<p>Bir sonuç yalnızca analiz edilen numuneye ve onun üretim lotuna aittir. Aynı markanın başka bir lotu farklı çıkabilir. Raporda lot “Unknown” ya da boş ise, elinizdeki ürünle rapordaki numunenin aynı üretimden geldiğini doğrulayamazsınız.</p></section>' +

      '<section><h2>Raporun gerçek olduğunu doğrulamak</h2>' +
      '<p>Rapor görselleri kolayca değiştirilebilir. Birçok laboratuvar bu yüzden raporlarına bir doğrulama anahtarı koyar. Örneğin Janoshik raporlarının altında bir anahtar ve laboratuvarın doğrulama sayfasının adresi bulunur; anahtarı o sayfaya girerek raporun laboratuvar kayıtlarındaki haliyle aynı olup olmadığına bakabilirsiniz.</p>' +
      '<p>Doğrulama anahtarı ya da bağlantısı olmayan bir raporu, laboratuvara doğrudan sormadan teyit etmenin yolu yoktur.</p></section>' +

      '<section><h2>Rapor ne söylemez</h2><ul>' +
      '<li>Ürünün güvenli ya da etkili olduğunu.</li>' +
      '<li>Steril olup olmadığını ya da endotoksin içerip içermediğini. Bunlar ayrı testlerdir ve çoğu raporda yoktur.</li>' +
      '<li>Aynı markanın diğer lotlarının ya da ürünlerinin durumunu.</li>' +
      '</ul><p>Arşivdeki bütün raporlara <a href="{{raporlar}}">Tüm raporlar</a> sayfasından ulaşabilirsiniz.</p></section>'
  }
];
