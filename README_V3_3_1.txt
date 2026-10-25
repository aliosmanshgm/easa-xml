EASA eRules Hub v3.3.1 - config.js indirme dugmesi gorunurluk duzeltmesi

Sorun:
v3.3'te "config.js indir" ve "Kodunu kopyala" dugmeleri yalnizca Firebase yapilandirmasi tarayici icinde yerel kayitliysa gorunuyordu. Gecerli GitHub config.js yuklendiginde dugmeler gizleniyordu.

Duzeltme:
- Iki dugme de "Hesap ve baglanti" ekraninin en ustunde gecerli ayar varsa her durumda gorunur.
- GitHub uzerinden otomatik baglanti zaten etkinse config.js indirmeniz veya yeniden yuklemeniz gerekmez; dugme yedekleme icindir.
- Yalnizca yerel ayarlar kullaniliyorsa, config.js indirerek GitHub depo kokune yukleyebilirsiniz.
- Hicbir gecerli ayar yoksa indirme dugmesi yerine kurulum yardimi gorunur.

GitHub Pages guncellemesi:
1. Bu ZIP'teki index.html dosyasini GitHub deposundaki index.html ile degistirin.
2. Bu ZIP'teki src/app.js dosyasini GitHub deposundaki src/app.js ile degistirin.
3. config.js, src/cloud.js, firebase ve Drive ayarlarina DOKUNMAYIN.
4. GitHub Pages yayinlandiktan sonra Ctrl+Shift+R ile sert yenileyin.
5. Hesap ve baglanti ekraninin ust kismindaki "config.js indir" veya "Kodunu kopyala" seceneklerini kontrol edin.

NOT: Eger ekranda "GitHub uzerinden otomatik" yaziyorsa baglanti zaten hazirdir; telefonunuzda ayni GitHub Pages adresini kullanip Google ile oturum acmaniz yeterli olmalidir.

Testler:
Local, GitHub, GitHub+local ve eksik yapilandirma senaryolari JavaScript testlerinde basarili.
Gercek Firebase/Drive canli testi yapilmadi.
