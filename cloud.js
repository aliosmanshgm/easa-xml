/* EASA eRules Hub v3 – personal cloud repository.
   GitHub Pages: static UI; Firebase Auth/Firestore: identities & metadata;
   Google Drive (drive.file): original XML and parsed/gzip version archives.
   OAuth access tokens are kept in memory only. No server secrets required.
*/
(function (global) {
  'use strict';
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
  const FIREBASE_VERSION = '11.10.0';
  const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  let modules, app, auth, firestore, currentUser = null;
  let driveToken = null, tokenIssued = 0, initialized = false;
  let onUserChanged = null;

  function configured(config) {
    return !!config && ['apiKey', 'authDomain', 'projectId', 'appId'].every(k =>
      typeof config[k] === 'string' && config[k].trim() && !/YOUR_|PLACEHOLDER|BURAYA/i.test(config[k]));
  }
  function user() { return currentUser ? {uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName, photoURL: currentUser.photoURL} : null; }
  function driveReady() { return !!(currentUser && driveToken && Date.now() - tokenIssued < 52 * 60 * 1000); }
  function ensureLogin() { if (!currentUser || !firestore) throw Error('Önce Google hesabınızla oturum açın.'); }
  function ensureDrive() { ensureLogin(); if (!driveReady()) {driveToken = null; throw Error('Google Drive bağlantısı gerekli veya yetkinin süresi doldu. Üst menüden “Drive bağla” seçeneğini kullanın.');} }
  async function init(config, callback) {
    if (initialized) return user();
    if (!configured(config)) throw Error('Firebase yapılandırması eksik. Ayarlar > Firebase bağlantısı bölümünden proje bilgilerini girin.');
    if (!/^https:/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname))
      throw Error('Google ile oturum açma HTTPS (GitHub Pages) veya localhost üzerinde çalışır. HTML dosyasını file:// olarak açmayın.');
    onUserChanged = callback || null;
    const [fa, au, fs] = await Promise.all([
      import(`${FIREBASE_BASE}/firebase-app.js`),
      import(`${FIREBASE_BASE}/firebase-auth.js`),
      import(`${FIREBASE_BASE}/firebase-firestore.js`)
    ]);
    modules = {fa, au, fs};
    app = fa.initializeApp(config, 'easa-erules-hub');
    auth = au.getAuth(app);
    firestore = fs.getFirestore(app);
    await au.setPersistence(auth, au.browserLocalPersistence);
    initialized = true;
    return new Promise((resolve, reject) => {
      let first = true;
      au.onAuthStateChanged(auth, u => {
        const previousId = currentUser?.uid;
        currentUser = u;
        if (previousId && previousId !== u?.uid) {driveToken = null; tokenIssued = 0;}
        if (first) {first = false; resolve(user());}
        else if (onUserChanged) Promise.resolve(onUserChanged(user())).catch(console.error);
      }, e => {if (first) reject(e); else console.error(e);});
    });
  }
  async function signIn() {
    if (!initialized) throw Error('Önce Firebase bağlantısını yapılandırın.');
    const provider = new modules.au.GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({prompt: 'select_account'});
    const prior = currentUser?.uid;
    const result = await modules.au.signInWithPopup(auth, provider);
    const credential = modules.au.GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw Error('Google Drive için OAuth erişim izni alınamadı.');
    driveToken = credential.accessToken;
    tokenIssued = Date.now();
    currentUser = result.user;
    if (prior && prior !== currentUser.uid && onUserChanged) await onUserChanged(user());
    return user();
  }
  async function signOut() {
    if (!initialized) return;
    await modules.au.signOut(auth);
    currentUser = null;
    driveToken = null;
    tokenIssued = 0;
    if (onUserChanged) await onUserChanged(null);
  }
  function coll(name) {ensureLogin(); return modules.fs.collection(firestore, 'users', currentUser.uid, name);}
  function doc(name, id) {ensureLogin(); return modules.fs.doc(firestore, 'users', currentUser.uid, name, id);}
  async function sha256(input) {
    if (!crypto?.subtle) throw Error('SHA-256 için HTTPS ortamı gereklidir.');
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function firestoreError(e) {
    if (/permission-denied|Missing or insufficient permissions/i.test(e?.message || ''))
      return Error('Firestore erişimi reddedildi. Güvenlik kurallarını, oturum hesabını ve veritabanı ayarlarını kontrol edin.');
    return e;
  }
  async function listReleases() {
    try {const snapshot = await modules.fs.getDocs(coll('releases'));return snapshot.docs.map(x=>x.data());}
    catch(e) {throw firestoreError(e);}
  }
  async function listAnnotations() {
    try {const snapshot = await modules.fs.getDocs(coll('annotations'));return snapshot.docs.map(x=>x.data());}
    catch(e) {throw firestoreError(e);}
  }
  async function listActive() {
    try {const d = await modules.fs.getDoc(doc('settings','activeVersions'));return d.exists() ? (d.data()?.map || {}) : {};}
    catch(e) {throw firestoreError(e);}
  }
  async function saveActive(familyId, versionId) {
    try {await modules.fs.setDoc(doc('settings','activeVersions'), {map: {[familyId]: versionId}}, {merge: true});}
    catch(e) {throw firestoreError(e);}
  }
  async function saveAnnotation(annotation) {
    const id = await sha256(annotation.id);
    try {await modules.fs.setDoc(doc('annotations', id), {...annotation}, {merge: false});}
    catch(e) {throw firestoreError(e);}
  }
  async function driveFetch(url, options = {}) {
    ensureDrive();
    const hdr = new Headers(options.headers || {});
    hdr.set('Authorization', `Bearer ${driveToken}`);
    let res;
    try {res = await fetch(url, {...options, headers: hdr});}
    catch (e) {throw Error('Google Drive bağlantısı kurulamadı. İnternet erişimini, Drive API izinlerini ve tarayıcı engellemelerini kontrol edin. ' + e.message);}
    if (res.status === 401) {driveToken = null;throw Error('Google Drive oturumu sona erdi. “Drive bağla” ile yetkiyi yenileyin.');}
    return res;
  }
  async function checkDrive(res, prefix='Google Drive isteği') {
    if (res.ok) return res;
    let message = '';
    try {const j = await res.json();message = j.error?.message || j.error_description || '';}
    catch (_) {message = await res.text().catch(()=> '');}
    if (res.status === 403 && /accessNotConfigured|API has not been used|SERVICE_DISABLED/i.test(message))
      throw Error('Google Drive API etkin değil. Google Cloud Console > APIs & Services içinde Google Drive API hizmetini etkinleştirin.');
    throw Error(`${prefix} başarısız (HTTP ${res.status}): ${message || res.statusText}`);
  }
  function driveFilesQ(name, parent) {
    const n = String(name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const clause = `name = '${n}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    return clause + (parent ? ` and '${parent}' in parents` : '');
  }
  async function findFolder(name, parent=null) {
    const qs = new URLSearchParams({q:driveFilesQ(name,parent),fields:'files(id,name,mimeType),nextPageToken',pageSize:'100'});
    const res = await checkDrive(await driveFetch(`${DRIVE_API}/files?${qs}`), 'Drive klasör araması');
    const x = await res.json();return x.files?.[0]?.id || null;
  }
  async function createFolder(name, parent=null) {
    const body = {name, mimeType:'application/vnd.google-apps.folder'};
    if (parent) body.parents=[parent];
    const res=await checkDrive(await driveFetch(`${DRIVE_API}/files?fields=id,name`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}), 'Drive klasörü oluşturma');
    return (await res.json()).id;
  }
  async function getOrCreateFolders() {
    ensureDrive();
    const drRef=doc('settings','driveFolder');
    const snap=await modules.fs.getDoc(drRef);
    let info=snap.exists()?snap.data():{};
    if (info.rootId) {
      const r=await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(info.rootId)}?fields=id,trashed`);
      if (r.status===404) info={}; else await checkDrive(r,'Drive klasörü kontrolü');
    }
    if (!info.rootId) info.rootId = await findFolder('EASA eRules Hub') || await createFolder('EASA eRules Hub');
    if (!info.xmlId) info.xmlId = await findFolder('Original_XML',info.rootId) || await createFolder('Original_XML',info.rootId);
    if (!info.dataId) info.dataId = await findFolder('Processed_Data',info.rootId) || await createFolder('Processed_Data',info.rootId);
    await modules.fs.setDoc(drRef,info,{merge:false});
    return info;
  }
  async function probeUpload(uri, size) {
    const res = await driveFetch(uri,{method:'PUT',headers:{'Content-Range':`bytes */${size}`}});
    if (res.status===200 || res.status===201) return {done:true,result:await res.json()};
    if (res.status!==308) await checkDrive(res,'Yükleme durum kontrolü');
    const range=res.headers.get('Range');
    return {done:false,next:range?Number(range.split('-').at(-1))+1:0};
  }
  async function uploadBlob(name, blob, mimeType, folderId, progress=()=>{}) {
    ensureDrive();
    const file=blob instanceof Blob?blob:new Blob([blob],{type:mimeType});
    if (!file.size) throw Error('Boş dosya yüklenemiyor.');
    const meta={name,mimeType,parents:[folderId],description:'Uploaded by EASA eRules Hub'};
    const init=await checkDrive(await driveFetch(`${UPLOAD_API}?uploadType=resumable&fields=id,name,size,webViewLink`,{
      method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mimeType,'X-Upload-Content-Length':String(file.size)},body:JSON.stringify(meta)
    }),'Drive yükleme oturumu');
    const uri=init.headers.get('Location');
    if (!uri) throw Error('Google Drive yükleme oturumu URL bilgisi dönmedi (Location başlığı).');
    const chunkSize=8*1024*1024;
    let cursor=0,failures=0;
    while(cursor<file.size) {
      const end=Math.min(cursor+chunkSize,file.size);
      try {
        const res=await driveFetch(uri,{method:'PUT',headers:{'Content-Range':`bytes ${cursor}-${end-1}/${file.size}`,'Content-Type':mimeType},body:file.slice(cursor,end)});
        if (res.ok) {const result=await res.json();progress(100);return result;}
        if (res.status===308) {
          const range=res.headers.get('Range');
          if (range) cursor=Number(range.split('-').at(-1))+1;
          else {const status=await probeUpload(uri,file.size);if(status.done){progress(100);return status.result;}cursor=status.next;}
          failures=0;progress(Math.min(99,Math.round(cursor/file.size*100)));continue;
        }
        if (res.status>=500 || res.status===429) throw Error(`Geçici Drive yükleme hatası (HTTP ${res.status})`);
        await checkDrive(res,'Drive dosyası yükleme');
      } catch(e) {
        failures++;
        if (failures>3) throw e;
        await new Promise(r=>setTimeout(r,400*failures*failures));
        const status=await probeUpload(uri,file.size);
        if (status.done) {progress(100);return status.result;}
        cursor=status.next;
      }
    }
    throw Error('Drive yüklemesi dosya kimliği döndürmeden sona erdi.');
  }
  async function getFile(fileId) {
    const res=await checkDrive(await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`),'Drive dosyası indirme');
    return new Uint8Array(await res.arrayBuffer());
  }
  async function getXmlFile(fileId) {return new Blob([await getFile(fileId)],{type:'application/xml'});}
  async function deleteDriveFile(id) {
    if (!id) return;
    const res=await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}`,{method:'DELETE'});
    if (res.status!==404) await checkDrive(res,'Drive dosyası silme');
  }
  async function uploadVersion(parsedDoc, rawFile, processedBinary, compressed, progress=()=>{}) {
    ensureLogin();ensureDrive();
    const id=await sha256(parsedDoc.versionId);
    const ref=doc('releases',id);
    if ((await modules.fs.getDoc(ref)).exists()) throw Error('Bu sürüm bulut kütüphanesinde zaten kayıtlı.');
    const folders=await getOrCreateFolders();
    const uploaded=[];
    const binary = processedBinary instanceof Uint8Array ? processedBinary : new Uint8Array(processedBinary);
    const dataHash=await sha256(binary);
    const namePrefix=[parsedDoc.familyId.slice(0,58),parsedDoc.published?.slice(0,10)||'tarihsiz',parsedDoc.guid?.slice(0,8)||''].filter(Boolean).join('_');
    try {
      progress(1,'Orijinal XML Google Drive’a aktarılıyor…');
      const xml=await uploadBlob(`${namePrefix}_${rawFile.name}`.slice(0,180),rawFile,'application/xml',folders.xmlId,n=>progress(3+Math.round(n*.71),'Orijinal XML aktarılıyor…'));
      uploaded.push(xml.id);
      progress(75,'İşlenmiş mevzuat dosyası aktarılıyor…');
      const data=await uploadBlob(`${namePrefix}.json${compressed?'.gz':''}`,new Blob([binary],{type:compressed?'application/gzip':'application/json'}),compressed?'application/gzip':'application/json',folders.dataId,n=>progress(76+Math.round(n*.20),'İşlenmiş kayıtlar aktarılıyor…'));
      uploaded.push(data.id);
      const record={
        versionId:parsedDoc.versionId,familyId:parsedDoc.familyId,title:parsedDoc.title,
        published:parsedDoc.published,guid:parsedDoc.guid,count:parsedDoc.records.length,stats:parsedDoc.stats,
        rawFileId:xml.id,rawName:rawFile.name,rawBytes:rawFile.size,
        dataFileId:data.id,dataCompressed:compressed,dataBytes:binary.byteLength,dataHash,
        storedAt:new Date().toISOString(), schema:3
      };
      progress(97,'Firebase mevzuat kataloğu güncelleniyor…');
      await modules.fs.setDoc(ref,record,{merge:false});
      progress(100,'Bulut arşivleme tamamlandı.');
      return record;
    } catch(e) {
      const cleanup=await Promise.allSettled(uploaded.map(deleteDriveFile));
      if (cleanup.some(x=>x.status==='rejected')) throw Error(e.message+' Bazı eksik yükleme dosyaları Drive’da kalmış olabilir.');
      throw e;
    }
  }
  async function removeVersion(row) {
    ensureLogin();ensureDrive();
    const id=await sha256(row.versionId);
    await modules.fs.deleteDoc(doc('releases',id));
    const results=await Promise.allSettled([deleteDriveFile(row.rawFileId),deleteDriveFile(row.dataFileId)]);
    return {orphaned:results.filter(r=>r.status==='rejected').length};
  }
  function folderUrl(folderId){return folderId?`https://drive.google.com/drive/u/0/folders/${encodeURIComponent(folderId)}`:'';}
  async function getFolderUrl() {
    ensureLogin();const d=await modules.fs.getDoc(doc('settings','driveFolder'));return folderUrl(d.data()?.rootId);
  }
  global.EasaCloud={init,configured,user,driveReady,signIn,signOut,listReleases,listAnnotations,listActive,saveActive,saveAnnotation,sha256,uploadVersion,getFile,getXmlFile,removeVersion,getOrCreateFolders,getFolderUrl};
})(window);
