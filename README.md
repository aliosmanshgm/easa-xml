# Havacılık Mevzuatı Hub v3.10.2 — Fıkra / Bent / Alt Bent Notları

## Kapsam

Mevcut v3.10.1 üzerine kuruludur. Mevcut Google Drive ve Firebase dosyalarına müdahale etmeden Türkiye mevzuatı için daha erişilebilir, ayrı not alma kontrolleri sunar.

- Fıkra `(1)`, bent `a)` ve alt bent `1)` için ayrı, görünür **Not ekle / Notu düzenle** düğmeleri.
- İlgili maddenin altında genişletilebilir **Fıkra, bent ve alt bent notları** rehberi; her satır ilgili not editörünü açar.
- Not editöründe tam kimlik yolu görünür: `(1) › s) › 2)`.
- Notlar eskisi gibi Firestore'da ilgili maddenin `subnotes` alanında saklanır. Yeni koleksiyon, güvenlik kuralı veya veri taşıma işlemi gerekmez.
- Önceden kaydedilmiş madde / fıkra notları, yer imleri, XML sürümleri ve TR–EASA eşleştirmeleri korunur.
- Note editöründeki kaynak metin parmak izi yeni sürümlerde değişiklik uyarısı için kullanılmaya devam eder.
- Word, PDF, Kindle ve EPUB dışa aktarma motorları değiştirilmemiştir; mevcut `subnotes` alanını kullanmaya devam eder.

## Kurulum

`HUB_v3_10_2_fix.zip` arşivindeki **üç** dosyayı GitHub deposunun birebir aynı yollarına yükleyip üzerine yazın:

- `index.html`
- `src/app.js`
- `src/style.css`

Diğer dosyaları silmeyin. Özellikle `config.js`, `src/tr-parser.js`, `src/mappings-ui.js`, `src/cloud.js`, `src/clauses.js`, `src/tr-import-ui.js` ve `src/tr-document-import.js` **aynen korunmalıdır**.

Ardından GitHub Pages sayfasını `Ctrl + Shift + R` ile önbelleksiz yenileyin. Mobil cihazda site verisi eski kalırsa sayfayı yeniden yükleyin.

## Kullanım

1. Kütüphaneden `SHY-OLAY` → `MADDE 4` açın.
2. `(1)` fıkrası, `s)` bendi veya onun altındaki `2)` alt bendinin yanındaki **Not ekle** düğmesine tıklayın.
3. İsterseniz metnin altındaki **Fıkra, bent ve alt bent notları** başlığını açıp `(1) › s) › 2)` satırından ilgili editöre geçin.
4. Notu yazıp **Kaydet**'e basın. Aynı maddedeki diğer notlar ve genel madde notu ayrı ayrı korunur.

## Teknik kontrol

Kaynak olarak yüklenmiş SHY-OLAY XML'i ile **MADDE 4** test edilmiştir: 2 fıkra, 30 bent, 3 alt bent; 35 ayrı not hedefi. Node.js kod doğrulaması ve ayrı seviyelere not kaydetme/önceden mevcut fıkra notunu koruma testleri başarılıdır.

**Sınır:** Gerçek Firebase/Drive hesabında otomatik canlı test yapılmamıştır. Bu çalışma ortamındaki Chromium, yönetim politikasıyla yerel sayfaları açmayı engellediği için gerçek tarayıcı üzerinde görsel uçtan uca test gerçekleştirilememiştir. GitHub Pages dağıtımında ilk kontrol kullanıcı ortamında yapılmalıdır.
