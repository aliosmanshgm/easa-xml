/* EASA eRules Hub v3.8 - multi-source publication engine.
 * No XML or user data is uploaded while generating an export.
 * JSZip is vendored for standards-based DOCX and EPUB packages.
 * PDF generation uses the browser print engine (Save as PDF).
 */
(function (root) {
'use strict';
const clauses = root.EasaClauses || (typeof require === 'function' ? require('./clauses.js') : null);
const trim = v => String(v == null ? '' : v).trim();
const xml = v => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const html = xml;
const normalize = v => trim(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const safeName = v => trim(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,92) || 'easa-derleme';
const fallbackDate = v => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleDateString('tr-TR') : (v || '-');
const plainNote = v => typeof v === 'string' ? v : typeof v?.text === 'string' ? v.text : '';
const filename = (model, extension) => safeName(model.title)+'_'+safeName(model.published.slice(0,10)||'surum')+'.'+extension;
function getZip(){const z=root.JSZip; if(!z)throw Error('ZIP kutuphanesi yuklenemedi. src/vendor/jszip.min.js dosyasini kontrol edin.');return new z();}
function publicationOutline(blocks){
  // Some EU provisions use 1., 2., etc. rather than (1), (2).
  // Preserve existing EasaClauses anchors so older subclause notes remain valid.
  let parentNumber='',ordinal=0;
  return clauses.outline(blocks||[]).map(b=>{
    if(b.type==='heading'){parentNumber='';return b;}
    if(b.type==='text'){
      const m=/^\s*(\d{1,3})\.\s+/.exec(b.text||'');
      if(m){parentNumber='$p:'+m[1]+':'+(++ordinal);return {...b,type:'clause',isNumberRoot:true,anchor:parentNumber,label:m[1]+'.',text:b.text.slice(m[0].length),level:0,reference:m[1],parentNumber};}
    }
    return {...b,parentNumber};
  });
}
function paragraphBlocks(rec,pick,annotation,opts){
  const outlined=publicationOutline(rec.blocks||[]), part=pick?.mode==='partial',wanted=new Set(part?(pick.anchors||[]):[]);
  const prefixAncestors=new Set();
  if(part)for(const target of wanted){const a=String(target).split('/');for(let i=1;i<a.length;i++)prefixAncestors.add(a.slice(0,i).join('/'));}
  const blocks=[], hasClauses=outlined.some(b=>b.type==='clause');let passedClause=false;
  const numbersWithSelectedChildren=new Set(outlined.filter(b=>b.type==='clause'&&!b.isNumberRoot&&wanted.has(b.anchor)).map(b=>b.parentNumber).filter(Boolean));
  for(const row of outlined){
    if(row.type==='clause')passedClause=true;
    if(part){
      if(row.type==='clause'){
        if(!wanted.has(row.anchor)&&!prefixAncestors.has(row.anchor)&&
           !(row.isNumberRoot&&numbersWithSelectedChildren.has(row.anchor)))continue;
      }else if(row.type==='heading'){continue;}
      else if(passedClause){continue;}
    }
    const entry={...row};
    if(row.type==='clause'){
      entry.context=part&&!wanted.has(row.anchor);
      const note=annotation?.subnotes?.[row.anchor];
      if(opts.includeClauseNotes&&!entry.context&&trim(plainNote(note))){
        entry.note=plainNote(note);
        entry.noteWarning=!!(note?.sourceFingerprint && note.sourceFingerprint!==clauses.fingerprint(row.text));
      }
    }
    blocks.push(entry);
  }
  if(part&&!hasClauses)throw Error('Bu kayitta numaralandirilmis alt gereklilik bulunmadi: '+(rec.title||''));
  if(part&&!blocks.some(b=>b.type==='clause'&&!b.context))throw Error('Secilen alt gereklilik bulunamadi: '+(rec.title||''));
  return blocks;
}
function findRelated(doc,rec){
  if(!['IR','DR','CS'].includes(rec.kind))return [];
  const parent=normalize(rec.title),code=/^(?:[A-Z]{3}\.[A-Z]{3}\.[\d]+\w?|Article\s+\d+[a-z]?)/i.exec(rec.title||'');
  return doc.records.filter(r=>r!==rec&&['AMC','GM','CS'].includes(r.kind)&&r.parentIR&&
    (normalize(r.parentIR)===parent || (code&&normalize(r.parentIR).startsWith(normalize(code[0])+' '))));
}
function prepare({doc,picks,annotations,options={}}){
  if(!doc||!Array.isArray(doc.records))throw Error('Mevzuat verisi yuklenemedi.');
  const o={includeRelated:!!options.includeRelated,includeNotes:!!options.includeNotes,includeClauseNotes:!!options.includeClauseNotes,
    extraNotePages:Math.min(2,Math.max(0,Number(options.extraNotePages)||0)),includeMetadata:options.includeMetadata!==false,
    kindleMode:options.kindleMode==='read'?'read':'notes'};
  const selected=new Map((Array.isArray(picks)?picks:[]).map(p=>[p.key,p]));
  if(!selected.size)throw Error('Derleme icin en az bir mevzuat maddesi secin.');
  const byKey=new Map(doc.records.map(r=>[r.key,r]));
  for(const key of selected.keys())if(!byKey.has(key))throw Error('Secili madde bu surumde bulunamadi: '+key);
  if(o.includeRelated){for(const key of [...selected.keys()])for(const related of findRelated(doc,byKey.get(key))){if(!selected.has(related.key))selected.set(related.key,{key:related.key,mode:'all',auto:true});}}
  if(selected.size>350)throw Error('Tek seferde en fazla 350 kayit derlenebilir. Daha kucuk bir bolum secin.');
  const noteMap=annotations instanceof Map?annotations:new Map(Object.entries(annotations||{}));
  const sections=[];
  for(const rec of doc.records){const pick=selected.get(rec.key);if(!pick)continue;
    const annotation=noteMap.get(doc.familyId+'::'+rec.key)||{};
    const blocks=paragraphBlocks(rec,pick,annotation,o);
    sections.push({key:rec.key,title:rec.title||rec.plain?.split('\n')[0]||'Untitled',kind:rec.kind||'OTHER',category:rec.category||'',
      source:rec.source||'',applicability:rec.applicability||'',effective:rec.effective||'',auto:!!pick.auto,
      partial:pick.mode==='partial',blocks,note:o.includeNotes?trim(annotation.note):''});
  }
  const title=trim(options.title)||doc.title.replace(/^Easy Access Rules for\s*/i,'')+' - Secilmis Mevzuat',
        subtitle=trim(options.subtitle),count=sections.length;
  return {title,subtitle,sourceTitle:doc.title,published:doc.published||'',versionId:doc.versionId||'',familyId:doc.familyId||'',
    generatedAt:new Date().toISOString(),options:o,sections,count,selectedCount:picks.length,autoCount:count-picks.length};
}
// The original prepare() remains supported for v3.6/v3.7 consumers.
// Each source is pinned to its exact XML release; no source is silently substituted.
function prepareMulti({sources,annotations,options={}}){
 if(!Array.isArray(sources)||!sources.length)throw Error('Derleme için en az bir kaynak seçin.');
 const total=sources.reduce((sum,x)=>sum+(x.picks?.length||0),0);
 if(total>350)throw Error('Bir derlemede en fazla 350 madde seçilebilir.');
 const used=new Set(),parts=[];
 for(const group of sources){
  const doc=group.doc;
  if(!doc||!doc.familyId||!doc.versionId||used.has(doc.familyId+'::'+doc.versionId))throw Error('Kaynak XML kimliği bulunamadı veya tekrar ediyor.');
  if(!Array.isArray(group.picks)||!group.picks.length)continue;
  used.add(doc.familyId+'::'+doc.versionId);
  const prepared=prepare({doc,picks:group.picks,annotations,options});
  parts.push({doc,prepared});
 }
 if(!parts.length)throw Error('Derleme için seçilmiş madde yok.');
 const refs=parts.map(({doc})=>({familyId:doc.familyId,versionId:doc.versionId,title:doc.title,published:doc.published||''}));
 const multi=refs.length>1;
 const sections=parts.flatMap(({doc,prepared})=>prepared.sections.map(sec=>({...sec,
   publicationFamilyId:doc.familyId,publicationVersionId:doc.versionId,
   publicationTitle:doc.title,publicationPublished:doc.published||''})));
 const count=sections.length;
 if(count>500)throw Error('İlişkili hükümlerle birlikte derleme çok büyük. Madde seçimini daraltın.');
 const common=parts[0].prepared;
 return {...common,title:trim(options.title)||(multi?'Tematik EASA Mevzuat Derlemesi':common.title),
  subtitle:trim(options.subtitle),sourceTitle:multi?refs.length+' EASA mevzuat yayını':refs[0].title,
  familyId:multi?'multi':refs[0].familyId,versionId:multi?'multi':refs[0].versionId,
  published:multi?'':refs[0].published,generatedAt:new Date().toISOString(),
  sections,sourceRefs:refs,multi,count,selectedCount:total,
  autoCount:parts.reduce((sum,x)=>sum+x.prepared.autoCount,0)};
}
const sourceCaption = s=>s.publicationTitle? s.publicationTitle+' | '+fallbackDate(s.publicationPublished):'';
const sourceSummary = (m,full=false)=>Array.isArray(m.sourceRefs)&&m.sourceRefs.length?
  m.sourceRefs.map((x,i)=>(i+1)+'. '+x.title+' | '+fallbackDate(x.published)+(full?' | '+x.versionId:'')).join('\n'):
  m.sourceTitle+' | '+fallbackDate(m.published);

function makeText(model,markdown=false){
 const lines=[];const hdr=(s,level=1)=>markdown?'#'.repeat(level)+' '+s:s;
 lines.push(hdr(model.title),model.subtitle||'',model.sourceTitle+' | '+fallbackDate(model.published),
   'Generated: '+fallbackDate(model.generatedAt),'',
   'Source: EASA eRules. Personal annotations are NOT part of the original regulation.','',sourceSummary(model),'');
 for(let i=0;i<model.sections.length;i++){
   const sec=model.sections[i];lines.push(hdr(sec.title,2));if(sec.publicationTitle)lines.push('PUBLICATION: '+sourceCaption(sec));
   if(model.options.includeMetadata)lines.push('['+sec.kind+'] '+sec.category+' | '+(sec.source||'EASA eRules'));
   for(const b of sec.blocks){
     if(b.type==='heading'){lines.push(markdown?'### '+b.text:b.text);continue;}
     if(b.type==='table'){for(const cells of b.rows)lines.push(cells.join(' | '));lines.push('');continue;}
     const spaces=' '.repeat(Math.max(0,Math.min(5,b.level||0))*3);
     const body=b.type==='clause'?spaces+b.label+' '+b.text:spaces+b.text;
     lines.push(body);if(b.note)lines.push(spaces+'[PERSONAL NOTE '+(b.noteWarning?'CHECK MATCH':'')+'] '+b.note);
     lines.push('');
   }
   if(sec.note)lines.push('[PERSONAL RULE NOTE] '+sec.note,'');
   if(model.options.extraNotePages)lines.push('[BLANK NOTE PAGES: '+model.options.extraNotePages+']','');
 }
 lines.push('',hdr('Source XML identifiers',2),sourceSummary(model,true));
 return lines.join('\n').replace(/\n{4,}/g,'\n\n\n');
}
function renderContentHtml(model,printProfile='a4',standalone=true){
 const kindle=printProfile.startsWith('kindle'),wideNotes=printProfile==='kindle-notes';
 const css=`:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;color:#17293b;background:#e8eef1;font:14px/1.65 Georgia,'Times New Roman',serif}a{color:#174e66;text-decoration:none}a:hover{text-decoration:underline}.actions{position:sticky;top:0;z-index:3;background:#123148;color:#fff;padding:12px 16px;font:13px system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px}.actions button{cursor:pointer;background:#f7fffd;color:#123148;border:0;border-radius:8px;padding:9px 15px;font-weight:bold}.print-sheet{background:#fff;max-width:${kindle?'750px':'930px'};margin:20px auto;padding:${wideNotes?'42px 54px':'52px 60px'};box-shadow:0 8px 32px #0001}.cover{min-height:${kindle?'350px':'440px'};display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid #cbd4d9;margin-bottom:28px;break-after:page}.kicker{font:700 10px system-ui;letter-spacing:1.2px;color:#516879}.cover h1{font:700 ${kindle?'28px':'35px'}/1.2 Georgia,serif;color:#183449;margin:20px 0}.muted{color:#647683}.notice{border-left:3px solid #9aadb7;padding:9px 12px;background:#f6f9f9;color:#4d606c;font:12px/1.5 system-ui}.toc{margin:25px 0 36px;break-after:page}.toc h2{font:700 21px system-ui}.toc-item{display:flex;align-items:start;gap:10px;padding:7px 0;border-bottom:1px dotted #cbd7dc;font:13px/1.5 system-ui}.toc-item span{min-width:25px;color:#708596}.rule{margin:0 0 29px;break-before:page}.rule h2{font:700 ${kindle?'20px':'22px'}/1.35 system-ui;color:#17364a;break-after:avoid;margin:0 0 10px}.rule-meta{font:11px/1.5 system-ui;color:#687b86;margin:0 0 18px}.rule-content p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 10px}.rule-content h3{font:700 16px/1.45 system-ui;margin:15px 0 9px}.clause{display:flex;gap:8px;align-items:start;margin:0 0 11px;break-inside:avoid-page;page-break-inside:avoid}.clause-label{flex:0 0 33px;font-weight:bold}.clause-body{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}.context{color:#677b88}.clause .personal{margin-top:8px}.clause.l1{margin-left:18px}.clause.l2{margin-left:36px}.clause.l3{margin-left:54px}.clause.l4{margin-left:72px}.clause.l5{margin-left:90px}.raw.indent1{margin-left:18px}.raw.indent2{margin-left:36px}.raw.indent3{margin-left:54px}.personal{border-left:3px solid #94acb7;padding:9px 12px;background:#f5f7f8;margin:13px 0;color:#456074;font:12px/1.55 system-ui;white-space:pre-wrap}.personal strong{display:block;font:700 10px system-ui;letter-spacing:.7px;margin-bottom:5px}.print-table{border-collapse:collapse;width:100%;font:12px/1.4 Georgia;margin:14px 0}.print-table td{border:1px solid #c7d2d8;padding:7px;vertical-align:top;overflow-wrap:anywhere}.blank{break-before:page;height:${kindle?'180mm':'238mm'};padding:14px 0 0}.blank h3{font:700 15px system-ui;color:#455b67;margin:0 0 16px}.line{height:12mm;border-bottom:1px solid #d2dadd}.margin-work{border:1px dashed #c8d4d8;border-radius:5px;margin-top:10px;height:29mm;padding:5px 8px;color:#95a5aa;font:10px system-ui}.note-layout .clause{border-bottom:1px dotted #d7e0e4;padding-bottom:8px;margin-bottom:14px}.nav-hint{font:11px system-ui;color:#637d87;margin-top:12px}.source-appendix{break-before:page;margin-top:20px}.source-appendix h2{font:700 18px system-ui}.source-appendix p{white-space:pre-wrap;font:11px/1.6 system-ui;overflow-wrap:anywhere}@media print{body{background:#fff}.actions{display:none}.print-sheet{box-shadow:none;max-width:none;margin:0;padding:0}.cover{min-height:${kindle?'170mm':'240mm'}}.toc{break-after:page}.rule{break-before:page}.blank{height:${kindle?'205mm':'260mm'}}.line{height:11mm}a{color:#17293b} .clause{break-inside:avoid-page}}@page{size:${kindle?'186mm 248mm':'A4'};margin:${kindle?'12mm 13mm':'17mm 18mm'}}`;
 const table=rows=>`<table class="print-table"><tbody>${rows.map(row=>'<tr>'+row.map(cell=>'<td>'+html(cell)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
 const note=(label,val,warn=false)=>`<div class="personal"><strong>${html(label)}${warn?' - Please check source text':''}</strong>${html(val)}</div>`;
 const section=(s,i)=>{
  let content='';for(const b of s.blocks){
   if(b.type==='heading'){content+=`<h3>${html(b.text)}</h3>`;continue;}
   if(b.type==='table'){content+=table(b.rows);continue;}
   if(b.type==='clause'){
    content+=`<div class="clause l${Math.max(0,Math.min(5,b.level||0))} ${b.context?'context':''}"><div class="clause-label">${html(b.label)}</div><div class="clause-body">${html(b.text)}${b.note?note('PERSONAL NOTE '+(b.reference||''),b.note,b.noteWarning):''}${wideNotes?'<div class="margin-work" aria-label="Handwriting notes">Notes</div>':''}</div></div>`;
   }else{content+=`<p class="raw indent${Math.min(3,b.level||0)}">${html(b.text)}</p>`;}
  }
  const notes=Array.from({length:model.options.extraNotePages||0},(_,page)=>`<div class="blank"><h3>${html(s.title)} - Notes ${page+1}</h3>${Array.from({length:13},()=>'<div class="line"></div>').join('')}</div>`).join('');
  return `<section class="rule" id="r${i+1}"><h2>${html(s.title)}</h2>${s.publicationTitle?`<p class="rule-meta"><b>Publication:</b> ${html(sourceCaption(s))}</p>`:''}${model.options.includeMetadata?`<p class="rule-meta">${html(s.kind)} | ${html(s.category)} | ${html(s.source)} | Applicable: ${html(s.applicability||'-')}</p>`:''}<div class="rule-content ${wideNotes?'note-layout':''}">${content}</div>${s.note?note('PERSONAL RULE NOTE',s.note):''}</section>${notes}`;
 };
 const contents=model.sections.map((s,i)=>`<div class="toc-item"><span>${i+1}.</span><a href="#r${i+1}">${html(s.title)}${model.multi?`<small style="display:block;color:#708596">${html(s.publicationTitle)}</small>`:''}</a></div>`).join('');
 const markup=`<div class="actions"><span>eRules Hub | ${printProfile==='a4'?'A4 PDF':wideNotes?'Kindle - handwriting':kindle?'Kindle - reading':'Preview'}</span><button type="button" onclick="window.print()">Print / Save as PDF</button></div><div class="print-sheet"><header class="cover"><div class="kicker">EASA eRULES | CUSTOM COMPILATION</div><h1>${html(model.title)}</h1>${model.subtitle?`<p>${html(model.subtitle)}</p>`:''}<p class="muted">Source publications:<br>${html(sourceSummary(model)).replace(/\n/g,'<br>')}<br>Compilation: ${html(fallbackDate(model.generatedAt))}</p><div class="notice">Selected extracts from EASA eRules. User annotations, if present, are clearly marked and are not part of the legal text. Confirm applicability and current status against official sources.</div></header><nav class="toc" role="doc-toc"><h2>Contents</h2>${contents}</nav>${model.sections.map(section).join('')}<section class="source-appendix"><h2>Source XML identifiers</h2><p>${html(sourceSummary(model,true))}</p></section><p class="nav-hint">Selected excerpts are pinned to the source XML releases listed above.</p></div>`;
 if(!standalone)return markup;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(model.title)}</title><style>${css}</style></head><body>${markup}</body></html>`;
}
function docxParagraph(text,style='Normal',options={}){
 const indent=options.level?`<w:ind w:left="${(options.level||0)*400}"/>`:'';
 const keep=options.keep?'<w:keepNext/>':'';
 const pageBreak=options.pageBreak?'<w:pageBreakBefore/>':'';
 const bold=options.bold?'<w:b/>':'';
 const lines=String(text||'').split('\n');
 return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${indent}${keep}${pageBreak}</w:pPr>${lines.map((line,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r><w:rPr>${bold}</w:rPr><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('')}</w:p>`;
}
function docxTable(rows){return '<w:tbl><w:tblPr><w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="CFD8DC"/><w:insideH w:val="single" w:sz="4" w:color="CFD8DC"/><w:insideV w:val="single" w:sz="4" w:color="CFD8DC"/></w:tblBorders></w:tblPr>'+rows.map(row=>'<w:tr>'+row.map(cell=>'<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>'+docxParagraph(cell)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';
}
function docxBookmark(id,title){return `<w:bookmarkStart w:id="${id}" w:name="section_${id}"/>${docxParagraph(title,'Heading1',{pageBreak:true,keep:true})}<w:bookmarkEnd w:id="${id}"/>`;}
function docxContents(model){return model.sections.map((s,i)=>`<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:hyperlink w:anchor="section_${i+1}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${xml(i+1+'. '+s.title+(model.multi?' ['+s.publicationTitle+']':''))}</w:t></w:r></w:hyperlink></w:p>`).join('');}
function docxStyles(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="310" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="18374B"/></w:rPr><w:pPr><w:spacing w:before="300" w:after="280"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/><w:spacing w:before="260" w:after="170"/></w:pPr><w:rPr><w:b/><w:sz w:val="31"/><w:color w:val="234B5D"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="536C7B"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/><w:color w:val="5E7382"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Annotation"><w:name w:val="Personal annotation"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="400"/><w:spacing w:before="110" w:after="120"/></w:pPr><w:rPr><w:i/><w:color w:val="466E7C"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="TOC 1"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="176B84"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`;}
async function createDocx(model){
 const zip=getZip(),w='word/';let body='';
 body+=docxParagraph('EASA eRULES | SELECTED COMPILATION','Meta')+docxParagraph(model.title,'Title');
 if(model.subtitle)body+=docxParagraph(model.subtitle,'Subtitle');
 body+=docxParagraph(model.sourceTitle,'Meta')+docxParagraph('Source XML versions:','Meta')+docxParagraph(sourceSummary(model),'Meta')+
 docxParagraph('Generated: '+fallbackDate(model.generatedAt),'Meta')+
 docxParagraph('Personal notes are not part of the original regulation. Verify the official publication for current applicability.','Annotation');
 body+=docxParagraph('Contents','Heading1',{pageBreak:true,keep:true})+docxContents(model);
 for(let i=0;i<model.sections.length;i++){
  const s=model.sections[i];body+=docxBookmark(i+1,s.title);if(s.publicationTitle)body+=docxParagraph('PUBLICATION: '+sourceCaption(s),'Meta');
  if(model.options.includeMetadata)body+=docxParagraph([s.kind,s.category,s.source,'Applicable: '+(s.applicability||'-')].filter(Boolean).join(' | '),'Meta');
  for(const b of s.blocks){
   if(b.type==='table'){body+=docxTable(b.rows);continue;}
   if(b.type==='heading'){body+=docxParagraph(b.text,'Heading2',{keep:true});continue;}
   if(b.type==='clause'){
    body+=docxParagraph(b.label+' '+b.text,'Normal',{level:b.level||0});
    if(b.note)body+=docxParagraph('PERSONAL NOTE '+(b.reference||'')+(b.noteWarning?' [CHECK REFERENCE]':'')+': '+b.note,'Annotation',{level:b.level||0});
   }else body+=docxParagraph(b.text,'Normal',{level:b.level||0});
  }
  if(s.note)body+=docxParagraph('PERSONAL RULE NOTE: '+s.note,'Annotation');
  for(let n=0;n<model.options.extraNotePages;n++){
   body+=docxParagraph(s.title+' - Notes '+(n+1),'Heading2',{pageBreak:true});
   for(let k=0;k<13;k++)body+=docxParagraph('____________________________________________________________________________','Meta');
  }
 }
 body+=docxParagraph('Source XML identifiers','Heading1',{pageBreak:true,keep:true})+docxParagraph(sourceSummary(model,true),'Meta');
 const contents=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1150" w:right="1250" w:bottom="1200" w:left="1250" w:header="550" w:footer="550"/></w:sectPr></w:body></w:document>`;
 const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>eRules Hub  |  </w:t></w:r><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>`;
 const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
 zip.file('[Content_Types].xml',ct);zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
 zip.file(w+'_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
 zip.file(w+'document.xml',contents);zip.file(w+'styles.xml',docxStyles());zip.file(w+'footer1.xml',footer);
 zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(model.title)}</dc:title><dc:creator>eRules Hub</dc:creator><dc:description>Extracted from ${xml(sourceSummary(model))}</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">${model.generatedAt}</dcterms:created></cp:coreProperties>`);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
function epubSection(s,i){
 let body='';for(const b of s.blocks){
  if(b.type==='heading'){body+=`<h3>${html(b.text)}</h3>`;continue;}
  if(b.type==='table'){body+='<table>'+b.rows.map(cells=>'<tr>'+cells.map(c=>'<td>'+html(c)+'</td>').join('')+'</tr>').join('')+'</table>';continue;}
  if(b.type==='clause')body+=`<div class="clause level-${Math.min(5,b.level||0)}"><span class="marker">${html(b.label)}</span><p>${html(b.text)}</p></div>`+(b.note?`<aside class="personal">PERSONAL NOTE (${html(b.reference)})${b.noteWarning?' [CHECK REFERENCE]':''}: ${html(b.note)}</aside>`:'');
  else body+=`<p class="text level-${Math.min(5,b.level||0)}">${html(b.text)}</p>`;
 }
 if(s.note)body+=`<aside class="personal">PERSONAL RULE NOTE: ${html(s.note)}</aside>`;
 return `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><title>${html(s.title)}</title><link rel="stylesheet" href="style.css" type="text/css" /></head><body><h1>${html(s.title)}</h1>${s.publicationTitle?`<p class="metadata">Publication: ${html(sourceCaption(s))}</p>`:''}${s.kind||s.source?`<p class="metadata">${html(s.kind)} | ${html(s.source)}</p>`:''}${body}</body></html>`;
}
async function createEpub(model){
 const zip=getZip();zip.file('mimetype','application/epub+zip',{compression:'STORE'});
 zip.file('META-INF/container.xml',`<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
 const uid='urn:uuid:'+('00000000-0000-4000-8000-'+Array.from(new TextEncoder().encode(model.title+'|'+model.generatedAt+'|'+(model.sourceRefs||[]).map(r=>r.versionId).join('|'))).reduce((a,n)=>((a*33+n)>>>0),5381).toString(16).padStart(12,'0'));
 const navItems=model.sections.map((s,i)=>`<li><a href="s${i+1}.xhtml">${html(s.title)}</a></li>`).join('');
 zip.file('OEBPS/nav.xhtml',`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en"><head><title>Contents</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${navItems}</ol></nav></body></html>`);
 zip.file('OEBPS/title.xhtml',`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><title>${html(model.title)}</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body><h1>${html(model.title)}</h1>${model.subtitle?'<h2>'+html(model.subtitle)+'</h2>':''}<p>${html(sourceSummary(model)).replace(/\n/g,'<br/>')}</p><p class="metadata">Personal annotations are not part of the regulation. Verify current legal applicability.</p><h3>Source XML identifiers</h3><p class="metadata">${html(sourceSummary(model,true)).replace(/\n/g,'<br/>')}</p></body></html>`);
 zip.file('OEBPS/toc.ncx',`<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uid}"/></head><docTitle><text>${html(model.title)}</text></docTitle><navMap>${model.sections.map((s,i)=>`<navPoint id="nav${i+1}" playOrder="${i+1}"><navLabel><text>${html(s.title)}</text></navLabel><content src="s${i+1}.xhtml"/></navPoint>`).join('')}</navMap></ncx>`);
 zip.file('OEBPS/style.css',`body{font-family:serif;line-height:1.6;color:#172936}h1,h2,h3{font-family:sans-serif;line-height:1.3}h1{font-size:1.45em;margin:1em 0 .4em}h3{font-size:1.12em}p{margin:0 0 .7em;white-space:pre-wrap}.metadata{font:small sans-serif;color:#5e6c75}.clause{margin:.6em 0}.clause .marker{display:inline-block;width:2.4em;font-weight:bold}.clause p{display:inline;white-space:pre-wrap}.level-1{margin-left:1.2em}.level-2{margin-left:2.4em}.level-3{margin-left:3.6em}.level-4{margin-left:4.8em}.level-5{margin-left:6em}.personal{display:block;margin:.7em 0;padding:.6em;border-left:.2em solid #9baeb8;color:#415f70;font-size:.9em;white-space:pre-wrap}table{border-collapse:collapse;width:100%}td{border:1px solid #b7c5c9;padding:.35em;vertical-align:top}`);
 for(let i=0;i<model.sections.length;i++)zip.file('OEBPS/s'+(i+1)+'.xhtml',epubSection(model.sections[i],i));
 const manifest=`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/><item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="style" href="style.css" media-type="text/css"/>`+model.sections.map((_,i)=>`<item id="sec${i+1}" href="s${i+1}.xhtml" media-type="application/xhtml+xml"/>`).join('');
 const spine=`<itemref idref="title"/>`+model.sections.map((_,i)=>`<itemref idref="sec${i+1}"/>`).join('');
 zip.file('OEBPS/content.opf',`<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pubid" xml:lang="en"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pubid">${uid}</dc:identifier><dc:title>${html(model.title)}</dc:title><dc:language>en</dc:language><dc:creator>eRules Hub</dc:creator><meta property="dcterms:modified">${model.generatedAt.replace(/\.\d{3}Z$/,'Z')}</meta></metadata><manifest>${manifest}</manifest><spine toc="toc">${spine}</spine></package>`);
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
}
root.EasaPublication={prepare,prepareMulti,makeText,renderContentHtml,createDocx,createEpub,filename,safeName,findRelated,publicationOutline};
if(typeof module!=='undefined'&&module.exports)module.exports=root.EasaPublication;
})(typeof globalThis!=='undefined'?globalThis:this);
