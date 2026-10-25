/* EASA eRules Hub v3.7 - publication builder and saved drafts/templates. */
(function(root){
'use strict';
const engine=root.EasaPublication;
const clauses=root.EasaClauses;
const s={familyId:'',releaseId:'',picks:new Map(),query:'',category:'ALL',kind:'ALL',limit:100,
 expanded:'',title:'',subtitle:'',includeRelated:true,includeNotes:true,includeClauseNotes:true,
 extraNotePages:0,kindleMode:'notes',busy:false,saveType:'draft',savedId:null,savedRevision:0,savedBaseline:null,savedSearch:'',saveBusy:false};
let bridge=null,doc=null,renderStamp=0,savedRows=[],savedLoaded=false,savedLoadError='',integrityIssues=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const short=(v,n=120)=>String(v||'').length>n?String(v).slice(0,n-1)+'\u2026':String(v||'');
const noteCount=()=>s.picks.size;
const addRecord=(key,anchors)=>{s.picks.set(key,anchors?.length?{key,mode:'partial',anchors:[...anchors]}:{key,mode:'all'});};
function configure(api){bridge=api;root.document.addEventListener('click',onClick);root.document.addEventListener('change',onChange);root.document.addEventListener('input',onInput);}
function titleOrText(r){return r.title||short(r.plain?.split('\n')?.[0]||r.key);}
function sourceFamilies(){return bridge?.families()||[];}
function hasPublication(){return !!(bridge?.loggedIn()&&sourceFamilies().length);}
function reset(){s.familyId='';s.releaseId='';s.picks.clear();s.query='';s.title='';s.subtitle='';s.expanded='';s.savedId=null;s.savedRevision=0;s.savedBaseline=null;s.saveType='draft';doc=null;resetSavedCache();}
function resetSavedCache(){savedLoaded=false;savedRows=[];savedLoadError='';}
function choose(familyId,releaseId,key){if(s.familyId!==familyId||s.releaseId!==releaseId){s.picks.clear();s.title='';s.subtitle='';s.category='ALL';s.kind='ALL';s.query='';s.limit=100;s.savedId=null;s.savedRevision=0;s.savedBaseline=null;}s.familyId=familyId;s.releaseId=releaseId;if(key)addRecord(key);}
function snap(){return {
 familyId:s.familyId,versionId:s.releaseId,title:s.title.trim().slice(0,180),subtitle:s.subtitle.trim().slice(0,250),
 type:s.saveType,picks:[...s.picks.values()].map(p=>({key:p.key,mode:p.mode==='partial'?'partial':'all',...(p.mode==='partial'?{anchors:[...new Set(p.anchors||[])]}:{} )})),
 options:{includeRelated:s.includeRelated,includeNotes:s.includeNotes,includeClauseNotes:s.includeClauseNotes,
 extraNotePages:s.extraNotePages,kindleMode:s.kindleMode}
};}
function fingerprint(){return JSON.stringify(snap());}
function dirty(){return s.savedBaseline!==null&&fingerprint()!==s.savedBaseline;}
function meaningful(){return !!(s.picks.size||s.title.trim()||s.subtitle.trim());}
function haveUnsaved(){return dirty()||(s.savedId===null&&meaningful());}
function allowDiscard(){return !haveUnsaved()||root.confirm('Bu çalışmadaki kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?');}
function resetWork(){s.picks.clear();s.title='';s.subtitle='';s.expanded='';s.query='';s.category='ALL';s.kind='ALL';s.limit=100;
 s.includeRelated=true;s.includeNotes=true;s.includeClauseNotes=true;s.extraNotePages=0;s.kindleMode='notes';
 s.saveType='draft';s.savedId=null;s.savedRevision=0;s.savedBaseline=null;integrityIssues=[];}
async function loadSaved(force=false){
 if(savedLoaded&&!force)return;
 try{const rows=await bridge.listDrafts();savedRows=(Array.isArray(rows)?rows:[]).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));savedLoadError='';savedLoaded=true;}
 catch(e){savedLoadError=e?.message||String(e);savedLoaded=false;}
}
function findSaved(id){return savedRows.find(d=>d.id===id);}
function sourceAvailable(d){const f=sourceFamilies().find(f=>f.id===d.familyId);return !!f?.releases?.some(r=>r.versionId===d.versionId);}
function savedList(){
 const q=norm(s.savedSearch),rows=savedRows.filter(d=>!q||norm([d.title,d.subtitle,d.sourceTitle].join(' ')).includes(q));
 if(savedLoadError)return `<div class="pub-saved-empty pub-saved-error">Kayıtlı çalışmalar yüklenemedi: ${esc(savedLoadError)} <button type="button" class="btn small" data-pub-refresh-saved>Tekrar dene</button></div>`;
 if(!rows.length)return `<div class="pub-saved-empty">${s.savedSearch?'Bu aramada kayıtlı çalışma yok.':'Henüz kaydedilmiş taslak veya şablon bulunmuyor.'}</div>`;
 return `<div class="pub-saved-items">${rows.slice(0,80).map(d=>{
   const missing=!sourceAvailable(d),active=s.savedId===d.id;
   return `<div class="pub-saved-item ${active?'active':''}"><div class="pub-saved-item-info"><div class="pub-saved-title">${esc(short(d.title,110))} ${active?'<span class="chip teal">Açık</span>':''}</div>
     <div class="pub-saved-meta"><span class="chip ${d.type==='template'?'blue':'teal'}">${d.type==='template'?'Şablon':'Taslak'}</span>
     <span>${esc(short(d.sourceTitle||d.familyId,65))}</span><span>Sürüm: ${esc(bridge.date(d.sourcePublished)||d.sourcePublished||'?')}</span><span>${Number(d.picks?.length)||0} madde</span>
     <span>Güncelleme: ${esc(bridge.date(d.updatedAt)||'—')}</span>${missing?'<span class="chip red">Kaynak sürüm bulunamadı</span>':''}</div></div>
     <div class="pub-saved-item-actions"><button type="button" class="btn small" data-pub-open-saved="${esc(d.id)}" ${missing?'disabled title="Kaynak sürüm bulutta mevcut değil"':''}>Aç</button>
     <button type="button" class="btn small" data-pub-copy-saved="${esc(d.id)}">Kopyala</button>
     <button type="button" class="btn small danger" data-pub-delete-saved="${esc(d.id)}" aria-label="${esc(d.title)} kaydını sil">Sil</button></div></div>`;
 }).join('')}${rows.length>80?`<p class="pub-fine">İlk 80 kayıt görüntüleniyor. Arama kullanın. Toplam: ${rows.length}.</p>`:''}</div>`;
}
function savedPanel(){return `<section class="pub-saved" aria-label="Kayıtlı çalışmalar"><div class="pub-saved-head"><div><div class="pub-section-title">Kayıtlı taslaklar ve şablonlar <span class="pub-saved-count">${savedRows.length}</span></div><p>Seçtiğiniz madde ve bentler, kaynak sürümü ve çıktı tercihleri Firebase'de saklanır; XML ve rapor dosyaları bu alanda depolanmaz.</p></div>
 <div class="pub-saved-head-actions"><button class="btn small" type="button" data-pub-refresh-saved>Yenile</button><button class="btn small" type="button" data-pub-new>Yeni çalışma</button></div></div>
 <div class="pub-saved-filter"><input class="form-field" id="pubSavedSearch" placeholder="Kayıtlı çalışma ara..." value="${esc(s.savedSearch)}" aria-label="Kayıtlı çalışma ara" /></div>
 <div id="pubSavedList">${savedList()}</div></section>`;}
function getIntegrity(){
 if(!doc)return [];
 const byKey=new Map(doc.records.map(r=>[r.key,r]));const issues=[];
 for(const pick of s.picks.values()){
  const rec=byKey.get(pick.key);
  if(!rec){issues.push({key:pick.key,missingKey:true});continue;}
  if(pick.mode==='partial'){
   const anchors=new Set(engine.publicationOutline(rec.blocks||[]).filter(r=>r.type==='clause').map(r=>r.anchor));
   const missing=(pick.anchors||[]).filter(a=>!anchors.has(a));
   if(missing.length)issues.push({key:pick.key,missingAnchors:missing});
  }
 }
 return issues;
}
function integrityPanel(){const el=root.document.getElementById('pubIntegrity');if(!el)return;
 integrityIssues=getIntegrity();
 el.innerHTML=integrityIssues.length?`<div class="pub-integrity-warning"><strong>${integrityIssues.length} kayıt/bent eşleşmesinde sorun var.</strong>
  <p>Kaynak sürüm veya işlenmiş XML değişmiş olabilir. Yanlış mevzuatla çıktı üretmemek için dışa aktarma durduruldu. Eski seçimler otomatik silinmedi.</p>
  <details><summary>Eşleşmeyen gereklilikleri göster</summary><ul>${integrityIssues.slice(0,30).map(x=>`<li>${esc(x.key)}${x.missingAnchors?' → '+esc(x.missingAnchors.join(', ')):' → madde bulunamadı'}</li>`).join('')}</ul></details>
  <button type="button" class="btn small danger" data-pub-drop-missing>Yalnızca eşleşmeyen seçimleri kaldır</button></div>`:'';
}
function statusPanel(){const element=root.document.getElementById('pubSaveStatus');if(!element)return;
 const row=s.savedId&&findSaved(s.savedId);
 const status=row?(dirty()?'Kaydedilmemiş değişiklikler':`Bulutta kayıtlı · sürüm ${s.savedRevision}`):(meaningful()?'Henüz kaydedilmedi':'Yeni çalışma');
 element.innerHTML=`<span class="pub-status-dot ${row&&!dirty()?'good':haveUnsaved()?'warn':''}"></span>${esc(status)}${row?` <small>· ${esc(row.title)}</small>`:''}`;
 const save=root.document.getElementById('pubSave');if(save)save.disabled=s.saveBusy||!s.picks.size||!!integrityIssues.length||!savedLoaded;
 const saveCopy=root.document.getElementById('pubSaveCopy');if(saveCopy)saveCopy.disabled=s.saveBusy||!s.picks.size||!!integrityIssues.length||!savedLoaded;
}
function refreshSavedUi(){const n=root.document.getElementById('pubSavedList');if(n)n.innerHTML=savedList();const count=root.document.querySelector('.pub-saved-count');if(count)count.textContent=String(savedRows.length);statusPanel();}
function makeId(){if(root.crypto?.randomUUID)return 'pub_'+root.crypto.randomUUID();if(root.crypto?.getRandomValues){const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);return 'pub_'+Array.from(bytes).map(n=>n.toString(16).padStart(2,'0')).join('');}throw Error('Güvenli kayıt kimliği üretilemedi. HTTPS üzerinden açın.');}
async function saveWork(asNew=false){
 if(s.saveBusy)return;if(!savedLoaded)throw Error('Kayıtlı çalışmalar yüklenemedi. Önce “Yenile” seçeneğini kullanın.');
 if(!doc||!s.picks.size)throw Error('Kaydetmeden önce en az bir mevzuat maddesi seçin.');
 integrityIssues=getIntegrity();if(integrityIssues.length)throw Error('Bazı maddeler veya bentler kaynak sürümde bulunamadı. Önce eşleşme uyarısını giderin.');
 const family=sourceFamilies().find(f=>f.id===s.familyId),release=family?.releases.find(x=>x.versionId===s.releaseId);
 if(!family||!release)throw Error('Kaynak mevzuat sürümü bulut kataloğunda bulunamadı.');
 const current=snap();current.title=current.title||'Derleme – '+short(family.title,95);
 const existing=!asNew&&s.savedId?findSaved(s.savedId):null;
 if(s.savedId&&!asNew&&!existing)throw Error('Bu kayıt bulut listesinden kaldırılmış. “Farklı kaydet” ile yeni kopya oluşturun.');
 const row={...current,id:existing?.id||makeId(),sourceTitle:family.title||'',sourcePublished:release.published||'',
  createdAt:existing?.createdAt||new Date().toISOString()};
 s.saveBusy=true;statusPanel();
 try{const saved=await bridge.saveDraft(row,existing?.revision||0);
   savedRows=[saved,...savedRows.filter(r=>r.id!==saved.id)].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
   s.savedId=saved.id;s.savedRevision=saved.revision;
   if(!s.title.trim()) {s.title=current.title;const field=root.document.getElementById('pubTitle');if(field)field.value=s.title;}
   s.savedBaseline=fingerprint();bridge.toast((existing?'Çalışma güncellendi.':'Yeni '+(saved.type==='template'?'şablon':'taslak')+' Firebase’e kaydedildi.')+' Diğer cihazlarda “Yenile” ile açabilirsiniz.');
 }finally{s.saveBusy=false;refreshSavedUi();}
}
async function openSaved(id){
 if(s.saveBusy)return;
 const item=findSaved(id);if(!item)throw Error('Kayıt bulunamadı. Listeyi yenileyin.');
 if(s.savedId===id&&!dirty())return;
 if(!sourceAvailable(item))throw Error('Bu çalışmanın kaynak XML sürümü artık bulut kataloğunda bulunmuyor. Çalışma korunuyor; kaynak sürüm geri yüklenene kadar açılamaz.');
 if(!allowDiscard())return;
 const familyId=item.familyId,releaseId=item.versionId;
 // Validate the source data before replacing an unsaved in-progress compilation.
 const fetched=await bridge.loadDoc(releaseId);
 if(!fetched||fetched.versionId!==releaseId)throw Error('Kayıtlı kaynak XML doğrulanamadı.');
 s.familyId=familyId;s.releaseId=releaseId;s.picks=new Map();
 for(const pick of (item.picks||[])){
   if(typeof pick.key!=='string')continue;
   const sanitized={key:pick.key,mode:pick.mode==='partial'?'partial':'all'};
   if(sanitized.mode==='partial')sanitized.anchors=[...new Set((pick.anchors||[]).filter(a=>typeof a==='string'))];
   s.picks.set(pick.key,sanitized);
 }
 s.title=String(item.title||'');s.subtitle=String(item.subtitle||'');s.saveType=item.type==='template'?'template':'draft';
 const opt=item.options||{};s.includeRelated=opt.includeRelated!==false;s.includeNotes=opt.includeNotes!==false;
 s.includeClauseNotes=opt.includeClauseNotes!==false;s.extraNotePages=Math.min(2,Math.max(0,Number(opt.extraNotePages)||0));
 s.kindleMode=opt.kindleMode==='read'?'read':'notes';
 s.query='';s.category='ALL';s.kind='ALL';s.expanded='';s.limit=100;
 s.savedId=item.id;s.savedRevision=Number(item.revision)||0;s.savedBaseline=fingerprint();
 await render();
 if(getIntegrity().length)bridge.toast('Kayıtta eşleşmeyen bentler bulundu. Derleme uyarısını inceleyin.','warn');
 else bridge.toast('Kayıtlı çalışma açıldı: '+short(item.title,55));
}
async function copySaved(id){
 const row=findSaved(id);if(!row)throw Error('Kopyalanacak kayıt bulunamadı.');
 if(s.saveBusy)return;
 s.saveBusy=true;try{
  const copy={...row,id:makeId(),title:short((row.title||'Derleme')+' (kopya)',180),createdAt:new Date().toISOString()};delete copy.revision;delete copy.updatedAt;
  const saved=await bridge.saveDraft(copy,0);savedRows=[saved,...savedRows].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  bridge.toast('Çalışmanın kopyası oluşturuldu.');
 }finally{s.saveBusy=false;refreshSavedUi();}
}
async function deleteSaved(id){
 const item=findSaved(id);if(!item)throw Error('Silinecek kayıt bulunamadı.');
 if(!root.confirm('“'+item.title+'” kaydı Firebase’den silinsin mi? Mevzuat XML’leri ve kişisel notlar silinmez.'))return;
 await bridge.deleteDraft(id);savedRows=savedRows.filter(r=>r.id!==id);
 if(s.savedId===id){s.savedId=null;s.savedRevision=0;s.savedBaseline=null;}
 refreshSavedUi();bridge.toast('Kayıtlı çalışma silindi. Mevcut mevzuat seçimi ekranda kaldı.');
}
function dropMissing(){const issues=getIntegrity();if(!issues.length)return;
 if(!root.confirm('Yalnızca kaynakta bulunamayan madde/bent seçimleri kaldırılsın mı?'))return;
 for(const entry of issues){if(entry.missingKey)s.picks.delete(entry.key);else{
  const p=s.picks.get(entry.key);if(p?.mode==='partial'){
   p.anchors=p.anchors.filter(a=>!entry.missingAnchors.includes(a));if(!p.anchors.length)s.picks.delete(entry.key);
  }
 }}updateItemList();
}
function sourceControls(){const fam=sourceFamilies(),f=fam.find(x=>x.id===s.familyId),rels=f?.releases||[];
 return `<div class="pub-source-controls"><label>Mevzuat yay\u0131n\u0131<select id="pubFamily" class="form-field">${fam.map(f=>`<option value="${esc(f.id)}" ${f.id===s.familyId?'selected':''}>${esc(short(f.title,65))}</option>`).join('')}</select></label><label>Kaynak s\u00fcr\u00fcm<select id="pubRelease" class="form-field">${rels.map(r=>`<option value="${esc(r.versionId)}" ${r.versionId===s.releaseId?'selected':''}>${esc(bridge.date(r.published))}${r.versionId===f.active?' (aktif)':''}</option>`).join('')}</select></label><div class="pub-source-caption">Kaynak s\u00fcr\u00fcm derlemeye sabitlenir; yeni XML yay\u0131n\u0131 mevcut \u00e7\u0131kt\u0131y\u0131 kendili\u011finden de\u011fi\u015ftirmez.</div></div>`;}
function optionsPanel(){return `<aside class="pub-options"><div class="pub-section-title">Yay\u0131n ayarlar\u0131</div><label class="pub-option-field">Derleme ba\u015fl\u0131\u011f\u0131<input id="pubTitle" class="form-field" maxlength="180" value="${esc(s.title)}" placeholder="\u00d6rn. Olay Raporlama - Yetkili Otorite" /></label><label class="pub-option-field">Alt ba\u015fl\u0131k / a\u00e7\u0131klama<input id="pubSubtitle" class="form-field" maxlength="250" value="${esc(s.subtitle)}" placeholder="\u0130ste\u011fe ba\u011fl\u0131" /></label><div class="pub-checkboxes"><label><input type="checkbox" id="pubRelated" ${s.includeRelated?'checked':''}/><span>Ba\u011flant\u0131l\u0131 AMC / GM / CS otomatik ekle <small>XML'de ana madde ili\u015fkisi bulunanlar</small></span></label><label><input type="checkbox" id="pubNotes" ${s.includeNotes?'checked':''}/><span>Genel ki\u015fisel notlar\u0131m</span></label><label><input type="checkbox" id="pubClauseNotes" ${s.includeClauseNotes?'checked':''}/><span>Alt gereklilik notlar\u0131m</span></label></div><label class="pub-option-field">Her madde sonunda bo\u015f not sayfas\u0131 (Word/PDF)<select id="pubExtra" class="form-field"><option value="0" ${s.extraNotePages===0?'selected':''}>Yok</option><option value="1" ${s.extraNotePages===1?'selected':''}>1 sayfa</option><option value="2" ${s.extraNotePages===2?'selected':''}>2 sayfa</option></select></label><label class="pub-option-field">Kindle Scribe PDF d\u00fczeni<select id="pubKindle" class="form-field"><option value="notes" ${s.kindleMode==='notes'?'selected':''}>Not alma - geni\u015f alanlar</option><option value="read" ${s.kindleMode==='read'?'selected':''}>Okuma - daha az bo\u015fluk</option></select></label><div class="pub-selected-summary" id="pubSummary"></div><div class="pub-save-box"><div class="pub-section-title">Buluta kaydet</div><div id="pubSaveStatus" class="pub-save-status" aria-live="polite"></div><label class="pub-option-field">Kayıt türü<select id="pubSaveType" class="form-field"><option value="draft" ${s.saveType==='draft'?'selected':''}>Taslak – kaldığım yerden devam et</option><option value="template" ${s.saveType==='template'?'selected':''}>Şablon – tekrar kullan</option></select></label><div class="pub-save-actions"><button type="button" class="btn primary" id="pubSave" data-pub-save>Kaydet</button><button type="button" class="btn" id="pubSaveCopy" data-pub-save-copy>Farklı kaydet</button></div><p class="pub-fine">Yalnızca seçimler, düzen ve kaynak XML kimliği saklanır; rapor metni ve kişisel not içerikleri kopyalanmaz. Notlar çıktıda güncel hâliyle kullanılır.</p></div><div class="pub-export-actions"><div class="pub-section-title">D\u0131\u015fa aktar</div><div class="pub-action-grid"><button class="btn primary" data-pub-export="docx">Word .docx</button><button class="btn" data-pub-export="pdf">PDF (A4)</button><button class="btn" data-pub-export="kindle">Kindle PDF</button><button class="btn" data-pub-export="epub">Kindle EPUB</button><button class="btn" data-pub-export="txt">TXT</button><button class="btn" data-pub-export="md">Markdown</button></div><button class="btn pub-preview-button" data-pub-export="preview">\u00d6nizlemeyi a\u00e7</button><p class="pub-fine">PDF'ler yazd\u0131rma \u00f6nizlemesinde <b>PDF olarak kaydet</b> ile olu\u015fturulur. Kindle PDF i\u00e7in Send to Kindle kullan\u0131n. Notlar belgede a\u00e7\u0131k\u00e7a ki\u015fisel olarak i\u015faretlenir.</p></div></aside>`;}
function renderItem(r){const checked=s.picks.get(r.key),partial=checked?.mode==='partial',expanded=r.key===s.expanded;
 return `<div class="pub-record ${checked?'picked':''}"><div class="pub-record-main"><label class="pub-record-check"><input type="checkbox" data-pub-pick="${esc(r.key)}" ${checked?'checked':''} aria-label="${esc(titleOrText(r))} se\u00e7" /></label><button class="pub-record-name" data-pub-expand="${esc(r.key)}"><span>${esc(short(titleOrText(r),130))}</span><small>${esc(r.kind||'OTHER')} \u00b7 ${esc(short(r.category||'',80))} ${partial?'\u00b7 bent baz\u0131nda':''}</small></button><button type="button" class="btn small pub-expand" data-pub-expand="${esc(r.key)}" aria-label="Alt gereklilikleri ${expanded?'gizle':'g\u00f6ster'}">${expanded?'\u2212':'+'}</button></div>${expanded?renderClauses(r,checked):''}</div>`;}
function renderClauses(rec,pick){const listed=engine.publicationOutline(rec.blocks||[]).filter(r=>r.type==='clause'),partial=pick?.mode==='partial';
 if(!listed.length)return '<div class="pub-clause-list"><p>Bu kay\u0131tta numaraland\u0131r\u0131lm\u0131\u015f alt gereklilik bulunamad\u0131. Maddenin tamam\u0131n\u0131 se\u00e7ebilirsiniz.</p></div>';
 return `<div class="pub-clause-list"><div class="pub-clause-tools"><span>${listed.length} alt gereklilik</span><button class="btn small" data-pub-full="${esc(rec.key)}">T\u00fcm metni se\u00e7</button>${partial?'<span class="chip teal">K\u0131smi se\u00e7im</span>':''}</div>${listed.slice(0,150).map(b=>`<label class="pub-clause-option" style="padding-left:${Math.min(5,b.level||0)*15+8}px"><input type="checkbox" data-pub-clause="${esc(rec.key)}" data-pub-anchor="${esc(b.anchor)}" ${pick?.mode==='all'||(partial&&pick.anchors.includes(b.anchor))?'checked':''}/><span><b>${esc(b.reference||b.label)}</b> ${esc(short(b.text,175))}</span></label>`).join('')}${listed.length>150?'<div class="pub-clause-limit">\u0130lk 150 alt gereklilik g\u00f6steriliyor. Daha k\u00fc\u00e7\u00fck maddeler i\u00e7in bent bazl\u0131 se\u00e7im kullan\u0131n.</div>':''}</div>`;}
function filtered(){if(!doc)return [];
 const q=norm(s.query);const tokens=q.split(' ').filter(Boolean);
 return doc.records.filter(r=>(s.category==='ALL'||r.category===s.category)&&(s.kind==='ALL'||r.kind===s.kind)&&tokens.every(t=>norm(r.title+' '+r.source+' '+r.plain).includes(t)));
}
function updateItemList(){const element=root.document.getElementById('pubRecordList');if(!element)return;
 const matches=filtered();root.document.getElementById('pubResultTotal').textContent=matches.length.toLocaleString('tr-TR')+' e\u015fle\u015fme';
 element.innerHTML=matches.slice(0,s.limit).map(renderItem).join('')||'<div class="pub-list-empty">Bu filtrede madde bulunamad\u0131.</div>';
 const more=root.document.getElementById('pubMore');if(more){more.hidden=matches.length<=s.limit;more.textContent='Daha fazla g\u00f6ster ('+Math.max(0,matches.length-s.limit)+')';}
 integrityPanel();updateSummary();
}
function updateSummary(){const node=root.document.getElementById('pubSummary');if(!node)return;
 const chosen=[...s.picks.values()],partial=chosen.filter(x=>x.mode==='partial').length;
 const related=s.includeRelated&&doc?chosen.reduce((acc,p)=>{const rec=doc.records.find(r=>r.key===p.key);if(rec)for(const r of engine.findRelated(doc,rec))if(!s.picks.has(r.key))acc.add(r.key);return acc;},new Set()).size:0;
 node.innerHTML=`<strong>${chosen.length} se\u00e7ili madde</strong><span>${partial?partial+' bent bazl\u0131 se\u00e7im \u00b7 ':''}${related?'+'+related+' otomatik ili\u015fkili h\u00fck\u00fcm':'Se\u00e7ilen kaynak s\u00fcr\u00fcm sabit'}</span>`;
 root.document.querySelectorAll('[data-pub-export]').forEach(b=>b.disabled=!chosen.length||s.busy||!!integrityIssues.length);
 statusPanel();
}
async function render(){const stamp=++renderStamp,screen=root.document.getElementById('screen');const families=sourceFamilies();
 if(!bridge?.loggedIn()){screen.innerHTML='<div class="pub-initial"><h1>Yay\u0131n Olu\u015fturucu</h1><p>Mevzuat derlemek i\u00e7in Google hesab\u0131n\u0131zla giri\u015f yap\u0131n.</p><button type="button" class="btn primary" data-action="signin">Google ile giri\u015f</button></div>';return;}
 await loadSaved();
 if(!families.length){screen.innerHTML='<div class="pub-initial"><h1>Yay\u0131n Olu\u015fturucu</h1><p>Hen\u00fcz bulutta bir EASA XML yay\u0131n\u0131 yok. \u00d6nce mevzuat k\u00fct\u00fcphanesine XML y\u00fckleyin.</p><button class="btn primary" data-action="go-library">K\u00fct\u00fcphaneye d\u00f6n</button></div>'+savedPanel();return;}
 if(!families.some(f=>f.id===s.familyId))s.familyId=families[0].id;
 const family=families.find(f=>f.id===s.familyId);
 if(!family.releases.some(r=>r.versionId===s.releaseId)){if(s.savedId){screen.innerHTML='<div class="pub-initial"><h1>Kaynak sürüm bulunamadı</h1><p>Kayıtlı çalışmanın kaynak XML sürümü bulut kataloğunda yok. Eski kayıt korunuyor. Lütfen kaynak sürümü geri yükleyin.</p></div>'+savedPanel();return;}s.releaseId=family.active||family.releases[0].versionId;}
 screen.innerHTML='<div class="loading"><div><div class="spinner"></div>Yay\u0131n i\u00e7eri\u011fi y\u00fckleniyor...</div></div>';
 try{doc=await bridge.loadDoc(s.releaseId);}catch(e){screen.innerHTML=`<div class="pub-initial"><h1>Mevzuat verisi okunamad\u0131</h1><p>${esc(e.message)}</p><button class="btn primary" data-action="drive">Drive ba\u011fla</button></div>`+savedPanel();return;}
 if(stamp!==renderStamp)return;
 const sections=[...new Set(doc.records.map(x=>x.category||'Genel'))];
 screen.innerHTML=`<div class="pub-builder"><header class="pub-header"><div class="eyebrow">v3.7 / YAYIN OLU\u015eTURUCU</div><h1>Mevzuat Derle & D\u0131\u015fa Aktar</h1><p>EASA XML s\u00fcr\u00fcm\u00fcnden madde veya bent se\u00e7in; Word, PDF, Kindle ya da d\u00fcz metin olu\u015fturun.</p></header>${savedPanel()}${sourceControls()}<div id="pubIntegrity"></div><div class="pub-builder-grid"><section class="pub-picker"><div class="pub-section-title">Madde ve alt gereklilik se\u00e7imi</div><div class="pub-filter-row"><input class="form-field" id="pubQuery" value="${esc(s.query)}" placeholder="Madde kodu, ba\u015fl\u0131k ya da i\u00e7erik ara"/><select class="form-field" id="pubCategory"><option value="ALL">T\u00fcm b\u00f6l\u00fcmler</option>${sections.map(x=>`<option value="${esc(x)}" ${s.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select class="form-field" id="pubKind">${['ALL','IR','DR','AMC','GM','CS','OTHER'].map(k=>`<option value="${k}" ${s.kind===k?'selected':''}>${k==='ALL'?'T\u00fcm t\u00fcrler':k}</option>`).join('')}</select></div><div class="pub-list-toolbar"><span id="pubResultTotal"></span><div><button class="btn small" data-pub-select-visible="1">G\u00f6r\u00fcnenleri se\u00e7</button><button class="btn small" data-pub-clear="1">Se\u00e7imi temizle</button></div></div><div id="pubRecordList" class="pub-record-list"></div><button class="btn pub-more" id="pubMore" data-pub-more="1" hidden>Daha fazla g\u00f6ster</button></section>${optionsPanel()}</div><div class="info-strip">Mevzuat metinleri ve notlar\u0131n\u0131z, rapor olu\u015ftururken yaln\u0131zca taray\u0131c\u0131n\u0131zda i\u015flenir. Taslak ve \u015fablonlar bulutta kaydedilir; rapor dosyalar\u0131 ise yerel olarak olu\u015fturulur. Kaynakta resim/karma\u015f\u0131k \u015fekil varsa son \u00e7\u0131kt\u0131y\u0131 kontrol edin.</div></div>`;
 updateItemList();
}
function options(){return {title:s.title,subtitle:s.subtitle,includeRelated:s.includeRelated,includeNotes:s.includeNotes,
 includeClauseNotes:s.includeClauseNotes,extraNotePages:s.extraNotePages,kindleMode:s.kindleMode,includeMetadata:true};}
function model(){if(!doc)throw Error('Mevzuat y\u00fcklenmedi.');return engine.prepare({doc,picks:[...s.picks.values()],annotations:bridge.annotations(),options:options()});}
function download(name,data,mime){const blob=data instanceof Blob?data:new Blob([data],{type:mime});const url=URL.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download=name;root.document.body.appendChild(a);a.click();a.remove();root.setTimeout(()=>URL.revokeObjectURL(url),20000);}
async function exportAs(format){if(s.busy)return;
 const m=model();
 if(['pdf','kindle','preview'].includes(format)){
  const profile=format==='pdf'?'a4':format==='kindle'?(s.kindleMode==='notes'?'kindle-notes':'kindle-read'):'a4';
  const child=root.open('','_blank');if(!child)throw Error('Taray\u0131c\u0131 a\u00e7\u0131l\u0131r pencereyi engelledi. Bu site i\u00e7in izin verin.');
  child.document.open();child.document.write(engine.renderContentHtml(m,profile,true));child.document.close();
  bridge.toast(format==='preview'?'\u00d6nizleme yeni sekmede a\u00e7\u0131ld\u0131.':'Yeni sekmede Print / Save as PDF se\u00e7in.');return;
 }
 s.busy=true;updateSummary();try{
  if(format==='txt')download(engine.filename(m,'txt'),engine.makeText(m),'text/plain;charset=utf-8');
  if(format==='md')download(engine.filename(m,'md'),engine.makeText(m,true),'text/markdown;charset=utf-8');
  if(format==='docx')download(engine.filename(m,'docx'),await engine.createDocx(m),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  if(format==='epub')download(engine.filename(m,'epub'),await engine.createEpub(m),'application/epub+zip');
  bridge.toast('Derleme dosyas\u0131 indirildi: '+format.toUpperCase());
 }finally{s.busy=false;updateSummary();}
}
function onClick(e){if(!bridge||bridge.currentView()!=='publish')return;
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.pubRefreshSaved!==undefined){loadSaved(true).then(()=>refreshSavedUi()).catch(bridge.error);return;}
 if(target.dataset.pubNew!==undefined){if(!allowDiscard())return;resetWork();render().catch(bridge.error);return;}
 if(target.dataset.pubOpenSaved!==undefined){openSaved(target.dataset.pubOpenSaved).catch(bridge.error);return;}
 if(target.dataset.pubCopySaved!==undefined){copySaved(target.dataset.pubCopySaved).catch(bridge.error);return;}
 if(target.dataset.pubDeleteSaved!==undefined){deleteSaved(target.dataset.pubDeleteSaved).catch(bridge.error);return;}
 if(target.dataset.pubSave!==undefined){saveWork(false).catch(bridge.error);return;}
 if(target.dataset.pubSaveCopy!==undefined){saveWork(true).catch(bridge.error);return;}
 if(target.dataset.pubDropMissing!==undefined){dropMissing();return;}
 if(target.dataset.pubExpand!==undefined){s.expanded=s.expanded===target.dataset.pubExpand?'':target.dataset.pubExpand;updateItemList();return;}
 if(target.dataset.pubFull!==undefined){addRecord(target.dataset.pubFull);updateItemList();return;}
 if(target.dataset.pubClear!==undefined){s.picks.clear();updateItemList();return;}
 if(target.dataset.pubSelectVisible!==undefined){const matches=filtered().slice(0,s.limit);if(s.picks.size+matches.length>350){bridge.error(Error('En fazla 350 madde se\u00e7ilebilir. Daha dar bir filtre uygulay\u0131n.'));return;}for(const r of matches)if(!s.picks.has(r.key))addRecord(r.key);updateItemList();return;}
 if(target.dataset.pubMore!==undefined){s.limit+=100;updateItemList();return;}
 if(target.dataset.pubExport!==undefined)exportAs(target.dataset.pubExport).catch(bridge.error);
}
function onChange(e){if(!bridge||bridge.currentView()!=='publish')return;const v=e.target.value;
 if(e.target.id==='pubFamily'){
  if(haveUnsaved()&&!root.confirm('Farkl\u0131 mevzuata ge\u00e7ildi\u011finde mevcut se\u00e7imler temizlenecek. Devam edilsin mi?')){e.target.value=s.familyId;return;}
  choose(v,sourceFamilies().find(f=>f.id===v)?.active);s.expanded='';render().catch(bridge.error);return;}
 if(e.target.id==='pubRelease'){
  if(haveUnsaved()&&!root.confirm('Kaynak s\u00fcr\u00fcm de\u011fi\u015firse se\u00e7imler temizlenecek. Devam edilsin mi?')){e.target.value=s.releaseId;return;}
  choose(s.familyId,v);s.expanded='';render().catch(bridge.error);return;}
 if(e.target.id==='pubSaveType'){s.saveType=v==='template'?'template':'draft';statusPanel();return;}
 if(e.target.id==='pubCategory'){s.category=v;s.limit=100;updateItemList();return;}
 if(e.target.id==='pubKind'){s.kind=v;s.limit=100;updateItemList();return;}
 if(e.target.dataset.pubPick!==undefined){const key=e.target.dataset.pubPick;if(e.target.checked)addRecord(key);else s.picks.delete(key);updateItemList();return;}
 if(e.target.dataset.pubClause!==undefined){const key=e.target.dataset.pubClause,anchor=e.target.dataset.pubAnchor;
  const listed=engine.publicationOutline(doc.records.find(r=>r.key===key)?.blocks||[]).filter(b=>b.type==='clause');
  let cur=s.picks.get(key),anchors=cur?.mode==='partial'?[...cur.anchors]:(cur?.mode==='all'?listed.map(b=>b.anchor):[]);
  const base=listed.find(b=>b.anchor===anchor);
  const affected=listed.filter(b=>b.anchor===anchor||
    (base?.isNumberRoot&&b.parentNumber===anchor)||
    (!base?.isNumberRoot&&b.anchor.startsWith(anchor+'/'))).map(b=>b.anchor);
  if(e.target.checked){for(const a of affected)if(!anchors.includes(a))anchors.push(a);}
  else anchors=anchors.filter(a=>!affected.includes(a));
  if(anchors.length)addRecord(key,anchors);else s.picks.delete(key);updateItemList();return;}
 const id=e.target.id;
 if(id==='pubRelated')s.includeRelated=e.target.checked;
 if(id==='pubNotes')s.includeNotes=e.target.checked;
 if(id==='pubClauseNotes')s.includeClauseNotes=e.target.checked;
 if(id==='pubExtra')s.extraNotePages=Number(v);
 if(id==='pubKindle')s.kindleMode=v;
 updateSummary();
}
function onInput(e){if(!bridge||bridge.currentView()!=='publish')return;
 if(e.target.id==='pubTitle')s.title=e.target.value;
 if(e.target.id==='pubSubtitle')s.subtitle=e.target.value;
 if(e.target.id==='pubQuery'){s.query=e.target.value;s.limit=100;updateItemList();}
 if(e.target.id==='pubSavedSearch'){s.savedSearch=e.target.value;refreshSavedUi();}
 if(['pubTitle','pubSubtitle'].includes(e.target.id))statusPanel();
}
root.addEventListener?.('beforeunload',event=>{if(haveUnsaved()){event.preventDefault();event.returnValue='';}});
root.EasaPublisherUI={configure,render,choose,reset,resetSavedCache,model,get state(){return s;}};
})(typeof globalThis!=='undefined'?globalThis:this);
