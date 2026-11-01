/* Havacılık Mevzuatı Hub v3.11: PDF/DOCX -> reviewed v2.0 TR XML.
 * All publications require explicit human confirmation and browser structural
 * validation. The authoritative XSD can be checked offline using lxml.
 */
(function(root){
'use strict';
let api=null,session=null;
const D=root.EasaTrDocuments,S=root.EasaTrSchema;
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeName=s=>String(s||'TR_Mevzuat').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70);
function makeName(){return safeName(session?.opts.code)+'_'+(session?.opts.publicationDate||'tarihsiz')+'_v2.xml';}
function guessOpts(ext){
 const title=ext.suggestions.title||'',name=ext.filename.toLocaleUpperCase('tr-TR');
 let kind='yonetmelik';
 if(/GENELGE/.test(name+' '+title))kind='genelge';else if(/TEBLİĞ|TEBLIG/.test(name+' '+title))kind='teblig';
 else if(/TALİMAT|TALIMAT/.test(name+' '+title))kind='talimat';else if(/YÖNERGE|YONERGE/.test(name+' '+title))kind='yonerge';
 else if(/KARARNAME/.test(title))kind='cumhurbaskanligi-kararnamesi';else if(/\bKANUN\b|KANUNU/.test(title))kind='kanun';
 const frame=/DEĞİŞİKLİK\s+YAPILMASI|DEĞİŞİKLİK\s+YAPILMASINA/.test(title);
 return {code:ext.suggestions.code||'',title,kind,form:frame?'cerceve':'mustakil',stage:/TASLAĞI\b/.test(title)?'taslak':'yayinlanmis',
   publicationChannel:ext.suggestions.gazetteNumber?'resmi-gazete':'kurumsal',publicationDate:ext.suggestions.publicationDate||'',effectiveDate:'',budgetImpactExpected:'false',articleJustifications:{},impactAnalysisRef:'',budgetImpactRef:'',
   gazetteNumber:ext.suggestions.gazetteNumber||'',issuer:'',sourceUrl:'',generalJustification:'',filename:ext.filename,sha256:ext.sha256};
}
function optionField(label,name,value,placeholder='',type='text',required=false){return `<label class="tr-field"><span>${e(label)}</span><input class="form-field" type="${type}" name="${name}" value="${e(value||'')}" placeholder="${e(placeholder)}" ${required?'required':''} maxlength="${name==='title'?280:240}"></label>`;}
function selectField(label,name,value,items){return `<label class="tr-field"><span>${e(label)}</span><select class="form-field" name="${name}">${items.map(([key,caption])=>`<option value="${e(key)}" ${key===value?'selected':''}>${e(caption)}</option>`).join('')}</select></label>`;}
function editingData(){if(!session)return;const form=document.getElementById('trImportForm');if(!form)return;
 const entries=Object.fromEntries(new FormData(form)),justifications={...(session.opts.articleJustifications||{})};
 for(const key of Object.keys(entries))if(key.startsWith('aj__')){justifications[key.slice(4)]=entries[key];delete entries[key];}
 session.opts={...session.opts,...entries,articleJustifications:justifications};const t=document.getElementById('trSourceText');if(t)session.text=t.value;
}
function statsHtml(p){const x=p.stats;return `<div class="tr-stats"><span><b>${x.books||0}</b> kitap</span><span><b>${x.parts||0}</b> kısım</span><span><b>${x.chapters||0}</b> bölüm</span><span><b>${x.articles}</b> madde</span><span><b>${x.paragraphs}</b> fıkra</span><span><b>${x.items}</b> bent</span><span><b>${x.subitems}</b> alt bent</span>${x.segments?`<span><b>${x.segments}</b> genelge bölümü</span>`:''}${x.annexes?`<span><b>${x.annexes}</b> ek</span>`:''}</div>`;}
function warnHtml(){
 const p=session.parsed,extra=[session.extraction.warning,...(session.extraction.warnings||[])].filter(Boolean),all=[...extra,...p.warnings];
 const critical=p.critical||[];
 return `<div class="tr-review-alert ${critical.length?'is-critical':''}"><strong>${critical.length?'Yayımlama engeli – yapıyı düzeltin':'Mevzuat biçimi kontrolü'}</strong><div>${critical.length?e(critical.join(' | ')):e(all.length?`${all.length} uyarı; metni ve özellikle ekleri kontrol edin.`:'Temel hiyerarşi tanındı. Kaynak belgedeki tüm hükümleri ayrıca kontrol edin.')}</div>${all.length?`<details><summary>Uyarılar (${all.length})</summary><ol>${all.slice(0,90).map(t=>`<li>${e(t)}</li>`).join('')}</ol></details>`:''}</div>`;
}
function summaryArticle(a){
 const label=a.kind==='gecici'?'GEÇİCİ MADDE':a.kind==='ek'?'EK MADDE':'MADDE',parts=[];
 for(const pa of a.paragraphs){parts.push((pa.number===null?'':'('+pa.number+') ')+pa.text);
  for(const b of pa.bents){parts.push(b.label+') '+b.text);for(const sub of b.children)parts.push(sub.number+') '+sub.text);}
  if(pa.closing)parts.push(pa.closing);
 }
 return `<details class="tr-article"><summary><b>${label} ${e(a.number)}</b><span>${e(a.heading|| (a.kind==='cerceve'?'Çerçeve madde':'(Başlık tespit edilemedi)'))}</span><small>${a.paragraphs.length} fıkra</small></summary><pre>${e(parts.join('\n'))}</pre></details>`;
}
function renderPreview(){const p=session.parsed;
 const sections=(p.chapters||[]).map(ch=>{
   const heading=[ch.book?.ordinal?ch.book.ordinal+' KİTAP · '+ch.book.title:'',ch.part?.ordinal?ch.part.ordinal+' KISIM · '+ch.part.title:'',!ch.virtual?ch.ordinal+' BÖLÜM · '+ch.title:''].filter(Boolean).join(' / ');
   return `<section class="tr-preview-chapter"><h4>${e(heading||'Doğrudan maddeler')}</h4>${ch.articles.map(summaryArticle).join('')}</section>`;
 }).join('');
 const segments=(p.segments||[]).map(s=>`<section class="tr-preview-chapter"><h4>${e(s.heading)}</h4><details class="tr-article"><summary>Maddesiz düzenleme metni</summary><pre>${e(s.text)}</pre></details></section>`).join('');
 const annex=(p.annexes||[]).map(a=>`<section class="tr-preview-chapter"><h4>${e(a.title)}</h4><details class="tr-article"><summary>Ek metni · kaynakla karşılaştır</summary><pre>${e(a.text.join('\n'))}</pre></details></section>`).join('');
 return `<div class="tr-preview-list">${sections}${segments}${annex}</div>`;
}
function qualitySummary(){
 if(!session.opts.code||(!session.opts.title && !(session.opts.kind==='genelge'&&session.opts.stage==='taslak'))||!session.opts.publicationDate)return '<div class="tr-validation-inline">Mevzuat kodu, tam ad ve yayım/sürüm tarihini doldurduğunda XML doğrulama raporu gösterilir.</div>';
 try{
  const xml=D.makeXml(session.parsed,session.opts),q=S?.validateXml(xml,{allowLegacy:false});
  if(!q)return '<div class="tr-validation-inline">Doğrulama modülü eksik: src/tr-schema.js.</div>';
  return `<div class="tr-validation-inline ${q.valid?'is-valid':'is-invalid'}"><b>${q.valid?'Yapısal kontrol başarılı':'Yapısal hatalar bulundu'}</b> · ${q.errors.length} hata · ${q.warnings.length} uyarı<br><small>Tarayıcı kontrolü: Yönetmelik 10–16 ve diğer seçilmiş şekil kuralları. Tam XSD denetimi için paketteki çevrimdışı doğrulama aracı kullanılabilir.</small>${q.errors.length?`<ul>${q.errors.slice(0,12).map(x=>`<li>${e(x.message)}</li>`).join('')}</ul>`:''}${q.warnings.length?`<details><summary>${q.warnings.length} ek uyarıyı gör</summary><ul>${q.warnings.slice(0,20).map(x=>`<li>${e(x.message)}</li>`).join('')}</ul></details>`:''}</div>`;
 }catch(err){return `<div class="tr-validation-inline is-invalid"><b>XML henüz yayıma hazır değil:</b> ${e(err.message)}</div>`;}
}
function paint(){if(!session)return;const s=session,p=s.parsed,o=s.opts;
 const r=`<div class="tr-import-modal" id="trImportRoot"><div class="tr-import-head"><div><div class="eyebrow">Türkiye mevzuatı · XML Standardı v2.0</div><h2>Word / PDF mevzuat aktarımı</h2><p>${e(s.file.name)} · ${(s.file.size/1024).toFixed(0)} KB · ${e(s.extraction.format)}${s.extraction.pages?' · '+s.extraction.pages+' sayfa':''}</p></div><button class="btn icon-only" type="button" data-tr-import="cancel" aria-label="Pencereyi kapat">✕</button></div>
 <div class="tr-import-body"><form id="trImportForm" autocomplete="off"><div class="tr-form-grid">
 ${optionField('Mevzuat kodu *','code',o.code,'SHY-OLAY','text',true)}
 ${optionField('Yayım / sürüm tarihi *','publicationDate',o.publicationDate,'','date',true)}
 <div class="tr-span-2">${optionField('Mevzuatın tam adı *','title',o.title,'SİVİL HAVACILIK … YÖNETMELİĞİ','text',true)}</div>
 ${selectField('Mevzuat türü *','kind',o.kind,[['kanun','Kanun'],['cumhurbaskanligi-kararnamesi','Cumhurbaşkanlığı Kararnamesi'],['cumhurbaskani-karari','Cumhurbaşkanı Kararı'],['yonetmelik','Yönetmelik'],['karar','Karar'],['teblig','Tebliğ'],['genelge','Genelge'],['talimat','Talimat'],['yonerge','Yönerge'],['diger','Diğer']])}
 ${selectField('Düzenleme biçimi *','form',o.form,[['mustakil','Müstakil'],['cerceve','Çerçeve / Değişiklik']])}
 ${selectField('Belgenin durumu *','stage',o.stage,[['yayinlanmis','Yayımlanmış'],['taslak','Taslak'],['konsolide','Konsolide']])}
 ${selectField('Yayım kanalı *','publicationChannel',o.publicationChannel,[['resmi-gazete','Resmî Gazete'],['kurumsal','Kurumsal'],['diger','Diğer'],['bilinmiyor','Bilinmiyor']])}
 ${optionField('Resmî Gazete sayısı','gazetteNumber',o.gazetteNumber,'33374')}
 ${optionField('Yürürlüğe giriş tarihi','effectiveDate',o.effectiveDate,'','date')}
 ${optionField('Yayımlayan kurum','issuer',o.issuer,'İlgili kurum')}
 <div class="tr-span-2">${optionField('Kaynak bağlantısı','sourceUrl',o.sourceUrl,'https://...')}</div>
 ${o.stage==='taslak'?`<label class="tr-field tr-span-2"><span>Genel gerekçe (genelge istisnası hariç)</span><textarea name="generalJustification" class="form-field" rows="3">${e(o.generalJustification)}</textarea></label>
 ${['kanun','cumhurbaskanligi-kararnamesi'].includes(o.kind)?`<div class="tr-span-2 tr-draft-guidance"><b>Kanun / CBK taslağına özel ek bilgiler (m.10 ve m.23)</b><p>Madde gerekçelerini ayrı ayrı yaz. Etki analizi referansı, dosyanın kendisini yüklemez; asıl belgenin ayrıca arşivlenmesini gerektirir.</p>
 ${(p.articles||[]).map(a=>`<label class="tr-field"><span>MADDE ${e(a.number)} gerekçesi *</span><textarea class="form-field" rows="3" name="aj__${e(a.number)}">${e(o.articleJustifications?.[String(a.number)]||'')}</textarea></label>`).join('')}
 ${optionField('Düzenleyici etki analizi dosya adı / URL *','impactAnalysisRef',o.impactAnalysisRef,'etki-analizi.pdf')}
 </div>`:''}
 ${selectField('Bütçe etkisi bekleniyor mu?','budgetImpactExpected',o.budgetImpactExpected||'false',[['false','Hayır'],['true','Evet']])}
 ${o.budgetImpactExpected==='true'?optionField('Bütçe etki formu dosyası / URL *','budgetImpactRef',o.budgetImpactRef,'butce-etki-formu.pdf'):''}
 `:''}
 </div>
 <div class="tr-preview-header"><div><h3>Algılanan mevzuat yapısı</h3><p>Kitap, kısım, bölüm, madde, fıkra, bent ve alt bentleri kaynakla karşılaştır.</p></div><button type="button" class="btn small" data-tr-import="reanalyze">Metni yeniden analiz et</button></div>
 ${statsHtml(p)}${warnHtml()}${qualitySummary()}${renderPreview()}
 <details class="tr-source-editor" ${s.editorOpen?'open':''}><summary>Kaynak metni incele ve düzelt</summary><p>Numaralandırma ve başlıkları her satırın başında koru: <code>MADDE 9/A-</code>, <code>EK MADDE 2-</code>, <code>GEÇİCİ MADDE 1-</code>, <code>(1)</code>, <code>ç)</code>, <code>2)</code>. Düzenledikten sonra yeniden analiz et.</p><textarea id="trSourceText" spellcheck="false" rows="14" class="form-field">${e(s.text)}</textarea></details>
 <label class="tr-confirm"><input id="trImportApproved" type="checkbox" ${s.approved?'checked':''}><span>Kaynak metni ve hiyerarşiyi kontrol ettim; eklerin ve tabloların özgün Word/PDF düzenini karşılaştırdım. Bu kaydın otomatik hukuki uygunluk kararı olmadığını biliyorum.</span></label>
 </form></div>
 <div class="tr-import-footer"><span class="inline-hint">Özgün dosya + XML Google Drive'a kaydedilir. Mevcut yayınlar değiştirilmez.</span><div class="page-actions"><button class="btn" type="button" data-tr-import="cancel">İptal</button><button class="btn" type="button" data-tr-import="download">XML indir</button><button class="btn primary" type="button" data-tr-import="publish" ${p.critical.length?'disabled':''}>Kontrol ettim, buluta kaydet</button></div></div></div>`;
 api.modal(r,false);
}
function collect(){const latest=document.getElementById('trSourceText')?.value,changed=latest!==undefined&&latest!==session.text;editingData();session.approved=!changed&&!!document.getElementById('trImportApproved')?.checked;session.editorOpen=!!document.querySelector('.tr-source-editor')?.open;return changed;}
function analyzed(){const s=session,clean=s.text===s.extraction.text?s.extraction.lines:s.text;s.parsed=D.parseText(clean,{...s.opts});if(s.text!==s.extraction.text&&s.extraction.pages)s.parsed.warnings.unshift('Kaynak metni düzenlendi: PDF sayfa referansları yeniden hesaplanmaz.');}
async function start(file){if(!api)throw Error('Mevzuat aktarım ekranı başlatılamadı.');session=null;api.modal('<h2>Word / PDF okunuyor</h2><p id="trImportProgress">Dosya yerel olarak okunuyor; henüz buluta yazılmıyor.</p><div class="progress-track"><div class="progress-fill" id="trImportProgressBar"></div></div>',true);
 try{const ext=await D.readFile(file,(percent,message)=>{const x=document.getElementById('trImportProgress'),bar=document.getElementById('trImportProgressBar');if(x)x.textContent=message;if(bar)bar.style.width=Math.min(100,percent)+'%';});session={file,extraction:ext,text:ext.text,opts:guessOpts(ext),approved:false,editorOpen:false,parsed:null};analyzed();paint();}
 catch(err){api.modalLocked?.(false);api.close();api.error(err);session=null;}
}
function getXml(){if(!session)throw Error('Mevzuat henüz okunmadı.');const changed=collect();if(changed)throw Error('Kaynak metin değişti. Önce Metni yeniden analiz et seçeneğini kullanın.');analyzed();const xml=D.makeXml(session.parsed,session.opts);if(!S?.validateXml)throw Error('v2.0 doğrulama dosyası eksik: src/tr-schema.js');const report=S.validateXml(xml,{allowLegacy:false});if(!report.valid)throw Error('Yapısal doğrulama: '+report.errors.slice(0,4).map(x=>x.message).join(' · '));return xml;}
async function perform(action){
 if(action==='finish'){api.close();return;}
 if(!session)return;
 if(action==='cancel'){session=null;api.close();return;}
 if(action==='reanalyze'){collect();session.approved=false;analyzed();paint();api.toast('Yapı yeniden analiz edildi. Önizlemeyi tekrar kontrol edin.');return;}
 if(action==='download'){const xml=getXml();api.saveFile(makeName(),xml,'application/xml;charset=utf-8');api.toast('Doğrulanmış XML indirildi. Bulut kaydı henüz yapılmadı.');return;}
 if(action==='publish'){
  const xml=getXml();if(!session.approved)throw Error('Kaynak belge ve hükümleri kontrol ettiğini onayla.');
  if(!api.ready())throw Error('Mevzuatı kaydetmek için Google hesabı ve Drive bağlantısı gerekiyor.');
  const generated=new File([xml],makeName(),{type:'application/xml'}),doc=api.parseXml(xml),source=session.file;
  api.modal(`<h2>Mevzuat arşivleniyor</h2><p id="trImportProgress">XML ve ${e(source.name)} Drive'a yükleniyor.</p><div class="progress-track"><div class="progress-fill" id="trImportProgressBar"></div></div>`,true);
  try{await api.publish(doc,generated,source,(percent,message)=>{const x=document.getElementById('trImportProgress'),b=document.getElementById('trImportProgressBar');if(x)x.textContent=message;if(b)b.style.width=percent+'%';});session=null;api.modal('<h2>Yeni sürüm kaydedildi</h2><p>Özgün belge, v2.0 XML ve işlenmiş veri arşivlendi. Önceki sürüm ve notlar değiştirilmedi.</p><div class="modal-actions"><button class="btn primary" type="button" data-tr-import="finish">Tamam</button></div>',false);}
  catch(err){api.modal(`<h2>Kaydetme tamamlanamadı</h2><p>${e(err.message||String(err))}</p><div class="modal-actions"><button class="btn" type="button" data-tr-import="back">Önizlemeye dön</button></div>`,false);api.error(err);}
  return;
 }
 if(action==='back'){paint();return;}
}
function configure(callbacks){api=callbacks;document.addEventListener('click',event=>{const node=event.target.closest('[data-tr-import]');if(!node)return;event.preventDefault();perform(node.dataset.trImport).catch(api.error);});
 document.addEventListener('change',event=>{const f=event.target.closest('#trImportForm');if(!session||!f)return;const name=event.target.name;
  if(['kind','form','stage','budgetImpactExpected'].includes(name)){collect();session.approved=false;analyzed();paint();}
 });
}
root.EasaTrImportUI={configure,start};
})(typeof window!=='undefined'?window:globalThis);
