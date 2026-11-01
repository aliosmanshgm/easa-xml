# Havacılık Mevzuatı Hub v3.11.2

**GitHub Pages + Firebase Auth/Firestore + Google Drive; EASA ve Türkiye mevzuatları için tek kullanıcı kütüphanesi.**

Bu sürüm, 23/2/2022 tarihli ve 5210 sayılı Cumhurbaşkanı Kararı ile kabul edilen, 24/2/2022 tarihli ve 31760 sayılı Resmî Gazete'de yayımlanan **Mevzuat Hazırlama Usul ve Esasları Hakkında Yönetmelik** metni esas alınarak oluşturulan Türkiye Mevzuatı XML Standardı v2.0'ı uygulamaya entegre eder.

## v3.11.2 – AB/TR için hüküm bazlı yürürlük ve geçiş takibi

**Yeni sol menü:** **Yürürlük ve Geçiş Takibi**. Genel yürürlük, uygulanmaya başlama, kademeli yürürlük, geçiş/uyum süresi, yürürlükten kaldırılma, askıya alma ve geçerlilik sonu için farklı **mevzuat + sürüm + madde/bent** kimliklerine bağlı çoklu kayıt tutulur. Kayıtlar Firestore'daki kullanıcıya özel **`temporalEvents`** koleksiyonundadır; kaynak XML/Word/PDF ile kişisel notlar değiştirilmez. Aday tarihleri ve güncel hukukî statüleri otomatik kesinleştirme yapılmaz.

- **SHY-OLAY:** MADDE 28 uyarınca genel yürürlük adayı **18.03.2027**; GEÇİCİ MADDE 1'deki 18 aylık sürenin hesaplanan son günü adayı **18.09.2028** olarak ayrı gösterilir. Kullanıcıdan kontrol ve onay istenir. İkinci tarih genel uygulanabilirlik tarihi değildir.
- **EASA / AB:** mevcut EASA XML'indeki hüküm bazlı tarih üst verileri ve İngilizce metinlerdeki sınırlı açık tarih ifadeleri öneri olarak sunulabilir. Belirli mevzuat hükümlerinin mülga olup olmadığı **değişiklik ve konsolidasyon kaynakları** üzerinden ayrıca doğrulanmalıdır.
- **Kapsam:** tüm mevzuat, belirli madde/alt bent, kademeli olarak seçilen hüküm grupları. Kaynak, göreli tarih hesabı, tarih koşulu, kaldıran düzenleme ve değerlendirme notu alanları bulunur.
- **İş akışı:** taslak → kaynak kontrolü → kullanıcı tarafından onaylanan kayıt. Günlük durum rozetleri sadece **kayıt tarihine yaklaşma/geçme** anlamına gelir, hukukî yürürlük kararı değildir. Veri CSV olarak dışa aktarılabilir.
- **Yedek:** JSON katalog yedeğine yeni kayıtlar eklendi. Geri yükleme mevcut ID'li kayıtların üzerine yazmaz. Farklı cihaz değişiklikleri revizyon kontrolüyle korunur.

**Kurulum:** Önceki sürümlerde eksik dosyalar görüldüğünden **tam GitHub paketini** kullanın. `config.js` kesinlikle korunur; mevcut mevzuat yeniden yüklenmez. Ayrıntılı kullanım: `YURURLUK_GECIS_TAKIBI_KULLANIM.md`. Bu sürümün yeni `temporalEvents` koleksiyonuna kullanıcı-sahiplik esaslı Firestore kuralının erişim tanıdığını mevcut kurallarınızdan kontrol edin. **Canlı bulut test edilmedi.**

## GitHub'a yükleme (önerilen tek yöntem)

1. Mevcut uygulamanın **Hesap ve bağlantı > Katalog yedeğini indir** işlemiyle notların, yer imlerinin, şablonların ve eşleştirmelerin yedeğini al.
2. **`config.js` dosyasının kopyasını güvenli bir yerde tut.** Paket içinde `config.js` **bulunmaz**. Mevcut dosyanızı koruyun; aynı yapılandırmayı yeniden üretmeyin. Firebase/GDrive bağlantı ayarlarını değiştirme.
3. ZIP'i aç, klasör yapısını bozmadan içindeki **`index.html`, `src` klasörünün tamamı, `.nojekyll`** ve XSD dosyalarını mevcut `easa-xml` deposuna yükle. `src` klasöründeki tüm JavaScript bileşenleri ile `src/vendor/` birlikte yüklenmeli; dosyalar yanlışlıkla `easa-xml/easa-xml/src` içine taşınmamalı.
4. **Firebase güvenlik kurallarını yeniden yayımlama.** Dağıtım paketinde `firestore.rules` bulunmaz; mevcut güvenlik kurallarını değiştirme.
5. GitHub Pages dağıtımını kontrol et; tarayıcıda **Ctrl + Shift + R** ile yeniden yükle. Sol menüde `v3.11.2` görülmeli.
6. **Mevzuat kütüphanesi, TR–EASA eşleştirmeleri, Yayın Oluşturucu ve Notlar** menülerini aç. Ardından **Mevzuat yükle → Word/PDF** işlemini test et.

> Mevcut SHY-OLAY XML'ini yeniden yükleme veya silme. Firestore notları ve Google Drive arşivindeki mevcut dosyalar üzerinde otomatik toplu dönüşüm yapılmaz.

## v3.11.1 – Yürürlük ve uygulanabilirlik tarihleri

**Mevcut SHY-OLAY kaydını yeniden yüklemeyin.** 18/9/2026 tarihli ve 33374 sayılı Resmî Gazete'de yayımlanan SHY-OLAY'ın MADDE 28 hükmü, yayımından altı ay sonra yürürlüğe girmeyi öngörür. Uygulama bu hükümden **18/3/2027** tarihini bir **öneri** olarak hesaplar; kullanıcı kaydetmeden kesin/teyit edilmiş tarih olarak göstermez. Ayrı bir düzenleme olmaksızın “uygulanabilirlik tarihi” aynı tarihe zorlanmaz; bu alan boş kalabilir.

**Mevcut kayıt için:** Kütüphane → SHY-OLAY → herhangi bir madde → **Tarihleri düzenle**. Önerilen tarih ve “MADDE 28” kaynak dayanağını gözden geçirip **Tarihleri kaydet** düğmesine basın. Aynı işlem **Sürüm yönetimi** ekranındaki ilgili TR mevzuat satırından da açılabilir. Bu işlem yalnızca kullanıcının kendi Firestore kataloğundaki sürüm üst verisini günceller; Google Drive XML/PDF/Word dosyalarına, hüküm kimliklerine, notlara veya eşleştirmelere dokunmaz. Başka cihaz aynı kayıtla çalışırken çakışma olursa kaydetme reddedilir ve buluttan yenileme istenir.

**Yeni Word/PDF yüklemesinde:** İçe aktarma ekranında “Yürürlüğe giriş tarihi” ve **ayrı, isteğe bağlı** “Uygulanabilirlik tarihi” alanları bulunur. Bir mevzuatta tek ve açık bir “Yürürlük” hükmü varsa sistem tarih önerisini forma doldurur. Kademeli, farklı hükümler için farklı tarihler veya belirsiz ifadeler içeren metinlerde öneri yapılmaz; kullanıcı doğrudan resmî metne göre tarihi girmelidir. Son onay ve karşılaştırma sorumluluğu kullanıcıdadır.

**Yedekleme:** Mevcut JSON katalog yedeği onaylanan tarih üst verisini içerir. Yedekten geri yüklemede yalnızca buluttaki sürümde henüz bulunmayan tarih kaydı yeniden eklenir; hâlihazırdaki tarih kaydı otomatik değiştirilmez. Tarih yedeği, kaynak mevzuatın arşiv kopyası değildir.

**Teknik:** Yeni `src/tr-dates.js` modülü otomatik önerileri hesaplar. `src/cloud.js` üzerindeki `saveReleaseDates()` Firestore işlemi, yalnızca `legalDates` alanını revizyon kontrolüyle günceller. TR XML v2.0 şemalarında `applicabilityDate` isteğe bağlıdır. v1.0 kaynak XML'ler ve mevcut SHY-OLAY not kimlikleri korunur. **Bu ifade yalnızca v3.11.1 tarih üst verisi için geçerlidir. v3.11.2, yeni kullanıcıya özel `temporalEvents` koleksiyonunu kullanır; mevcut sahiplik kuralı bunun erişimini kapsamalıdır.**

## v3.11'de neler değişti?

- `src/tr-schema.js` **yeni**: v1.0/v2.0 TR XML doğrulama ve seçilmiş mevzuat biçim kuralları. Tarayıcıda yapısal ve iş kuralı denetimi yapılır; bu tam bir XSD işlemcisi değildir.
- `src/tr-parser.js` **güncellendi**: iki XML sürümünü ve kitap/kısım/bölüm, ek ve geçici maddeleri, çerçeve değişiklik metinlerini, maddesiz genelge/tebliği ve ekleri okuyabilir.
- `src/tr-document-import.js` **güncellendi**: Word/PDF metin katmanlarından v2.0 XML üretir. Farklı mevzuat sınıfları ve numaralandırma düzeni için genişletildi.
- `src/tr-import-ui.js` **güncellendi**: mevzuat türü, müstakil/çerçeve, taslak/yayımlanmış/konsolide, yayım kanalı seçimleri; önizleme ve doğrulama. Kanun/CBK taslaklarında madde gerekçesi ve etki analizi referansı alanları eklendi.
- `src/app.js`, `src/clauses.js`, `src/style.css`, `index.html` güncellendi. Tüm diğer modüller v3.10.5'ten korunarak birlikte paketlendi.
- `TR_Mevzuat_Semasi_v2_0_YeniKayit.xsd`: yeni kayıtlar için **sıkı XSD**, `TR_Mevzuat_Semasi_v2_0.xsd`: v1.0 arşiv uyumlu XSD. Önceki `TR_Mevzuat_Semasi_v1_1.xsd` referans amaçlı tutuldu.
- `tools/site_kontrol.py`: GitHub’a yüklenmesi gereken bütün yerel modüllerin varlığını kontrol eder.
- `tools/tr_mevzuat_dogrula.py`: çevrimdışı **gerçek XSD + ek iş kuralı** doğrulaması. Python 3 ve `lxml` gerektirir.

## Mevzuat yapısı

Yeni standart; kanun, Cumhurbaşkanlığı kararnamesi, karar, yönetmelik, talimat, yönerge, tebliğ ve genelge türlerini veri olarak sınıflandırır. Müstakil düzenlemede **Kitap → Kısım → Bölüm → Madde → Fıkra → Bent → Alt bent**, çerçeve değişiklik mevzuatında **numarasız fıkralı çerçeve madde**, tebliğ/genelge istisnasında **maddesiz metin bölümleri** ve ekler desteklenir.

Türk alfabesindeki bent etiketleri, `MADDE 9/A-`, `EK MADDE 2-`, `GEÇİCİ MADDE 1-`, ekler ve yürürlük tarihi modelde saklanabilir. **Tespit edilen yapı resmî metinle karşılaştırılmadan buluta yüklenmez.**

### Sınırlamalar ve dikkat edilmesi gerekenler

- PDF metin katmanı gerektirir; görüntü/tarama PDF için **OCR yoktur**. PDF.js 3.11.174 bileşeni ilk kullanımda CDN'den yüklenir. `.doc` yerine `.docx` kullanılmalıdır.
- Word otomatik numaralandırması ve karmaşık tablolar her dosyada güvenilir çıkarılamayabilir; uygulama uyarır. Ekler/metin korunur ama tablo hücrelerinin ve görsellerin birebir hukuki içerik olarak taşındığı garanti edilmez. **Çerçeve değişiklik metinlerinde içeride alıntılanan başka maddelerin sınırları uzman kontrolü gerektirir.**
- Uygulama içindeki JS doğrulama XSD 1.0 motoru değildir; XSD şemaları ve Python denetleyici ile **çevrimdışı bağımsız doğrulama** mümkündür. Tipografi, usule uygun görüş alma, kanunî yetki, içerik/mevzuat uyumu ve tarihsel mevzuat değişiklikleri uzman incelemesinden geçmelidir.
- Kanun/CBK taslağında genel/madde gerekçesi ve etki analizi referansı istenir. **Referans girmek ek belgeyi yüklemez**; gerçek belgeyi ayrıca kurumsal arşive koyman gerekir.
- Eski yürürlükte/yayımlanmış düzenlemeler **kendiliğinden yeni biçime dönüştürülmez**, uygulama yalnızca yeni belgelerde bu yapıya göre XML üretir.
- `talimat` ve `yonerge` türlerini dijital sınıf olarak desteklemek, bunların her durumda Resmî Gazete adı olarak kullanılabileceği anlamına gelmez. Yönetmelik m.11/4 ve ilgili özel düzenlemeler ayrıca gözetilmelidir.

## Eski notların korunması

`schemaVersion="1.0"` XML'leri yeni okuyucuda okunur ve eski `tr:TR.SHY-OLAY.M4` gibi **madde anahtarları aynen kalır**. SHY-OLAY'ın v1.0 XML'indeki işlenmiş 30 madde kaydının **sürüm kimliği ve tüm metin/alt bent blokları** eski okuyucuyla birebir karşılaştırıldı. Bu yazılım güncellemesinde hiçbir sürüm dosyası, not veya eşleştirme silinmez/yeniden yazılmaz. Yeni v2 XML'i kullanıcı ayrıca yüklerse farklı metin imlâları farklı bir içerik parmak izi yaratabilir; mevcut sürüme kendiliğinden yazılmaz.

## Test özeti (yerel, canlı Google hesabı kullanmadan)

- SHY-OLAY Word ve PDF metni: **4 bölüm / 30 madde / 88 fıkra / 59 bent / 3 alt bent**.
- Her iki belgeden üretilen v2.0 XML: **lxml gerçek XSD doğrulaması başarılı**.
- v1.0 SHY-OLAY: tüm 30 kayıt ve sürüm parmak izi eski sürümle eşleşti.
- v2.0 örnek çerçeve kanun, maddesiz genelge, kitap-kısım-bölüm talimat, ekler: JS ayrıştırma kontrolü başarılı.
- Chrome masaüstü ve mobil: menülerin tıklanabilirliği, yeni yükleme önizlemesi ve yatay taşmama testi başarılı.
- **Canlı Firebase/Drive yüklemesi ve gerçek GitHub Pages dağıtımı test edilmedi.**
- v3.11.1: SHY-OLAY MADDE 28 üzerinden 18/3/2027 önerisi, kullanıcı tarafından kayıt/güncelleme, Firestore revizyon kontrolü ve yeni DOCX yükleme formunda tarih önerisi Playwright ile simüle edilmiş bulut hizmetleri üzerinde test edildi. Uygulanabilirlik alanının boş bırakılması doğrulandı.

## Çevrimdışı XSD doğrulama

Gerekiyorsa ZIP içindeki proje kökünde:

```bash
python -m pip install lxml
python tools/tr_mevzuat_dogrula.py OrnekMevzuat.xml --schema TR_Mevzuat_Semasi_v2_0_YeniKayit.xsd --json rapor.json
```

Kaynaklar **2022 tarihli gönderilen yönetmelik metni** ve bu metne göre hazırlanmış XSD v2.0 paketidir; daha sonraki resmî mevzuat değişiklikleri bu çalışma kapsamında doğrulanmamıştır.

## Yükleme öncesi dosya bütünlüğü kontrolü

ZIP açıldıktan sonra kök dizinde `python tools/site_kontrol.py` çalıştırılarak eksik statik modül kontrolü yapılabilir. Bu kontrol `config.js` dosyasını aramaz; mevcut GitHub ayar dosyan korunmalıdır.
