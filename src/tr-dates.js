/* Havacilik Mevzuati Hub v3.11.1 - cautious TR legal-date suggestions.
 * The dates are candidates derived from an identified Yururluk provision,
 * never legal determinations. Dates for separate provisions / staged entry
 * into force always require human review. No cloud writes from this module.
 */
(function(root){
'use strict';
const WORDS={bir:1,iki:2,uc:3,üç:3,dort:4,dört:4,bes:5,beş:5,alti:6,altı:6,yedi:7,sekiz:8,dokuz:9,on:10,onbir:11,'on bir':11,oniki:12,'on iki':12,onuc:13,'on üç':13,ondort:14,'on dört':14,onbes:15,'on beş':15,onalti:16,'on altı':16,onyedi:17,'on yedi':17,onsekiz:18,'on sekiz':18,ondokuz:19,'on dokuz':19,yirmi:20,otuz:30,altmis:60,altmış:60};
function validDate(str){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(str||'')))return false;const dt=new Date(str+'T00:00:00Z');return Number.isFinite(+dt)&&dt.toISOString().slice(0,10)===str;}
function toIso(day,month,year){const x=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');return validDate(x)?x:'';}
function quantity(s){s=String(s||'').trim().toLocaleLowerCase('tr-TR').replace(/[-\s]+/g,' ');if(/^\d+$/.test(s))return Number(s);if(WORDS[s])return WORDS[s];const bits=s.split(' ');if(bits.length===2 && WORDS[bits[0]]===10 && WORDS[bits[1]]<10)return 10+WORDS[bits[1]];return 0;}
function offsetDate(iso,number,unit){if(!validDate(iso)||!(number>0&&number<=120))return '';const [y,m,d]=iso.split('-').map(Number);let date;if(unit==='ay'||unit==='yıl'){const total=y*12+(m-1)+(unit==='yıl'?12*number:number);const yr=Math.floor(total/12),mo=total%12;const last=new Date(Date.UTC(yr,mo+1,0)).getUTCDate();date=new Date(Date.UTC(yr,mo,Math.min(d,last)));}else{date=new Date(Date.UTC(y,m-1,d));date.setUTCDate(date.getUTCDate()+number);}return date.toISOString().slice(0,10);}
function isYururlukTitle(title){let s=String(title||'').trim().toLocaleLowerCase('tr-TR');return s==='yürürlük'||/\b(yürürlük)\s*$/.test(s)&&!/(yürürlüğe girmesi|yürürlükten|yürürlüğün|yürürlük ve|önceki)/.test(s);}
function textOf(article){if(article.plain)return article.plain;if(Array.isArray(article.paragraphs))return article.paragraphs.map(p=>[p.text,...(p.bents||[]).map(b=>b.text)].filter(Boolean).join(' ')).join(' ');return '';}
function findYururluk(doc){let articles=[];
 if(Array.isArray(doc?.records))articles=doc.records.map(r=>({title:r.title||'',heading:r.title?.split(/[—–]/).at(-1)||'',text:textOf(r),ref:r.title?.match(/(?:GEÇİCİ\s+)?MADDE\s+[0-9]+(?:\/[A-Z])?/i)?.[0]||''}));
 else if(Array.isArray(doc?.chapters))articles=doc.chapters.flatMap(c=>(c.articles||[]).map(a=>({heading:a.heading,title:a.heading,text:textOf(a),ref:(a.kind==='gecici'?'GEÇİCİ ':'')+'MADDE '+a.number})));
 return articles.filter(a=>isYururlukTitle(a.heading||a.title));
}
function suggestEffective(doc,published){const source=findYururluk(doc);
 if(!validDate(published))return {date:'',reason:'Yayım tarihi geçerli değil veya belirtilmemiş.',ref:'',ambiguous:false};
 if(source.length!==1)return {date:'',reason:source.length?'Birden fazla yürürlük maddesi var; tarih elle doğrulanmalı.':'Yürürlük maddesi otomatik belirlenemedi.',ref:'',ambiguous:source.length>1};
 const {text,ref}=source[0],s=String(text||'').replace(/\s+/g,' ').trim();
 // Any list-like formulation or multiple "yururluge girer" clauses is treated as staged.
 if(/(?:^|[;:,])\s*[a-zçğıöşü]\)|\bdiğer hükümleri\b|\bfarklı tarihlerde\b|\başağıdaki tarihlerde\b/i.test(s)||((s.match(/yürürlüğe\s+girer/gi)||[]).length>1))return {date:'',ref,reason:'Kademeli veya hükme özel yürürlük olasılığı; genel tarih otomatik atanmadı.',ambiguous:true};
 let date='',reason='';
 const exact=/(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})\s+tarihinde\s+yürürlüğe\s+girer/i.exec(s);
 if(exact){date=toIso(exact[1],exact[2],exact[3]);reason='Yürürlük maddesindeki açık takvim tarihi';}
 else if(/(?:yayım[ıi]\s+tarihinde|yayımlandığı\s+tarihte|yayımı\s+ile\s+birlikte)\s+yürürlüğe\s+girer/i.test(s)){
  date=published;reason='Yayımı tarihinde yürürlüğe girer';
 }else{
   const m=/(?:yayım[ıi]\s+tarihinden|yayımlandığı\s+tarihten|yayım\s+tarihinden)(?:\s+itibaren)?\s+(\d+|[a-zçğıöşü]+(?:\s+[a-zçğıöşü]+)?)\s+(gün|ay|yıl)\s+sonra\s+yürürlüğe\s+girer/i.exec(s);
   if(m){const n=quantity(m[1]);if(n>0){date=offsetDate(published,n,m[2].toLocaleLowerCase('tr-TR'));reason='Yayımdan '+m[1]+' '+m[2]+' sonra';}}
 }
 if(!date)return {date:'',ref,reason:'Yürürlük hükmü otomatik hesaplama için tek anlamlı değil; elle girilmeli.',ambiguous:true};
 return {date,ref,reason,ambiguous:false,sourceText:s.slice(0,650),publicationDate:published,verified:false};
}
root.EasaTrDates={suggestEffective,validDate,offsetDate,isYururlukTitle,version:'1.0'};
if(typeof module!=='undefined'&&module.exports)module.exports=root.EasaTrDates;
})(typeof window!=='undefined'?window:globalThis);
