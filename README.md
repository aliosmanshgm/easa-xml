# Havacılık Mevzuatı Hub v3.10.3

## Gerekçe

Mevcut bir Türkiye mevzuatı sürümünde bent ve alt bent notlarının görünmemesi iki farklı nedenle oluşabilir:
- Eski `index.html`/`src/app.js` veya önbelleğe alınmış JavaScript dosyalarının çalışması.
- Kayıtlı mevzuatın işlenmiş bloklarında açık fıkra-bent-alt bent seviye bilgisinin bulunmaması veya Firebase katalog şemasının geride kalması.

## Düzeltmeler

- Mevcut Türkiye mevzuatının not hedefleri artık yalnızca Firebase `schema` sayısına göre değil, gerçekte kayıtlı ve açıkça seviyelendirilmiş hiyerarşiye göre açılır. Belirsiz seviyelerde yanlış hükme not bağlanmasını önlemek için düzey bilgisi olmayan kayıtlar otomatik olarak güvenilir sayılmaz.
- Mevzuat okuyucusunda not hedeflerinin fıkra/bent/alt bent sayıları ile arayüz kodu ve katalog şema bilgisi görüntülenir.
- **Buluttan yenile:** Seçilen sürümün *yalnızca bu tarayıcıdaki işlenmiş veri önbelleğini* siler ve Google Drive'daki aynı işlenmiş dosyayı yeniden indirir. Orijinal XML/PDF, Firestore notları, yer imleri, eşleştirmeler ve rapor şablonları değiştirilmez.
- Gerçek hiyerarşi eksikse ve saklanan orijinal XML mevcutsa **XML hiyerarşisini güncelle** işlevi kullanılabilir. Bu işlem Google Drive'da yeni işlenmiş veri dosyası oluşturup katalog işaretçisini günceller; sürüm kimliğini korur. Katalog güncellemesinden önce orijinal XML'in kimliği doğrulanır. Buluttaki canlı ortamda ilk çalıştırmadan önce JSON yedeği alınması önerilir.
- `index.html` ve `src/app.js` sürümleri farklıysa açılış uyarısı görünür; kaynak URL'lerinde `?v=3.10.3` kullanılır.

## Kurulum (GitHub Pages)

`HUB_v3_10_3_Guncelleme.zip` içerisindeki 3 dosyayı aynı isim ve yolla üzerine yazın:
- `index.html`
- `src/app.js`
- `src/style.css`

**Silinmemesi gerekenler:** `config.js`, `src/cloud.js`, `src/clauses.js`, `src/tr-parser.js`, `src/mappings-ui.js`, `src/tr-import-ui.js`, `src/tr-document-import.js`, orijinal XML ve PDF dosyaları, Firestore kayıtları. Tam kaynak paketi de gereken tüm uygulama modüllerini içerir; gerçek `config.js` dosyasını içermez.

## SHY-OLAY testi

1. GitHub Pages üzerinde sol altta `v3.10.3` yazdığını doğrulayın ve `Ctrl + Shift + R` ile önbelleksiz yenileyin.
2. Kütüphane > SHY-OLAY > MADDE 4 - Tanımlar ve kısaltmalar maddesini açın.
3. "Not hedefleri" satırında **2 fıkra · 30 bent · 3 alt bent** sayıları beklenir. Bu sayılar kullanıcının daha önce kaydettiği SHY-OLAY içeriğine göre değişebilir; referans test verisinde bu değerler doğrulanmıştır.
4. `(1)`, `s)` ve `s) > 2)` için bağımsız "Not ekle" düğmelerini deneyin.
5. Sayılar eksikse önce **Buluttan yenile**, hâlâ eksikse **XML hiyerarşisini güncelle** düğmesini (görünüyorsa) kullanın. Mevzuat sürümünü silmeyin veya mükerrer yüklemeyin.
6. Not eklemeden önce JSON yedeğini almak veri emniyeti açısından faydalıdır. Başka cihazda görünürlüğü doğrulamak için aynı Google hesabıyla giriş yapın.

## Teknik doğrulama

- `node --check` (tüm uygulama JS dosyaları)
- Gerçek SHY-OLAY MADDE 4 blokları üzerinde 2 fıkra, 30 bent, 3 alt bent için toplam 35 bağımsız not hedefi; v3.10.2 ile kayıtlı genel not/bent notu kimliklerinin korunması.
- Katalog `schema=3` olsa bile açık seviyelerle not izninin verilmesi; belirsiz seviyelerde otomatik not izninin kapalı tutulması.
- Tarayıcıda canlı Firebase/Drive bağlantısı bu çalışma ortamında test edilmedi; HTTP istekleri üzerinde Chromium yönetici politikası nedeniyle görsel QA yapılamadı.
