# Havacilik Mevzuati Hub v3.10.1 - Tum butonlar/menuler tepkisiz hatasi

## Tespit

v3.10 acilis kodu, yeni `src/tr-import-ui.js` dosyasini **ana tiklama olaylari baglanmadan once** cagiriyordu. Bu dosya GitHub Pages'te eksikse, yanlis klasordeyse veya yuklenemezse `ReferenceError: EasaTrImportUI is not defined` olusuyor, ana JS calismayi durduruyor, sayfa gorunmesine ragmen butonlar tepkisiz kaliyordu. Bu durum tarayicida dosyayi bilerek eksilterek birebir yeniden olusturuldu.

v3.10.1, tum menulerin olaylarini oncelikle baglar. Word/PDF modulu eksikse yalnizca bu aktarim devre disi kalir ve hangi dosyanin eksik oldugunu uygulama gosterir. Normal yuklemede v3.10 Word/PDF ozelligi korunur.

## GitHub Pages guncellemesi

ZIP arsinindeki **6 dosyanin tamamini**, asagidaki ayni konumlara yukleyin (ZIP'i tek dosya olarak yuklemeyin):

- `index.html` - degistir
- `src/app.js` - degistir
- `src/cloud.js` - v3.10 ile ayni, eksikse tamamla
- `src/style.css` - v3.10 ile ayni, eksikse tamamla
- `src/tr-document-import.js` - **mutlaka src klasorunde bulunsun**
- `src/tr-import-ui.js` - **mutlaka src klasorunde bulunsun**

Mevcut `config.js`, `firestore.rules`, Google Drive, Firestore ve XML kayitlarina kesinlikle dokunmayin. Bu islem herhangi bir bulut kaydini degistirmez.

GitHub Pages adresinde su yollarin calistigini dogrulayin (repo base path'i varsa onu koruyun):

- `.../src/tr-document-import.js?v=3.10.1`
- `.../src/tr-import-ui.js?v=3.10.1`

Bu adreslerde 404 sayfasi degil JS kodu gorunmeli. Repo GitHub Pages'i bir alt klasorden yayinliyorsa **o klasorde** dosyalari guncelleyin.

Degisiklikler yayinlandiktan sonra bilgisayarda `Ctrl+Shift+R` yapin; telefonda sekmeyi tamamen kapatip tekrar acin. v3.10.1 bilgisinin gorunmesini kontrol edin.

## Testler

Chromium ortaminda asagidaki senaryolar uygulandi:

- Tam paket: kütüphane, arama, hesap ekranlari arasi buton gecisleri calisti.
- DOCX: SHY-OLAY icin 4 bolum, 30 madde, 88 fikra, 59 bent, 3 alt bentli kontrol penceresi acildi.
- `src/tr-import-ui.js` eksik: butonlar ve menuler calismaya devam etti; eksik dosya uyarisi gorundu.
- `src/tr-document-import.js` eksik: ayni bicimde ana ekran calisiyor, Word/PDF aktarimi kontrollu hata veriyor.
- `src/app.js` yuklenmezse ekranda genel baslatma tanisi gorunuyor.

Bu testler simulasyon ortaminda yapilmistir; gercek Firebase veya Google Drive hesabina baglanilmamistir.

## Hata halen devam ediyorsa

Uygulamanin alt saginda gorunen **Uygulama dosyasi kontrolu** mesaji varsa tam metnini paylasin. Yoksa Chrome DevTools > Console ekranindaki ilk kirmizi hata satirini paylasin (API anahtari/tokenlari gondermeyin).
