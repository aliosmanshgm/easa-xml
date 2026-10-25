/* EASA eRules Hub v3.8 - multi-publication thematic compilations and drafts. */
(function(root){
'use strict';
const engine=root.EasaPublication;
const clauses=root.EasaClauses;
const s={familyId:'',releaseId:'',picks:new Map(),sourceOrder:[],query:'',category:'ALL',kind:'ALL',limit:100,
 expanded:'',title:'',subtitle:'',includeRelated:true,includeNotes:true,includeClauseNotes:true,
 extraNotePages:0,kindleMode:'notes',busy:false,saveType:'draft',savedId:null,savedRevision:0,savedBaseline:null,savedSearch:'',saveBusy:false};
let bridge=null,doc=null,docs=new Map(),renderStamp=0,savedRows=[],savedLoaded=false,savedLoadError='',integrityIssues=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const short=(v,n=120)=>String(v||'').length>n?String(v).slice(0,n-1)+'\u2026':String(v||'');
const noteCount=()=>s.picks.size;

function addRecord(key,anchors){const id=pickId(s.familyId,s.releaseId,key);
 if(!s.picks.has(id)&&s.picks.size>=350)throw Error('Bir derlemede en fazla 350 madde seçilebilir.');
 ensurePickSource(s.familyId,s.releaseId);
 const rec={familyId:s.familyId,versionId:s.releaseId,key,mode:anchors?.length?'partial':'all'};
 if(rec.mode==='partial')rec.anchors=[...new Set(anchors)];s.picks.set(id,rec);
}

function configure(api){bridge=api;root.document.addEventListener('click',onClick);root.document.addEventListener('change',onChange);root.document.addEventListener('input',onInput);}
function titleOrText(r){return r.title||short(r.plain?.split('\n')?.[0]||r.key);}
function sourceFamilies(){return bridge?.families()||[];}
function hasPublication(){return !!(bridge?.loggedIn()&&sourceFamilies().length);}
function reset(){s.familyId='';s.releaseId='';s.picks.clear();s.sourceOrder=[];s.query='';s.title='';s.subtitle='';s.expanded='';s.savedId=null;s.savedRevision=0;s.savedBaseline=null;s.saveType='draft';doc=null;docs.clear();resetSavedCache();}
// Identity of a choice includes the publication, pinned release AND provision key.
const sourceKey=(familyId,versionId)=>JSON.stringify([familyId,versionId]);
const pickId=(familyId,versionId,key)=>JSON.stringify([familyId,versionId,key]);
function sameSource(a,b){return a.familyId===b.familyId&&a.versionId===b.versionId;}
function pickFor(key){return s.picks.get(pickId(s.familyId,s.releaseId,key));}
function currentPicks(){return [...s.picks.values()].filter(x=>x.familyId===s.familyId&&x.versionId===s.releaseId);}
function sourceMeta(familyId,versionId){const f=sourceFamilies().find(f=>f.id===familyId),r=f?.releases?.find(x=>x.versionId===versionId);
 return {familyId,versionId,title:f?.title||familyId,published:r?.published||'',available:!!r};}
function sourceRefs(){const all=[...s.picks.values()].map(p=>({familyId:p.familyId,versionId:p.versionId})),seen=new Set(),ordered=[];
 for(const r of [...s.sourceOrder,...all]){const key=sourceKey(r.familyId,r.versionId);if(!seen.has(key)&&all.some(p=>sourceKey(p.familyId,p.versionId)===key)){seen.add(key);ordered.push(sourceMeta(r.familyId,r.versionId));}}
 return ordered;
}
function ensurePickSource(familyId,versionId){if(!s.sourceOrder.some(x=>x.familyId===familyId&&x.versionId===versionId))s.sourceOrder.push({familyId,versionId});}
function resetSavedCache(){savedLoaded=false;savedRows=[];savedLoadError='';}
function choose(familyId,releaseId,key){s.familyId=familyId;s.releaseId=releaseId;if(key)addRecord(key);s.expanded='';}
function snap(){const refs=sourceRefs(),first=refs[0]||{familyId:s.familyId,versionId:s.releaseId};return {
 familyId:first.familyId,versionId:first.versionId,title:s.title.trim().slice(0,180),subtitle:s.subtitle.trim().slice(0,250),
 type:s.saveType,sources:refs.map(({familyId,versionId,title,published})=>({familyId,versionId,title,published})),
 picks:[...s.picks.values()].map(p=>({familyId:p.familyId,versionId:p.versionId,key:p.key,
  mode:p.mode==='partial'?'partial':'all',...(p.mode==='partial'?{anchors:[...new Set(p.anchors||[])]}:{})})),
 options:{includeRelated:s.includeRelated,includeNotes:s.includeNotes,includeClauseNotes:s.includeClauseNotes,
 extraNotePages:s.extraNotePages,kindleMode:s.kindleMode}
};}
function fingerprint(){return JSON.stringify(snap());}
function dirty(){return s.savedBaseline!==null&&fingerprint()!==s.savedBaseline;}
function meaningful(){return !!(s.picks.size||s.title.trim()||s.subtitle.trim());}
function haveUnsaved(){return dirty()||(s.savedId===null&&meaningful());}
function allowDiscard(){return !haveUnsaved()||root.confirm('Bu çalışmadaki kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?');}
function resetWork(){s.picks.clear();s.sourceOrder=[];s.title='';s.subtitle='';s.expanded='';s.query='';s.category='ALL';s.kind='ALL';s.limit=100;
 s.includeRelated=true;s.includeNotes=true;s.includeClauseNotes=true;s.extraNotePages=0;s.kindleMode='notes';
 s.saveType='draft';s.savedId=null;s.savedRevision=0;s.savedBaseline=null;integrityIssues=[];}
async function loadSaved(force=false){
 if(savedLoaded&&!force)return;
 try{const rows=await bridge.listDrafts();savedRows=(Array.isArray(rows)?rows:[]).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));savedLoadError='';savedLoaded=true;}
 catch(e){savedLoadError=e?.message||String(e);savedLoaded=false;}
}
function findSaved(id){return savedRows.find(d=>d.id===id);}
function draftSources(item){const entries=Array.isArray(item.sources)&&item.sources.length?item.sources:[{familyId:item.familyId,versionId:item.versionId}];
 return entries.filter(x=>x&&typeof x.familyId==='string'&&typeof x.versionId==='string');}
function sourceAvailable(d){const sources=draftSources(d);return !!sources.length&&sources.every(ref=>sourceMeta(ref.familyId,ref.versionId).available);}
function savedList(){
 const q=norm(s.savedSearch),rows=savedRows.filter(d=>!q||norm([d.title,d.subtitle,d.sourceTitle,...draftSources(d).map(x=>x.title||sourceMeta(x.familyId,x.versionId).title)].join(' ')).includes(q));
 if(savedLoadError)return `<div class="pub-saved-empty pub-saved-error">Kayıtlı çalışmalar yüklenemedi: ${esc(savedLoadError)} <button type="button" class="btn small" data-pub-refresh-saved>Tekrar dene</button></div>`;
 if(!rows.length)return `<div class="pub-saved-empty">${s.savedSearch?'Bu aramada kayıtlı çalışma yok.':'Henüz kaydedilmiş taslak veya şablon bulunmuyor.'}</div>`;
 return `<div class="pub-saved-items">${rows.slice(0,80).map(d=>{
   const missing=!sourceAvailable(d),active=s.savedId===d.id;
   return `<div class="pub-saved-item ${active?'active':''}"><div class="pub-saved-item-info"><div class="pub-saved-title">${esc(short(d.title,110))} ${active?'<span class="chip teal">Açık</span>':''}</div>
     <div class="pub-saved-meta"><span class="chip ${d.type==='template'?'blue':'teal'}">${d.type==='template'?'Şablon':'Taslak'}</span>
     <span>${esc(short(d.sourceTitle||d.familyId,65))}</span><span>${draftSources(d).length} kaynak sürüm</span><span>${Number(d.picks?.length)||0} madde</span>
     <span>Güncelleme: ${esc(bridge.date(d.updatedAt)||'—')}</span>${missing?'<span class="chip red">Kaynak sürüm bulunamadı</span>':''}</div></div>
     <div class="pub-saved-item-actions"><button type="button" class="btn small" data-pub-open-saved="${esc(d.id)}" ${missing?'disabled title="Kaynak sürüm bulutta mevcut değil"':''}>Aç</button>
     <button type="button" class="btn small" data-pub-copy-saved="${esc(d.id)}">Kopyala</button>
     <button type="button" class="btn small danger" data-pub-delete-saved="${esc(d.id)}" aria-label="${esc(d.title)} kaydını sil">Sil</button></div></div>`;
 }).join('')}${rows.length>80?`<p class="pub-fine">İlk 80 kayıt görüntüleniyor. Arama kullanın. Toplam: ${rows.length}.</p>`:''}</div>`;
}
function savedPanel(){return `<section class="pub-saved" aria-label="Kayıtlı çalışmalar"><div class="pub-saved-head"><div><div class="pub-section-title">Kayıtlı taslaklar ve şablonlar <span class="pub-saved-count">${savedRows.length}</span></div><p>Seçili kaynak XML sürümleri, maddeler, alt bentler ve çıktı seçenekleri Firebase'de saklanır; XML metinleri saklanmaz. Eski tek kaynaklı şablonlar da desteklenir.</p></div>
 <div class="pub-saved-head-actions"><button class="btn small" type="button" data-pub-refresh-saved>Yenile</button><button class="btn small" type="button" data-pub-new>Yeni çalışma</button></div></div>
 <div class="pub-saved-filter"><input class="form-field" id="pubSavedSearch" placeholder="Kayıtlı çalışma ara..." value="${esc(s.savedSearch)}" aria-label="Kayıtlı çalışma ara" /></div>
 <div id="pubSavedList">${savedList()}</div></section>`;}
function getIntegrity(){const issues=[];for(const pick of s.picks.values()){
 const d=docs.get(pick.versionId),id=pickId(pick.familyId,pick.versionId,pick.key);
 if(!sourceMeta(pick.familyId,pick.versionId).available||!d||d.familyId!==pick.familyId){issues.push({id,key:pick.key,source:pick.familyId,missingSource:true});continue;}
 const rec=d.records.find(r=>r.key===pick.key);
 if(!rec){issues.push({id,key:pick.key,source:pick.familyId,missingKey:true});continue;}
 if(pick.mode==='partial'){const anchors=new Set(engine.publicationOutline(rec.blocks||[]).filter(r=>r.type==='clause').map(r=>r.anchor));
  const missing=(pick.anchors||[]).filter(a=>!anchors.has(a));if(missing.length)issues.push({id,key:pick.key,source:pick.familyId,missingAnchors:missing});}
 }return issues;}
function integrityPanel(){const el=root.document.getElementById('pubIntegrity');if(!el)return;
 integrityIssues=getIntegrity();
 el.innerHTML=integrityIssues.length?`<div class="pub-integrity-warning"><strong>${integrityIssues.length} kayıt/bent eşleşmesinde sorun var.</strong>
  <p>Kaynak sürüm veya işlenmiş XML değişmiş olabilir. Yanlış mevzuatla çıktı üretmemek için dışa aktarma durduruldu. Eski seçimler otomatik silinmedi.</p>
  <details><summary>Eşleşmeyen gereklilikleri göster</summary><ul>${integrityIssues.slice(0,30).map(x=>`<li>${esc(x.source+' · '+x.key)}${x.missingAnchors?' → '+esc(x.missingAnchors.join(', ')):x.missingSource?' → kaynak sürüm bulunamadı':' → madde bulunamadı'}</li>`).join('')}</ul></details>
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
 if(!s.picks.size)throw Error('Kaydetmeden önce en az bir mevzuat maddesi seçin.');
 integrityIssues=getIntegrity();if(integrityIssues.length)throw Error('Bazı kaynak XML, madde veya bentler yüklenemedi. Uyarıyı giderin.');
 const refs=sourceRefs();if(!refs.length||refs.some(r=>!r.available))throw Error('Seçilen kaynak sürümlerden biri bulut kataloğunda bulunamadı.');
 const current=snap();current.title=current.title||('Derleme – '+(refs.length>1?refs.length+' EASA yayını':short(refs[0].title,95)));
 const existing=!asNew&&s.savedId?findSaved(s.savedId):null;
 if(s.savedId&&!asNew&&!existing)throw Error('Bu kayıt bulut listesinden kaldırılmış. “Farklı kaydet” ile yeni kopya oluşturun.');
 const row={...current,id:existing?.id||makeId(),sourceTitle:refs.length===1?refs[0].title:refs.length+' EASA mevzuat yayını',
  sourcePublished:refs[0].published,createdAt:existing?.createdAt||new Date().toISOString()};
 s.saveBusy=true;statusPanel();try{
  const saved=await bridge.saveDraft(row,existing?.revision||0);
  savedRows=[saved,...savedRows.filter(r=>r.id!==saved.id)].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  s.savedId=saved.id;s.savedRevision=saved.revision;
  if(!s.title.trim()){s.title=current.title;const field=root.document.getElementById('pubTitle');if(field)field.value=s.title;}
  s.savedBaseline=fingerprint();bridge.toast((existing?'Çalışma güncellendi.':'Yeni '+(saved.type==='template'?'şablon':'taslak')+' Firebase’e kaydedildi.')+' Diğer cihazlarda “Yenile” ile açabilirsiniz.');
 }finally{s.saveBusy=false;refreshSavedUi();}
}
async function openSaved(id){if(s.saveBusy)return;const item=findSaved(id);if(!item)throw Error('Kayıt bulunamadı. Listeyi yenileyin.');
 if(s.savedId===id&&!dirty())return;
 if(!sourceAvailable(item))throw Error('Kaynak XML sürümlerinden en az biri bulut kataloğunda bulunmuyor. Kayıt korunuyor; önce kaynak sürümü geri yükleyin.');
 if(!allowDiscard())return;
 const refs=draftSources(item);
 // Load ALL source releases before touching the current unsaved work. Never silently substitute active/newer XML.
 const results=await Promise.all(refs.map(async ref=>{const data=await bridge.loadDoc(ref.versionId);
  if(!data||data.versionId!==ref.versionId||data.familyId!==ref.familyId)throw Error('Kaydedilmiş XML kaynağı doğrulanamadı: '+ref.familyId);
  return data;}));
 const restored=new Map();for(const raw of item.picks||[]){if(typeof raw.key!=='string')continue;
  const familyId=raw.familyId||item.familyId,versionId=raw.versionId||item.versionId;
  const pick={familyId,versionId,key:raw.key,mode:raw.mode==='partial'?'partial':'all'};
  if(pick.mode==='partial')pick.anchors=[...new Set((raw.anchors||[]).filter(a=>typeof a==='string'))];
  restored.set(pickId(familyId,versionId,raw.key),pick);
 }
 for(const d of results)docs.set(d.versionId,d);
 s.picks=restored;s.sourceOrder=refs.map(({familyId,versionId})=>({familyId,versionId}));
 s.familyId=refs[0].familyId;s.releaseId=refs[0].versionId;
 s.title=String(item.title||'');s.subtitle=String(item.subtitle||'');s.saveType=item.type==='template'?'template':'draft';
 const opt=item.options||{};s.includeRelated=opt.includeRelated!==false;s.includeNotes=opt.includeNotes!==false;
 s.includeClauseNotes=opt.includeClauseNotes!==false;s.extraNotePages=Math.min(2,Math.max(0,Number(opt.extraNotePages)||0));s.kindleMode=opt.kindleMode==='read'?'read':'notes';
 s.query='';s.category='ALL';s.kind='ALL';s.expanded='';s.limit=100;
 s.savedId=item.id;s.savedRevision=Number(item.revision)||0;s.savedBaseline=fingerprint();
 await render();
 if(getIntegrity().length)bridge.toast('Kayıtta eşleşmeyen kaynak/madde/bent bulundu. Uyarıyı inceleyin.','warn');
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
 if(issues.some(x=>x.missingSource)){bridge.error(Error('Kaynak XML eksik olduğu için bu seçimler otomatik silinemez. Önce ilgili sürümü geri yükleyin.'));return;}
 if(!root.confirm('Yalnızca XML içerisinde bulunmayan madde/bent seçimleri kaldırılsın mı?'))return;
 for(const entry of issues){if(entry.missingKey)s.picks.delete(entry.id);else{
  const p=s.picks.get(entry.id);if(p?.mode==='partial'){p.anchors=p.anchors.filter(a=>!entry.missingAnchors.includes(a));if(!p.anchors.length)s.picks.delete(entry.id);}
 }}updateItemList();}
function sourceControls(){const fam=sourceFamilies(),f=fam.find(x=>x.id===s.familyId),rels=f?.releases||[];
 return `<div class="pub-source-controls"><label>Mevzuat yayını<select id="pubFamily" class="form-field">${fam.map(f=>`<option value="${esc(f.id)}" ${f.id===s.familyId?'selected':''}>${esc(short(f.title,65))}</option>`).join('')}</select></label><label>Kaynak sürüm<select id="pubRelease" class="form-field">${rels.map(r=>`<option value="${esc(r.versionId)}" ${r.versionId===s.releaseId?'selected':''}>${esc(bridge.date(r.published))}${r.versionId===f.active?' (aktif)':''}</option>`).join('')}</select></label><div class="pub-source-caption">Mevzuat değiştirmek seçilmiş maddeleri silmez. Her kaynak kendi XML sürümüne sabitlenir; tüm seçimleri aşağıdaki derleme sepetinden yönetin.</div></div>`;}
function sourceBasket(){const refs=sourceRefs();if(!refs.length)return `<section class="pub-source-basket"><div class="pub-section-title">Tematik derleme sepeti</div><p class="pub-fine">Bir yayın seçip madde ekleyin. Ardından başka mevzuata geçerek ekleme yapabilirsiniz. Kaynaklar burada birikir.</p></section>`;
 return `<section class="pub-source-basket"><div class="pub-source-basket-head"><div><div class="pub-section-title">Tematik derleme sepeti <span class="pub-saved-count">${refs.length} kaynak</span></div><p>Kaynak sırasını değiştirebilirsiniz. Her kaynağın içinde maddeler XML sırasını korur.</p></div><button type="button" class="btn small" data-pub-clear-current>Görüntülenen kaynağı temizle</button></div><div class="pub-source-items">${refs.map((r,i)=>{const id=sourceKey(r.familyId,r.versionId),num=[...s.picks.values()].filter(p=>sameSource(p,r)).length;
 return `<div class="pub-source-item"><span class="pub-source-index">${i+1}</span><div class="pub-source-info"><strong>${esc(short(r.title,100))}</strong><small>${esc(bridge.date(r.published)||r.published||'?')} · ${num} madde · Sürüm: ${esc(short(r.versionId,32))}</small></div><div class="pub-source-buttons"><button type="button" class="btn small" data-pub-source-open="${esc(id)}" aria-label="Kaynağı görüntüle">Aç</button><button type="button" class="btn small" data-pub-source-up="${esc(id)}" ${i===0?'disabled':''} aria-label="Kaynağı yukarı taşı">↑</button><button type="button" class="btn small" data-pub-source-down="${esc(id)}" ${i===refs.length-1?'disabled':''} aria-label="Kaynağı aşağı taşı">↓</button><button type="button" class="btn small danger" data-pub-source-remove="${esc(id)}" aria-label="Kaynağı derlemeden çıkar">Çıkar</button></div></div>`;}).join('')}</div></section>`;}
function basketRefresh(){const b=root.document.getElementById('pubBasket');if(b)b.innerHTML=sourceBasket();}
function optionsPanel(){return `<aside class="pub-options"><div class="pub-section-title">Yay\u0131n ayarlar\u0131</div><label class="pub-option-field">Derleme ba\u015fl\u0131\u011f\u0131<input id="pubTitle" class="form-field" maxlength="180" value="${esc(s.title)}" placeholder="\u00d6rn. Olay Raporlama - Yetkili Otorite" /></label><label class="pub-option-field">Alt ba\u015fl\u0131k / a\u00e7\u0131klama<input id="pubSubtitle" class="form-field" maxlength="250" value="${esc(s.subtitle)}" placeholder="\u0130ste\u011fe ba\u011fl\u0131" /></label><div class="pub-checkboxes"><label><input type="checkbox" id="pubRelated" ${s.includeRelated?'checked':''}/><span>Ba\u011flant\u0131l\u0131 AMC / GM / CS otomatik ekle <small>XML'de ana madde ili\u015fkisi bulunanlar</small></span></label><label><input type="checkbox" id="pubNotes" ${s.includeNotes?'checked':''}/><span>Genel ki\u015fisel notlar\u0131m</span></label><label><input type="checkbox" id="pubClauseNotes" ${s.includeClauseNotes?'checked':''}/><span>Alt gereklilik notlar\u0131m</span></label></div><label class="pub-option-field">Her madde sonunda bo\u015f not sayfas\u0131 (Word/PDF)<select id="pubExtra" class="form-field"><option value="0" ${s.extraNotePages===0?'selected':''}>Yok</option><option value="1" ${s.extraNotePages===1?'selected':''}>1 sayfa</option><option value="2" ${s.extraNotePages===2?'selected':''}>2 sayfa</option></select></label><label class="pub-option-field">Kindle Scribe PDF d\u00fczeni<select id="pubKindle" class="form-field"><option value="notes" ${s.kindleMode==='notes'?'selected':''}>Not alma - geni\u015f alanlar</option><option value="read" ${s.kindleMode==='read'?'selected':''}>Okuma - daha az bo\u015fluk</option></select></label><div class="pub-selected-summary" id="pubSummary"></div><div class="pub-save-box"><div class="pub-section-title">Buluta kaydet</div><div id="pubSaveStatus" class="pub-save-status" aria-live="polite"></div><label class="pub-option-field">Kayıt türü<select id="pubSaveType" class="form-field"><option value="draft" ${s.saveType==='draft'?'selected':''}>Taslak – kaldığım yerden devam et</option><option value="template" ${s.saveType==='template'?'selected':''}>Şablon – tekrar kullan</option></select></label><div class="pub-save-actions"><button type="button" class="btn primary" id="pubSave" data-pub-save>Kaydet</button><button type="button" class="btn" id="pubSaveCopy" data-pub-save-copy>Farklı kaydet</button></div><p class="pub-fine">Yalnızca seçimler, düzen ve bütün kaynak XML sürüm kimlikleri saklanır; rapor metni ve kişisel not içerikleri kopyalanmaz. Notlar çıktıda güncel hâliyle kullanılır.</p></div><div class="pub-export-actions"><div class="pub-section-title">D\u0131\u015fa aktar</div><div class="pub-action-grid"><button class="btn primary" data-pub-export="docx">Word .docx</button><button class="btn" data-pub-export="pdf">PDF (A4)</button><button class="btn" data-pub-export="kindle">Kindle PDF</button><button class="btn" data-pub-export="epub">Kindle EPUB</button><button class="btn" data-pub-export="txt">TXT</button><button class="btn" data-pub-export="md">Markdown</button></div><button class="btn pub-preview-button" data-pub-export="preview">\u00d6nizlemeyi a\u00e7</button><p class="pub-fine">PDF'ler yazd\u0131rma \u00f6nizlemesinde <b>PDF olarak kaydet</b> ile olu\u015fturulur. Kindle PDF i\u00e7in Send to Kindle kullan\u0131n. Notlar belgede a\u00e7\u0131k\u00e7a ki\u015fisel olarak i\u015faretlenir.</p></div></aside>`;}
function renderItem(r){const checked=pickFor(r.key),partial=checked?.mode==='partial',expanded=r.key===s.expanded;
 return `<div class="pub-record ${checked?'picked':''}"><div class="pub-record-main"><label class="pub-record-check"><input type="checkbox" data-pub-pick="${esc(r.key)}" ${checked?'checked':''} aria-label="${esc(titleOrText(r))} se\u00e7" /></label><button class="pub-record-name" data-pub-expand="${esc(r.key)}"><span>${esc(short(titleOrText(r),130))}</span><small>${esc(r.kind||'OTHER')} \u00b7 ${esc(short(r.category||'',80))} ${partial?'\u00b7 bent baz\u0131nda':''}</small></button><button type="button" class="btn small pub-expand" data-pub-expand="${esc(r.key)}" aria-label="Alt gereklilikleri ${expanded?'gizle':'g\u00f6ster'}">${expanded?'\u2212':'+'}</button></div>${expanded?renderClauses(r,checked):''}</div>`;}
function renderClauses(rec,pick){const listed=engine.publicationOutline(rec.blocks||[]).filter(r=>r.type==='clause'),partial=pick?.mode==='partial';
 if(!listed.length)return '<div class="pub-clause-list"><p>Bu kay\u0131tta numaraland\u0131r\u0131lm\u0131\u015f alt gereklilik bulunamad\u0131. Maddenin tamam\u0131n\u0131 se\u00e7ebilirsiniz.</p></div>';
 return `<div class="pub-clause-list"><div class="pub-clause-tools"><span>${listed.length} alt gereklilik</span><button class="btn small" data-pub-full="${esc(rec.key)}">T\u00fcm metni se\u00e7</button>${partial?'<span class="chip teal">K\u0131smi se\u00e7im</span>':''}</div>${listed.slice(0,150).map(b=>`<label class="pub-clause-option" style="padding-left:${Math.min(5,b.level||0)*15+8}px"><input type="checkbox" data-pub-clause="${esc(rec.key)}" data-pub-anchor="${esc(b.anchor)}" ${pick?.mode==='all'||(partial&&pick.anchors.includes(b.anchor))?'checked':''}/><span><b>${esc(b.reference||b.label)}</b> ${esc(short(b.text,175))}</span></label>`).join('')}${listed.length>150?'<div class="pub-clause-limit">\u0130lk 150 alt gereklilik g\u00f6steriliyor. Daha k\u00fc\u00e7\u00fck maddeler i\u00e7in bent bazl\u0131 se\u00e7im kullan\u0131n.</div>':''}</div>`;}
function filtered(){if(!doc)return [];
 const q=norm(s.query);const tokens=q.split(' ').filter(Boolean);
 return doc.records.filter(r=>(s.category==='ALL'||r.category===s.category)&&(s.kind==='ALL'||r.kind===s.kind)&&tokens.every(t=>norm(r.title+' '+r.source+' '+r.plain).includes(t)));
}
function updateItemList(){const element=root.document.getElementById('pubRecordList');if(!element)return;
 const matches=filtered();root.document.getElementById('pubResultTotal').textContent=matches.length.toLocaleString('tr-TR')+' eşleşme';
 element.innerHTML=matches.slice(0,s.limit).map(renderItem).join('')||'<div class="pub-list-empty">Bu filtrede madde bulunamadı.</div>';
 const more=root.document.getElementById('pubMore');if(more){more.hidden=matches.length<=s.limit;more.textContent='Daha fazla göster ('+Math.max(0,matches.length-s.limit)+')';}
 basketRefresh();integrityPanel();updateSummary();}
function updateSummary(){const node=root.document.getElementById('pubSummary');if(!node)return;
 const chosen=[...s.picks.values()],partial=chosen.filter(x=>x.mode==='partial').length,refs=sourceRefs();
 let related=0;if(s.includeRelated)for(const ref of refs){const d=docs.get(ref.versionId);if(!d)continue;
  const selected=chosen.filter(p=>sameSource(p,ref)),keys=new Set(selected.map(p=>p.key)),extras=new Set();
  for(const p of selected){const rec=d.records.find(r=>r.key===p.key);if(rec)for(const r of engine.findRelated(d,rec))if(!keys.has(r.key))extras.add(r.key);}
  related+=extras.size;}
 node.innerHTML=`<strong>${chosen.length} seçili madde · ${refs.length} kaynak</strong><span>${partial?partial+' bent bazlı seçim · ':''}${related?'+'+related+' otomatik ilişkili hüküm':'XML kaynak sürümleri sabit'}</span>`;
 root.document.querySelectorAll('[data-pub-export]').forEach(b=>b.disabled=!chosen.length||s.busy||!!integrityIssues.length);
 statusPanel();}
async function render(){const stamp=++renderStamp,screen=root.document.getElementById('screen'),families=sourceFamilies();
 if(!bridge?.loggedIn()){screen.innerHTML='<div class="pub-initial"><h1>Yayın Oluşturucu</h1><p>Mevzuat derlemek için Google hesabınızla giriş yapın.</p><button type="button" class="btn primary" data-action="signin">Google ile giriş</button></div>';return;}
 await loadSaved();if(!families.length){screen.innerHTML='<div class="pub-initial"><h1>Yayın Oluşturucu</h1><p>Bulutta EASA XML yayını yok. Önce mevzuat kütüphanesine XML yükleyin.</p><button class="btn primary" data-action="go-library">Kütüphaneye dön</button></div>'+savedPanel();return;}
 if(!families.some(f=>f.id===s.familyId))s.familyId=families[0].id;
 const family=families.find(f=>f.id===s.familyId);
 if(!family.releases.some(r=>r.versionId===s.releaseId)){s.releaseId=family.active||family.releases[0].versionId;}
 screen.innerHTML='<div class="loading"><div><div class="spinner"></div>Mevzuat verisi yükleniyor...</div></div>';
 try{doc=docs.get(s.releaseId)||await bridge.loadDoc(s.releaseId);if(!doc||doc.familyId!==s.familyId||doc.versionId!==s.releaseId)throw Error('Kaynak XML kimliği beklenen sürümle eşleşmedi.');docs.set(s.releaseId,doc);}catch(e){screen.innerHTML=`<div class="pub-initial"><h1>Mevzuat verisi okunamadı</h1><p>${esc(e.message)}</p><button class="btn primary" data-action="drive">Drive bağla</button></div>`+savedPanel();return;}
 if(stamp!==renderStamp)return;
 const sections=[...new Set(doc.records.map(x=>x.category||'Genel'))];
 screen.innerHTML=`<div class="pub-builder"><header class="pub-header"><div class="eyebrow">v3.8 / TEMATİK YAYIN OLUŞTURUCU</div><h1>Çoklu Mevzuat Derle & Dışa Aktar</h1><p>Bir yayından madde/bent seçin; diğer mevzuata geçerek seçimlerinizi aynı rapora ekleyin. Her hüküm, kendi kaynak XML sürümüyle korunur.</p></header>${savedPanel()}${sourceControls()}<div id="pubBasket">${sourceBasket()}</div><div id="pubIntegrity"></div><div class="pub-builder-grid"><section class="pub-picker"><div class="pub-section-title">Madde ve alt gereklilik seçimi</div><div class="pub-filter-row"><input class="form-field" id="pubQuery" value="${esc(s.query)}" placeholder="Madde kodu, başlık ya da içerik ara"/><select class="form-field" id="pubCategory"><option value="ALL">Tüm bölümler</option>${sections.map(x=>`<option value="${esc(x)}" ${s.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select class="form-field" id="pubKind">${['ALL','IR','DR','AMC','GM','CS','OTHER'].map(k=>`<option value="${k}" ${s.kind===k?'selected':''}>${k==='ALL'?'Tüm türler':k}</option>`).join('')}</select></div><div class="pub-list-toolbar"><span id="pubResultTotal"></span><div><button class="btn small" data-pub-select-visible="1">Görünenleri seç</button><button class="btn small" data-pub-clear="1">Tüm seçimi temizle</button></div></div><div id="pubRecordList" class="pub-record-list"></div><button class="btn pub-more" id="pubMore" data-pub-more="1" hidden>Daha fazla göster</button></section>${optionsPanel()}</div><div class="info-strip">Mevzuat içerikleri çıktı hazırlanırken tarayıcıda işlenir. Firebase'de yalnızca seçimler ve sabitlenmiş kaynak sürüm kimlikleri tutulur. Notlar rapora isteğe bağlı eklenir; resmî hüküm gibi sunulmaz.</div></div>`;
 updateItemList();}
function options(){return {title:s.title,subtitle:s.subtitle,includeRelated:s.includeRelated,includeNotes:s.includeNotes,
 includeClauseNotes:s.includeClauseNotes,extraNotePages:s.extraNotePages,kindleMode:s.kindleMode,includeMetadata:true};}
function model(){if(!s.picks.size)throw Error('Seçili mevzuat maddesi yok.');const issues=getIntegrity();if(issues.length)throw Error('Kaynak/madde/bent eşleşmesi hatalı. Önce derleme uyarısını giderin.');
 const groups=sourceRefs().map(ref=>({doc:docs.get(ref.versionId),picks:[...s.picks.values()].filter(p=>sameSource(p,ref)).map(p=>({key:p.key,mode:p.mode,anchors:p.anchors}))}));
 return engine.prepareMulti({sources:groups,annotations:bridge.annotations(),options:options()});}
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
function onClick(e){if(!bridge||bridge.currentView()!=='publish')return;const target=e.target.closest('button');if(!target)return;
 const call=fn=>{try{fn();}catch(e){bridge.error(e);}};
 if(target.dataset.pubRefreshSaved!==undefined){loadSaved(true).then(()=>refreshSavedUi()).catch(bridge.error);return;}
 if(target.dataset.pubNew!==undefined){if(!allowDiscard())return;resetWork();render().catch(bridge.error);return;}
 if(target.dataset.pubOpenSaved!==undefined){openSaved(target.dataset.pubOpenSaved).catch(bridge.error);return;}
 if(target.dataset.pubCopySaved!==undefined){copySaved(target.dataset.pubCopySaved).catch(bridge.error);return;}
 if(target.dataset.pubDeleteSaved!==undefined){deleteSaved(target.dataset.pubDeleteSaved).catch(bridge.error);return;}
 if(target.dataset.pubSave!==undefined){saveWork(false).catch(bridge.error);return;}
 if(target.dataset.pubSaveCopy!==undefined){saveWork(true).catch(bridge.error);return;}
 if(target.dataset.pubDropMissing!==undefined){dropMissing();return;}
 if(target.dataset.pubSourceRemove!==undefined){call(()=>{const [familyId,versionId]=JSON.parse(target.dataset.pubSourceRemove);
  if(!root.confirm('Bu kaynağın bütün madde seçimleri derlemeden çıkarılsın mı?'))return;
  for(const [id,p] of s.picks)if(p.familyId===familyId&&p.versionId===versionId)s.picks.delete(id);
  s.sourceOrder=s.sourceOrder.filter(p=>!(p.familyId===familyId&&p.versionId===versionId));updateItemList();});return;}
 if(target.dataset.pubSourceOpen!==undefined){call(()=>{const [familyId,versionId]=JSON.parse(target.dataset.pubSourceOpen);
  s.familyId=familyId;s.releaseId=versionId;s.category='ALL';s.kind='ALL';s.query='';s.limit=100;render().catch(bridge.error);});return;}
 if(target.dataset.pubSourceUp!==undefined||target.dataset.pubSourceDown!==undefined){call(()=>{const [familyId,versionId]=JSON.parse(target.dataset.pubSourceUp??target.dataset.pubSourceDown);
  const refs=sourceRefs().map(({familyId,versionId})=>({familyId,versionId}));const i=refs.findIndex(x=>x.familyId===familyId&&x.versionId===versionId);
  const j=i+(target.dataset.pubSourceUp!==undefined?-1:1);if(i<0||j<0||j>=refs.length)return;
  [refs[i],refs[j]]=[refs[j],refs[i]];s.sourceOrder=refs;updateItemList();});return;}
 if(target.dataset.pubClearCurrent!==undefined){const curr=currentPicks();if(!curr.length)return;
  if(!root.confirm('Görüntülenen mevzuatın '+curr.length+' seçimini çıkaralım mı?'))return;
  for(const pick of curr)s.picks.delete(pickId(pick.familyId,pick.versionId,pick.key));updateItemList();return;}
 if(target.dataset.pubExpand!==undefined){s.expanded=s.expanded===target.dataset.pubExpand?'':target.dataset.pubExpand;updateItemList();return;}
 if(target.dataset.pubFull!==undefined){call(()=>{addRecord(target.dataset.pubFull);updateItemList();});return;}
 if(target.dataset.pubClear!==undefined){if(s.picks.size&&!root.confirm('Bütün mevzuatlardaki seçimler silinsin mi?'))return;s.picks.clear();s.sourceOrder=[];updateItemList();return;}
 if(target.dataset.pubSelectVisible!==undefined){call(()=>{const matches=filtered().slice(0,s.limit),add=matches.filter(r=>!pickFor(r.key));
  if(s.picks.size+add.length>350)throw Error('En fazla 350 madde seçilebilir. Daha dar filtre uygulayın.');
  for(const r of add)addRecord(r.key);updateItemList();});return;}
 if(target.dataset.pubMore!==undefined){s.limit+=100;updateItemList();return;}
 if(target.dataset.pubExport!==undefined)exportAs(target.dataset.pubExport).catch(bridge.error);
}
function onChange(e){if(!bridge||bridge.currentView()!=='publish')return;const v=e.target.value;
 if(e.target.id==='pubFamily'){s.familyId=v;s.releaseId=sourceFamilies().find(f=>f.id===v)?.active||sourceFamilies().find(f=>f.id===v)?.releases?.[0]?.versionId||'';
  s.expanded='';s.category='ALL';s.kind='ALL';s.query='';s.limit=100;render().catch(bridge.error);return;}
 if(e.target.id==='pubRelease'){s.releaseId=v;s.expanded='';s.category='ALL';s.kind='ALL';s.query='';s.limit=100;render().catch(bridge.error);return;}
 if(e.target.id==='pubSaveType'){s.saveType=v==='template'?'template':'draft';statusPanel();return;}
 if(e.target.id==='pubCategory'){s.category=v;s.limit=100;updateItemList();return;}
 if(e.target.id==='pubKind'){s.kind=v;s.limit=100;updateItemList();return;}
 if(e.target.dataset.pubPick!==undefined){const key=e.target.dataset.pubPick;
  try{if(e.target.checked)addRecord(key);else s.picks.delete(pickId(s.familyId,s.releaseId,key));updateItemList();}
  catch(err){e.target.checked=false;bridge.error(err);}return;}
 if(e.target.dataset.pubClause!==undefined){const key=e.target.dataset.pubClause,anchor=e.target.dataset.pubAnchor;
  const listed=engine.publicationOutline(doc.records.find(r=>r.key===key)?.blocks||[]).filter(b=>b.type==='clause');
  const cur=pickFor(key);let anchors=cur?.mode==='partial'?[...cur.anchors]:(cur?.mode==='all'?listed.map(b=>b.anchor):[]);
  const base=listed.find(b=>b.anchor===anchor);
  const affected=listed.filter(b=>b.anchor===anchor||(base?.isNumberRoot&&b.parentNumber===anchor)||(!base?.isNumberRoot&&b.anchor.startsWith(anchor+'/'))).map(b=>b.anchor);
  if(e.target.checked){for(const a of affected)if(!anchors.includes(a))anchors.push(a);}else anchors=anchors.filter(a=>!affected.includes(a));
  try{if(anchors.length)addRecord(key,anchors);else s.picks.delete(pickId(s.familyId,s.releaseId,key));updateItemList();}
  catch(err){e.target.checked=false;bridge.error(err);}return;}
 const id=e.target.id;
 if(id==='pubRelated')s.includeRelated=e.target.checked;
 if(id==='pubNotes')s.includeNotes=e.target.checked;
 if(id==='pubClauseNotes')s.includeClauseNotes=e.target.checked;
 if(id==='pubExtra')s.extraNotePages=Number(v);
 if(id==='pubKindle')s.kindleMode=v;
 updateSummary();}
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
