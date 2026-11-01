# Havacilik Mevzuati Hub v3.10.4 - MADDE 4 bent/alt bent notlari

## Ne duzeltildi?

v3.10.3, Google Drive'da daha once saklanmis SHY-OLAY'in islenmis verisinde bentler eksikse yeniden indeksleme islemini bazen gereksiz sayabiliyordu. Yeni surum, secilen maddenin **gercek kaynak XML kaydini** indirerek islenmis kayitla karsilastirir. Hicbir PDF/XML dosyasi veya not yalnizca denetim yapildigi icin degistirilmez.

MADDE 4 icin onaylanmis ornek kaynakta su seviyeler goruluyor: 2 fikra, 30 bent, 3 alt bent (toplam 35 not hedefi).

## GitHub'a guncelleme

1. `index.html`, `src/app.js`, `src/cloud.js`, `src/style.css` dosyalarini GitHub deposunda **ayni dosya yolu** ile degistirin. Diger dosyalari silmeyin.
2. `config.js`, Firestore kurallari, Drive dosyalari, notlar ve yuklu SHY-OLAY XML/PDF degistirilmez.
3. Sayfayi onbelleksiz yenileyin. Sol altta `v3.10.4` yazisini kontrol edin.
4. SHY-OLAY -> **MADDE 4** ekranina gidin. `Not hedefleri` sayacini inceleyin.
5. **Kaynak XML ile kontrol et** dugmesine basin.
6. Sistem yalnizca **maddenin tam metni ve basligi ayniysa**, mevcut notlar yeni yapida gorunuyorsa ve kaynaktan daha fazla bent/alt bent bulunuyorsa `Onayla: bu maddenin bentlerini bulutta duzelt` dugmesini gosterir. Bu dugmeyle onay verin.
7. Sonrasinda `2 fikra - 30 bent - 3 alt bent` ve her birinin yaninda `Not ekle` dugmesi beklenir. `MADDE 4 > (1) > s) > 2)` uzerinde deneyin.

## Uyari durumlari

- Orijinal XML'de de bentler yoksa otomatik onarim yapilmaz. Daha once yuklenen PDF/Word arşivlenmisse **Orijinal Word/PDF'yi de kontrol et** dugmesiyle ikinci bir okuma yapilabilir.
- Orijinal veya yeniden olusturulan metin ile buluttaki metin farkliysa uygulama **veri degisikligini engeller**. `Tani raporunu indir` secenegini kullanarak kişisel kimlik bilgisi icermeyen hiyerarsi tanisini alabilirsiniz. `Kontrol amacli XML indir` da vardir; elle dogrulamadan baska bir surumun uzerine yazmayin.
- Eski subnot referanslari yeni yapida bulunamazsa otomatik onarim kapali kalir.
- Yeni surum bir surumu guncellerken onceki **islenmis veri kopyasini** Google Drive'da muhafaza eder; bulut notlari ve orijinal belgeler etkilenmez.

## Teknik QA

- `node --check` tum ana JavaScript dosyalarinda geciyor.
- Chromium masaustu (1440) ve mobil (390): eski MADDE 4 `2 fikra/0 bent` modeline karsin dogrulanmis XML `2/30/3` modeli kontrollu onarildi, `1/s/2` note yazildi. Eski fıkra ve genel not kaybolmadi.
- Metin uyusmazligi senaryosunda guvenli onarim dugmesi gosterilmiyor ve buluta yazma yapilmiyor.
- Canli Firebase/Drive hesabi uzerinde test yapilmadi; en son onay kullanicida kalir.
