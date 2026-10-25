# EASA eRules Hub v3.8 – Çoklu Mevzuatla Tematik Derleme

v3.7'nin kaydedilebilir derleme/şablon altyapısına, **birden fazla EASA yayın ailesinden ve sabitlenmiş XML sürümlerinden madde seçerek tek rapor oluşturma** özelliği eklenmiştir.

## v3.7'den yükseltme

`EASA_v3_8_Guncelleme.zip` içindeki **beş dosyayı** GitHub Pages deposunda aynı yollarla değiştirin:

| Dosya | İşlem |
| --- | --- |
| `index.html` | Değiştirin (3.8.0 önbellek sürümü) |
| `src/publisher-ui.js` | Değiştirin (çoklu seçimler / kaynak sepeti) |
| `src/publications.js` | Değiştirin (çoklu kaynak çıktı motoru) |
| `src/cloud.js` | Değiştirin (Firestore şablon kaynak doğrulaması) |
| `src/style.css` | Değiştirin (masaüstü ve mobil kaynak sepeti) |

**Dokunmayın:** `config.js`, `firestore.rules`, `src/app.js`, `src/parser.js`, `src/clauses.js` ve `src/vendor/` dosyaları. Mevcut XML kaynaklarını tekrar yüklemeyin. Yeni Firebase/Google Drive API yetkisi veya Firebase kural değişikliği gerekmez.

GitHub Pages dağıtımı tamamlandıktan sonra masaüstünde `Ctrl+Shift+R` ile yenileyin. Mobilde aynı GitHub Pages sayfasını yeniden açın.

## Kullanım

1. **Yayın Oluşturucu** menüsünü açın.
2. **Mevzuat yayını** ve belirli **kaynak sürümü** seçin. Madde veya alt gereklilikleri işaretleyin.
3. Mevzuat seçicisiyle diğer EASA yayınına geçin. **Önceden yaptığınız seçimler korunur.** İkinci yayından madde/bent ekleyin.
4. **Tematik derleme sepeti** bölümünde kaynak başlıklarını, sürüm tarihlerini ve seçilen madde sayılarını kontrol edin. Kaynak gruplarını **yukarı/aşağı** taşıyarak rapor sırasını belirleyin. Bir kaynak grubunu tamamen çıkarmak için **Çıkar** kullanın. Aynı kaynağın maddeleri her zaman XML'deki özgün sırada kalır.
5. Başlık/açıklama, ilişkili AMC/GM/CS, notlar ve Kindle düzeni seçeneklerini seçin.
6. **Taslak/Şablon** olarak kaydedebilir; farklı cihazda açabilir veya **Word, EPUB, TXT, Markdown, A4 PDF ve Kindle PDF** oluşturabilirsiniz.

PDF/Kindle PDF, tarayıcıda açılan yazdırma düzeni üzerinden **Print → Save as PDF** ile oluşturulur. Kindle Scribe 2024'e el yazısı için **Send to Kindle** tercih edilir.

## Kaynak, sürüm ve güvenlik ilkeleri

- Her seçim `familyId + versionId + provisionKey + (varsa) anchor` kimliğiyle saklanır; iki farklı mevzuattaki aynı isimli maddeler karıştırılmaz.
- Her kaynak **yayımlandığı XML sürümüne sabitlenir**. Yeni bir EASA XML yayımlandığında eski kaynak kendiliğinden yeni sürüme geçirilmez.
- Rapordaki her maddenin yanında EASA yayın adı ve sürüm tarihi belirtilir; tam XML sürüm kimlikleri belgenin sonundaki **Source XML identifiers** bölümünde yer alır. İlişkili AMC/GM/CS yalnızca kendi yayın ailesi içinde otomatik eşleştirilir.
- Kayıtlı şablonun herhangi bir kaynak sürümü bulut kataloğunda yoksa kayıt korunur; açma ve dışa aktarma işlemlerinde kaynak yerine başka sürüm kullanılmaz.
- Eksik madde veya bent eşleşmesi varsa rapor oluşturma engellenir; seçimler sessizce değiştirilmez.
- Firestore'daki `users/{uid}/publicationDrafts/{draftId}` kaydına **yalnızca kaynak/sürüm kimlikleri, madde/bent seçimi ve rapor seçenekleri** yazılır. Orijinal XML, işlenmiş mevzuat metni ve çıktı dosyaları Firestore'a taşınmaz.
- Kaydedilmiş **v3.7 tek-mevzuat şablonları** okunabilir. Şablon v3.8'de yeniden kaydedildiğinde yeni şema kullanılabilir; eski kayıtlar otomatik topluca değiştirilmez.
- Başka cihazda eşzamanlı değişiklik sırasında Firestore `revision` çakışma kontrolü korunmuştur.
- JSON katalog yedeğinde kayıtlı şablonlar mevcut `schema:3` manifest biçiminde bulunur; yeni seçim alanları da kaydedilir. Yedek yalnızca katalog ve şablon tanımlarını içerir, Drive'daki orijinal XML'leri içermez.

## Testler

- Gerçek Occurrence Reporting XML'indeki 119 kayıt ve gerçek Air Operations XML'inden alınmış 35 kayıtlık bir örnekle çoklu seçme, kaynak değiştirme, sırayı değiştirme, kaydetme/açma, farklı kaynak metinlerini koruma ve v3.7 şablon uyumluluğu denendi.
- Word ve EPUB arşivleri açıldı ve içerikleri kontrol edildi; EPUB XML dosyaları ayrıştırıldı. Örnek Word görsel olarak sayfa sayfa kontrol edildi.
- Kindle PDF tarayıcıdan üretildi; yaklaşık 186 × 248 mm sayfa boyutunda doğrulandı ve render edildi.
- Masaüstü ve 390 piksel genişliğinde mobil görünüm test edildi; yatay taşma gözlenmedi.
- Firebase ve Google Drive işlemleri **simüle edilen ortamda** test edildi. Gerçek Google hesabında canlı yükleme, kaydetme ve Drive erişimi bu ortamda doğrulanmadı. Gerçek ortamda özellikle ilk çoklu taslağı kaydetme/açma işlemini kontrol edin.

## Sınırlar

- Derleme başına en fazla **350 kullanıcı seçimi**, kaynak listesinde en fazla **40 XML sürümü**. Otomatik ilgili maddeler eklenince toplam bölüm sayısı 500'ü aşarsa dışa aktarma durdurulur.
- Kaynak gruplarının sırası değiştirilebilir; **aynı grup içindeki maddeler XML sırasına göre** kalır. Serbest madde sıralama ve görsel bölüm editörü sonraki geliştirme olabilir.
- DOCX/PDF/EPUB gibi belgelerde karmaşık XML tablolarının/görsellerinin özgün sayfa düzeniyle birebir eşleşmesi garanti edilemez; resmî kullanım öncesinde gözden geçirin.
- Not metinleri şablon içine kopyalanmaz; dışa aktarırken mevcut Firestore notları isteğe bağlı olarak eklenir. Arşivde değişmez bir anlık görüntü istiyorsanız oluşturulan çıktıyı saklayın.

## Paketler

- `EASA_v3_8_Guncelleme.zip`: güncellenmesi gereken 5 dosya ve README.
- `EASA_v3_8_Tam_Kaynak.zip`: tüm uygulama kodu, örnek yapılandırma, Firebase kuralları ve README. **Gerçek `config.js` veya XML dosyaları dahil değildir.**
