/* v3.10 TR PDF/DOCX import wizard: explicit human review before cloud publish. */
(function(root){
'use strict';
let api=null,session=null;
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const D=root.EasaTrDocuments;
const safeName=s=>String(s||'TR_Mevzuat').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70);
function makeName(code){return safeName(code)+'_'+(session?.opts.publicationDate||'tarihsiz')+'.xml';}
function guessOpts(ext){return {code:ext.suggestions.code||'',title:ext.suggestions.title||'',publicationDate:ext.suggestions.publicationDate||'',effectiveDate:'',gazetteNumber:ext.suggestions.gazetteNumber||'',issuer:'Sivil Havacılık Genel Müdürlüğü',sourceUrl:'',filename:ext.filename,sha256:ext.sha256};}
function optionField(label,name,value,placeholder='',type='text',required=false){return `<label class="tr-field"><span>${e(label)}</span><input class="form-field" type="${type}" name="${name}" value="${e(value||'')}" placeholder="${e(placeholder)}" ${required?'required':''} maxlength="${name==='title'?280:240}"></label>`;}
function editingData(){if(!session)return;const body=document.getElementById('trImportForm');if(!body)return;const data=Object.fromEntries(new FormData(body));session.opts={...session.opts,...data};const textarea=document.getElementById('trSourceText');if(textarea)session.text=textarea.value;}
function statsHtml(parsed){const st=parsed.stats;return `<div class="tr-stats"><span><b>${st.chapters}</b> bölüm</span><span><b>${st.articles}</b> madde</span><span><b>${st.paragraphs}</b> fıkra</span><span><b>${st.items}</b> bent</span><span><b>${st.subitems}</b> alt bent</span></div>`;}
function warnHtml(){const p=session.parsed,extra=[session.extraction.warning,...(session.extraction.warnings||[])].filter(Boolean),all=[...extra,...p.warnings];return `<div class="tr-review-alert ${p.critical.length?'is-critical':''}"><strong>${p.critical.length?'Yayımlama engeli – yapıyı düzeltin':all.length?'Kontrol edilmesi gereken noktalar':'Yapı denetimi'}</strong><div>${p.critical.length?e(p.critical.join(' ')):e(all.length?`${all.length} uyarı bulundu. Madde metinlerini resmî kaynakla karşılaştırın.`:'Temel hiyerarşi tanındı. Yine de mevzuat metnini kaynakla karşılaştırın.')}</div>${all.length?`<details><summary>Tüm uyarıları gör (${all.length})</summary><ol>${all.slice(0,80).map(x=>`<li>${e(x)}</li>`).join('')}</ol></details>`:''}</div>`;}
function renderPreview(){const s=session,p=s.parsed;
  return `<div class="tr-preview-list">${p.chapters.map(ch=>`<section class="tr-preview-chapter"><h4>${e(ch.ordinal)} BÖLÜM · ${e(ch.title)}</h4><div>${ch.articles.map(a=>{
   const parts=[];
   for(const pa of a.paragraphs){
     parts.push((pa.number===null?'':'('+pa.number+') ')+pa.text);
     for(const b of pa.bents){
       parts.push(b.label+') '+b.text);
       for(const child of b.children)parts.push(child.number+') '+child.text);
     }
     if(pa.closing)parts.push(pa.closing);
   }
   const text=parts.join('\n');
   return `<details class="tr-article"><summary><b>${a.temporary?'GEÇİCİ MADDE':'MADDE'} ${a.number}</b><span>${e(a.heading||'(Başlık yok)')}</span><small>${a.paragraphs.length} fıkra</small></summary><pre>${e(text)}</pre></details>`;
 }).join('')}</div></section>`).join('')}</div>`;
}
function paint(){
 if(!session)return;
 const s=session,p=s.parsed,o=s.opts;
 const r=`<div class="tr-import-modal" id="trImportRoot"><div class="tr-import-head"><div><div class="eyebrow">Türkiye mevzuatı · DOCX / PDF</div><h2>Mevzuat aktarımını kontrol et</h2><p>${e(s.file.name)} · ${(s.file.size/1024).toFixed(0)} KB · ${e(s.extraction.format)}${s.extraction.pages?' · '+s.extraction.pages+' sayfa':''}</p></div><button class="btn icon-only" type="button" data-tr-import="cancel" aria-label="Pencereyi kapat">✕</button></div>
 <div class="tr-import-body"><form id="trImportForm" autocomplete="off"><div class="tr-form-grid">
 ${optionField('Mevzuat kodu *','code',o.code,'SHY-OLAY', 'text',true)}
 ${optionField('Yayımlanma tarihi *','publicationDate',o.publicationDate,'','date',true)}
 <div class="tr-span-2">${optionField('Mevzuatın tam adı *','title',o.title,'SİVİL HAVACILIK ... YÖNETMELİĞİ','text',true)}</div>
 ${optionField('Resmî Gazete sayısı','gazetteNumber',o.gazetteNumber,'33374')}
 ${optionField('Yürürlüğe giriş tarihi','effectiveDate',o.effectiveDate,'','date')}
 ${optionField('Yayımlayan kurum','issuer',o.issuer,'Sivil Havacılık Genel Müdürlüğü')}
 ${optionField('Kaynak bağlantısı','sourceUrl',o.sourceUrl,'https://...')}
 </div>
 <div class="tr-preview-header"><div><h3>Algılanan mevzuat hiyerarşisi</h3><p>XML oluşturulmadan önce metni, fıkraları ve bentleri gözden geçir.</p></div><button type="button" class="btn small" data-tr-import="reanalyze">Metni yeniden analiz et</button></div>
 ${statsHtml(p)}${warnHtml()}${renderPreview()}
 <details class="tr-source-editor" ${s.editorOpen?'open':''}><summary>Kaynak metni düzenle (yanlış ayrılmış maddeleri düzelt)</summary><p>Madde ve bentleri düzenlerken satır başlangıçlarındaki <code>MADDE 1-</code>, <code>(1)</code>, <code>a)</code>, <code>1)</code> işaretlerini koru. Değişiklik sonrası <b>Metni yeniden analiz et</b> seçeneğine bas.</p><textarea id="trSourceText" spellcheck="false" rows="13" class="form-field">${e(s.text)}</textarea></details>
 <label class="tr-confirm"><input id="trImportApproved" type="checkbox" ${s.approved?'checked':''}><span>Madde, fıkra, bent ve alt bentleri kaynak dosyayla karşılaştırdım. Yayımlanan mevzuatın doğruluğunu kontrol ettim.</span></label>
 </form></div>
 <div class="tr-import-footer"><span class="inline-hint">Orijinal belge + üretilen XML Drive’a; katalog Firestore’a kaydedilir.</span><div class="page-actions"><button type="button" class="btn" data-tr-import="cancel">İptal</button><button type="button" class="btn" data-tr-import="download">XML indir</button><button type="button" class="btn primary" data-tr-import="publish" ${p.critical.length?'disabled':''}>Kontrol ettim, buluta kaydet</button></div></div></div>`;
 api.modal(r,false);
}
function collect(){const latest=document.getElementById('trSourceText')?.value;const changed=latest!==undefined&&latest!==session.text;editingData();session.approved=!changed&&!!document.getElementById('trImportApproved')?.checked;session.editorOpen=!!document.querySelector('.tr-source-editor')?.open;return changed;}
function analyzed(){
 const s=session;const clean=s.text===s.extraction.text?s.extraction.lines:s.text;
 s.parsed=D.parseText(clean,{...s.opts});
 if(s.text!==s.extraction.text&&s.extraction.pages&&!s.parsed.warnings.includes('Kaynak metni düzenlendi. PDF sayfa referansları otomatik yeniden hesaplanmaz.'))s.parsed.warnings.unshift('Kaynak metni düzenlendi. PDF sayfa referansları otomatik yeniden hesaplanmaz.');
}
async function start(file){
 if(!api)throw Error('Mevzuat içe aktarma modülü başlatılmadı.');
 session=null;
 api.modal('<h2>Word / PDF okunuyor</h2><p id="trImportProgress">Dosya yerel olarak işleniyor; henüz buluta kaydedilmiyor…</p><div class="progress-track"><div class="progress-fill" id="trImportProgressBar"></div></div>',true);
 try{
   const ext=await D.readFile(file,(percent,message)=>{const txt=document.getElementById('trImportProgress'),fill=document.getElementById('trImportProgressBar');if(txt)txt.textContent=message;if(fill)fill.style.width=Math.min(100,percent)+'%';});
   session={file,extraction:ext,text:ext.text,opts:guessOpts(ext),approved:false,editorOpen:false,parsed:null};analyzed();
   paint();
 }catch(err){api.modalLocked?.(false);api.close();api.error(err);session=null;}
}
function getXml(){if(!session)throw Error('Mevzuat verisi henüz okunmadı.');const changed=collect();if(changed)throw Error('Kaynak metin düzenlendi. Önce “Metni yeniden analiz et” düğmesine basın, ardından son hâlini yeniden kontrol edip onaylayın.');analyzed();return D.makeXml(session.parsed,session.opts);}
async function perform(action){
 if(action==='finish'){api.close();return;}
 if(!session)return;
 if(action==='cancel'){session=null;api.close();return;}
 if(action==='reanalyze'){collect();session.approved=false;analyzed();paint();api.toast('Mevzuat yeniden analiz edildi; sonuçları yeniden kontrol edip onaylayın.');return;}
 if(action==='download'){
   const xml=getXml();api.saveFile(makeName(session.opts.code),xml,'application/xml;charset=utf-8');api.toast('Taslak XML indirildi; henüz buluta yayımlanmadı.');return;
 }
 if(action==='publish'){
   const xml=getXml();if(!session.approved)throw Error('Lütfen önce kaynak metni karşılaştırdığını onayla.');
   if(!api.ready())throw Error('Mevzuatı buluta kaydetmek için Google hesabına giriş yap ve Drive bağlantısını etkinleştir.');
   const code=session.opts.code;const generated=new File([xml],makeName(code),{type:'application/xml'});
   const doc=api.parseXml(xml);
   const source=session.file;
   api.modal(`<h2>Mevzuat arşivleniyor</h2><p id="trImportProgress">Yapılandırılmış XML ve orijinal ${e(source.name)} Drive’a yükleniyor…</p><div class="progress-track"><div class="progress-fill" id="trImportProgressBar"></div></div>`,true);
   try{
     await api.publish(doc,generated,source,(percent,message)=>{const x=document.getElementById('trImportProgress'),b=document.getElementById('trImportProgressBar');if(x)x.textContent=message;if(b)b.style.width=percent+'%';});
     session=null;api.modal('<h2>Mevzuat buluta kaydedildi</h2><p>Orijinal Word/PDF, yapılandırılmış XML ve aranabilir mevzuat verisi Google Drive’a arşivlendi. Kaynak sürümünü artık kütüphaneden açabilir, not ekleyebilir ve EASA ile eşleştirebilirsin.</p><div class="modal-actions"><button class="btn primary" type="button" data-tr-import="finish">Tamam</button></div>',false);
   }catch(err){api.modal(`<h2>Kaydetme tamamlanamadı</h2><p>${e(err.message||String(err))}</p><div class="modal-actions"><button class="btn" data-tr-import="back" type="button">Önizlemeye dön</button><button class="btn primary" data-tr-import="retry" type="button">Tekrar dene</button></div>`,false);api.error(err);}
   return;
 }
 if(action==='back'){paint();return;}
 if(action==='retry'){paint();api.toast('Metin önizlemesi açıldı. Kontrol ederek tekrar kaydedebilirsin.');return;}
}
function configure(callbacks){api=callbacks;document.addEventListener('click',event=>{const node=event.target.closest('[data-tr-import]');if(!node)return;event.preventDefault();perform(node.dataset.trImport).catch(api.error);});}
root.EasaTrImportUI={configure,start};
})(typeof window!=='undefined'?window:globalThis);
