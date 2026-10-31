/* EASA/TR Mevzuat Hub v3.10: local DOCX / text-layer PDF -> reviewable TR XML.
   No legal source, user credentials or XML content is bundled in this script.
   PDF.js 3.11.174 is loaded only when extracting a PDF; offline DOCX remains supported.
   Text extraction is not OCR. All structure is a candidate until human approval.
*/
(function(root){
'use strict';
const NS='urn:eyuik:legislation:tr:v1';
const ORD=['BİRİNCİ','İKİNCİ','ÜÇÜNCÜ','DÖRDÜNCÜ','BEŞİNCİ','ALTINCI','YEDİNCİ','SEKİZİNCİ','DOKUZUNCU','ONUNCU','ON BİRİNCİ','ON İKİNCİ','ON ÜÇÜNCÜ','ON DÖRDÜNCÜ','ON BEŞİNCİ'];
const ARTICLE=/^(?:(GEÇİCİ)\s+)?MADDE\s*(\d{1,4})\s*[-–—.:]?\s*(.*)$/i;
const PAR=/^\((\d{1,3})\)\s*(.*)$/;
const BENT=/^([a-zçğıöşü]{1,3})\)\s*(.*)$/i;
const SUB=/^(\d{1,3})\)\s*(.*)$/;
const CHAPTER=/^((?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SEKİZİNCİ|DOKUZUNCU|ONUNCU|ON\s+BİRİNCİ|ON\s+İKİNCİ|ON\s+ÜÇÜNCÜ|ON\s+DÖRDÜNCÜ|ON\s+BEŞİNCİ))\s+BÖLÜM$/i;
const strip=s=>String(s??'').replace(/[\u00ad\u200b-\u200d\ufeff]/g,'').replace(/\u00a0/g,' ').replace(/[\t ]+/g,' ').trim();
const scrub=s=>strip(s).replace(/\s+/g,' ');
const lower=s=>String(s||'').toLocaleLowerCase('tr-TR');
const el=(doc,name,attrs={})=>{const x=doc.createElementNS(NS,name);for(const [key,val] of Object.entries(attrs))if(val!==null&&val!==undefined&&String(val)!=='')x.setAttribute(key,String(val));return x;};
const txt=(doc,parent,name,value)=>{const x=el(doc,name);x.textContent=String(value??'');parent.appendChild(x);return x;};
function addWarning(warnings,text){if(warnings.length<220)warnings.push(text);}
function skipNoise(line,seenChapter){
 const s=strip(line);
 if(!s)return true;
 if(/^https?:\/\/\S+\s+(?:\d+\s*\/\s*\d+)?$/i.test(s))return true;
 if(/^\d+\s*\/\s*\d+$/.test(s))return true;
 if(/^\d{1,2}\.\d{1,2}\.\d{4}\s+\d{1,2}:\d{2}(?:\s|$)/.test(s))return true;
 if(/\bResm[îi]\s+Gazete\b/i.test(s)&&(/\bSay[ıi]\s*[:：]/i.test(s)||/\bCUMA\b/i.test(s)))return true;
 if(/^\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4}\s+(?:PAZARTESİ|SALI|ÇARŞAMBA|PERŞEMBE|CUMA|CUMARTESİ|PAZAR)$/i.test(s))return true;
 if(!seenChapter && (/^YÖNETMELİK$/i.test(s)||/^TEBLİĞ$/i.test(s)||/^TALİMAT$/i.test(s)||/^(Sivil\s+Havacılık\s+Genel\s+Müdürlüğünden:?)$/i.test(s)))return true;
 return false;
}
function isHeadingCandidate(s){return s.length<200&&!/^(?:\(?\d+\)?|[a-zçğıöşü]{1,3}\))\s/.test(s)&&!/[.;,:]$/.test(s)&&!CHAPTER.test(s)&&!ARTICLE.test(s)&&!/^\b(?:EK|EKLER|ÇİZELGE|TABLO)\b[\s\-\d]*$/i.test(s);}
function parseText(input,{code='TR-MEVZUAT',title='',issuer='',publicationDate='',gazetteNumber='',effectiveDate='',sourceUrl=''}={}){
 const warnings=[];const notes=[];
 let lines=Array.isArray(input)?input.map(x=>typeof x==='string'?{text:x,page:0}:{text:x.text,page:x.page||0}):String(input||'').split(/\r?\n/).map(s=>({text:s,page:0}));
 lines=lines.map(x=>({text:strip(x.text),page:x.page}));
 const rawNonempty=lines.filter(x=>x.text);
 const chapters=[];let currentChap=null,art=null,par=null,bent=null,sub=null,lastBody=null;
 let ignored=0,heads=0,sourceText=0,appendixSeen=false;
 const append=(target,s,page)=>{target.text=scrub((target.text||'')+' '+s);if(page&&!target.pages.includes(page))target.pages.push(page);};
 const newPar=(no,content,page)=>{const id=art.id+'.F'+(no===null?'0':no);par={number:no,id,text:content,pages:page?[page]:[],bents:[],closing:''};art.paragraphs.push(par);bent=sub=null;lastBody=par;};
 for(let i=0;i<lines.length;i++){
   let {text:s,page}=lines[i];if(!s)continue;
   const cm=CHAPTER.exec(s);
   if(cm){
     const ordinal=cm[1].replace(/\s+/g,' ').toLocaleUpperCase('tr-TR');const n=ORD.indexOf(ordinal)+1;
     let titleLine='';let j=i+1;while(j<lines.length&&!lines[j].text)j++;
     if(j<lines.length&&!ARTICLE.test(lines[j].text)&&!CHAPTER.test(lines[j].text)){
       titleLine=lines[j].text;i=j;
     }else addWarning(warnings,ordinal+' BÖLÜM başlığı bulunamadı.');
     currentChap={number:n||chapters.length+1,ordinal,title:titleLine||'Başlıksız Bölüm',page,articles:[]};chapters.push(currentChap);
     art=par=bent=sub=lastBody=null;heads++;continue;
   }
   if(skipNoise(s,!!chapters.length))continue;
   if(!chapters.length){
     if(!title&&/(?:YÖNETMELİĞİ|TALİMATI|GENELGESİ|TEBLİĞİ)(?:\s*\(.+\))?$/i.test(s)&&s.length<230)notes.push({title:s});
     ignored++;continue;
   }
   let heading='';let m=ARTICLE.exec(s);
   if(!m&&isHeadingCandidate(s)){
     let j=i+1;while(j<lines.length&&skipNoise(lines[j].text,true))j++;
     if(j<lines.length&&ARTICLE.test(lines[j].text)){
       heading=s;i=j;s=lines[i].text;page=lines[i].page;m=ARTICLE.exec(s);
     }
   }
   if(m){
     if(!currentChap){addWarning(warnings,'Madde bölüm dışında bulundu.');continue;}
     const temp=!!m[1],no=Number(m[2]),id=`TR.${code}.${temp?'G':'M'}${no}`;
     heading=heading||'';
     art={number:no,temporary:temp,id,heading,page,paragraphs:[]};currentChap.articles.push(art);
     par=bent=sub=lastBody=null;
     let remainder=strip(m[3]);
     if(remainder){const fm=PAR.exec(remainder);if(fm)newPar(Number(fm[1]),fm[2],page);else newPar(null,remainder,page);}
     sourceText++;continue;
   }
   if(/^\s*(?:EKLER|EK\s*[-–]?\s*\d+|ÇİZELGE\s*\d*|TABLO\s*\d+)\s*$/i.test(s)){
     appendixSeen=true;addWarning(warnings,'EK / tablo başlığı görüldü: '+s+'. Bu tür içeriklerin ayrıştırılması elle kontrol edilmelidir.');
   }
   const fm=PAR.exec(s);
   if(fm&&art){newPar(Number(fm[1]),fm[2],page);continue;}
   const bm=BENT.exec(s);
   if(bm&&par){
     const label=lower(bm[1]);bent={label,id:par.id+'.B'+label,text:bm[2],pages:page?[page]:[],children:[]};par.bents.push(bent);
     sub=null;lastBody=bent;continue;
   }
   const sm=SUB.exec(s);
   if(sm&&bent){
     const no=Number(sm[1]);sub={number:no,id:bent.id+'.A'+no,text:sm[2],pages:page?[page]:[]};bent.children.push(sub);lastBody=sub;continue;
   }
   if(art){
     if(!par)newPar(null,'',page);
     if(/^\s*(?:ifade\s+eder|ifade\s+eder\.|şeklinde\s+ifade\s+eder\.)\s*$/i.test(s)&&par.bents.length){par.closing=s;lastBody=null;continue;}
     if(lastBody)append(lastBody,s,page);else if(par.bents.length)par.closing=scrub((par.closing||'')+' '+s);else append(par,s,page);
     continue;
   }
   ignored++;addWarning(warnings,'Bölümde maddeye bağlanamayan metin: '+s.slice(0,125));
 }
 const articles=chapters.flatMap(c=>c.articles);
 const unique=new Set(),dups=[];
 for(const a of articles)if(unique.has(a.id))dups.push(a.id);else unique.add(a.id);
 if(dups.length)addWarning(warnings,'Yinelenen madde kimlikleri: '+dups.join(', '));
 const regular=articles.filter(x=>!x.temporary).map(x=>x.number);
 const missing=regular.length?Array.from({length:Math.max(...regular)},(_,i)=>i+1).filter(n=>!regular.includes(n)):[];
 if(missing.length)addWarning(warnings,'MADDE numaralarında atlama var: '+missing.slice(0,15).join(', '));
 if(!chapters.length)addWarning(warnings,'BÖLÜM başlıkları bulunamadı; belge bu şablonla yayımlanamaz.');
 if(!articles.length)addWarning(warnings,'MADDE başlıkları bulunamadı.');
 if(ignored>0)addWarning(warnings,`${ignored} satır madde dışı / üst bilgi olarak atlandı. Mevzuat hükümleri içermediğini kontrol edin.`);
 const stats={chapters:chapters.length,articles:articles.length,paragraphs:articles.reduce((n,a)=>n+a.paragraphs.length,0),items:articles.reduce((n,a)=>n+a.paragraphs.reduce((v,p)=>v+p.bents.length,0),0),subitems:articles.reduce((n,a)=>n+a.paragraphs.reduce((v,p)=>v+p.bents.reduce((x,b)=>x+b.children.length,0),0),0),ignored,appendixSeen};
 const critical=[];if(!articles.length)critical.push('Madde bulunamadı.');if(!chapters.length)critical.push('Bölüm bulunamadı.');if(dups.length)critical.push('Tekrarlanan madde numaraları var.');if(chapters.some(c=>!c.articles.length))critical.push('Maddesi bulunmayan bölüm var.');if(appendixSeen)critical.push('Ek/tablo bulunan belgelerde ek içerik ayrıştırılması doğrulanmadan yayımlanmamalı.');
 const empty=articles.filter(a=>!a.paragraphs.length||a.paragraphs.every(p=>!p.text&&!p.bents.length));
 if(empty.length)critical.push('Metni boş maddeler bulundu: '+empty.slice(0,8).map(a=>a.number).join(', '));
 return {chapters,articles,stats,warnings,critical,titleSuggestion:notes.find(x=>x.title)?.title||'',sourceLines:rawNonempty.length};
}
function makeXml(parsed,opts){
 if(parsed.critical.length)throw Error('Yayımlama engeli: '+parsed.critical.join(' '));
 const code=scrub(opts.code).toLocaleUpperCase('tr-TR');const title=scrub(opts.title);
 if(!/^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9._\/-]{1,79}$/.test(code))throw Error('Mevzuat kodu geçersiz (ör. SHY-OLAY).');
 if(title.length<6||title.length>280)throw Error('Mevzuat adı 6–280 karakter olmalıdır.');
 const validateDate=(s,name)=>{if(!s)return;const d=new Date(s+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)throw Error(name+' tarihi YYYY-AA-GG olmalıdır.');};
 validateDate(opts.publicationDate,'Yayım');validateDate(opts.effectiveDate,'Yürürlük');
 if(!opts.publicationDate)throw Error('Resmî yayım tarihini girin; sürüm kimliği buna bağlanacak.');
 const doc=document.implementation.createDocument(NS,'tr:legislation',null),r=doc.documentElement;
 r.setAttribute('schemaVersion','1.0');r.setAttribute('code',code);r.setAttribute('language','tr');r.setAttribute('id','TR.'+code);
 const meta=el(doc,'metadata');r.appendChild(meta);
 txt(doc,meta,'title',title);txt(doc,meta,'shortTitle',code);txt(doc,meta,'issuer',scrub(opts.issuer)||'Kaynak mevzuat');
 meta.appendChild(el(doc,'source',{type:'document-upload',publicationDate:opts.publicationDate,number:opts.gazetteNumber||'',url:opts.sourceUrl||''}));
 meta.appendChild(el(doc,'file',{name:opts.filename||'',sha256:opts.sha256||''}));
 meta.appendChild(el(doc,'version',{date:opts.publicationDate,mode:'as-published',effectiveDate:opts.effectiveDate||''}));
 for(const chap of parsed.chapters){
   const c=el(doc,'chapter',{id:`TR.${code}.CH${chap.number}`,number:chap.number,ordinal:chap.ordinal,title:chap.title,sourcePage:chap.page||''});r.appendChild(c);
   for(const art of chap.articles){
     const aid=`TR.${code}.${art.temporary?'G':'M'}${art.number}`;
     const a=el(doc,'article',{number:art.number,temporary:art.temporary?'true':'false',heading:art.heading,id:aid,sourcePage:art.page||''});a.setAttribute('heading',art.heading||'');c.appendChild(a);
     for(const par of art.paragraphs){
       const pid=aid+'.F'+(par.number===null?'0':par.number),attrs={id:pid,sourcePages:par.pages.join(',')};if(par.number!==null)attrs.number=par.number;
       const p=el(doc,'paragraph',attrs);p.setAttribute('sourcePages',par.pages.join(','));a.appendChild(p);txt(doc,p,'text',par.text);
       for(const b of par.bents){
         const bid=pid+'.B'+b.label,be=el(doc,'item',{id:bid,level:'bent',label:b.label,sourcePages:b.pages.join(',')});be.setAttribute('sourcePages',b.pages.join(','));p.appendChild(be);txt(doc,be,'text',b.text);
         for(const sub of b.children){const s=el(doc,'item',{id:bid+'.A'+sub.number,level:'alt-bent',number:sub.number,sourcePages:sub.pages.join(',')});s.setAttribute('sourcePages',sub.pages.join(','));be.appendChild(s);txt(doc,s,'text',sub.text);}
       }
       if(par.closing)txt(doc,p,'closing',par.closing);
     }
   }
 }
 return '<?xml version="1.0" encoding="utf-8"?>\n'+new XMLSerializer().serializeToString(doc);
}
async function digest(file){if(!crypto?.subtle)throw Error('Dosya bütünlük kontrolü için HTTPS gereklidir.');const bytes=new Uint8Array(await file.arrayBuffer()),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');}
function infer(filename,text){
 const code=/(?:SHY|SHT|GEN|TAL|HKY|SHGM)[-_][A-ZÇĞİÖŞÜ0-9._-]+/i.exec(filename)?.[0]?.replace(/\.(?:DOCX|PDF|TXT)$/i,'').replace(/_/g,'-')||'';
 const lines=String(text).split('\n').map(strip).filter(Boolean);
 let title=lines.find(s=>s.length>15&&s.length<260&&/(?:YÖNETMELİĞİ|TALİMATI|GENELGESİ|TEBLİĞİ)(?:\s*\([^)]+\))?$/i.test(s))||'';
 if(!title){const i=lines.findIndex(x=>CHAPTER.test(x));title=lines.slice(0,Math.max(i,0)).reverse().find(x=>x.length>12&&x.length<220&&!/Resmî Gazete/i.test(x))||'';}
 const gazette=/\bSay[ıi]\s*[:：]\s*(\d{4,6})/i.exec(text)?.[1]||'';
 const months={ocak:1,şubat:2,mart:3,nisan:4,mayıs:5,haziran:6,temmuz:7,ağustos:8,eylül:9,ekim:10,kasım:11,aralık:12};
 const m=/\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i.exec(text);
 const publicationDate=m?m[3]+'-'+String(months[lower(m[2])]||0).padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
 return {code:code.toLocaleUpperCase('tr-TR'),title,publicationDate,gazetteNumber:gazette};
}
async function loadPdfJs(){
 if(root.pdfjsLib)return root.pdfjsLib;
 if(!loadPdfJs.promise){loadPdfJs.promise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.async=true;
   // Pinned version; PDF worker uses the same version to avoid handshake mismatch.
   script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
   script.onload=()=>root.pdfjsLib?resolve(root.pdfjsLib):reject(Error('PDF.js modülü başlatılamadı.'));
   script.onerror=()=>reject(Error('PDF okuma bileşeni indirilemedi. İnternet erişimini / CDN erişimini kontrol edin.'));
   document.head.appendChild(script);
 });loadPdfJs.promise.catch(()=>{loadPdfJs.promise=null;});}
 const lib=await loadPdfJs.promise;
 lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 return lib;
}
async function readPdf(file,onProgress=()=>{}){
 const lib=await loadPdfJs(),data=new Uint8Array(await file.arrayBuffer());
 let task;
 try{task=lib.getDocument({data,useSystemFonts:true});}catch(e){throw Error('PDF açılamadı: '+e.message);}
 const pdf=await task.promise;if(pdf.numPages>450)throw Error('450 sayfadan uzun PDF için önce kaynak belgeyi parçalara ayırın.');
 const lines=[];let empty=0;
 for(let p=1;p<=pdf.numPages;p++){
   const page=await pdf.getPage(p),content=await page.getTextContent(),fragments=[];
   for(const t of content.items||[]){
     if(typeof t.str!=='string'||!t.str.trim())continue;
     const x=t.transform?.[4]||0,y=t.transform?.[5]||0;
     fragments.push({text:t.str,x,y,w:t.width||0,h:Math.abs(t.transform?.[3]||0)});
   }
   fragments.sort((a,b)=>b.y-a.y||a.x-b.x);
   const groups=[];
   for(const t of fragments){const nearest=groups.find(g=>Math.abs(g.y-t.y)<Math.max(2.6,Math.min(5.5,t.h*.37)));if(nearest){nearest.parts.push(t);nearest.y=(nearest.y*(nearest.parts.length-1)+t.y)/nearest.parts.length;}else groups.push({y:t.y,parts:[t]});}
   groups.sort((a,b)=>b.y-a.y);
   const pageLines=[];
   for(const g of groups){g.parts.sort((a,b)=>a.x-b.x);let line='',prev=null;for(const x of g.parts){const gap=prev?x.x-(prev.x+prev.w):0;const sep=prev&&gap>Math.max(1.5,(prev.h||10)*.10)?' ':'';line+=sep+x.text;prev=x;}if(strip(line))pageLines.push(strip(line));}
   if(pageLines.join('').length<25)empty++;
   for(const s of pageLines)lines.push({text:s,page:p});
   onProgress(Math.round(p/pdf.numPages*100),`PDF sayfa ${p} / ${pdf.numPages}`);
   if(p%3===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 try{await pdf.destroy();}catch{}
 const text=lines.map(x=>x.text).join('\n');
 if(text.trim().length<100)throw Error('PDF metin katmanı bulunamadı. Bu dosya taranmış görüntü olabilir. OCR veya metin içeren DOCX/PDF gerekli.');
 return {lines,text,warning:empty?`${empty} sayfada okunabilir metin az veya yok; taranmış sayfa bulunabilir.`:'',pages:pdf.numPages,format:'PDF'};
}
async function readDocx(file,onProgress=()=>{}){
 if(!root.JSZip)throw Error('Word okuma bileşeni (JSZip) eksik. GitHub paketindeki src/vendor dosyasını kontrol edin.');
 const zip=await root.JSZip.loadAsync(await file.arrayBuffer());
 const main=zip.file('word/document.xml');if(!main)throw Error('DOCX belgesinde word/document.xml bulunamadı; .doc yerine .docx kullanın.');
 const xml=await main.async('string');if(xml.length>22*1024*1024)throw Error('DOCX içeriği işleme sınırını aşıyor.');
 const dom=new DOMParser().parseFromString(xml,'application/xml');if(dom.getElementsByTagName('parsererror').length)throw Error('Word XML içeriği bozuk.');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const body=dom.getElementsByTagNameNS(ns,'body')[0];if(!body)throw Error('Word ana gövdesi bulunamadı.');
 const nodes=Array.from(body.children),lines=[];let tableCount=0,numCount=0;
 function readP(p){
   let text='';const walk=node=>{if(node.nodeType!==1)return;if(node.namespaceURI===ns){if(node.localName==='t')text+=node.textContent||'';else if(node.localName==='tab')text+=' ';else if(node.localName==='br')text+='\n';else if(node.localName==='instrText')return;}
     if(node.localName!=='t')for(const child of Array.from(node.children||[]))walk(child);
   };walk(p);
   if(p.getElementsByTagNameNS(ns,'numPr').length)numCount++;
   return strip(text);
 }
 for(const n of nodes){
   if(n.localName==='p'){const t=readP(n);if(t)for(const row of t.split('\n'))if(strip(row))lines.push({text:strip(row),page:0});}
   else if(n.localName==='tbl'){tableCount++;for(const row of Array.from(n.getElementsByTagNameNS(ns,'tr'))){let parts=[];for(const cell of Array.from(row.getElementsByTagNameNS(ns,'tc'))){const first=Array.from(cell.children).filter(x=>x.localName==='p');const txt=first.map(readP).filter(Boolean).join(' ; ');if(txt)parts.push(txt);}if(parts.length)lines.push({text:parts.join(' | '),page:0});}}
 }
 const text=lines.map(x=>x.text).join('\n');if(text.length<100)throw Error('DOCX dosyasında mevzuat metni bulunamadı.');
 onProgress(100,'DOCX paragraf metinleri ayrıştırıldı');
 const warnings=[tableCount?`${tableCount} tablo metne satır olarak aktarıldı; tablo düzenini kontrol edin.`:'',numCount?`${numCount} Word otomatik numaralandırma paragrafı tespit edildi. Madde/bent numaraları metinde olmayabilir; kontrol edin.`:''].filter(Boolean);
 return {lines,text,warnings,pages:null,format:'DOCX'};
}
async function readFile(file,onProgress=()=>{}){
 if(!file?.name)throw Error('Geçerli bir belge seçin.');if(file.size>80*1024*1024)throw Error('Word/PDF dosyası 80 MB sınırını aşıyor.');
 const ext=file.name.toLowerCase().split('.').pop();let out;
 if(ext==='pdf')out=await readPdf(file,onProgress);
 else if(ext==='docx')out=await readDocx(file,onProgress);
 else if(ext==='txt'){const text=await file.text();out={text,lines:text.split(/\r?\n/).map(x=>({text:x,page:0})),warnings:[],pages:null,format:'TXT'};}
 else throw Error('Desteklenen mevzuat kaynakları: .pdf, .docx veya .txt. Eski .doc dosyalarını önce .docx olarak kaydedin.');
 return {...out,filename:file.name,sha256:await digest(file),suggestions:infer(file.name,out.text)};
}
root.EasaTrDocuments={readFile,parseText,makeXml,infer};
if(typeof module!=='undefined'&&module.exports)module.exports={parseText,infer};
})(typeof window!=='undefined'?window:globalThis);
