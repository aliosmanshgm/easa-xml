/* EASA eRules Hub v3.6 - publication builder UI (no Firestore schema changes). */
(function(root){
'use strict';
const engine=root.EasaPublication;
const clauses=root.EasaClauses;
const s={familyId:'',releaseId:'',picks:new Map(),query:'',category:'ALL',kind:'ALL',limit:100,
 expanded:'',title:'',subtitle:'',includeRelated:true,includeNotes:true,includeClauseNotes:true,
 extraNotePages:0,kindleMode:'notes',busy:false};
let bridge=null,doc=null,renderStamp=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const short=(v,n=120)=>String(v||'').length>n?String(v).slice(0,n-1)+'\u2026':String(v||'');
const noteCount=()=>s.picks.size;
const addRecord=(key,anchors)=>{s.picks.set(key,anchors?.length?{key,mode:'partial',anchors:[...anchors]}:{key,mode:'all'});};
function configure(api){bridge=api;root.document.addEventListener('click',onClick);root.document.addEventListener('change',onChange);root.document.addEventListener('input',onInput);}
function titleOrText(r){return r.title||short(r.plain?.split('\n')?.[0]||r.key);}
function sourceFamilies(){return bridge?.families()||[];}
function hasPublication(){return !!(bridge?.loggedIn()&&sourceFamilies().length);}
function reset(){s.familyId='';s.releaseId='';s.picks.clear();s.query='';s.title='';s.subtitle='';s.expanded='';doc=null;}
function choose(familyId,releaseId,key){if(s.familyId!==familyId||s.releaseId!==releaseId){s.picks.clear();s.title='';s.subtitle='';s.category='ALL';s.kind='ALL';s.query='';s.limit=100;}s.familyId=familyId;s.releaseId=releaseId;if(key)addRecord(key);}
function sourceControls(){const fam=sourceFamilies(),f=fam.find(x=>x.id===s.familyId),rels=f?.releases||[];
 return `<div class="pub-source-controls"><label>Mevzuat yay\u0131n\u0131<select id="pubFamily" class="form-field">${fam.map(f=>`<option value="${esc(f.id)}" ${f.id===s.familyId?'selected':''}>${esc(short(f.title,65))}</option>`).join('')}</select></label><label>Kaynak s\u00fcr\u00fcm<select id="pubRelease" class="form-field">${rels.map(r=>`<option value="${esc(r.versionId)}" ${r.versionId===s.releaseId?'selected':''}>${esc(bridge.date(r.published))}${r.versionId===f.active?' (aktif)':''}</option>`).join('')}</select></label><div class="pub-source-caption">Kaynak s\u00fcr\u00fcm derlemeye sabitlenir; yeni XML yay\u0131n\u0131 mevcut \u00e7\u0131kt\u0131y\u0131 kendili\u011finden de\u011fi\u015ftirmez.</div></div>`;}
function optionsPanel(){return `<aside class="pub-options"><div class="pub-section-title">Yay\u0131n ayarlar\u0131</div><label class="pub-option-field">Derleme ba\u015fl\u0131\u011f\u0131<input id="pubTitle" class="form-field" maxlength="180" value="${esc(s.title)}" placeholder="\u00d6rn. Olay Raporlama - Yetkili Otorite" /></label><label class="pub-option-field">Alt ba\u015fl\u0131k / a\u00e7\u0131klama<input id="pubSubtitle" class="form-field" maxlength="250" value="${esc(s.subtitle)}" placeholder="\u0130ste\u011fe ba\u011fl\u0131" /></label><div class="pub-checkboxes"><label><input type="checkbox" id="pubRelated" ${s.includeRelated?'checked':''}/><span>Ba\u011flant\u0131l\u0131 AMC / GM / CS otomatik ekle <small>XML'de ana madde ili\u015fkisi bulunanlar</small></span></label><label><input type="checkbox" id="pubNotes" ${s.includeNotes?'checked':''}/><span>Genel ki\u015fisel notlar\u0131m</span></label><label><input type="checkbox" id="pubClauseNotes" ${s.includeClauseNotes?'checked':''}/><span>Alt gereklilik notlar\u0131m</span></label></div><label class="pub-option-field">Her madde sonunda bo\u015f not sayfas\u0131 (Word/PDF)<select id="pubExtra" class="form-field"><option value="0" ${s.extraNotePages===0?'selected':''}>Yok</option><option value="1" ${s.extraNotePages===1?'selected':''}>1 sayfa</option><option value="2" ${s.extraNotePages===2?'selected':''}>2 sayfa</option></select></label><label class="pub-option-field">Kindle Scribe PDF d\u00fczeni<select id="pubKindle" class="form-field"><option value="notes" ${s.kindleMode==='notes'?'selected':''}>Not alma - geni\u015f alanlar</option><option value="read" ${s.kindleMode==='read'?'selected':''}>Okuma - daha az bo\u015fluk</option></select></label><div class="pub-selected-summary" id="pubSummary"></div><div class="pub-export-actions"><div class="pub-section-title">D\u0131\u015fa aktar</div><div class="pub-action-grid"><button class="btn primary" data-pub-export="docx">Word .docx</button><button class="btn" data-pub-export="pdf">PDF (A4)</button><button class="btn" data-pub-export="kindle">Kindle PDF</button><button class="btn" data-pub-export="epub">Kindle EPUB</button><button class="btn" data-pub-export="txt">TXT</button><button class="btn" data-pub-export="md">Markdown</button></div><button class="btn pub-preview-button" data-pub-export="preview">\u00d6nizlemeyi a\u00e7</button><p class="pub-fine">PDF'ler yazd\u0131rma \u00f6nizlemesinde <b>PDF olarak kaydet</b> ile olu\u015fturulur. Kindle PDF i\u00e7in Send to Kindle kullan\u0131n. Notlar belgede a\u00e7\u0131k\u00e7a ki\u015fisel olarak i\u015faretlenir.</p></div></aside>`;}
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
 updateSummary();
}
function updateSummary(){const node=root.document.getElementById('pubSummary');if(!node)return;
 const chosen=[...s.picks.values()],partial=chosen.filter(x=>x.mode==='partial').length;
 const related=s.includeRelated&&doc?chosen.reduce((acc,p)=>{const rec=doc.records.find(r=>r.key===p.key);if(rec)for(const r of engine.findRelated(doc,rec))if(!s.picks.has(r.key))acc.add(r.key);return acc;},new Set()).size:0;
 node.innerHTML=`<strong>${chosen.length} se\u00e7ili madde</strong><span>${partial?partial+' bent bazl\u0131 se\u00e7im \u00b7 ':''}${related?'+'+related+' otomatik ili\u015fkili h\u00fck\u00fcm':'Se\u00e7ilen kaynak s\u00fcr\u00fcm sabit'}</span>`;
 root.document.querySelectorAll('[data-pub-export]').forEach(b=>b.disabled=!chosen.length||s.busy);
}
async function render(){const stamp=++renderStamp,screen=root.document.getElementById('screen');const families=sourceFamilies();
 if(!bridge?.loggedIn()){screen.innerHTML='<div class="pub-initial"><h1>Yay\u0131n Olu\u015fturucu</h1><p>Mevzuat derlemek i\u00e7in Google hesab\u0131n\u0131zla giri\u015f yap\u0131n.</p><button type="button" class="btn primary" data-action="signin">Google ile giri\u015f</button></div>';return;}
 if(!families.length){screen.innerHTML='<div class="pub-initial"><h1>Yay\u0131n Olu\u015fturucu</h1><p>Hen\u00fcz bulutta bir EASA XML yay\u0131n\u0131 yok. \u00d6nce mevzuat k\u00fct\u00fcphanesine XML y\u00fckleyin.</p><button class="btn primary" data-action="go-library">K\u00fct\u00fcphaneye d\u00f6n</button></div>';return;}
 if(!families.some(f=>f.id===s.familyId))s.familyId=families[0].id;
 const family=families.find(f=>f.id===s.familyId);
 if(!family.releases.some(r=>r.versionId===s.releaseId))s.releaseId=family.active||family.releases[0].versionId;
 screen.innerHTML='<div class="loading"><div><div class="spinner"></div>Yay\u0131n i\u00e7eri\u011fi y\u00fckleniyor...</div></div>';
 try{doc=await bridge.loadDoc(s.releaseId);}catch(e){screen.innerHTML=`<div class="pub-initial"><h1>Mevzuat verisi okunamad\u0131</h1><p>${esc(e.message)}</p><button class="btn primary" data-action="drive">Drive ba\u011fla</button></div>`;return;}
 if(stamp!==renderStamp)return;
 const sections=[...new Set(doc.records.map(x=>x.category||'Genel'))];
 screen.innerHTML=`<div class="pub-builder"><header class="pub-header"><div class="eyebrow">v3.6 / YAYIN OLU\u015eTURUCU</div><h1>Mevzuat Derle & D\u0131\u015fa Aktar</h1><p>EASA XML s\u00fcr\u00fcm\u00fcnden madde veya bent se\u00e7in; Word, PDF, Kindle ya da d\u00fcz metin olu\u015fturun.</p></header>${sourceControls()}<div class="pub-builder-grid"><section class="pub-picker"><div class="pub-section-title">Madde ve alt gereklilik se\u00e7imi</div><div class="pub-filter-row"><input class="form-field" id="pubQuery" value="${esc(s.query)}" placeholder="Madde kodu, ba\u015fl\u0131k ya da i\u00e7erik ara"/><select class="form-field" id="pubCategory"><option value="ALL">T\u00fcm b\u00f6l\u00fcmler</option>${sections.map(x=>`<option value="${esc(x)}" ${s.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select class="form-field" id="pubKind">${['ALL','IR','DR','AMC','GM','CS','OTHER'].map(k=>`<option value="${k}" ${s.kind===k?'selected':''}>${k==='ALL'?'T\u00fcm t\u00fcrler':k}</option>`).join('')}</select></div><div class="pub-list-toolbar"><span id="pubResultTotal"></span><div><button class="btn small" data-pub-select-visible="1">G\u00f6r\u00fcnenleri se\u00e7</button><button class="btn small" data-pub-clear="1">Se\u00e7imi temizle</button></div></div><div id="pubRecordList" class="pub-record-list"></div><button class="btn pub-more" id="pubMore" data-pub-more="1" hidden>Daha fazla g\u00f6ster</button></section>${optionsPanel()}</div><div class="info-strip">Mevzuat metinleri ve notlar\u0131n\u0131z, rapor olu\u015ftururken yaln\u0131zca taray\u0131c\u0131n\u0131zda i\u015flenir. Bu a\u015famada rapor tasla\u011f\u0131n\u0131n buluta kaydedilmesi desteklenmiyor. Kaynakta resim/karma\u015f\u0131k \u015fekil varsa son \u00e7\u0131kt\u0131y\u0131 kontrol edin.</div></div>`;
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
 if(target.dataset.pubExpand!==undefined){s.expanded=s.expanded===target.dataset.pubExpand?'':target.dataset.pubExpand;updateItemList();return;}
 if(target.dataset.pubFull!==undefined){addRecord(target.dataset.pubFull);updateItemList();return;}
 if(target.dataset.pubClear!==undefined){s.picks.clear();updateItemList();return;}
 if(target.dataset.pubSelectVisible!==undefined){const matches=filtered().slice(0,s.limit);if(s.picks.size+matches.length>350){bridge.error(Error('En fazla 350 madde se\u00e7ilebilir. Daha dar bir filtre uygulay\u0131n.'));return;}for(const r of matches)if(!s.picks.has(r.key))addRecord(r.key);updateItemList();return;}
 if(target.dataset.pubMore!==undefined){s.limit+=100;updateItemList();return;}
 if(target.dataset.pubExport!==undefined)exportAs(target.dataset.pubExport).catch(bridge.error);
}
function onChange(e){if(!bridge||bridge.currentView()!=='publish')return;const v=e.target.value;
 if(e.target.id==='pubFamily'){
  if(s.picks.size&&!root.confirm('Farkl\u0131 mevzuata ge\u00e7ildi\u011finde mevcut se\u00e7imler temizlenecek. Devam edilsin mi?')){e.target.value=s.familyId;return;}
  choose(v,sourceFamilies().find(f=>f.id===v)?.active);s.expanded='';render().catch(bridge.error);return;}
 if(e.target.id==='pubRelease'){
  if(s.picks.size&&!root.confirm('Kaynak s\u00fcr\u00fcm de\u011fi\u015firse se\u00e7imler temizlenecek. Devam edilsin mi?')){e.target.value=s.releaseId;return;}
  choose(s.familyId,v);s.expanded='';render().catch(bridge.error);return;}
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
}
root.EasaPublisherUI={configure,render,choose,reset,model,get state(){return s;}};
})(typeof globalThis!=='undefined'?globalThis:this);
