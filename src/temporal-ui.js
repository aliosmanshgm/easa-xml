/* Havacilik Mevzuati Hub 3.11.2 - provision-level entry into force / transition / repeal register UI.
 * This module cannot alter imported legal text, note IDs, or crosswalks.
 */
(function(root){
'use strict';
const T=root.EasaTemporal;
let api=null,records=[],loaded=false,loadError='',busy=false,editor=null,activeDoc=null,suggestions=[],searchText='',selectedVersion='',selection=null;
const filters={family:'ALL',type:'ALL',status:'ALL',window:'all'};
const H='temporal';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const desc=(s,n=100)=>String(s||'').length>n?String(s).slice(0,n-1)+'…':String(s||'');
const date=s=>s&&T.validDate(s)?new Date(s+'T12:00:00Z').toLocaleDateString('tr-TR'):'—';
const options=(dict,value)=>Object.entries(dict).map(([id,label])=>`<option value="${e(id)}" ${id===value?'selected':''}>${e(label)}</option>`).join('');
const el=id=>document.getElementById(id);
const isCurrent=()=>api?.currentView()===H;
const families=()=>api?.families()||[];
const allReleases=()=>families().flatMap(f=>f.releases.map(r=>({...r,displayTitle:f.title})));
const findRelease=id=>allReleases().find(r=>r.versionId===id);
const typename=t=>T.TYPES[t]||t;
const newId=()=> 'tim_'+(root.crypto?.randomUUID?root.crypto.randomUUID().replace(/-/g,''):(Math.random().toString(36).slice(2)+Date.now().toString(36)+Math.random().toString(36).slice(2)));
function configure(opts){api=opts;}
function choose(familyId,versionId,recordKey='',anchor=''){
 selection={familyId,versionId,recordKey,anchor};selectedVersion=versionId;
 filters.family=familyId||'ALL';
}
function reset(){records=[];loaded=false;loadError='';busy=false;editor=null;activeDoc=null;suggestions=[];searchText='';selection=null;selectedVersion='';filters.family='ALL';filters.type='ALL';filters.status='ALL';filters.window='all';}
async function refresh(){if(!api?.loggedIn()){records=[];loaded=true;return;}records=await api.listEvents();loaded=true;loadError='';}
function filtered(){const today=T.todayLocal();return records.filter(x=>{
 if(filters.family!=='ALL'&&x.familyId!==filters.family)return false;
 if(filters.type!=='ALL'&&x.type!==filters.type)return false;
 if(filters.status!=='ALL'&&x.status!==filters.status)return false;
 const st=T.status(x,today);
 if(filters.window==='future'&&!(x.status==='confirmed'&&x.date&&x.date>=today))return false;
 if(filters.window==='soon'&&st.code!=='soon'&&st.code!=='today')return false;
 if(filters.window==='past'&&st.code!=='past')return false;
 if(filters.window==='unscheduled'&&!!x.date)return false;
 return true;
 }).sort((a,b)=>{
  const av=a.date||'9999-99-99',bv=b.date||'9999-99-99';
  return av.localeCompare(bv)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
 });}
function statusClass(c){return {draft:'tp-draft',soon:'tp-soon',today:'tp-soon',past:'tp-past',future:'tp-future',unknown:'tp-unknown'}[c]||'tp-unknown';}
function renderRows(){const target=el('tpRows');if(!target)return;const found=filtered();const familyMap=new Map(families().map(x=>[x.id,x.title]));
 target.innerHTML=found.length?found.map(x=>{
  const st=T.status(x),pub=familyMap.get(x.familyId)||x.familyId,src=x.recordKey?x.reference:'Genel mevzuat kaydı';
  return `<article class="tp-row"><div class="tp-row-top"><span class="tp-type">${e(typename(x.type))}</span><span class="tp-state ${statusClass(st.code)}">${e(st.label)}</span><span class="tp-flag">${x.status==='confirmed'?'Kaynak kontrol edildi':'Doğrulama bekliyor'}</span></div>
  <div class="tp-row-body"><div class="tp-row-date">${e(date(x.date))}${x.date?'':`<span>Tarih belirtilmedi</span>`}</div><div class="tp-row-main"><b>${e(desc(pub,105))}</b><small>${e(date(findRelease(x.versionId)?.published))} tarihli XML sürümü · ${e(T.SCOPES[x.scope])}</small><div class="tp-rule-ref">${e(desc(src,170))}${x.anchor?` · Alt gereklilik: ${e(x.anchor)}`:''}${x.targetDescription?` · ${e(desc(x.targetDescription,140))}`:''}</div>${x.expression?`<p>${e(desc(x.expression,200))}</p>`:''}</div></div>
  <div class="tp-row-actions"><button type="button" class="btn small" data-temporal="edit" data-id="${e(x.id)}">Düzenle</button><button type="button" class="btn small" data-temporal="duplicate" data-id="${e(x.id)}">Kopyala</button><button type="button" class="btn small danger" data-temporal="delete" data-id="${e(x.id)}">Sil</button></div></article>`;
 }).join(''):'<div class="tp-empty">Bu filtrelerle eşleşen kayıt bulunamadı. “Yeni tarih / geçiş kaydı” ile hüküm bazında kayıt oluşturabilirsiniz.</div>';
 const count=el('tpResultCount');if(count)count.textContent=found.length+' kayıt gösteriliyor';
}
function renderSummary(){const target=el('tpSummary');if(!target)return;const arr=records,confirmed=arr.filter(x=>x.status==='confirmed'),today=new Date().toISOString().slice(0,10),soon=confirmed.filter(x=>['soon','today'].includes(T.status(x,today).code));
 const cards=[['Toplam olay kaydı',arr.length,'Yürürlük, geçiş ve diğer olaylar'],['Doğrulama bekleyen',arr.filter(x=>x.status==='draft').length,'Kaynak metni kontrol edilecek'],['60 gün içindeki tarihler',soon.length,'Sadece doğrulanmış kayıtlar'],['Yürürlükten kaldırma',arr.filter(x=>x.type==='repeal').length,'Hüküm veya düzenleme kapsamında']];
 target.innerHTML=cards.map(([a,n,b])=>`<div class="tp-stat"><small>${e(a)}</small><strong>${n}</strong><span>${e(b)}</span></div>`).join('');}
function renderFilters(){const f=el('tpFilters');if(!f)return;
 f.innerHTML=`<label>Mevzuat<select class="form-field" data-tp-filter="family"><option value="ALL">Tüm mevzuatlar</option>${families().map(x=>`<option value="${e(x.id)}" ${filters.family===x.id?'selected':''}>${e(desc(x.title,65))}</option>`).join('')}</select></label>
 <label>Olay<select class="form-field" data-tp-filter="type"><option value="ALL">Tüm olaylar</option>${options(T.TYPES,filters.type)}</select></label>
 <label>Doğrulama<select class="form-field" data-tp-filter="status"><option value="ALL">Tümü</option><option value="draft" ${filters.status==='draft'?'selected':''}>Taslak</option><option value="confirmed" ${filters.status==='confirmed'?'selected':''}>Kaynak doğrulandı</option></select></label>
 <label>Tarih<select class="form-field" data-tp-filter="window"><option value="all">Tüm tarihler</option><option value="future" ${filters.window==='future'?'selected':''}>İleri tarihli</option><option value="soon" ${filters.window==='soon'?'selected':''}>60 gün içinde</option><option value="past" ${filters.window==='past'?'selected':''}>Tarihi geçmiş</option><option value="unscheduled" ${filters.window==='unscheduled'?'selected':''}>Tarihi belirsiz</option></select></label>`;}
async function render(){if(!api)return;
 if(!api.loggedIn()){
  el('screen').innerHTML='<div class="page-head"><div><div class="eyebrow">MEVZUAT TAKVİMİ</div><h1 class="page-title">Yürürlük ve Geçiş Takibi</h1><p class="lead">Kayıtlara erişmek için Google hesabınızla giriş yapın.</p></div></div><div class="tp-empty">Bu ekranda mevzuat metni değil, size özel tarih ve hukukî durum takip kayıtları Firestore’da saklanır.</div>';
  return;
 }
 el('screen').innerHTML=`<div class="page-head"><div><div class="eyebrow">TR + AB / EASA · HÜKÜM BAZLI TAKİP</div><h1 class="page-title">Yürürlük ve Geçiş Takibi</h1><p class="lead">Genel yürürlük, kademeli uygulama, geçiş süreleri ve yürürlükten kaldırılan hükümleri kaynak ve sürüm bazında izleyin.</p></div><div class="page-actions"><button type="button" class="btn small" data-temporal="reload">Buluttan yenile</button><button type="button" class="btn small" data-temporal="export">CSV indir</button><button type="button" class="btn primary" data-temporal="new">+ Yeni tarih / geçiş kaydı</button></div></div>
  <section class="tp-info">Olay tarihi ile bir hükmün güncel hukukî statüsü aynı şey değildir. Renkler yalnızca <b>kullanıcı tarafından doğrulanmış takvim kayıtlarının</b> tarihini gösterir. Otomatik öneriler kayıt edilmeden önce kaynak metinle kontrol edilmelidir.</section>
  <div id="tpSummary" class="tp-summary"></div><div class="tp-panel"><div class="tp-title-row"><h2>Mevzuat olay kayıtları</h2><span id="tpResultCount" class="muted"></span></div><div id="tpFilters" class="tp-filters"></div><div id="tpRows" class="tp-rows"></div></div>
  <section class="tp-panel tp-candidates"><div class="tp-title-row"><div><h2>Kaynak metinden tarih önerileri</h2><p>İlgili XML’deki açık tarihleri ve SHY-OLAY benzeri geçiş sürelerini tarar. Öneriler kendiliğinden kaydedilmez.</p></div></div><div class="tp-candidate-tools"><label>Yayın sürümü<select class="form-field" id="tpSourceRelease">${allReleases().map(r=>`<option value="${e(r.versionId)}" ${r.versionId===(selectedVersion||allReleases()[0]?.versionId)?'selected':''}>${e(desc(r.displayTitle,65))} · ${e(date(r.published))}</option>`).join('')}</select></label><button class="btn small" data-temporal="suggest">Kaynağı tara</button></div><div id="tpSuggestions"><p class="muted">Bir mevzuat sürümü seçerek önerileri inceleyin. Genel tarih önerisinin tüm maddeler için geçerli olduğunu otomatik varsaymayın.</p></div></section>`;
 renderSummary();renderFilters();renderRows();
 if(!loaded){try{await refresh();}catch(err){loadError=err.message;api.error(err);}if(isCurrent()){renderSummary();renderRows();}}
 if(selection){const s=selection;selection=null;await openEditor(null,s);}
}
async function getDoc(versionId){if(activeDoc?.versionId===versionId)return activeDoc;const d=await api.loadDoc(versionId);if(!d?.records)throw Error('Mevzuat XML sürümü okunamadı; Drive bağlantısını yenileyin.');activeDoc=d;return d;}
const blank=({familyId='',versionId='',recordKey='',anchor=''}={})=>({id:newId(),familyId,versionId,recordKey,anchor,scope:recordKey?'provision':'release',type:'transition',date:'',basis:'fixed',baseDate:'',period:0,unit:'month',reference:'',sourceExcerpt:'',expression:'',status:'draft',note:'',targetDescription:'',legalChangeRef:'',revision:0});
async function openEditor(event=null,preselect=null){if(!api.loggedIn())throw Error('Kayıt oluşturmak için giriş gerekli.');const seed=event?{...event}:(preselect?.seed?{...blank(preselect),...preselect.seed}:blank(preselect||{}));
 if(!seed.id)seed.id=newId();
 if(!seed.versionId){const first=allReleases()[0];if(!first)throw Error('Önce bir mevzuat yayınını kütüphaneye yükleyin.');seed.versionId=first.versionId;seed.familyId=first.familyId;}
 const rel=findRelease(seed.versionId);if(!rel)throw Error('Kaydın mevzuat sürümü artık katalogda bulunmuyor.');
 seed.familyId=rel.familyId;
 const sourceDoc=await getDoc(seed.versionId);
 if(!event&&seed.recordKey&&!seed.reference){const sourceRule=sourceDoc.records.find(r=>r.key===seed.recordKey);if(sourceRule){seed.reference=T.title(sourceRule);seed.sourceExcerpt=T.plain(sourceRule).slice(0,1300);}}
 editor={item:seed,existing:!!event,versionId:seed.versionId,search:'',loading:false};
 paintEditor();}
function paintEditor(){const ed=editor;if(!ed)return;const x=ed.item;const modal=el('modalLayer'),body=el('modalBody');if(!modal||!body)return;
 const releaseOpts=allReleases().map(r=>`<option value="${e(r.versionId)}" ${r.versionId===x.versionId?'selected':''}>${e(desc(r.displayTitle,73))} (${e(date(r.published))})</option>`).join('');
 const selected=activeDoc?.records.find(r=>r.key===x.recordKey),meta=findRelease(x.versionId);
 body.innerHTML=`<div class="tp-editor"><h2>🗓 ${ed.existing?'Tarih / geçiş kaydını düzenle':'Yeni yürürlük ve geçiş kaydı'}</h2><p>Her kayıt belirli bir XML sürümüne sabitlenir. Kaynak mevzuat metni ve notlar değişmez.</p>
  <form id="tpEditorForm" class="tp-form" autocomplete="off"><label>Mevzuat sürümü<select name="versionId" class="form-field" ${ed.existing?'disabled':''}>${releaseOpts}</select></label>
   <label>Olay türü<select name="type" class="form-field">${options(T.TYPES,x.type)}</select></label>
   <label>Kapsam<select name="scope" class="form-field">${options(T.SCOPES,x.scope)}</select></label>
   <label>Doğrulama<select name="status" class="form-field"><option value="draft" ${x.status==='draft'?'selected':''}>Taslak / incelemede</option><option value="confirmed" ${x.status==='confirmed'?'selected':''}>Kaynak kontrol edildi</option></select></label>
   <div class="tp-wide tp-provision" ${x.scope!=='provision'?'hidden':''}><label>Madde / hüküm ara<input id="tpRecordSearch" class="form-field" placeholder="Örn. MADDE 4, ARO.GEN.305, Article 4" value="${e(ed.search)}"></label><label>Kaynak hüküm<select id="tpRecordKey" name="recordKey" class="form-field"></select></label><label>Alt gereklilik (isteğe bağlı)<select name="anchor" id="tpAnchor" class="form-field"><option value="">Tüm madde</option></select></label></div>
   <label>Tarih temeli<select name="basis" class="form-field">${options(T.DATE_BASIS,x.basis)}</select></label><label>Kesin/hesaplanmış tarih<input type="date" name="date" class="form-field" value="${e(x.date||'')}"></label>
   <label>Hesaplama başlangıcı<input type="date" name="baseDate" class="form-field" value="${e(x.baseDate||'')}"></label><label>Göreli süre<div class="tp-period"><input type="number" min="0" max="3650" name="period" class="form-field" value="${e(x.period||0)}"><select name="unit" class="form-field">${options(T.UNITS,x.unit||'month')}</select></div></label>
   <div class="tp-wide tp-calculation">${x.basis==='conditional'?'Tarih koşula bağlıysa boş bırakılabilir.':'Göreli süre yalnızca başlangıç tarihi açık ve doğrulanmışsa hesaplanmalıdır.'}<button type="button" class="btn small" data-temporal="calculate">Hesaplanan tarihi al</button></div>
   <label class="tp-wide">Kademeli uygulamanın kapsadığı hükümler (grup seçildiyse zorunlu)<textarea name="targetDescription" maxlength="800" class="form-field" rows="2" placeholder="Örn. MADDE 7/(1), MADDE 9, EK-2 hükümleri">${e(x.targetDescription||'')}</textarea></label>
   <label class="tp-wide">Yürürlükten kaldıran / değiştiren düzenleme (varsa)<input name="legalChangeRef" maxlength="320" class="form-field" value="${e(x.legalChangeRef||'')}" placeholder="Örn. 2027 tarihli ve ... sayılı Yönetmelik, MADDE 12"></label>
   <label class="tp-wide">Kaynak madde / atıf<input name="reference" maxlength="320" required class="form-field" value="${e(x.reference||'')}" placeholder="Örn. SHY-OLAY GEÇİCİ MADDE 1 / Article 4(3)"></label>
   <label class="tp-wide">Kaynak hükümden kısa alıntı<textarea name="sourceExcerpt" class="form-field" maxlength="1600" rows="3" placeholder="Öneri ile gelir veya resmî metinden eklenir">${e(x.sourceExcerpt||'')}</textarea></label>
   <label class="tp-wide">Hükümdeki tarih / koşul ifadesi<input name="expression" maxlength="450" class="form-field" value="${e(x.expression||'')}" placeholder="Örn. yürürlüğe girdiği tarihten itibaren on sekiz ay içinde"></label>
   <label class="tp-wide">Değerlendirme ve takip notu<textarea name="note" maxlength="2500" class="form-field" rows="3" placeholder="Kapsam, istisna, revizyon ve resmî kaynak kontrolü">${e(x.note||'')}</textarea></label>
   <label class="tp-wide tp-review-check"><input type="checkbox" id="tpReviewed"> <span>Kaynak hükmü, kapsamı ve tarihi kontrol ettim. Durumu “Kaynak kontrol edildi” olarak kaydedersem sorumluluğu alıyorum.</span></label>
  </form><div class="tp-editor-info">Kayıt yalnızca Firestore hesabınızın özel <code>temporalEvents</code> koleksiyonunda tutulur. Tarihler mevzuat metnini kendiliğinden değiştirmez.</div>
  <div class="modal-actions"><button type="button" class="btn" data-temporal="cancel">Vazgeç</button><button type="button" class="btn primary" data-temporal="save" ${busy?'disabled':''}>${busy?'Kaydediliyor…':'Kaydet'}</button></div></div>`;
 modal.hidden=false; // modal is controlled by this module, not by app's modal helper.
 paintRecordOptions();
}
function paintRecordOptions(){if(!editor||!activeDoc)return;const sel=el('tpRecordKey');if(!sel)return;
 const q=editor.search.toLocaleLowerCase('tr-TR').trim(),rec=activeDoc.records;
 let matches=q?rec.filter(r=>(T.title(r)+' '+r.key).toLocaleLowerCase('tr-TR').includes(q)):rec.slice(0,100);
 if(editor.item.recordKey&&!matches.some(r=>r.key===editor.item.recordKey)){const item=rec.find(r=>r.key===editor.item.recordKey);if(item)matches=[item,...matches];}
 matches=matches.slice(0,120);
 sel.innerHTML=`<option value="">Hüküm seçin</option>`+matches.map(r=>`<option value="${e(r.key)}" ${r.key===editor.item.recordKey?'selected':''}>${e(desc(T.title(r),105))}</option>`).join('');
 paintAnchorOptions();
}
function paintAnchorOptions(){if(!editor||!activeDoc)return;const sel=el('tpAnchor');if(!sel)return;const r=activeDoc.records.find(v=>v.key===editor.item.recordKey);const parts=r&&root.EasaClauses?.outline?root.EasaClauses.outline(r.blocks||[]).filter(n=>n.type==='clause'):[];
 sel.innerHTML='<option value="">Madde geneli</option>'+parts.map(n=>`<option value="${e(n.anchor)}" ${n.anchor===editor.item.anchor?'selected':''}>${e((n.label||n.anchor)+' — '+desc(n.text||'',80))}</option>`).join('');}
function readForm(){if(!editor)return;const form=el('tpEditorForm');if(!form)return;
 const x=editor.item,data=Object.fromEntries(new FormData(form));
 Object.assign(x,{...data,period:Number(data.period||0)});
 if(editor.existing)x.versionId=editor.versionId;
 x.familyId=findRelease(x.versionId)?.familyId||'';
 if(x.scope==='release'||x.scope==='group'){x.recordKey='';x.anchor='';}
 if(x.scope==='provision'&&!x.recordKey)x.anchor='';
}
async function setVersion(next){readForm();const rel=findRelease(next);if(!rel)throw Error('Sürüm bulunamadı.');editor.item.versionId=next;editor.item.familyId=rel.familyId;editor.item.recordKey='';editor.item.anchor='';editor.search='';await getDoc(next);paintEditor();}
function updateEditorField(name,value){if(!editor)return;readForm();editor.item[name]=value;if(name==='scope'&&value!=='provision'){editor.item.recordKey='';editor.item.anchor='';}paintEditor();}
async function save(){if(!editor||busy)return;readForm();const item=editor.item;
 if(item.status==='confirmed'&&!el('tpReviewed')?.checked)throw Error('Kaynak ve tarih kontrolünü onaylayın veya kaydı taslak olarak saklayın.');
 if(item.scope==='provision'){const doc=await getDoc(item.versionId);const r=doc.records.find(r=>r.key===item.recordKey);if(!r)throw Error('Seçilen hüküm bu XML sürümünde bulunamadı.');if(item.anchor){const anchors=root.EasaClauses?.outline?.(r.blocks||[]).filter(n=>n.type==='clause').map(n=>n.anchor)||[];if(!anchors.includes(item.anchor))throw Error('Seçilen alt gereklilik bu sürümde bulunamadı.');}}
 T.validate(item);busy=true;try{
  const saved=await api.saveEvent(item,Number(item.revision)||0);
  const old=records.findIndex(x=>x.id===saved.id);
  if(old<0)records.push(saved);else records[old]=saved;
  closeEditor();api.toast('Yürürlük / geçiş kaydı Firebase\'e kaydedildi. Kaynak XML ve notlar değişmedi.');if(isCurrent()){renderSummary();renderRows();}
 }finally{busy=false;}
}
function closeEditor(){editor=null;el('modalLayer').hidden=true;el('modalBody').innerHTML='';}
async function remove(id){const row=records.find(x=>x.id===id);if(!row)return;
 if(!confirm('Bu tarih/geçiş takip kaydı silinsin mi? Mevzuat XML\'i ve notlar etkilenmez.'))return;
 await api.deleteEvent(id,row.revision);records=records.filter(x=>x.id!==id);renderSummary();renderRows();api.toast('Takip kaydı silindi.');}
async function scan(){const select=el('tpSourceRelease'),box=el('tpSuggestions');if(!box)return;const id=select?.value;if(!id){box.textContent='Önce bir mevzuat yükleyin.';return;}
 selectedVersion=id;box.textContent='Kaynak XML inceleniyor…';try{
  const doc=await getDoc(id);const meta=findRelease(id);suggestions=T.suggest(doc,'',meta?.legalDates||null);
  const existing=new Set(records.filter(x=>x.versionId===id).map(x=>[x.type,x.recordKey,x.date,x.reference].join('|')));
  const newItems=suggestions.filter(x=>!existing.has([x.type,x.recordKey,x.date,x.reference].join('|')));
  box.innerHTML=newItems.length?newItems.map((s,i)=>`<div class="tp-suggestion"><div><b>${e(typename(s.type))}</b> · ${s.date?e(date(s.date)):'Tarih belirsiz'}<p>${e(desc(s.reference,120))}</p><small>${e(desc(s.expression||s.sourceExcerpt||'Kaynak kayıt incelemesi gerekli',220))}</small></div><button type="button" class="btn small" data-temporal="use-suggestion" data-suggest-index="${suggestions.indexOf(s)}">Taslak aç</button></div>`).join(''):'<div class="tp-empty">Yeni bir otomatik tarih önerisi bulunmadı. Kademeli, koşullu ve mülga hükümler için manuel kayıt oluşturabilirsiniz. Bu, hüküm bulunmadığı anlamına gelmez.</div>';
 }catch(err){box.innerHTML='<div class="tp-empty">Kaynak sürümü okunamadı. Drive bağlantısını kontrol edin.</div>';api.error(err);}
}
function reportError(err){
  if(editor&&el('modalLayer')&&!el('modalLayer').hidden){
    let node=el('tpInlineError');
    if(!node){node=document.createElement('div');node.id='tpInlineError';node.className='tp-inline-error';
      const actions=el('modalBody')?.querySelector('.modal-actions');if(actions)actions.before(node);}
    if(node){node.textContent=err?.message||String(err);node.scrollIntoView({block:'nearest'});return;}
  }
  api?.error(err);
}
async function handleClick(evt){const b=evt.target.closest('button[data-temporal]');if(!b||!api)return;evt.preventDefault();evt.stopPropagation();const act=b.dataset.temporal;
 try{
  if(act==='reload'){await refresh();if(isCurrent()){renderSummary();renderRows();}api.toast('Takvim kayıtları güncellendi.');}
  if(act==='export'){const text=T.toCSV(filtered().map(x=>({...x,publication:findRelease(x.versionId)?.displayTitle||''})));api.saveFile('Mevzuat_Yururluk_Gecis_Takibi_'+new Date().toISOString().slice(0,10)+'.csv',text,'text/csv;charset=utf-8');}
  if(act==='new'){await openEditor(null,selection||{versionId:selectedVersion});}
  if(act==='edit'){await openEditor(records.find(x=>x.id===b.dataset.id));}
  if(act==='duplicate'){const row=records.find(x=>x.id===b.dataset.id);if(row)await openEditor(null,{versionId:row.versionId,seed:{...row,id:newId(),revision:0,status:'draft',createdAt:'',updatedAt:'',note:(row.note||'')+' (kopya; yeniden doğrulayın)'}});}
  if(act==='delete')await remove(b.dataset.id);
  if(act==='suggest')await scan();
  if(act==='use-suggestion'){const row=suggestions[Number(b.dataset.suggestIndex)];if(row)await openEditor(null,{versionId:row.versionId,seed:row});}
  if(act==='calculate'){readForm();const x=editor?.item;if(!x)return;if(x.basis==='conditional')throw Error('Koşula bağlı kaydın kesin tarihi hesaplanamaz.');const base=x.baseDate||(x.basis==='publication'?findRelease(x.versionId)?.published:'');if(!base)throw Error('Başlangıç tarihini doğrulayarak girin.');const calculated=T.addPeriod(base,x.period,x.unit);if(!calculated)throw Error('Başlangıç tarihi veya süre geçersiz.');x.date=calculated;x.baseDate=base;paintEditor();}
  if(act==='save')await save();
  if(act==='cancel')closeEditor();
 }catch(err){reportError(err);}
}
async function handleChange(evt){const t=evt.target;if(!api)return;
 try{
  if(t.matches('[data-tp-filter]')){filters[t.dataset.tpFilter]=t.value;renderRows();return;}
  if(!editor||!t.closest('#tpEditorForm'))return;
  if(t.name==='versionId'){await setVersion(t.value);return;}
  if(t.name==='scope'||t.name==='basis'){updateEditorField(t.name,t.value);return;}
  if(t.name==='recordKey'){editor.item.recordKey=t.value;editor.item.anchor='';paintAnchorOptions();const r=activeDoc?.records.find(r=>r.key===t.value);if(r){const ref=el('tpEditorForm')?.elements.namedItem('reference'),src=el('tpEditorForm')?.elements.namedItem('sourceExcerpt');if(ref&&!ref.value.trim())ref.value=T.title(r);if(src&&!src.value.trim())src.value=T.plain(r).slice(0,1300);}return;}
  if(t.name==='anchor'){editor.item.anchor=t.value;return;}
 }catch(err){reportError(err);}
}
function handleInput(evt){if(!editor||evt.target.id!=='tpRecordSearch')return;editor.search=evt.target.value;paintRecordOptions();}
// Own only elements explicitly tagged with data-temporal; never intercept main-app buttons.
document.addEventListener('click',e=>{if(e.target.closest('[data-temporal]'))handleClick(e);},true);
document.addEventListener('change',e=>{if(e.target.matches('[data-tp-filter]')||e.target.closest('#tpEditorForm'))handleChange(e);});
document.addEventListener('input',handleInput);
root.EasaTemporalUI={configure,render,reset,refresh,choose,getRecords:()=>records,_test:{filtered}};
})(window);
