/* Havacılık Mevzuatı Hub v3.11. TR XML v1/v2 -> stable processed records.
 * Existing v1.0 article keys, sub-clause anchors and release fingerprints unchanged.
 * Version 2.0 supports book/part/chapter, extra/temporary/framework articles,
 * article-less circular segments and annexes. Never silently rewrite legal text.
 */
(function(root){
'use strict';
const NS='urn:eyuik:legislation:tr:v1';
const tidy=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const child=(el,name)=>Array.from(el?.children||[]).find(e=>e.localName===name&&e.namespaceURI===NS)||null;
const kids=(el,name)=>Array.from(el?.children||[]).filter(e=>e.localName===name&&e.namespaceURI===NS);
const childText=(el,name)=>tidy(child(el,name)?.textContent||'');
const mark=s=>String(s||'').replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-');
const kinds={normal:'MADDE',ek:'EK MADDE',gecici:'GEÇİCİ MADDE',cerceve:'MADDE'};
function parseTrXml(xml,onProgress){
 const dom=new DOMParser().parseFromString(xml,'application/xml');
 const pe=dom.getElementsByTagName('parsererror')[0];if(pe)throw Error('Türkiye mevzuatı XML hatası: '+tidy(pe.textContent).slice(0,240));
 const rootEl=dom.documentElement;
 if(rootEl.localName!=='legislation'||rootEl.namespaceURI!==NS)throw Error('Bu XML desteklenen Türkiye mevzuatı biçiminde değil.');
 const schemaVersion=rootEl.getAttribute('schemaVersion');
 if(!['1.0','2.0'].includes(schemaVersion))throw Error('TR mevzuatı XML şema sürümü desteklenmiyor: '+schemaVersion);
 if(schemaVersion==='2.0'&&!root.EasaTrSchema?.validateXml)throw Error('TR v2.0 XML doğrulama dosyası eksik: src/tr-schema.js');
 if(root.EasaTrSchema?.validateXml){
   const validation=root.EasaTrSchema.validateXml(xml);
   if(!validation.valid)throw Error('Mevzuat XML doğrulaması: '+validation.errors.slice(0,4).map(e=>e.message).join(' · '));
 }
 const metadata=child(rootEl,'metadata');if(!metadata)throw Error('XML metadata bulunamadı.');
 const code=(rootEl.getAttribute('code')||childText(metadata,'shortTitle')).trim().toLocaleUpperCase('tr-TR');
 if(!code||code.length>80||!/[A-ZÇĞİÖŞÜ]/.test(code))throw Error('Mevzuat kodu geçersiz.');
 const title=childText(metadata,'title')||(child(metadata,'classification')?.getAttribute('kind')==='genelge'?'Genelge · '+code:'');if(!title)throw Error('Mevzuat adı bulunamadı.');
 const source=child(metadata,'source'),file=child(metadata,'file'),ver=child(metadata,'version'),cl=child(metadata,'classification');
 const published=source?.getAttribute('publicationDate')||ver?.getAttribute('date')||'';
 const sha=file?.getAttribute('sha256')||'',effectiveDate=ver?.getAttribute('effectiveDate')||'',applicabilityDate=ver?.getAttribute('applicabilityDate')||'';
 const sourceLabel=[code,source?.getAttribute('number')?'Resmî Gazete '+source.getAttribute('number'):''].filter(Boolean).join(' · ');
 const records=[],uniqueKeys=new Set(),categories=[];let chapters=0;
 function put(record){
   if(!record.id)throw Error('Kimliksiz mevzuat hükmü.');
   if(uniqueKeys.has(record.key))throw Error('Tekrarlanan hüküm kimliği: '+record.id);
   if(!record.blocks.length)throw Error('Boş hüküm: '+record.title);
   uniqueKeys.add(record.key);records.push(record);if(!categories.includes(record.category))categories.push(record.category);
 }
 function regArticle(art,ctx){
   const id=art.getAttribute('id')||'',num=art.getAttribute('number')||'',ak=art.getAttribute('kind')||(art.getAttribute('temporary')==='true'?'gecici':'normal');
   const heading=art.getAttribute('heading')||'',name=(kinds[ak]||'MADDE')+' '+num+(heading?' — '+heading:'');
   const category=ctx.length?ctx[ctx.length-1].caption:'Maddeler';
   const blocks=[];
   for(const item of Array.from(art.children)){
     if(item.namespaceURI!==NS)continue;
     if(item.localName==='paragraph'){
       const pn=item.getAttribute('number'),ptext=childText(item,'text');
       if(ptext)blocks.push({t:(pn?'('+pn+') ':'')+ptext,level:0});
       for(const b of kids(item,'item')){
         const label=b.getAttribute('label')||'';if(!label)throw Error('Etiketsiz bent: '+id);
         blocks.push({t:label+') '+childText(b,'text'),level:1});
         for(const sub of kids(b,'item')){
           const no=sub.getAttribute('number')||'';if(!no)throw Error('Numarasız alt bent: '+id);
           blocks.push({t:no+') '+childText(sub,'text'),level:2});
         }
         const bc=childText(b,'closing');if(bc)blocks.push({t:bc,level:1});
       }
       const closing=childText(item,'closing');if(closing)blocks.push({t:closing,level:0});
     }else if(item.localName==='amendment'){
       const desc=childText(item,'description');if(desc)blocks.push({t:desc,level:0});
       for(const quote of kids(item,'quotedProvision'))if(tidy(quote.textContent))blocks.push({t:tidy(quote.textContent),level:1});
     }else if(item.localName==='explanation'){
       if(tidy(item.textContent))blocks.push({t:tidy(item.textContent),level:0});
     }
   }
   if(art.getAttribute('status')==='mulga'&&!blocks.length)blocks.push({t:'Mülga',level:0});
   put({id,erules:id,title:name.trim(),kind:'IR',type:'TR legislation',subject:ctx.at(-1)?.title||'',source:sourceLabel,
        category,path:ctx.flatMap(x=>[x.pathLabel,x.title]),applicability:applicabilityDate,effective:art.getAttribute('effectiveDate')||effectiveDate,parentIR:'',
        sourcePage:art.getAttribute('sourcePage')||'',key:'tr:'+id,blocks,plain:blocks.map(b=>b.t).join('\n'),
        legalKind:ak,legalStatus:art.getAttribute('status')||'aktif'});
 }
 function regSegment(seg,ctx){
   const id=seg.getAttribute('id')||'',titlePart=childText(seg,'heading');
   const blocks=kids(seg,'text').map(t=>({t:tidy(t.textContent),level:0})).filter(b=>b.t);
   put({id,erules:id,title:titlePart||'Bölümlendirilmiş metin '+(seg.getAttribute('order')||records.length+1),kind:'IR',type:'TR legislation',
     subject:ctx.at(-1)?.title||'',source:sourceLabel,category:ctx.at(-1)?.caption||'Genelge / Tebliğ',
     path:ctx.flatMap(x=>[x.pathLabel,x.title]),applicability:applicabilityDate,effective:effectiveDate,parentIR:'',
     sourcePage:seg.getAttribute('sourcePage')||'',key:'tr:'+id,blocks,plain:blocks.map(b=>b.t).join('\n'),legalKind:'segment'});
 }
 function regAnnexes(node){
   for(const a of kids(node,'annex')){
     const id=a.getAttribute('id')||'',number=a.getAttribute('number')||'',blocks=[];
     for(const x of Array.from(a.children)){
       if(x.namespaceURI!==NS||x.localName==='title')continue;
       if(x.localName==='text'&&tidy(x.textContent))blocks.push({t:tidy(x.textContent),level:0});
       if(x.localName==='resource')blocks.push({t:'Ek dosya: '+(x.getAttribute('file')||'Kaynak dosya'),level:0});
       if(x.localName==='table'){
         const rows=kids(x,'row').map(r=>kids(r,'cell').map(c=>tidy(c.textContent)));
         if(rows.length)blocks.push({rows});
       }
     }
     if(!blocks.length)blocks.push({t:'Ek içeriği',level:0});
     const heading=childText(a,'title');
     put({id,erules:id,title:'EK-'+number+' — '+heading,kind:'IR',type:'TR annex',subject:'Ekler',source:sourceLabel,
       category:'Ekler',path:['Ekler'],applicability:applicabilityDate,effective:effectiveDate,parentIR:'',sourcePage:a.getAttribute('sourcePage')||'',
       key:'tr:'+id,blocks,plain:blocks.map(b=>b.t||b.rows?.map(r=>r.join(' | ')).join('\n')||'').join('\n'),legalKind:'annex'});
   }
 }
 function visit(parent,ctx){
   for(const item of Array.from(parent.children)){
     if(item.namespaceURI!==NS)continue;
     if(['book','part','chapter'].includes(item.localName)){
       const word={book:'KİTAP',part:'KISIM',chapter:'BÖLÜM'}[item.localName];
       const ordinal=item.getAttribute('ordinal')||item.getAttribute('number')||'';
       const entry={type:item.localName,title:item.getAttribute('title')||'',pathLabel:ordinal+' '+word,caption:ordinal+' '+word+' · '+(item.getAttribute('title')||'')};
       if(item.localName==='chapter')chapters++;
       visit(item,[...ctx,entry]);
     }else if(item.localName==='article')regArticle(item,ctx);
     else if(item.localName==='segment')regSegment(item,ctx);
     else if(item.localName==='annexes')regAnnexes(item);
   }
 }
 visit(rootEl,[]);
 if(!records.length)throw Error('Türkiye mevzuatında okunabilir hüküm, bölüm veya ek bulunamadı.');
 const familyId='tr-'+mark(code).toLowerCase();
 // Intentional identity compatibility: same article wording + same IDs => same
 // fingerprint as legacy v1, regardless of schema metadata.
 const basis=records.map(x=>x.key+'|'+x.title+'|'+x.plain).join('\n');
 let hash=0xcbf29ce484222325n;
 for(let i=0;i<basis.length;i++){hash^=BigInt(basis.charCodeAt(i));hash=BigInt.asUintN(64,hash*0x100000001b3n);}
 const fingerprint=hash.toString(16).padStart(16,'0');
 const versionId=familyId+'|'+(published||'undated')+'|'+fingerprint;
 onProgress?.(100,records.length+' kayıt işlendi');
 return {familyId,versionId,title,published,guid:fingerprint,source:'Türkiye mevzuatı / yapılandırılmış XML',jurisdiction:'TR',language:'tr',code,parseSchema:schemaVersion==='2.0'?5:4,records,
   metadata:{issuer:childText(metadata,'issuer'),effectiveDate,applicabilityDate,gazetteNumber:source?.getAttribute('number')||'',sourceUrl:source?.getAttribute('url')||'',
     rawSha256:sha,trSchemaVersion:schemaVersion,documentKind:cl?.getAttribute('kind')||'',documentForm:cl?.getAttribute('form')||'',documentStage:cl?.getAttribute('stage')||'',
     publicationChannel:cl?.getAttribute('publicationChannel')||''},
   stats:{total:records.length,matched:records.length,chapters,elapsedMs:0}};
}
root.parseTrXml=parseTrXml;
if(typeof module!=='undefined'&&module.exports)module.exports={parseTrXml};
})(typeof window!=='undefined'?window:globalThis);
