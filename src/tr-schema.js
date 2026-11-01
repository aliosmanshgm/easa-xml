/* TR legislative schema v2: portable browser-side structural and editorial checks.
 * The normative offline XML schema is TR_Mevzuat_Semasi_v2_0_YeniKayit.xsd.
 * Browsers do not implement XSD validation natively. This is a purpose-built
 * pre-publication check, not an XSD engine or a legal-compliance certificate.
 * Legacy v1.0 publications are accepted without migration.
 */
(function(root){
'use strict';
const NS='urn:eyuik:legislation:tr:v1';
const TYPES=['kanun','cumhurbaskanligi-kararnamesi','cumhurbaskani-karari','yonetmelik','karar','teblig','genelge','talimat','yonerge','diger'];
const FORMS=['mustakil','cerceve'];
const STAGES=['taslak','yayinlanmis','konsolide'];
const CHANNELS=['resmi-gazete','kurumsal','diger','bilinmiyor'];
const KINDS=['normal','ek','gecici','cerceve'];
const ALPHABET=Array.from('abcçdefgğhıijklmnoöprsştuüvyz');
const NUMBER=/^[1-9][0-9]*(?:\/[A-ZÇĞİÖŞÜ])?$/;
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const BENT=/^([abcçdefgğhıijklmnoöprsştuüvyz])\1*$/;
const ALLOWED={legislation:['metadata','preamble','book','part','chapter','article','segment','annexes'],book:['part','chapter','article'],part:['chapter','article'],chapter:['article','segment'],article:['paragraph','amendment','explanation'],paragraph:['text','item','closing','references'],item:['text','item','closing','references'],segment:['heading','text'],annexes:['annex'],annex:['title','text','resource','table'],table:['row'],row:['cell'],amendment:['description','target','quotedProvision'],metadata:['title','shortTitle','issuer','source','file','version','classification','legalBasis','draftMaterials','editorialNotes'],draftMaterials:['generalJustification','articleJustification','opinionForm','opinionEvaluation','comparisonTable','impactAnalysis','budgetImpactForm']};
const directs=(node,name)=>Array.from(node?.children||[]).filter(x=>x.localName===name&&x.namespaceURI===NS);
const first=(node,name)=>directs(node,name)[0]||null;
const str=(x,n)=>first(x,n)?.textContent?.trim()||'';
const goodDate=d=>{if(!ISO.test(d))return false;const v=new Date(d+'T00:00:00Z');return !Number.isNaN(+v)&&v.toISOString().slice(0,10)===d;};
const attr=(e,name)=>e?.getAttribute(name)||'';
function nextLabel(i){const ch=ALPHABET[i%ALPHABET.length];return ch.repeat(Math.floor(i/ALPHABET.length)+1);}
function validateXml(xml,{allowLegacy=true}={}){
 const errors=[],warnings=[],info=[],stats={articles:0,paragraphs:0,bents:0,subbents:0,segments:0,annexes:0,books:0,parts:0,chapters:0};
 function fail(code,where,message){errors.push({code,where,message});}
 function warn(code,where,message){warnings.push({code,where,message});}
 let dom;
 try{dom=new DOMParser().parseFromString(String(xml||''),'application/xml');}catch(e){fail('XML','/',String(e.message||e));return {valid:false,errors,warnings,info,stats};}
 if(dom.getElementsByTagName('parsererror').length){fail('XML','/',dom.getElementsByTagName('parsererror')[0].textContent.slice(0,240));return {valid:false,errors,warnings,info,stats};}
 const main=dom.documentElement;
 if(main?.localName!=='legislation'||main.namespaceURI!==NS){fail('ROOT','/','Türkiye mevzuatı kök elemanı veya namespace geçersiz.');return {valid:false,errors,warnings,info,stats};}
 const version=attr(main,'schemaVersion'),legacy=version==='1.0';
 if(version!=='2.0'&&!(legacy&&allowLegacy))fail('SCHEMA','/','Desteklenen TR XML şema sürümleri: 1.0 ve 2.0.');
 const meta=first(main,'metadata'),classification=first(meta,'classification');
 if(!meta)fail('METADATA','/','Mevzuat üst bilgileri bulunamadı.');
 const code=attr(main,'code');if(!code)fail('CODE','/','Mevzuat kodu eksik.');
 if(attr(main,'language')!=='tr')fail('LANGUAGE','/','Türkiye mevzuatı için language="tr" olmalıdır.');
 if(!str(meta,'title') && !(attr(classification,'kind')==='genelge' && attr(classification,'stage')==='taslak'))fail('TITLE','metadata/title','Mevzuat adı boş.');
 if(!legacy){
   if(!classification)fail('CLASSIFICATION','metadata','v2.0 belgelerinde mevzuat türü/biçimi sınıflandırması zorunludur.');
   if(!TYPES.includes(attr(classification,'kind')))fail('CLASSIFICATION','metadata/classification','Mevzuat türü geçersiz.');
   if(!FORMS.includes(attr(classification,'form')))fail('CLASSIFICATION','metadata/classification','Müstakil veya çerçeve biçimi seçilmelidir.');
   if(!STAGES.includes(attr(classification,'stage')))fail('CLASSIFICATION','metadata/classification','Belge durumu geçersiz.');
   if(!CHANNELS.includes(attr(classification,'publicationChannel')))fail('CLASSIFICATION','metadata/classification','Yayım kanalı geçersiz.');
 }
 const stage=attr(classification,'stage'),form=attr(classification,'form'),kind=attr(classification,'kind'),channel=attr(classification,'publicationChannel');
 const file=first(meta,'file'),ver=first(meta,'version');
 const digest=attr(file,'sha256');if(digest&&!/^[a-f0-9]{64}$/i.test(digest))fail('HASH','metadata/file','SHA-256 özeti 64 onaltılık karakter olmalı.');
 const dt=attr(ver,'effectiveDate');if(dt&&!goodDate(dt))fail('DATE','metadata/version','Yürürlük tarihi geçersiz.');
 const application=attr(ver,'applicabilityDate');if(application&&!goodDate(application))fail('DATE','metadata/version','Uygulanabilirlik tarihi geçersiz.');
 const published=attr(first(meta,'source'),'publicationDate');if(published&&!goodDate(published))fail('DATE','metadata/source','Yayım tarihi geçersiz.');
 const used=new Set(),articleIds=[];
 const hasId=(node,where)=>{
   const id=attr(node,'id');if(!id){fail('ID',where,'Kimlik alanı eksik.');return;}
   if(!/^[\p{L}_][\p{L}\p{N}_.:-]*$/u.test(id))warn('ID',where,'Kimlik XML ID biçiminde olmayabilir: '+id);
   if(used.has(id))fail('DUP_ID',where,'Yinelenen mevzuat kimliği: '+id);
   used.add(id);
 };
 hasId(main,'legislation');
 function checkChildren(node,where){if(legacy)return;const allowed=ALLOWED[node.localName];if(!allowed)return;for(const ch of Array.from(node.children)){if(ch.namespaceURI!==NS||!allowed.includes(ch.localName))fail('ELEMENT',where,'Desteklenmeyen eleman: '+ch.nodeName);}}
 function paragraph(par,where,frame){stats.paragraphs++;hasId(par,where);const pn=attr(par,'number');
   if(frame&&pn)fail('FRAME_PAR',where,'Çerçeve maddelerde fıkra numaralandırılmaz (m.13/2).');
   if(!frame&&!legacy&&!pn)fail('PAR_NUMBER',where,'Normal/ek/geçici maddelerin fıkraları numaralı olmalıdır.');
   if(pn&&!/^[1-9][0-9]*$/.test(pn))fail('PAR_NUMBER',where,'Fıkra pozitif tam sayı olmalıdır.');
   const bents=directs(par,'item');bents.forEach((b,i)=>{
     stats.bents++;const w=where+' / '+attr(b,'label')+')';hasId(b,w);
     if(attr(b,'level')!=='bent')fail('BENT',w,'Bent level="bent" olmalıdır.');
     const label=attr(b,'label');if(!BENT.test(label))fail('BENT_LABEL',w,'Bent etiketi Türk alfabesine uygun değil.');
     if(!legacy&&label!==nextLabel(i))warn('BENT_ORDER',w,`Sıra kontrolü: beklenen ${nextLabel(i)}), bulunan ${label}). Eski/eklenen hükümler ayrıca incelenmelidir.`);
     if(!str(b,'text'))warn('BENT_TEXT',w,'Bent metni boş.');
     directs(b,'item').forEach((s,j)=>{
       stats.subbents++;const q=w+' / '+attr(s,'number')+')';hasId(s,q);
       if(attr(s,'level')!=='alt-bent')fail('SUBBENT',q,'Alt bent level="alt-bent" olmalıdır.');
       if(!/^[1-9][0-9]*$/.test(attr(s,'number')))fail('SUBBENT_NUMBER',q,'Alt bent numarası geçersiz.');
       if(!legacy&&Number(attr(s,'number'))!==j+1)warn('SUBBENT_ORDER',q,`Alt bent sırası ${j+1} olarak bekleniyor.`);
       if(!str(s,'text'))warn('SUBBENT_TEXT',q,'Alt bent metni boş.');
     });
   });
   if(!str(par,'text')&&!bents.length)warn('PAR_TEXT',where,'Fıkra içeriği bulunamadı.');
 }
 function article(a,where){stats.articles++;hasId(a,where);const no=attr(a,'number');
   if(!NUMBER.test(no))fail('ARTICLE_NUMBER',where,'Madde numarası örn. 9 veya 9/A olmalıdır.');
   const ak=attr(a,'kind')||(attr(a,'temporary')==='true'?'gecici':'normal');
   if(!KINDS.includes(ak))fail('ARTICLE_KIND',where,'Madde türü tanımlı değil.');
   if(!legacy&&ak!=='cerceve'&&!attr(a,'heading').trim())fail('HEADING',where,'Normal, ek ve geçici maddelerde başlık zorunludur (m.14).');
   if(!legacy&&ak==='cerceve'&&attr(a,'heading').trim())fail('FRAME_HEADING',where,'Çerçeve maddelerin başlığı bulunmaz (m.14).');
   if(ak==='cerceve'&&form==='mustakil')warn('FRAME_FORM',where,'Müstakil düzenlemede çerçeve madde bulundu, kaynağı kontrol edin.');
   if(ak!=='cerceve'&&form==='cerceve')warn('FRAME_FORM',where,'Çerçeve düzenlemede normal madde bulunuyor olabilir (yürürlük/yürütme maddeleri de çerçeve biçimindedir).');
   if(/\.$/.test(attr(a,'heading')))warn('HEADING_PUNCT',where,'Madde başlığının sonuna nokta konulmaz (m.14/3).');
   const pp=directs(a,'paragraph');pp.forEach((p,i)=>{
     paragraph(p,where+' / ('+(attr(p,'number')||'?')+')',ak==='cerceve');
     if(!legacy&&ak!=='cerceve'&&attr(p,'number')&&Number(attr(p,'number'))!==i+1)warn('PAR_ORDER',where,'Fıkra numaraları sıralı değil.');
   });
   if(!pp.length&&!directs(a,'amendment').length&&attr(a,'status')!=='mulga')fail('EMPTY_ARTICLE',where,'Madde içeriği boş.');
   articleIds.push(attr(a,'id'));
 }
 function segment(s,where){stats.segments++;hasId(s,where);if(!directs(s,'text').length)fail('SEGMENT_TEXT',where,'Maddesiz bölüm metni eksik.');}
 function div(node,where){hasId(node,where);const type=node.localName;stats[type==='book'?'books':type==='part'?'parts':'chapters']++;
   if(!attr(node,'title'))fail('DIV_HEADING',where,'Kitap/kısım/bölüm başlığı boş.');
   if(!/^[1-9][0-9]*$/.test(attr(node,'number')))fail('DIV_NUMBER',where,'Bölüm numarası geçersiz.');
   for(const ch of Array.from(node.children))visit(ch,where+' / '+type+' '+attr(node,'number'));
 }
 function visit(node,where){if(node.namespaceURI!==NS)return;checkChildren(node,where);
   switch(node.localName){case 'book':case 'part':case 'chapter':div(node,where);break;
     case 'article':article(node,where+' / '+attr(node,'number'));break;
     case 'segment':segment(node,where);break;
     case 'annexes':for(const a of directs(node,'annex')){stats.annexes++;hasId(a,where+' / ek '+attr(a,'number'));if(!str(a,'title'))warn('ANNEX_TITLE',where,'Ek başlığı bulunamadı.');if(!directs(a,'text').length&&!directs(a,'table').length&&!directs(a,'resource').length)fail('ANNEX_EMPTY',where,'Ek içeriği boş.');}break;
   }
 }
 for(const node of Array.from(main.children).filter(x=>x.localName!=='metadata'&&x.localName!=='preamble'))visit(node,'mevzuat');
 if(!legacy&&stats.articles===0 && !(stats.segments && ['genelge','teblig'].includes(kind)))fail('NO_ARTICLE','mevzuat','Madde bulunamadı. Maddesiz biçim yalnız tebliğ/genelge istisnasında kullanılabilir.');
 if(!legacy&&stats.segments && !['genelge','teblig'].includes(kind))warn('SEGMENT_KIND','mevzuat','Maddesiz bölümlendirme için düzenlemenin türünü kontrol edin (m.10/2).');
 if(stage==='taslak'&&kind!=='genelge'&&!str(first(meta,'draftMaterials'),'generalJustification'))fail('JUSTIFICATION','metadata/draftMaterials','Taslakta genel gerekçe zorunludur (m.10/1).');
 if(stage==='taslak'&&['kanun','cumhurbaskanligi-kararnamesi'].includes(kind)){
   const docs=first(meta,'draftMaterials'),refs=new Set(directs(docs,'articleJustification').map(n=>attr(n,'articleRef')));
   for(const id of articleIds)if(!refs.has(id))fail('ARTICLE_JUSTIFICATION','metadata/draftMaterials','Kanun/CBK taslağında madde gerekçesi yok: '+id);
   if(!first(docs,'impactAnalysis'))fail('IMPACT','metadata/draftMaterials','Kanun/CBK taslağında düzenleyici etki analizi referansı bulunamadı.');
 }
 if(!legacy&&stage==='taslak'&&attr(classification,'budgetImpactExpected')==='true'&&!first(first(meta,'draftMaterials'),'budgetImpactForm'))fail('BUDGET_IMPACT','metadata/draftMaterials','Bütçe etkisi işaretlenen taslakta bütçe etki formu referansı yok (m.10/1, m.27).');
 if(!legacy&&stage==='taslak'&&str(meta,'title')&&str(meta,'title')!==str(meta,'title').toLocaleUpperCase('tr-TR'))warn('TITLE_CASE','metadata/title','Taslak adı büyük harflerle yazılmalı (m.11).');
 if(!legacy&&channel==='resmi-gazete'&&['talimat','yonerge'].includes(kind))warn('CHANNEL','metadata/classification','Resmî Gazete düzenleyici işlem adlandırması ve özel dayanağı ayrıca kontrol edilmeli (m.11/4).');
 if(legacy)info.push({code:'LEGACY',message:'v1.0 arşiv XML’i aynen korunur; not kimlikleri değiştirilmez.'});
 return {valid:!errors.length,errors,warnings,info,stats,version,classification:{kind,form,stage,channel}};
}
root.EasaTrSchema={validateXml,ALPHABET,TYPES,FORMS,STAGES,CHANNELS,KINDS,version:'2.0'};
if(typeof module!=='undefined'&&module.exports)module.exports=root.EasaTrSchema;
})(typeof window!=='undefined'?window:globalThis);
