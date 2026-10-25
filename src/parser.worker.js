/* This file runs on a Web Worker so large XML parsing does not freeze the UI. */
importScripts('./parser.js');
self.onmessage = async e => {
  try {
    self.postMessage({type:'progress',percent:1,label:'XML okunuyor'});
    const xml = await e.data.file.text();
    const doc = parseEasaXml(xml,(percent,label)=>self.postMessage({type:'progress',percent,label}));
    self.postMessage({type:'success',doc});
  } catch(err) {self.postMessage({type:'error',message:err.message||String(err)});}
};
