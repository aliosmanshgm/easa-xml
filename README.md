# EASA eRules Hub v3.7 — Kayıtlı Derlemeler ve Rapor Şablonları

Bu sürüm v3.6'nın **Mevzuat Derle & Dışa Aktar** modülüne, bulutta kaydedilebilen ve farklı cihazlarda tekrar açılabilen taslak/şablon yönetimini ekler.

## v3.6'dan geçiş

`EASA_v3_7_Guncelleme.zip` arşivindeki dosyaları mevcut GitHub Pages deposunda **aynı yollarla** değiştirin:

| Dosya | İşlem |
| --- | --- |
| `index.html` | Değiştirin |
| `src/app.js` | Değiştirin |
| `src/cloud.js` | Değiştirin |
| `src/publisher-ui.js` | Değiştirin |
| `src/style.css` | Değiştirin |

**Dokunmayın:** `config.js`, `firestore.rules`, `src/parser.js`, `src/clauses.js`, `src/publications.js`, `src/vendor/` ve Google Drive'daki XML/işlenmiş veri dosyaları. Firebase projesinin ayarlarını yeniden girmeniz veya eski XML dosyalarını yeniden yüklemeniz gerekmez.

GitHub Pages yayınlandıktan sonra sayfayı zorunlu yenileyin (`Ctrl+Shift+R`); telefonda sayfayı yeniden açın. Sol menüden **Yayın Oluşturucu** ekranına girin.

## Kullanım

1. Mevzuat ve belirli XML sürümünü seçin. İstediğiniz maddeleri / alt gereklilikleri işaretleyin.
2. Derleme başlığı ve açıklamasını, AMC/GM/CS ekleme tercihini, mevcut notları, not sayfası sayısını ve Kindle düzenini belirleyin.
3. **Kayıt türü** olarak **Taslak** (üzerinde çalışılan seçim) veya **Şablon** (tekrar kullanılacak seçim) belirleyin.
4. **Kaydet:** aynı bulut kaydını oluşturur veya günceller. **Farklı kaydet:** ayrı bir kayıt oluşturur.
5. Üstteki **Kayıtlı taslaklar ve şablonlar** bölümünde **Aç**, **Kopyala**, **Sil**, **Yenile** ve **Yeni çalışma** seçeneklerini kullanın.
6. Açtığınız seçimlerle v3.6'da olduğu gibi Word, EPUB, TXT, Markdown ya da A4/Kindle PDF oluşturun.

## Veriler nerede saklanır?

- Firebase Firestore: yalnızca raporun başlığı, açıklaması, kayıt türü, seçili madde kodları, alt bent anahtarları, çıktı seçenekleri, sabitlenmiş XML sürüm kimliği ve sürüm kontrolü.
- Google Drive: **mevcut**, değişmeyen orijinal XML ve ayrıştırılmış mevzuat dosyaları.
- Yerel tarayıcı: derleme hazırlanırken işlenen mevzuat metinleri ve hazırlandıktan sonra indirilen çıktı.

Firestore yolu: `users/{uid}/publicationDrafts/{draftId}`. Önceki tek kullanıcıya özel `match /users/{uid}/{doc=**}` kuralı bu koleksiyonu da kapsar. Mevcut Firestore güvenlik kurallarının **doğru Google hesabını** yetkilendirdiğinden emin olun. Yeni API veya OAuth kapsamı gerekmiyor.

## Güvenli sürüm ve senkronizasyon ilkeleri

- Şablon **tam bir mevzuat sürümüne sabitlenir**. Yeni EASA XML'i geldiğinde otomatik yeni sürüme aktarılmaz.
- Kullanılan madde veya bent eşleşmiyorsa **uyarı** gösterilir, dışa aktarma kapatılır, mevcut seçimler otomatik silinmez. İsterseniz yalnızca eşleşmeyen seçimleri açık onayla kaldırabilirsiniz.
- Kaydedilmiş kaynak sürüm artık bulutta mevcut değilse şablon listede korunur ve “Kaynak sürüm bulunamadı” olarak gösterilir; eski mevzuat metni yerine başka sürüm kullanılmaz.
- **Kişisel notların metni şablona kopyalanmaz.** Çıktıda “notları ekle” açıkken, geçerli Firestore notları çalışma anında alınır. Notların eski tarihli bir anlık görüntüsü gerekiyorsa Word/PDF çıktısını saklayın.
- Kayıtlar Google hesabınızın Firebase kullanıcı kimliğiyle ilişkilidir. Başka cihazdan aynı hesapla açıp **Yenile** seçebilirsiniz.
- Bir kayıt iki cihazda değiştirildiğinde Firestore işleminde sürüm (`revision`) kontrol edilir. Eski cihazın kaydı diğer cihazın değişikliğini otomatik ezmez. Değişiklikleri korumak için **Farklı kaydet** kullanın.
- **Sil** sadece kaydedilmiş taslak/şablon kaydını siler. Mevzuat XML'i, notlar veya yer imleri silinmez.
- İçeriklerdeki kişisel notlar resmi mevzuat olarak etiketlenmez. EASA mevzuatının uygulanabilirliğini resmi kaynaktan doğrulayın.

## Yedekleme

**Hesap ve bağlantı → Yedekle** seçeneği artık kayıtlı derlemeleri de `publicationDrafts` alanında içerir. Mevcut v3 katalog yedeği biçimi `schema: 3` ile uyumludur. Geri yüklemede mevcut derlemelerin üstüne otomatik yazılmaz, yalnızca eksik kayıtlar eklenir; böylece farklı cihazların kayıtları yanlışlıkla üzerine yazılmaz.

Bu JSON yedek yalnızca Firestore kataloğu / notlar / rapor tanımlarını içerir; **Drive'daki XML dosyalarını içermez**.

## Sınırlamalar ve sonraki aşama

- v3.7'nin her derlemesi **tek bir EASA yayın ailesinin tek bir XML sürümünü** kullanır. Birden fazla mevzuatı aynı tematik raporda birleştirme sonraki v3.8 aşamasıdır.
- Çıktılar tarayıcıda oluşturulur; rapor Word/PDF/EPUB dosyası otomatik olarak Drive'a yüklenmez.
- Firestore doküman boyutunu aşmamak için kayıt başına üst sınır yaklaşık 780 KiB ve 350 seçili kayıt olarak kontrol edilir.
- PDF indirme v3.6'daki gibi tarayıcının **Yazdır → PDF olarak kaydet** işlemiyle yapılır.
- Bazı XML tabloları/şekilleri özgün belgeyle aynı düzeni koruyamayabilir; hassas resmî kullanım öncesi çıktıları kontrol edin.
- Canlı Firebase ve Drive hesabında bu ortamdan oturum açılmadı. Testler gerçek Occurrence Reporting ayrıştırılmış verileriyle, taklit edilmiş bulut işlemleriyle ve Chromium masaüstü/mobil tarayıcılarında yapıldı.

## Dosya içeriği

`EASA_v3_7_Guncelleme.zip`: değişmesi gereken 5 dosya + bu README.

`EASA_v3_7_Tam_Kaynak.zip`: uygulamanın tüm kod dosyaları, `config.example.js`, `firestore.rules` ve bu README. **Gerçek `config.js` veya XML belgeleri ZIP'e eklenmemiştir.**
