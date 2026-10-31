/* eRules Hub v3.9: importer for reviewed, structured Turkish regulation XML.
   Input: urn:eyuik:legislation:tr:v1 - no remote service or embedded legislation.
   The original text, numbering, provenance and each subsection ID are preserved.
*/
(function(root){
'use strict';
const NS='urn:eyuik:legislation:tr:v1';
const tidy=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function child(el,name){return Array.from(el?.children||[]).find(e=>e.localName===name&&e.namespaceURI===NS)||null;}
function kids(el,name){return Array.from(el?.children||[]).filter(e=>e.localName===name&&e.namespaceURI===NS);}
function childText(el,name){return tidy(child(el,name)?.textContent||'');}
function mark(s){return String(s||'').replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-');}
function parseTrXml(xml,onProgress){
 const dom=new DOMParser().parseFromString(xml,'application/xml');
 const pe=dom.querySelector('parsererror');
 if(pe)throw Error('Türkçe mevzuat XML yapısı hatalı: '+tidy(pe.textContent).slice(0,240));
 const rootEl=dom.documentElement;
 if(rootEl.localName!=='legislation'||rootEl.namespaceURI!==NS)throw Error('Bu dosya EASA XML veya desteklenen TR mevzuat XML biçiminde değil.');
 if(rootEl.getAttribute('schemaVersion')!=='1.0')throw Error('Desteklenmeyen TR mevzuatı XML şema sürümü.');
 const metadata=child(rootEl,'metadata');if(!metadata)throw Error('XML metadata bölümü bulunamadı.');
 const code=(rootEl.getAttribute('code')||childText(metadata,'shortTitle')).trim().toUpperCase();
 if(!code||code.length>80||!/[A-ZÇĞİÖŞÜ]/.test(code))throw Error('Mevzuat kodu geçersiz.');
 const title=childText(metadata,'title');if(!title)throw Error('Mevzuat adı bulunamadı.');
 const source=child(metadata,'source');const filename=child(metadata,'file');const ver=child(metadata,'version');
 const published=source?.getAttribute('publicationDate')||ver?.getAttribute('date')||'';
 const sha=filename?.getAttribute('sha256')||'';
 const effectiveDate=ver?.getAttribute('effectiveDate')||'';
 const sourceLabel=[code,source?.getAttribute('number')?'Resmî Gazete '+source.getAttribute('number'):''].filter(Boolean).join(' · ');
 const records=[],uniqueKeys=new Set();let chapters=0;
 const categories=[];
 for(const chap of kids(rootEl,'chapter')){
   chapters++;
   const ordinal=chap.getAttribute('ordinal')||'';
   const chapterTitle=chap.getAttribute('title')||'';
   const chapterName=(ordinal?ordinal+' BÖLÜM':'BÖLÜM '+chapters);
   const category=chapterName+' · '+chapterTitle;
   categories.push(category);
   for(const art of kids(chap,'article')){
     const id=art.getAttribute('id')||'';
     if(!id)throw Error('Kimliksiz madde bulundu.');
     const num=art.getAttribute('number')||'';
     const temporary=art.getAttribute('temporary')==='true';
     const heading=art.getAttribute('heading')||'';
     const name=(temporary?'GEÇİCİ MADDE ':'MADDE ')+num+' — '+heading;
     const key='tr:'+id;
     if(uniqueKeys.has(key))throw Error('Tekrarlanan madde kimliği: '+id);
     uniqueKeys.add(key);
     const blocks=[];
     for(const par of kids(art,'paragraph')){
       const pn=par.getAttribute('number');
       const ptext=childText(par,'text');
       if(ptext)blocks.push({t:(pn?'('+pn+') ':'')+ptext,level:0});
       for(const bent of kids(par,'item')){
         const code=bent.getAttribute('label')||'';
         if(!code)throw Error('Etiketsiz bent: '+id);
         const btext=childText(bent,'text');
         blocks.push({t:code+') '+btext,level:1});
         for(const sub of kids(bent,'item')){
           const no=sub.getAttribute('number')||'';
           if(!no)throw Error('Numarasız alt bent: '+id);
           blocks.push({t:no+') '+childText(sub,'text'),level:2});
         }
       }
       const closing=childText(par,'closing');if(closing)blocks.push({t:closing,level:0});
     }
     if(!blocks.length)throw Error('Boş madde: '+name);
     records.push({
       id,erules:id,title:name,kind:'IR',type:'TR legislation',subject:chapterTitle,
       source:sourceLabel,category,path:[chapterName,chapterTitle],applicability:'',effective:effectiveDate,parentIR:'',
       sourcePage:art.getAttribute('sourcePage')||'',key,
       blocks,plain:blocks.map(b=>b.t).join('\n')
     });
   }
 }
 if(!records.length)throw Error('Türkçe mevzuatta madde bulunamadı.');
 const slug=mark(code).toLowerCase();
 const familyId='tr-'+slug;
 // A content-based fingerprint preserves identity across PDF/DOCX exports
 // when the legislative wording and numbering are identical.
 const basis=records.map(x=>x.key+'|'+x.title+'|'+x.plain).join('\n');
 let hash=0xcbf29ce484222325n;
 for(let i=0;i<basis.length;i++){hash^=BigInt(basis.charCodeAt(i));hash=BigInt.asUintN(64,hash*0x100000001b3n);}
 const fingerprint=hash.toString(16).padStart(16,'0');
 const versionId=familyId+'|'+(published||'undated')+'|'+fingerprint;
 onProgress?.(100,records.length+' madde işlendi');
 return {familyId,versionId,title,published,guid:fingerprint,source:'Türkiye mevzuatı / yapılandırılmış XML',jurisdiction:'TR',language:'tr',code,parseSchema:4,records,
  metadata:{issuer:childText(metadata,'issuer'),effectiveDate:effectiveDate,gazetteNumber:source?.getAttribute('number')||'',sourceUrl:source?.getAttribute('url')||'',rawSha256:sha},
  stats:{total:records.length,matched:records.length,chapters,elapsedMs:0}};
}
root.parseTrXml=parseTrXml;
if(typeof module!=='undefined'&&module.exports)module.exports={parseTrXml};
})(typeof globalThis!=='undefined'?globalThis:this);
