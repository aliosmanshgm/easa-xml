# Havacılık Mevzuatı Hub v3.10.5 — Bent / Alt bent Notları Düzeltmesi

## Tespit edilen kesin hata

Kullanıcının `Mevzuat_Hiyerarsi_Tani.json` raporu, SHY-OLAY MADDE 4 için **36 kayıtlı metin bloğu** ve yalnızca **2 fıkra / 0 bent / 0 alt bent** gösteriyor. İndirilen `TR_Mevzuat_Yeniden_Ayrismis_Taslak.xml` ise ilgili maddede **2 fıkra + 30 bent + 3 alt bent** içeriyor.

Hatanın esas kaynağı: GitHub'da muhtemelen v3.9 öncesinden kalan `src/clauses.js` dosyası. v3.4–v3.8 motoru yalnızca `(1)` / `(a)` biçimindeki parantezli numaraları tanır. Türk mevzuatının `a)`, `ç)`, `aa)` ve `1)` biçimlerini tanımaz. Bu yüzden işlenmiş veri ve arşiv XML'i, ikisi de tam olsa bile, aynı eski okuyucu tarafından **2 / 0 / 0** sayılıyor ve önceki onarım gerekli değilmiş gibi sonuçlanıyor.

Aynı kullanıcı XML'iyle gerçek tarayıcı testi:

| Motor | Metin bloğu | Fıkra | Bent | Alt bent |
|---|---:|---:|---:|---:|
| Eski v3.8 `clauses.js` | 36 | 2 | 0 | 0 |
| Düzeltilmiş `clauses.js` | 36 | 2 | 30 | 3 |

Bu nedenle eski SHY-OLAY sürümünün Drive'dan silinmesi, yeni XML yüklenmesi veya bir veri onarımı çalıştırılması **gerekmiyor**.

## GitHub'a kurulumu

v3.10.4'ten bu sürüme geçmek için yalnızca **üç** uygulama dosyasını, ZIP içindeki klasör yollarını koruyarak değiştirin:

1. `index.html`
2. `src/app.js`
3. `src/clauses.js` (**asıl sorunlu dosya**)

`src/clauses.js` dosyasını repo köküne değil `src/` klasörüne yükleyin. GitHub arayüzünden `src/clauses.js` dosyasını açıp içeriğini güncelleyebilir veya ZIP'den aynı yoluyla yükleyebilirsiniz. Her üç değişikliği commit edin; GitHub Pages dağıtımının tamamlandığını doğrulayın.

Tarayıcıda önbelleksiz yenileme için **Ctrl + Shift + R** kullanın. Ekranın sol altındaki sürüm **v3.10.5** olmalı. Yeniden yüklenen `index.html` her JavaScript dosyasını `?v=3.10.5` ile çağırarak eski önbellek kopyalarını atlar.

**Kesinlikle değiştirmeyin:** `config.js`, Firebase ayarları ve kuralları, Google Drive'daki orijinal Word/PDF/XML dosyaları, işlemden geçmiş mevzuat verisi veya mevcut Firestore notları. Hiçbir mevzuat dosyasını yeniden yüklemeyin ya da silmeyin.

## Kullanıcı testi

1. Mevcut SHY-OLAY'ı açın.
2. **MADDE 4 — Tanımlar ve kısaltmalar** maddesine gidin.
3. `Not hedefleri` satırında **2 fıkra · 30 bent · 3 alt bent** görmelisiniz.
4. `s)` bendini, `2)` alt bendini açın. Her birinin yanında bağımsız `Not ekle` düğmesi olmalıdır.
5. `MADDE 4 → (1) → s) → 2)` için yeni bir not kaydedin ve diğer eski notların korunduğunu kontrol edin.

**Kaynak XML ile kontrol et**, **XML hiyerarşisini güncelle**, **Buluttan yenile**, XML/PDF'yi yeniden yükle veya sürümü sil gibi işlemler gerekli değildir.

## Yeni sürümde ilave güvenlik

- Sayfa açılırken motorun `a)` ve `1)` Türkçe numaralarını ayrıştırabilmesi küçük bir testle kontrol edilir.
- `clauses.js` eskiyse sayfanın sağ altındaki teşhis bölümünde bunun adı açıkça gösterilir; ana menüler kilitlenmez.
- `Mevzuat_Hiyerarsi_Tani.json` dosyasına artık motor sürümü ve `bent` / `altBent` destek bayrakları eklenir.
- EASA maddelerinde kullanılan eski `(a)` biçimi ve mevcut not referansları korunur.

## Yerel test özeti

- Kullanıcının gönderdiği gerçek SHY-OLAY XML'i üzerinde aynı 36 bloktan **2 / 30 / 3** hiyerarşisi oluşturuldu.
- Chromium masaüstü (1440 piksel) ve mobil (390 piksel): 35 bağımsız not düğmesi doğrulandı; alt bent `1/s/2` notu başarıyla kaydedildi. Önceki genel not ve `1` fıkra notu korundu.
- Eski v3.8 `clauses.js` bilinçli olarak kullanıldığında doğru dosya uyarısı verildi; ana gezinme çalıştı.
- Gerçek Firebase hesabına erişim kullanılmadı; not kaydı testlerinde bulut servisi simüle edildi.
