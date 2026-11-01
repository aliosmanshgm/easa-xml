# Yürürlük ve Geçiş Takibi | v3.11.2

## Amaç

Havacılık Mevzuatı Hub'da **Türkiye ve AB/EASA mevzuatı için mevzuat sürümüne bağlı** birden çok hukukî zaman olayı kaydetmek. Bu sayfada tutulan kayıtlar **resmî mevzuat metni değildir**; kullanıcının kaynağa dayalı takip ve değerlendirme notlarıdır. Kaydedilmiş bir tarihin geçmiş olması, ilgili hükmün yürürlükte, yürürlükten kalkmış veya uygulanabilir olduğu sonucunu tek başına doğurmaz.

## Veri modelimiz

Her kayıt `users/{uid}/temporalEvents/{eventId}` Firestore yolunda saklanır. Değiştirilmeyen temel alanlar `familyId`, `versionId`, isteğe bağlı `recordKey` (madde kimliği) ve `anchor` (fıkra/bent/alt bent kimliği). Böylece eski ve yeni XML sürümleri birbirine karışmaz.

- **Olay türü:** genel yürürlüğe giriş, uygulanmaya başlama, geçiş/uyum sonu, yürürlükten kaldırılma, geçerliliğin sona ermesi, askıya alınma.
- **Kapsam:** mevzuatın tamamı, belirli madde/alt gereklilik, seçilmiş hükümler (kademeli). Kademeli durumda kapsanan hükümler açıkça yazılır.
- **Tarih:** kesin tarih, başlangıç tarihi ile gün/ay/yıl cinsinden göreli süre veya tarih belirsiz/koşula bağlı kayıt. Tarih hesapları sadece birer aday öneridir.
- **Dayanak:** ilgili madde/atıf, kısa kaynak alıntısı, tarih/koşul ifadesi, varsa kaldıran/değiştiren mevzuat ve kişisel değerlendirme.
- **İnceleme:** taslak ya da kullanıcı tarafından kaynak metni kontrol edilmiş kayıt. Kaynak kontrolü **hukukî uygunluk onayı** değildir.
- **Çakışma:** aynı kayıt iki cihazdan düzenlenirse revizyon numarası nedeniyle sessiz üzerine yazma reddedilir.

## Nasıl kullanılır?

1. Sol menüde **Yürürlük ve Geçiş Takibi** bölümünü aç.
2. **Yeni tarih / geçiş kaydı** ile ilgili mevzuatın XML sürümünü ve kapsamını seç.
3. Kaynak hükmü belirle. Kademeli uygulamada madde grubu ve koşulları yaz; mülga hükümde kaldıran mevzuatı ayrıca belirt.
4. Tarih ve hesaplama temeli ile dayanağı kontrol et. Belirsiz koşullu durumlarda tarih boş kalabilir.
5. Doğrulama yapılmadıysa **Taslak** olarak sakla. Resmî kaynak doğrulandıysa **Kaynak kontrol edildi** ve onay kutusuyla kaydet.
6. Tarih/olay/kaynak filtrelerinden yararlan; CSV ile dışa aktar veya JSON katalog yedeğini al.

**Alternatif:** Mevzuat okuyucusunda bir maddeyi açıp **Yürürlük / geçiş kaydı** düğmesine bas; madde ve kaynak metni ön seçilir. Sürüm yönetimi sayfasında da her TR/EASA sürümü için kısayol bulunur.

## Kaynaktan öneri

**Kaynak metinden tarih önerileri → Kaynağı tara** düğmesi XML kayıtlarında sınırlı ve ihtiyatlı işaretleri inceler. Örnekler:

| SHY-OLAY hükmü | Öneri | Açıklama |
| --- | --- | --- |
| MADDE 28 | 18.03.2027 | 18.09.2026 yayımı + altı ay. Genel yürürlük aday tarihi. |
| GEÇİCİ MADDE 1 | 18.09.2028 | Genel yürürlükten itibaren on sekiz aylık yükümlülük tamamlanma süresinin aday son günü. Bu tarih tüm mevzuatın uygulanabilirlik tarihi değildir. |

**Öneriler kendiliğinden Firestore'a kaydedilmez.** Kayıt oluşturmak için **Taslak aç** ve sonrasında kaydet. Uygulama İngilizce EASA metnindeki doğrudan takvim tarihi içeren sınırlı `shall apply from ...` / `shall enter into force on ...` ifadelerini ve XML'deki maddeye özgü EntryIntoForceDate/ApplicabilityDate alanlarını da aday olarak gösterebilir. Şu hususlarda **otomatik tarih veya hukukî durum tespiti güvenilir değildir**: parçalı/çok aşamalı uygulama, AB düzeltme/değişiklik tüzükleri, koşula bağlı yükümlülükler, yürürlükten kaldırılan **başka** mevzuata yapılan atıflar, Resmî Gazete düzeltmeleri, konsolide sürüm farkları ve mahkeme iptalleri. Bunlar elle değerlendirilmelidir.

## Koruma ve yedek

- SHY-OLAY ve EASA'nın kayıtlı orijinal XML/Word/PDF belgeleri ile Drive dosya kimlikleri değiştirilmez.
- Eski madde/alt bent notları, TR–EASA eşleştirmeleri, eski v3.11.1 sürüm tarih üst verileri ve derlemeler korunur.
- v3.11.2 JSON katalog yedeği `temporalEvents` listesini de içerir; v3.11.1 yedekleri okunmaya devam eder. İçe aktarmada aynı ID'li mevcut kayıt üzerine yazılmaz; artık bulunmayan mevzuat sürümüne bağlı kayıt atlanır.
- Firestore yetki modeli: kullanıcıya ait `users/{uid}/...` altındaki dokümanlar. Mevcut güvenlik kurallarınız bu yeni koleksiyonu kapsamıyorsa `permission-denied` hatası görülebilir; yetkileri genişletmeden önce mevcut kullanıcı-sahiplik kurallarını kontrol edin. Kaydı herkese açık yapmayın.
- Takvimde tarih yaklaşımı **uygulama açıldığında** görüntülenir. Henüz e-posta/push bildirimi veya sürekli arka plan izleme yoktur.

## Kurulum

`index.html`, `src/` klasöründeki **tüm dosyalar** ve `.nojekyll` depoda kendi yollarına yüklenir. **config.js üzerine yazılmaz.** `src/temporal.js` ve `src/temporal-ui.js` yeni modüllerdir; `src/cloud.js`, `src/app.js`, `src/style.css` ve `index.html` güncellenmiştir. v3.11.2'den sonra sol altta `v3.11.2` görülecek. Kurulum kontrolü: `python tools/site_kontrol.py`.

Canlı Firebase/Drive hesabında yükleme bu paket hazırlanırken test edilmemiştir; yerel Chromium arayüz testleri ve sahte bulut kayıt işlemleriyle doğrulanmıştır.
