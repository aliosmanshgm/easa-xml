# Havacilik Mevzuati Hub v3.10 - Dogrudan PDF / DOCX mevzuat aktarimi

Bu surum, v3.9 TR-EASA mevzuat kutuphanesine **dogrudan Word (.docx), metin katmanli PDF (.pdf) ve TXT** yukleyip, kontrol ettikten sonra Google Drive + Firestore'a aktarma ozelligi ekler. Mevcut **EASA eRules XML** ve yapilandirilmis **Turkiye mevzuati XML** aktarimi aynen korunur.

## GitHub Pages guncellemesi

`EASA_v3_10_Guncelleme.zip` icindeki su dosyalari depodaki AYNI yollarla yerlestirin:

- `index.html` (degistir)
- `src/app.js` (degistir)
- `src/cloud.js` (degistir)
- `src/style.css` (degistir)
- `src/tr-document-import.js` (**yeni**)
- `src/tr-import-ui.js` (**yeni**)

Diger dosyalari degistirmeyin. `config.js`, Firestore kurallari, mevcut Google Drive/XML kayitlari, notlar, TR-EASA eslestirmeleri, rapor sablonlari ve diger uygulama modulleri korunur. Bu guncelleme yeni OAuth scope, yeni Firebase koleksiyonu veya yeni Cloud projesi gerektirmez.

Yeni `TR_Mevzuat_Semasi_v1_1.xsd` yardimci dogrulama semasi pakete eklenmistir; uygulamanin calismasi icin tarayicinin bu dosyayi indirmesi gerekmez. Word belgelerinde PDF sayfa numarasi olmadigi icin `sourcePage` opsiyoneldir; bos `sourcePages` alanlari semada izinlidir. XML `schemaVersion` mevcut TR ayristrici ile uyumlu olarak `1.0` kalir.

> **Onemli:** Duz bir `index.html` yerine GitHub deposunun mevcut dosya hiyerarsisini koruyun; uygulama `src/*.js` modullerini ayri yukler. Ilk yenilemede masaustunde `Ctrl+Shift+R`, telefonda sayfayi yeniden acma kullanin.

## Kullanim

1. GitHub Pages'te uygulamayi acip Google hesabiyla giris yapin ve Google Drive iznini etkinlestirin.
2. **Mevzuat yukle** secenegine basin. XML'ler toplu secilebilir; Word/PDF/TXT dosyalari ayrica **tek tek** secilerek incelenir.
3. Word/PDF yerel tarayicida islenir; bu asamada buluta dosya yuklenmez.
4. Olusan **BOLUM -> MADDE -> fikra -> bent -> alt bent** hiyerarsisini acilip kapanabilir maddeler uzerinde inceleyin. Mevzuat kodu, resmi adi, yayim tarihi (zorunlu), RG sayisi, yururluk tarihi ve kaynak URL'sini kontrol edin.
5. Yanlis ayrilan bolumler/numaralar varsa **Kaynak metni duzenle** alanini kullanip **Metni yeniden analiz et** dugmesine basin. Duzenleme sonrasinda onayin yeniden verilmesi gerekir.
6. Istiyorsaniz **XML indir** ile kontrole tabi dosyayi buluta atmadan disari alin.
7. Maddeleri ve alt bentleri kaynak dosyayla karsilastirdiktan sonra onayi isaretleyip **Kontrol ettim, buluta kaydet** deyin.
8. Kaydedilen duzenleme ayni kutuphanede aranabilir, notlanabilir, surumleri takip edilebilir, TR-EASA eslestirmelerinde kullanilabilir ve Yayın Oluşturucu'dan Word/EPUB/Kindle PDF derlemelerine eklenebilir.

## Bulut verileri

- `Original_XML` - Uygulama tarafindan uretilen yapilandirilmis XML (EASA kaynaklari icin eskiden oldugu gibi EASA XML)
- `Original_Documents` - **YENI**: Yuklediginiz kaynak DOCX/PDF/TXT dosyalarinin degistirilmemis kopyalari
- `Processed_Data` - Arama/okuma icin sikistirilmis islenmis mevzuat JSON'u
- `Firestore users/{uid}/releases` - Kaynak kimlikleri, surum bilgisi, dosya kimlikleri ve SHA-256 butunluk dogrulamasi; tam mevzuat metni Firestore'a yazilmaz.

Sürüm yönetimi ekraninda TR dosyalari icin **XML indir** ve **Orijinal Word/PDF** ayri indirilir. Birebir ayni mevzuat metni ve ayni yayim tarihli ikinci kaynak varsa bu tekrar surum olarak kaydedilmez. Surum silinirse o surumun orijinal XML'i, kaynak PDF/DOCX'i ve islenmis JSON'u silinir; DIGER surumlere, rapor taslaklarina ve notlara dokunulmaz.

## Sinirlar ve hukuk/metin dogrulugu

- Desteklenen: `.docx`, metin katmanli `.pdf`, `.txt`; **eski `.doc`** ve taranmis/resim PDF'lerde otomatik OCR **yoktur**. Bunlari once metin katmanli PDF veya DOCX'e donusturun.
- 80 MB dosya ve 450 PDF sayfasi teknik ust siniri; cihaz performansi daha once sinirlayabilir.
- PDF metin ayrıştırması **PDF.js 3.11.174** ile tarayicida yapilir ve bu kitaplik ilk PDF kullaniminda su kaynaktan yuklenir: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js` (worker ayni versiyon). Bu nedenle ilk PDF isleme icin internete ve bu alana erisim gereklidir. Word ise projede zaten mevcut JSZip kutuphanesini kullanir.
- Word'un otomatik listeleri metne dahil edilmeyebilir; tablolar satir metnine donusturulur. Orijinal Word'de sayfa bilgisi yoksa PDF sayfa numarasi uydurulmaz.
- Karmaşık iki sütunlu PDF, dipnot, tablolar, ekler, devam sayfalari, ek/gecici madde duzenleri ve standart disi mevzuat bicimleri insan kontrolu gerektirir; basit surum bunlarin tumunu garanti etmez. EK/tablo tespit edilirse otomatik yayim engellenir. Harici XML donusturucusunde farkli sema varsa otomatik anlasilmayabilir.
- ***Bu sistem bir resmî mevzuat doğrulama servisi değildir.*** Yükleyen kişi metni Resmî Gazete / resmî yayımlayıcıyla kontrol etmelidir. Yayımlama için açık onay istenir; kaynakla eşleştirme veya hukuki uyum değerlendirmesi otomatik kurulmaz.
- Gizli Firebase veya Google OAuth anahtarları bu pakette yoktur. Mevcut `config.js` korunmalıdır.

## Test özeti

Kaynak SHY-OLAY (18.09.2026 / 33374) örnek PDF ve DOCX temsili kopyasıyla: **4 bölüm, 30 madde (29 + 1 geçici), 88 fıkra, 59 bent, 3 alt bent** elde edildi. İki çıktı da doğrulanmış SHY-OLAY XML'i ile madde metni ve başlık düzeyinde eşleşti. XML yeni yardımcı XSD ile doğrulandı. Önizleme, yayın onayı, mock Drive/Firestore kaynak arşivi, mobil görünüm ve orijinal kaynak indirme bağlantısı test edildi.

**Canlı Firebase / Google Drive hesabında gerçek veri yükleme testi yapılamadı.** İlk canlı denemede küçük bir DOCX ve ardından SHY-OLAY PDF'si ile kontrol edilmesi önerilir. **Her yeni mevzuat kaynağında tam metin gözden geçirmesi önemlidir.**
