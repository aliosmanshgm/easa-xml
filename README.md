# EASA eRules Hub v3.0 – GitHub Pages + Firebase + Google Drive

**Tür:** Tek kullanıcıya yönelik, bulut destekli EASA Easy Access Rules XML kütüphanesi.

**Başlangıç:** **SIFIR mevzuat kaydı**. Kodda hiçbir XML dosyası, mevzuat metni veya önceden doldurulmuş yayın yoktur. Kendi EASA XML dosyalarınızı uygulamadan yükleyip bulut kütüphanenizi oluşturursunuz.

## 1. Mimari / bulutta ne saklanır?

| Bileşen | Saklanan içerik | Not |
|---|---|---|
| GitHub Pages | `index.html`, `src/`, `config.js` (arayüz kodu) | Orijinal XML **yok**. |
| Google Drive / `EASA eRules Hub/Original_XML` | Yüklenen **orijinal EASA XML dosyaları** | Google hesabınızın özel Drive alanında. |
| Google Drive / `EASA eRules Hub/Processed_Data` | XML'den ayrıştırılmış **JSON / JSON.GZ** kopyaları | Arama ve okuma için; dosya başına saklanır. |
| Cloud Firestore | Yayın/sürüm bilgileri, Drive dosya kimlikleri, notlar, yer imleri, aktif sürüm ve klasör kimlikleri | Büyük mevzuat metinleri Firestore'a yazılmaz. |
| Tarayıcı / IndexedDB | Açılan mevzuatların **önbelleği** | Yetkili kullanıcının cihazına özgü; bulut arşiviyle karıştırılmaz. |

### Önemli erişim kuralı

Bu ilk bulut sürümü **aynı Google hesabıyla farklı cihazlardan kullanım** için tasarlanmıştır; ortak kurumsal kütüphane veya çok kullanıcılı yayın yönetimi henüz yoktur. Başka Google hesaplarının aynı katalogu ve Drive dosyalarını birlikte yönetmesi otomatik gerçekleşmez. Böyle bir ihtiyaçta merkezi yönetici/onay/yayın altyapısı ayrıca tasarlanmalıdır.

## 2. İlk kurulum

1. Firebase Console'da bir Firebase projesi oluşturun (veya bu uygulamaya ayrılmış mevcut bir proje kullanın). **Add app > Web** ile web uygulaması ekleyin. `firebaseConfig` içindeki `apiKey`, `authDomain`, `projectId`, `appId` alanlarını not edin.
2. **Authentication > Sign-in method** ekranında **Google** sağlayıcısını etkinleştirin. **Authentication > Settings > Authorized domains** içine GitHub Pages alan adınızı, örneğin `KULLANICI.github.io`, ekleyin. Yerel test için `localhost` da eklenebilir. Google OAuth izin ekranının test modunda olması halinde kullanacağınız Google hesabını **Test users** listesine ekleyin.
3. **Firestore Database** oluşturun. `firestore.rules` dosyasını açın, `OWNER_EMAIL_HERE@example.com` alanını kullanacağınız **gerçek Google hesabı adresiyle** değiştirin; Rules sekmesinde kuralları yayımlayın. *Örnek e-posta adresini değiştirmeden bırakmayın:* aksi halde bütün okuma/yazmalar reddedilir.
4. Firebase projesine bağlı **Google Cloud Console > APIs & Services > Library** bölümünden **Google Drive API**'yi etkinleştirin. Uygulama, Google giriş iznine ek olarak **`https://www.googleapis.com/auth/drive.file`** kapsamını ister. Bu kapsam uygulamanın oluşturduğu/açtırılan dosyalara erişim verir; bütün Drive'ınıza kapsamlı erişim talep edilmez.
5. Bu ZIP içeriğini boş bir **GitHub deposunun kök dizinine** yükleyin (`index.html`, `config.js`, `src/` birlikte bulunmalı). **Settings > Pages > Deploy from a branch > main / root** seçin. GitHub Pages URL'sinden uygulamayı açın. `file://` üzerinden Google/Firebase oturumu beklemeyin.
6. GitHub üzerindeki **`config.js`** dosyasını kendi Firebase Web App yapılandırmanızla doldurun. API anahtarı web istemcisi yapılandırmasının parçasıdır ve kendi başına gizli bir sunucu anahtarı değildir. Koruma Firestore Security Rules ile sağlanır. **Servis hesabı JSON, özel anahtar, GitHub token, Drive OAuth access token koymayın.** Alternatif: `config.js` boş kalabilir; uygulamanın **Bulut bağlantısı ve ayarlar** ekranındaki formdan bu 4 değeri her tarayıcıda ayrı kaydedebilirsiniz.
7. **Google ile giriş** düğmesine basın; Google Drive erişim iznini onaylayın. Firebase kimliği + geçici Drive erişim izni kurulunca XML yükleyebilirsiniz. İlk yükleme otomatik olarak Drive'da `EASA eRules Hub/Original_XML` ve `Processed_Data` klasörlerini oluşturur.

**Önemli:** Google Drive OAuth erişim belirteci güvenlik nedeniyle hiçbir yere kalıcı kaydedilmez. Tarayıcı yenilendiğinde Firebase girişi korunabilir, ancak Drive'a ilk erişimde yeniden **Drive bağla** düğmesini kullanmak gerekebilir.

## 3. İşleyiş

- **Yeni XML yükle:** EASA eRules Flat Open XML dosyasını yükleyin. Büyük dosyalar için XML ayrıştırma Web Worker'da gerçekleşir. Orijinal dosya Drive'a **parçalı/resumable upload** ile kaydedilir; işlenmiş JSON sıkıştırılarak Drive'da ayrı dosyaya yazılır. Son olarak yalnızca sürüm kimlikleri ve kaynak dosya adresleri Firestore'a yazılır.
- **Farklı mevzuat**: Yeni kart/kütüphane ailesi; **aynı mevzuatın yeni sürümü**: aynı kartın sürüm arşivine kayıt. Aktif sürüm seçimi Firestore'da tutulur.
- **Madde okuyucu:** Metinler Google Drive'dan indirilerek tarayıcıda açılır; hızlı yeniden okumaya yardımcı olmak için işlenmiş kopya yerel önbelleğe alınır.
- **Tüm mevzuatta arama:** Kayıtlı yayınların seçilen aktif sürümlerinin işlenmiş verilerinde aranır; ilk taramada Drive dosyalarının indirilmesi gerekebilir. Eski sürümler karşılaştırma ekranındadır.
- **Orijinal XML indir:** Sürüm yönetimi ekranındaki **XML indir** düğmesiyle orijinal kaynak Drive'dan alınır.
- **Notlar ve yer imleri:** Firestore'a madde kimliğiyle kaydedilir; aynı Google hesabıyla diğer cihazlarda görünür.
- **Katalog yedeği:** JSON dosyasına sürüm metadata bilgileri, yer imleri ve notlar indirilir. **Bu JSON orijinal XML dosyalarını içermez.** Dosyaların kendisi Drive'da tutulur. Drive arşivi için ayrı bir bağımsız yedek önerilir.
- **Kalıcı silme:** Bir sürüm silinirse Firestore kaydı, orijinal XML ve işlenmiş dosya Drive'dan kalıcı olarak kaldırılmak üzere işlem yapılır. Silmeden önce onay istenir; Drive dosyası silme başarısız olursa uygulama uyarır.

## 4. Özellikle bilinmesi gereken sınırlar

- Bu kod, oturum açma ve Google Drive erişimi için **Firebase ve Google API servislerini** gerektirir. `config.js` doldurulmadıkça gerçek bulut bağlantısı oluşmaz. Bu ZIP'in üretilmiş olması hesaplarınıza otomatik kurulum yapıldığı anlamına gelmez.
- Kodda yer alan Firebase istemci SDK'sı sürümü: **11.10.0** (`www.gstatic.com/firebasejs/`). Çalışması için internet gerekir.
- Katalog ve notlar Firestore'da tutulur. `Cloud Storage for Firebase` kullanılmaz; bu nedenle Firebase Storage'ın ücretli plan zorunluluğu bu modelde doğrudan uygulanmaz. Google Drive kotası ayrıca geçerlidir.
- Önceden kullandığınız **v2.0** sürümündeki gömülü 2 mevzuat **v3.0'a otomatik aktarılmaz**. Orijinal EASA XML'leri, bulut bağlantısı yapıldıktan sonra ayrıca yüklenmelidir.
- Sürüm kimliği EASA XML içindeki yayın başlığı + `pub-time` + `guid` üzerinden türetilir. Aynı tanımla yeniden yüklenen dosya mükerrer sayılır.
- EASA XML'lerinde tablolar metinsel olarak aktarılır; bazı karmaşık Word görselleri/sayfa düzenleri orijinal belgeyle birebir eşleşmeyebilir.
- Bu uygulama EASA'nın resmî çevrimiçi güncellik kaynağı değildir; yalnızca yüklediğiniz sürümleri gösterir. Yürürlük ve uygulanabilirlik tarihleri, güncel resmî metinlerle birlikte değerlendirilmelidir.
- OAuth ve Firestore kurallarını doğru yapılandırmadan herkese açık Google OAuth istemcisiyle üretimde çok kullanıcılı yayın yapmayın.

## 5. Dosyalar

```
index.html
config.js                 # Boş; Firebase yapılandırmasını siz belirlersiniz
config.example.js
firestore.rules           # Tek kullanıcıya kapalı yetki örneği
src/style.css
src/parser.js             # EASA XML -> madde / AMC / GM
src/parser.worker.js      # Büyük XML'i arka iş parçacığında çözümler
src/cloud.js              # Firebase / Google Drive entegrasyonu
src/app.js                # Arayüz, arama, not, sürüm yönetimi
README.md
```

Ayrıca paket dışında **`EASA_Dijital_Mevzuat_Kutuphanesi_v3.html`** adlı tek dosyalık sürüm de sağlanır. Bu dosyada *XML içeriği bulunmaz*; ayarlardan Firebase yapılandırması girilebilir. En rahat bakım/güncelleme için GitHub Pages'e ZIP içindeki **modüler sürümü** yükleyin.

### Google kaynak dokümanları

- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/security/get-started
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
