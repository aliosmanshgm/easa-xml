# EASA eRules Hub v3.4 — XML sırası, alt gereklilikler ve bent bazlı notlar

## Ne değişti?

1. **Mevzuat gezgini sıralaması:** Bölümler artık kayıt sayısına göre değil, EASA eRules XML içinde ilk göründükleri sıraya göre listelenir. Air Operations için Cover regulation → Part-DEFINITIONS → Part-ARO → Part-ORO → Part-CAT ... düzeni korunur. Ön bilgi niteliğindeki `Genel` grubu sonda gösterilir. Occurrence Reporting gibi başka yayınlarda da kendi XML sırası esas alınır.
2. **Yapılandırılmış bent görüntüleme:** Yeni XML ayrıştırıcısı Word/EASA metnindeki `ListLevel0`, `ListLevel1`, `ListLevel2`... düzeylerini saklar. Örneğin ORO.GEN.140 için `(a)` ve `(b)` düzey 0; `(1)`, `(2)`, `(i)` ve `(ii)` düzey 1 görünür.
3. **Alt gereklilik bazında notlar:** `(a)`, `(a)/(1)`, `(b)/(i)` gibi numaralandırılmış alt gerekliliklerin yanında `Not +` seçeneği vardır. Bu notlar maddenin genel notuna ek olarak aynı Firestore annotation kaydındaki `subnotes` alanına yazılır. Kişisel notlar hem madde okuyucusunda hem de Yer imleri ve notlarım ekranında gösterilir.
4. **Sürüm koruması:** Alt notlar yayın ailesi + EASA madde kimliği + bent yolu ile ilişkilendirilir. Yeni sürümde aynı bent metninin değiştiği algılanırsa uyarı gösterilir. Mevcut sürümde artık karşılığı bulunamayan alt notlar silinmez, ayrıca gösterilir.
5. **Mevcut bulut XML'lerini yeniden işlemeye olanak:** v3.3 ve öncesinde yüklenen sürümlerin işlenmiş JSON kayıtları Word liste seviyelerini içermediğinden, okuyucunun üstündeki **XML hiyerarşisini güncelle** düğmesiyle orijinal XML Drive'dan alınır, tekrar ayrıştırılır ve yalnızca işlenmiş arama verisi yeniden yayımlanır. Eski işlenmiş dosya, yeni dosya başarıyla yüklenip Firebase kataloğunda işaretlenene kadar korunur. Orijinal XML, mevzuat sürümleri ve notlar değiştirilmez.

**Önemli:** Eski sürümlerde liste yapısı yalnızca tahmini girintilerle gösterilebilir. Yanlış bir bent yoluna not bağlamamak için **XML hiyerarşisini güncelle** yapılıncaya kadar alt gereklilik notu ekleme kapalıdır. Genel madde notu aynı şekilde çalışmaya devam eder.

## Güncelleme (mevcut GitHub Pages projesi)

Güncelleme ZIP dosyası içindeki şu altı dosyayı GitHub deposunda birebir aynı yollarla değiştirin/ekleyin:

- `index.html`
- `src/app.js`
- `src/style.css`
- `src/parser.js`
- `src/cloud.js`
- `src/clauses.js` **(yeni dosya)**

`src/parser.worker.js`, `config.js`, Firebase proje ayarları ve `firestore.rules` değişmedi. **Özellikle çalışan `config.js` dosyanızı değiştirmeyin!**

GitHub Pages güncellendikten sonra Ctrl+Shift+R ile sayfayı yenileyin. Mobilde sayfayı yeniden yükleyin. İlk olarak Air Operations yayınının açılabildiğini, bölüm filtresinin Cover regulation ile başladığını doğrulayın.

Sonra Air Operations (ve önceden yüklenmiş diğer her mevzuat sürümü) için **XML hiyerarşisini güncelle** düğmesine basın. İşlem bu yayının *bu sürümüne* uygulanır; eski sürümler varsa ayrı ayrı güncellenebilir. Büyük XML dosyaları nedeniyle işlemi bilgisayardan yapmak daha uygundur. Aynı XML'i tekrar yüklemeyin: uygulama Drive'daki orijinal dosyayı kullanır.

Ardından ORO.GEN.140 Access maddesini açın: `(a)` ve `(b)` ana düzeyde, `(1)` ve `(2)` `(a)` altında, `(i)` ve `(ii)` `(b)` altında görünür. Örneğin `(a)/(1)` yanındaki Not + ile eklenen not Firebase'e kaydedilir.

## Depolama ve güvenlik

- GitHub Pages üzerinde herhangi bir mevzuat XML'i veya mevzuat metni gömülü değildir.
- Google Drive'daki `Original_XML` klasörü değişmeden kalır.
- `Processed_Data` içindeki ilgili işlenmiş JSON değiştirilebilir; başarılı güncelleme sonrasında eski kopya temizlenir. Silme başarısız olursa artık kopya Drive'da kalabilir, uygulama uyarır.
- Firestore mevcut `annotations` koleksiyonu kullanılır; yeni bir koleksiyon veya güvenlik kuralı gerekmez.
- `config.js` içinde Firebase Web App yapılandırması kalmalıdır; gizli anahtarları veya OAuth tokenlarını asla GitHub'a eklemeyin.
- Uygulamanın veri deposu öncelikle kişisel Google hesabı içindir. Başka hesaplarda aynı Drive dosyalarına erişim için ayrıca yetki tasarımı gerekir.

## Test ve sınırlar

Kaynak XML'lerden 3.658 Air Operations ve 119 Occurrence Reporting kaydı yerel olarak tekrar ayrıştırıldı. ORO.GEN.140 için Word XML liste seviyeleri ve bent yolları kontrol edildi. Masaüstü ve mobil arayüzde bölüm sırası, madde görüntüleme, alt not kaydetme/özetleme ve eski sürüm not koruması simüle edildi. Occurrence Reporting XML'iyle yeniden indeksleme akışı tarayıcıda simüle edildi. **Gerçek Firebase/Google Drive hesabınıza bağlanarak canlı yazma yapılmadı; bulut ortamında son test sizin hesabınızda yapılmalıdır.**

Bölüm listesi yayın sırasını takip eder, metnin içinde görünmeyen/belirsiz bir liste hiyerarşisi hukukî yorumla tamamlanmaz. Eski XML'de `ListLevel` bilgisi bulunmazsa mantıksal bir gösterim yapılır ama özel şartlarda manuel kontrol gerekebilir. Aynı bent numarası sürümler arasında farklı bir gerekliliğe karşılık gelebileceğinden not eşleşmesi uyarısı mutlaka dikkate alınmalıdır.
