# EASA eRules Hub v3.5 — Mevzuat içinde geri / ileri gezinme

## Güncelleme

v3.4'ten v3.5'e geçiş için `EASA_v3_5_Guncelleme.zip` içindeki üç dosyayı mevcut GitHub Pages deposunda aynı konumlarda değiştirin:

1. `index.html`
2. `src/app.js`
3. `src/style.css`

**`config.js` dosyanızı değiştirmeyin.** Firebase kimlik doğrulaması, Firestore notları, Drive dosyaları ve XML işleme mantığı değişmedi. Yeni bir XML yüklemek, hiyerarşiyi yeniden indekslemek veya Firestore güvenlik kurallarını değiştirmek gerekmez.

GitHub Pages yayımlandıktan sonra tarayıcıda Ctrl+Shift+R ile yenileyin; telefonda sayfayı yeniden yükleyin.

## Yeni işlevler

- **Geri / İleri düğmeleri:** IR, AMC, GM veya CS hükmü arasında gezinirken önceki/sonraki kayda dönebilirsiniz. İlgili düğmeler metin uzunsa da görünür kalan bir çubukta yer alır.
- **Tarayıcı geçmişi:** Chrome/Edge ve mobil tarayıcıların geri/ileri davranışı uygulama içi hüküm geçişlerinde çalışır.
- **Bağlı ana gereklilik:** AMC/GM/CS kaydının XML'de `ParentIR` bağlantısı varsa aynı mevzuatın ilgili IR/DR/CS kaydına doğrudan dönen kısayol görüntülenir.
- **Konumu koruma:** Geri döndüğünüzde daha önce seçili madde, mevzuat bölüm ve tür filtreleri, arama metni, kayıt limiti, sol liste kaydırma konumu ve sayfa kaydırma konumu korunur.
- **Bağlantıyla açılan hüküm:** Önceki filtre, ilişkili kaydı göstermiyor olsa bile geçici olarak seçili kayıt sol panelde görünür; kullanıcı filtresi değiştirilmez.
- **Aramaya geri dönüş:** Tüm mevzuatta arama sonuçlarından açılan kayıtta Geri ile arama ekranına ve mevcut arama ifadesine dönülebilir.

Gezinme geçmişi uygulama sekmesinde tutulur. Sayfa tamamen yenilenirse geçmişin tamamı yeniden oluşturulmaz. Bu güncelleme kalıcı bir geçmiş veritabanı oluşturmaz; kişisel notlar ve bulut kayıtları eskisi gibi kalır.

## Deneme

1. Air Operations yayınında bağlı AMC/GM'si olan bir IR hükmü açın (örn. `ARO.GEN.200`).
2. Alttaki "Bağlantılı AMC / GM / CS" listesinden bir kayda gidin.
3. Yeni hükmün üstündeki **Geri** düğmesine basın. Önceki madde ve okuma konumu geri gelmelidir.
4. **İleri** ile tekrar AMC/GM'ye gidin. Ayrıca tarayıcının geri/ileri denetimlerini test edin.
5. AMC/GM üzerinde **Bağlı ana gereklilik** kısayolunu kullanın; varsa üst maddeye gidecektir.

## Teknik testler

Chromium tabanlı masaüstü ve 390 px mobil görünümde; IR → AMC, geri, ileri, AMC → IR, GM'den geri, tür filtresi korunması, sayfa kaydırma konumu, yer imi/not kaydı ve global arama sonuçlarına dönüş senaryoları test edildi. Herhangi bir JavaScript hatası ve mobil yatay taşma görülmedi.

Gerçek Google hesabınızla bağlantı kurularak canlı Firebase/Drive yazma testi yapılmadı. Önceki sürümden değişmeyen Firebase/Drive işlevlerine dokunulmadı.
