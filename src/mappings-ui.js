/* eRules Hub v3.9 - human-reviewed cross-jurisdiction mapping workbench.
   No suggested link is automatically considered legal equivalence.
   Source/target are pinned to exact versions and optionally a clause anchor.
*/
(function(root){
'use strict';
let deps=null;
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const cut=(s,n=105)=>{s=String(s??'');return s.length>n?s.slice(0,n-1)+'…':s;};
const sorts={related:'Konusal ilişki',similar:'Benzer gereklilik',partial:'Kısmi karşılık',different:'Farklı yaklaşım'};
let current=null,existing=[],busy=false,pending=null,initialised=false;
const s={fromFamily:'',fromVersion:'',fromKey:'',fromAnchor:'',fromQuery:'',toFamily:'',toVersion:'',toKey:'',toAnchor:'',toQuery:'',relation:'related',rationale:'',status:'draft'};
const loaded=new Map();
function families(){return deps?.families?.()||[];}
function family(id){return families().find(f=>f.id===id);}
function groups(side){return families().filter(f=>side==='from'?f.id.startsWith('tr-'):!f.id.startsWith('tr-'));}
function reset(){current=null;for(const k of Object.keys(s))s[k]='';s.relation='related';s.status='draft';}
function choose(familyId,versionId,recordKey){reset();pending={familyId,versionId,recordKey};}
function setupDefaults(){
 for(const side of ['from','to']){
  const opts=groups(side);if(!opts.length){s[side+'Family']='';s[side+'Version']='';continue;}
  if(!opts.some(f=>f.id===s[side+'Family']))s[side+'Family']=opts[0].id;
  const f=family(s[side+'Family']);if(!f?.releases?.some(x=>x.versionId===s[side+'Version']))s[side+'Version']=f?.active||f?.releases?.[0]?.versionId||'';
 }
 if(pending){const side=pending.familyId.startsWith('tr-')?'from':'to';
  if(groups(side).some(f=>f.id===pending.familyId)){
   s[side+'Family']=pending.familyId;s[side+'Version']=pending.versionId;s[side+'Key']=pending.recordKey;
  }
  pending=null;
 }
}
async function doc(side){const id=s[side+'Version'];if(!id)return null;if(loaded.has(id))return loaded.get(id);const d=await deps.loadDoc(id);loaded.set(id,d);return d;}
function selectOptions(side,items){const val=s[side+'Family'];return `<select class="form-field map-family" id="map-${side}-family" aria-label="Mevzuat ailesi">${items.map(f=>`<option value="${esc(f.id)}" ${f.id===val?'selected':''}>${esc(cut(f.title,80))}</option>`).join('')}</select>`;}
function versionOptions(side){const f=family(s[side+'Family']);return `<select class="form-field" id="map-${side}-version" aria-label="Mevzuat sürümü">${(f?.releases||[]).map(r=>`<option value="${esc(r.versionId)}" ${r.versionId===s[side+'Version']?'selected':''}>${esc(r.published?.slice(0,10)||'Tarihsiz')} · ${esc(cut(r.versionId,40))}</option>`).join('')}</select>`;}
function matching(docObj,side){const q=String(s[side+'Query']||'').trim().toLocaleLowerCase('tr-TR');const all=docObj?.records||[];
 const found= q?all.filter(r=>(r.title+' '+r.plain).toLocaleLowerCase('tr-TR').includes(q)):all;
 const limited=found.slice(0,110);
 const sel=all.find(r=>r.key===s[side+'Key']);
 if(sel&&!limited.some(r=>r.key===sel.key))limited.unshift(sel);
 return {found,limited};}
function anchorOptions(record,selected){let clauses=record&&root.EasaClauses?root.EasaClauses.outline(record.blocks).filter(b=>b.type==='clause'):[];
 return '<option value="">Madde bütünü</option>'+clauses.slice(0,240).map(b=>`<option value="${esc(b.anchor)}" ${b.anchor===selected?'selected':''}>${esc(cut(b.reference||b.label,48))} · ${esc(cut(b.text,74))}</option>`).join('');}
function renderSide(side,d){const tr=side==='from';const fams=groups(side);const sideTitle=tr?'Türkiye mevzuatı':'EASA mevzuatı';
 if(!fams.length)return `<section class="panel map-side"><h3>${sideTitle}</h3><div class="empty-state">${tr?'Henüz bir TR mevzuatı bulunmuyor. Yapılandırılmış SHY-OLAY XML dosyasını yükleyin.':'Henüz EASA mevzuatı bulunmuyor. EASA eRules XML dosyasını yükleyin.'}</div></section>`;
 const {found,limited}=matching(d,side);
 const chosen=d?.records.find(r=>r.key===s[side+'Key']);
 return `<section class="panel map-side"><div class="section-heading"><h2>${sideTitle}</h2><span class="chip">${d?.records.length||0} hüküm</span></div>
 <label class="cloud-label">Mevzuat${selectOptions(side,fams)}</label>
 <label class="cloud-label">Kaynak sürüm${versionOptions(side)}</label>
 <label class="cloud-label">Madde ara<input class="form-field" id="map-${side}-query" value="${esc(s[side+'Query'])}" placeholder="Madde kodu veya başlık..." autocomplete="off" /></label>
 <label class="cloud-label">Madde / hüküm <span class="inline-hint">${found.length} eşleşme · ilk 110</span><select class="form-field map-record" id="map-${side}-record" size="7">${limited.map(r=>`<option value="${esc(r.key)}" ${r.key===s[side+'Key']?'selected':''}>${esc(cut(r.title,95))}</option>`).join('')}</select></label>
 <label class="cloud-label">Alt gereklilik<select class="form-field" id="map-${side}-anchor">${anchorOptions(chosen,s[side+'Anchor'])}</select></label>
 ${chosen?`<div class="map-quote"><b>${esc(chosen.title)}</b><p>${esc(cut(chosen.plain,410))}</p></div>`:'<div class="inline-hint">Lütfen bir madde seçin.</div>'}
 </section>`;
}
function savedHTML(){if(!existing.length)return '<p class="muted">Henüz eşleştirme kaydı oluşturulmadı. Aşağıdaki formdan iki hüküm seçerek başlayabilirsiniz.</p>';
 return `<div class="map-saved-list">${existing.map(m=>`<div class="map-saved-item"><div><span class="chip">${esc(sorts[m.relation]||'İlişki')}</span> <span class="chip ${m.status==='reviewed'?'green':'amber'}">${m.status==='reviewed'?'İncelendi':'Taslak'}</span></div><strong>${esc(cut(m.from?.title||'',100))}</strong><div class="inline-hint">TR → ${esc(cut(m.to?.title||'',100))}</div><p>${esc(cut(m.rationale||'',200))}</p><div class="row-buttons"><button class="btn small" data-map-action="open" data-map-id="${esc(m.id)}">Aç / Düzenle</button><button class="btn small danger" data-map-action="delete" data-map-id="${esc(m.id)}">Sil</button></div></div>`).join('')}</div>`;
}
async function render(){
 const screen=document.getElementById('screen');if(!screen||!deps)return;
 if(!deps.loggedIn()){screen.innerHTML='<div class="page-head"><div><h1>TR ↔ EASA eşleştirmeleri</h1><p>Önce Google hesabınızla giriş yapın.</p></div></div>';return;}
 if(!initialised){existing=await deps.listMappings();initialised=true;}
 setupDefaults();
 try{
  const [fromDoc,toDoc]=await Promise.all([doc('from'),doc('to')]);
  if(fromDoc&&!fromDoc.records.some(r=>r.key===s.fromKey)){s.fromKey='';s.fromAnchor='';}
  if(toDoc&&!toDoc.records.some(r=>r.key===s.toKey)){s.toKey='';s.toAnchor='';}
  screen.innerHTML=`<div class="page-head"><div><div class="eyebrow">KARŞILAŞTIRMALI MEVZUAT ANALİZİ</div><h1>TR ↔ EASA Eşleştirmeleri</h1><p class="lead">İki mevzuattaki hükümleri ve alt gereklilikleri kaynak sürümleriyle ilişkilendirin. Otomatik eşdeğerlik veya hukuki uygunluk kararı verilmez.</p></div></div>
  <section class="panel"><div class="section-heading"><h2>Kaydedilen eşleştirmeler (${existing.length})</h2><div class="row-buttons"><button class="btn small" data-map-action="refresh">Buluttan yenile</button><button class="btn small" data-map-action="new">Yeni eşleştirme</button></div></div>${savedHTML()}</section>
  <div class="map-sides">${renderSide('from',fromDoc)}${renderSide('to',toDoc)}</div>
  <section class="panel map-review"><div class="section-heading"><h2>${current?'Eşleştirmeyi düzenle':'Eşleştirme değerlendirmesi'}</h2><span class="chip">Kaynak sürümler sabitlenir</span></div>
    <div class="map-review-grid"><label class="cloud-label">İlişki türü<select id="map-relation" class="form-field">${Object.entries(sorts).map(([v,l])=>`<option value="${v}" ${s.relation===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="cloud-label">Değerlendirme durumu<select id="map-status" class="form-field"><option value="draft" ${s.status==='draft'?'selected':''}>Taslak / doğrulanmadı</option><option value="reviewed" ${s.status==='reviewed'?'selected':''}>İncelendi</option></select></label></div>
    <label class="cloud-label">Eşleştirme gerekçesi / farklar<textarea id="map-rationale" class="form-field" rows="4" maxlength="4000" placeholder="Mevzuatlar arasındaki ilişkinin dayanağı, farklılıklar ve sonuç...">${esc(s.rationale)}</textarea></label>
    <div class="info-strip">İlişki ve gerekçeler sizin değerlendirmenizdir. Bir hükmün başka bir hükümle benzer olması doğrudan tam uyum sağladığı anlamına gelmez. Yeni mevzuat sürümleri bu kayıtları kendiliğinden değiştirmez.</div>
    <div class="map-actions"><button class="btn primary" data-map-action="save" ${busy?'disabled':''}>${current?'Değişiklikleri kaydet':'Eşleştirmeyi kaydet'}</button><button class="btn" data-map-action="new">Temizle</button></div>
  </section>`;
 }catch(err){screen.innerHTML='<section class="panel"><h2>Eşleştirme ekranı açılamadı</h2><p>'+esc(err.message)+'</p><button class="btn" data-map-action="refresh">Yeniden dene</button></section>';}
}
async function onChange(target){
 const id=target.id;
 const m=/^map-(from|to)-(family|version|record|anchor)$/.exec(id);
 if(m){const side=m[1],key=m[2];
  if(key==='family'){s[side+'Family']=target.value;s[side+'Version']=family(target.value)?.active||family(target.value)?.releases?.[0]?.versionId||'';s[side+'Key']='';s[side+'Anchor']='';s[side+'Query']='';}
  else if(key==='version'){s[side+'Version']=target.value;s[side+'Key']='';s[side+'Anchor']='';s[side+'Query']='';}
  else if(key==='record'){s[side+'Key']=target.value;s[side+'Anchor']='';}
  else s[side+'Anchor']=target.value;
  await render();return;
 }
 if(id==='map-relation')s.relation=target.value;
 if(id==='map-status')s.status=target.value;
}
async function save(){
 if(busy)return;
 const a=await doc('from'),b=await doc('to');
 const r=a?.records.find(x=>x.key===s.fromKey),t=b?.records.find(x=>x.key===s.toKey);
 if(!r||!t)throw Error('Hem TR hem EASA tarafında bir hüküm seçin.');
 if(!sorts[s.relation])throw Error('Geçerli bir ilişki türü seçin.');
 const rationale=document.getElementById('map-rationale')?.value?.trim()||s.rationale;
 if(rationale.length<8||rationale.length>4000)throw Error('Eşleştirme gerekçesi en az 8, en fazla 4000 karakter olmalıdır.');
 s.rationale=rationale;
 const pick=(side,docObj,rec)=>({familyId:s[side+'Family'],versionId:s[side+'Version'],key:rec.key,anchor:s[side+'Anchor']||'',title:rec.title,excerpt:cut(rec.plain,320)});
 const randomId=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID().replace(/-/g,'');const buf=new Uint8Array(16);crypto.getRandomValues(buf);return [...buf].map(v=>v.toString(16).padStart(2,'0')).join('');};
 const data={id:current?.id||'map_'+randomId(),from:pick('from',a,r),to:pick('to',b,t),relation:s.relation,status:s.status,rationale,createdAt:current?.createdAt||new Date().toISOString()};
 busy=true;try{const saved=await deps.saveMapping(data,current?.revision||0);existing=await deps.listMappings();current=saved;deps.toast('TR–EASA eşleştirmesi Firebase’e kaydedildi.');await render();}finally{busy=false;}
}
async function open(id){const m=existing.find(x=>x.id===id);if(!m)throw Error('Eşleştirme bulunamadı.');
 current=m;s.fromFamily=m.from.familyId;s.fromVersion=m.from.versionId;s.fromKey=m.from.key;s.fromAnchor=m.from.anchor||'';s.fromQuery='';
 s.toFamily=m.to.familyId;s.toVersion=m.to.versionId;s.toKey=m.to.key;s.toAnchor=m.to.anchor||'';s.toQuery='';
 s.relation=m.relation;s.status=m.status||'draft';s.rationale=m.rationale||'';await render();
 document.querySelector('.map-review')?.scrollIntoView({behavior:'smooth',block:'start'});
}
async function action(action,id){
 if(action==='new'){reset();await render();return;}
 if(action==='save'){await save();return;}
 if(action==='open'){await open(id);return;}
 if(action==='refresh'){loaded.clear();existing=await deps.listMappings();await render();return;}
 if(action==='delete'){
  const m=existing.find(x=>x.id===id);if(!m)return;
  if(!confirm('Bu eşleştirme kaydı silinsin mi? Mevzuat metinleri ve diğer notlar etkilenmeyecek.'))return;
  await deps.deleteMapping(id);if(current?.id===id)reset();existing=await deps.listMappings();deps.toast('Eşleştirme kaydı silindi.');await render();
 }
}
function configure(d){deps=d;}
async function refresh(){loaded.clear();existing=[];initialised=false;if(deps?.currentView?.()==='mappings')await render();}
document.addEventListener('click',e=>{const el=e.target.closest('[data-map-action]');if(!el)return;e.preventDefault();action(el.dataset.mapAction,el.dataset.mapId).catch(err=>deps?.error?.(err));});
document.addEventListener('change',e=>{if(e.target.id?.startsWith('map-'))onChange(e.target).catch(err=>deps?.error?.(err));});
document.addEventListener('input',e=>{
 const m=/^map-(from|to)-query$/.exec(e.target.id||'');
 if(m){const side=m[1];s[side+'Query']=e.target.value;const select=document.getElementById(`map-${side}-record`);
  const d=loaded.get(s[side+'Version']);if(!select||!d)return;
  const found=matching(d,side);select.innerHTML=found.limited.map(r=>`<option value="${esc(r.key)}" ${r.key===s[side+'Key']?'selected':''}>${esc(cut(r.title,95))}</option>`).join('');
  return;
 }
 if(e.target.id==='map-rationale')s.rationale=e.target.value;
});
root.EasaMappingsUI={configure,render,choose,refresh,reset,get state(){return s;}};
})(window);
