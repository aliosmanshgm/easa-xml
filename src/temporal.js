/* Havacilik Mevzuati Hub v3.11.2 - TR & EASA temporal provision register.
 * All suggestions are unverified; no legal conclusion is drawn from a pattern.
 * Persisted records are handled separately by Firebase; source texts are immutable.
 */
(function(root){
'use strict';
const TYPES={entry:'Yürürlüğe giriş',application:'Uygulanmaya başlama',transition:'Geçiş / uyum süresi',repeal:'Yürürlükten kaldırılma',suspension:'Uygulamanın askıya alınması',expiry:'Geçerliliğin sona ermesi'};
const SCOPES={release:'Mevzuatın tamamı',provision:'Belirli madde veya hüküm',group:'Seçili hükümler / kademeli düzenleme'};
const DATE_BASIS={fixed:'Açık takvim tarihi',publication:'Yayım tarihine göre',effective:'Genel yürürlüğe girişe göre',external:'Başka bir tarih / olay',conditional:'Koşula bağlı / tarih belirlenemiyor'};
const UNITS={day:'gün',month:'ay',year:'yıl'};
const WORDS={bir:1,iki:2,'üç':3,uc:3,'dört':4,dort:4,'beş':5,bes:5,'altı':6,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,onbir:11,'on bir':11,oniki:12,'on iki':12,onuc:13,'on üç':13,ondort:14,'on dört':14,onbes:15,'on beş':15,onalti:16,'on altı':16,onyedi:17,'on yedi':17,onsekiz:18,'on sekiz':18,ondokuz:19,'on dokuz':19,yirmi:20,otuz:30,altmis:60,'altmış':60};
const MONTH_EN={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;}
function dateISO(y,m,d){const s=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');return validDate(s)?s:'';}
function addPeriod(base,n,unit){if(!validDate(base)||!Number.isSafeInteger(Number(n))||n<1||n>3650||!UNITS[unit])return '';const [y,m,d]=base.split('-').map(Number);let dt;if(unit==='day'){dt=new Date(Date.UTC(y,m-1,d));dt.setUTCDate(dt.getUTCDate()+Number(n));}else{const total=y*12+(m-1)+(unit==='year'?Number(n)*12:Number(n));const yy=Math.floor(total/12),mm=total%12;const last=new Date(Date.UTC(yy,mm+1,0)).getUTCDate();dt=new Date(Date.UTC(yy,mm,Math.min(d,last)));}return dt.toISOString().slice(0,10);}
function quantity(s){const p=String(s||'').trim().toLocaleLowerCase('tr-TR').replace(/[-\s]+/g,' ');if(/^\d{1,4}$/.test(p))return Number(p);if(WORDS[p])return WORDS[p];const tokens=p.split(' ');if(tokens.length===2&&WORDS[tokens[0]]>=10&&WORDS[tokens[1]]<10)return WORDS[tokens[0]]+WORDS[tokens[1]];return 0;}
function todayLocal(){const d=new Date();return dateISO(d.getFullYear(),d.getMonth()+1,d.getDate());}
function status(event,today=todayLocal()){if(event.status!=='confirmed')return {label:'Taslak / doğrulanmadı',code:'draft'};if(!event.date||!validDate(event.date))return {label:'Tarih/koşul takibi',code:'unknown'};if(event.date<today)return {label:'Kaydedilen tarih geçti',code:'past'};if(event.date===today)return {label:'Kaydedilen tarih bugün',code:'today'};const days=Math.round((Date.parse(event.date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);return days<=60?{label:days+' gün kaldı',code:'soon'}:{label:'İleri tarihli',code:'future'};}
function plain(rec){return String(rec?.plain||(rec?.blocks||[]).map(x=>x.t||'').join(' ')||'').replace(/\s+/g,' ').trim();}
function title(rec){return String(rec?.title||'').trim();}
function extractExplicitDate(text){const str=String(text||'');let m=/\b(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})\b/.exec(str);if(m)return dateISO(m[3],m[2],m[1]);m=/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i.exec(str);return m?dateISO(m[3],MONTH_EN[m[2].toLowerCase()],m[1]):'';}
function euDatedPhrase(text){
 const pattern=/(shall\s+apply\s+from|shall\s+enter\s+into\s+force\s+on|apply\s+from)\s+(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/gi;
 const found=[...String(text||'').matchAll(pattern)].map(m=>({kind:/apply\s+from/i.test(m[1])?'application':'entry',date:extractExplicitDate(m[2]),phrase:m[0]})).filter(x=>x.date);
 // Several distinct dates in one provision may indicate staged application.
 if(found.length!==1)return null;
 return found[0];
}
function unique(candidates){const ids=new Set();return candidates.filter(c=>{const id=[c.versionId,c.recordKey,c.type,c.date,c.reference].join('|');if(ids.has(id))return false;ids.add(id);return true;});}
// This never saves or confirms; candidate evidence stays visible for human review.
function suggest(doc,selectedKey='',releaseDates=null){
 if(!doc?.records?.length)return [];
 const tr=doc.language==='tr';const out=[];
 const release=releaseDates?.effectiveDate||doc.metadata?.effectiveDate||'';
 const initial=tr&&root.EasaTrDates?.suggestEffective?root.EasaTrDates.suggestEffective(doc,doc.published):null;
 const effective=validDate(release)?release:(initial?.date||'');
 function candidate(r,extra){return {
  id:'',familyId:doc.familyId,versionId:doc.versionId,recordKey:r?.key||'',scope:r?'provision':'release',anchor:'',
  type:'transition',date:'',basis:'conditional',baseDate:'',period:0,unit:'month',reference:r?title(r):'Genel yürürlük',
  sourceExcerpt:plain(r).slice(0,800),expression:'',status:'draft',note:'',targetDescription:'',legalChangeRef:'',...extra
 };}
 if(tr){
  if(!initial?.ambiguous&&validDate(release)){out.push(candidate(null,{type:'entry',date:release,basis:initial?.date===release?'publication':'fixed',baseDate:doc.published||'',period:0,reference:releaseDates?.reference||initial?.ref||'Yürürlük maddesi',sourceExcerpt:initial?.sourceText||'',expression:releaseDates?.reference?'Önceden onaylanmış sürüm tarih üst verisi; hüküm kapsamını kontrol edin.':initial?.reason||''}));}
  else if(!initial?.ambiguous&&initial?.date){out.push(candidate(null,{type:'entry',date:initial.date,basis:'publication',baseDate:doc.published||'',period:0,reference:initial.ref||'Yürürlük maddesi',sourceExcerpt:initial.sourceText||'',expression:initial.reason||''}));}
  if(initial?.ambiguous){out.push(candidate(null,{type:'entry',basis:'conditional',reference:initial.ref||'Yürürlük maddesi',expression:initial.reason||'Kademeli yürürlük olasılığı; madde düzeyinde kontrol gerekli.'}));}
 }
 const records=selectedKey?doc.records.filter(r=>r.key===selectedKey):doc.records;
 for(const r of records){
  const t=plain(r),rt=title(r),low=t.toLocaleLowerCase('tr-TR');
  if(!t)continue;
  if(tr){
   if(r.legalStatus==='mulga'){out.push(candidate(r,{type:'repeal',basis:'conditional',date:'',expression:'Kaynak XML hükmü mülga olarak işaretli; kaldıran mevzuatın yürürlük tarihi doğrulanmalı.',note:'Mülga hükmün tarihi ve kaldıran düzenleme ayrı kaynak üzerinden belirlenmelidir.'}));}
   const trans=/(?:yürürlüğe\s+girdiği\s+tarihten|yürürlük\s+tarihinden|yürürlüğe\s+giriş\s+tarihinden)\s+itibaren\s+(\d+|[a-zçğıöşü]+(?:\s+[a-zçğıöşü]+)?)\s+(gün|ay|yıl)\s+içinde/i.exec(low);
   if(trans&&(/geçici\s+madde/i.test(rt)||/geçiş|uyum|tamamla|süre/i.test(low))){
    const n=quantity(trans[1]), unit={gün:'day',ay:'month',yıl:'year'}[trans[2]], date=effective&&n&&unit?addPeriod(effective,n,unit):'';
    out.push(candidate(r,{type:'transition',date,basis:'effective',baseDate:effective,period:n,unit:unit||'month',expression:trans[0],note:date?'Yürürlük tarihi esas alınarak hesaplanan geçiş/uyum son günü; hükmü ve başlangıç tarihini doğrulayın.':'Başlangıç tarihi doğrulanmadan son gün hesaplanamaz.'}));
   }
   if(/(aşağıdaki|diğer\s+hükümleri|farklı\s+tarihlerde)\s*.{0,90}(yürürlüğe\s+girer|uygulanır)/i.test(low)){
    out.push(candidate(r,{type:'entry',scope:'group',basis:'conditional',expression:'Kademeli yürürlük ihtimali: her hükmün tarihi ayrı incelenmeli.'}));
   }
  } else {
   const phrase=euDatedPhrase(t);
   if(phrase)out.push(candidate(r,{type:phrase.kind,date:phrase.date,basis:'fixed',expression:phrase.phrase}));
  }
  // EASA metadata may encode different dates at record level; never assume that
  // such dates govern the entire publication.
  if(!tr&&validDate(r.effective||''))out.push(candidate(r,{type:'entry',date:r.effective,basis:'fixed',expression:'EASA XML EntryIntoForceDate metadata'}));
  if(!tr&&validDate(r.applicability||''))out.push(candidate(r,{type:'application',date:r.applicability,basis:'fixed',expression:'EASA XML ApplicabilityDate metadata'}));
 }
 return unique(out).slice(0,selectedKey?12:40);
}
function validate(item){if(!item||!/^tim_[a-zA-Z0-9_-]{20,90}$/.test(String(item.id||'')))throw Error('Zaman kaydının kimliği geçersiz.');for(const k of ['familyId','versionId'])if(!item[k]||String(item[k]).length>320)throw Error('Mevzuat kaynağı eksik.');if(!TYPES[item.type]||!SCOPES[item.scope]||!DATE_BASIS[item.basis])throw Error('Kayıt türü, kapsam veya tarih temeli geçersiz.');if(!['draft','confirmed'].includes(item.status))throw Error('Değerlendirme durumu geçersiz.');if(item.scope==='provision'&&!item.recordKey)throw Error('Hüküm kapsamı için madde seçimi gerekli.');if(item.scope==='release'&&(item.recordKey||item.anchor))throw Error('Tüm mevzuat kaydında hüküm kimliği bulunamaz.');if(item.anchor&&!item.recordKey)throw Error('Alt bent seçimi için madde gereklidir.');for(const x of ['date','baseDate'])if(item[x]&&!validDate(item[x]))throw Error('Geçersiz takvim tarihi: '+x);if(item.period&&(item.period<0||item.period>3650||!Number.isInteger(Number(item.period))||!UNITS[item.unit]))throw Error('Süre veya birim geçersiz.');for(const [k,len] of Object.entries({recordKey:300,anchor:180,reference:320,sourceExcerpt:1600,expression:450,note:2500,targetDescription:800,legalChangeRef:320}))if(String(item[k]||'').length>len)throw Error('Alan çok uzun: '+k);if(String(item.reference||'').trim().length<3)throw Error('Kaynak madde veya dayanak belirtilmelidir.');if(item.scope==='group'&&!String(item.targetDescription||'').trim())throw Error('Kademeli düzenlemenin hangi hükümleri kapsadığı belirtilmelidir.');if(item.status==='confirmed'&&!item.date){if(item.basis!=='conditional'||String(item.note||'').trim().length<8)throw Error('Tarihi olmayan bir kayıt ancak koşullu olup açıklamasıyla doğrulanabilir.');}if(item.basis==='conditional'&&item.date)throw Error('Koşullu kayıt kesin tarihle birleştirilemez; tarih temelini güncelleyin.');return true;}
function toCSV(items){const cols=[['Mevzuat','publication'],['Sürüm','versionId'],['Hüküm','recordKey'],['Alt bent','anchor'],['Olay','type'],['Kapsam','scope'],['Tarih','date'],['Başlangıç','baseDate'],['Süre','period'],['Birim','unit'],['Durum','status'],['Kaynak','reference'],['Kapsanan hükümler','targetDescription'],['Kaldıran/değiştiren mevzuat','legalChangeRef'],['Kaynak metni','sourceExcerpt'],['Açıklama','note']];const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+[cols.map(c=>cell(c[0])).join(';'),...items.map(x=>cols.map(([label,k])=>cell(k==='type'?TYPES[x[k]]||x[k]:k==='scope'?SCOPES[x[k]]||x[k]:x[k])).join(';'))].join('\r\n');}
root.EasaTemporal={TYPES,SCOPES,DATE_BASIS,UNITS,validDate,addPeriod,quantity,status,todayLocal,plain,title,extractExplicitDate,suggest,validate,toCSV,version:'1.0'};
if(typeof module!=='undefined'&&module.exports)module.exports=root.EasaTemporal;
})(typeof window!=='undefined'?window:globalThis);
