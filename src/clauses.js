/* EASA eRules Hub - Clause hierarchy and stable sub-requirement anchors.
   Keeps the XML's explicit ListLevelN when available; legacy processed releases
   use conservative numbered-marker inference without modifying saved Drive data.
*/
(function (root) {
  'use strict';
  const numbered = /^\s*\(\s*([a-zA-Z]{1,5}|\d{1,4})\s*\)[ \t\u00a0]*/;
  const romans = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/;
  function marker(text) {
    const m = numbered.exec(String(text || ''));
    if (!m) return null;
    return {code:m[1].toLowerCase(), label:'('+m[1]+')', body:String(text).slice(m[0].length).trim()};
  }
  function group(code, primary, lastRoot) {
    if (/^\d+$/.test(code)) return 'number';
    if (romans.test(code) && (code.length>1 || (code==='i' && lastRoot!=='h' && primary==='alpha') || primary==='number')) return 'roman';
    return 'alpha';
  }
  function legacyDepth(m, context) {
    if (!context.primary) context.primary = /^\d+$/.test(m.code)?'number':(m.code==='i'?'roman':'alpha');
    const g = group(m.code, context.primary, context.lastRoot);
    let depth=0;
    if (context.primary==='alpha') {
      if (g==='number') depth=1;
      else if (g==='roman') depth=context.previousGroup==='number'?2:1;
      else depth=0;
    } else if (context.primary==='number') {
      if (g==='alpha') depth=1;
      else if (g==='roman') depth=context.previousGroup==='alpha'?2:1;
    } else if (g==='alpha'||g==='number') depth=1;
    if (depth===0) context.lastRoot=m.code;
    context.previousGroup=g;
    return depth;
  }
  function outline(blocks) {
    const out=[], stack=[], used=new Map(), ctx={primary:null,previousGroup:null,lastRoot:null};
    for (const block of blocks || []) {
      if (block && Array.isArray(block.rows)) {out.push({type:'table',rows:block.rows}); continue;}
      if (!block || typeof block.t!=='string') continue;
      if (block.h) {out.push({type:'heading',text:block.t});stack.length=0;ctx.primary=null;continue;}
      const m=marker(block.t);
      const exact=Number.isInteger(block.level) && block.level>=0 && block.level<=8 ? block.level : null;
      if (m) {
        const level= Math.min(5,exact===null?legacyDepth(m,ctx):exact);
        if (exact!==null && level===0) ctx.lastRoot=m.code;
        if (exact!==null && !ctx.primary) ctx.primary= /^\d+$/.test(m.code)?'number':'alpha';
        stack.length=level+1;
        stack[level]=m.code;
        for(let i=0;i<level;i++) if(!stack[i]) stack[i]='_';
        let anchor=stack.join('/');
        const occ=(used.get(anchor)||0)+1;used.set(anchor,occ);
        if(occ>1)anchor+='~'+occ;
        out.push({type:'clause',text:m.body,label:m.label,anchor,level,reference:stack.filter(x=>x!=='_').join(' › '),raw:block.t});
      } else if (exact!==null) {
        out.push({type:'text',text:block.t,level:Math.min(5,exact)});
      } else out.push({type:'text',text:block.t});
    }
    return out;
  }
  function fingerprint(text){
    const s=String(text||'').replace(/\s+/g,' ').trim();
    let h=0xcbf29ce484222325n;
    for(let i=0;i<s.length;i++){h^=BigInt(s.charCodeAt(i));h=BigInt.asUintN(64,h*0x100000001b3n);}
    return h.toString(16).padStart(16,'0');
  }
  function noteText(v){return typeof v==='string'?v:(v&&typeof v.text==='string'?v.text:'');}
  function countNotes(annotation){return Object.values(annotation?.subnotes||{}).filter(v=>noteText(v).trim()).length;}
  root.EasaClauses={outline,marker,fingerprint,noteText,countNotes};
  if (typeof module!=='undefined' && module.exports) module.exports=root.EasaClauses;
})(typeof globalThis!=='undefined'?globalThis:this);
