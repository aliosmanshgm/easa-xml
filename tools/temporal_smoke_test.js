#!/usr/bin/env node
/* Offline tests of date math, draft candidates, conservative repeal detection,
   clause scope and safe CSV output. No Firebase / Drive required. */
const assert=require('node:assert/strict');
const T=require('../src/temporal.js');
assert.equal(T.addPeriod('2026-09-18',6,'month'),'2027-03-18');
assert.equal(T.addPeriod('2027-03-18',18,'month'),'2028-09-18');
assert.equal(T.addPeriod('2024-01-31',1,'month'),'2024-02-29');
assert.equal(T.addPeriod('2025-01-31',1,'month'),'2025-02-28');
assert.equal(T.addPeriod('2026-12-31',1,'day'),'2027-01-01');
assert.equal(T.validDate('2026-02-29'),false);
assert.equal(T.quantity('on sekiz'),18);
const eu={language:'en',familyId:'easa-test',versionId:'easa-test|2028-01-01|s',published:'2028-01-01',records:[
 {key:'e:article5',title:'Article 5',plain:'This Regulation shall apply from 1 January 2029.',blocks:[]},
 {key:'e:article6',title:'Article 6',plain:'Regulation (EU) 123/2014 is repealed.',blocks:[]}
]};
const suggestions=T.suggest(eu);
assert.equal(suggestions.length,1);
assert.equal(suggestions[0].type,'application');
assert.equal(suggestions[0].date,'2029-01-01');
assert.equal(suggestions[0].status,'draft');
const base={id:'tim_123456789012345678901234',familyId:'easa-test',versionId:eu.versionId,type:'repeal',scope:'provision',recordKey:'e:article6',anchor:'',date:'',basis:'conditional',baseDate:'',period:0,unit:'month',reference:'Article 6',sourceExcerpt:'',expression:'',status:'confirmed',note:'Historical act and scope verified.',targetDescription:'',legalChangeRef:'Regulation (EU) 123/2014'};
assert(T.validate(base));
assert.throws(()=>T.validate({...base,status:'confirmed',note:'',date:''}),/açıklamasıyla/);
assert.throws(()=>T.validate({...base,scope:'group',recordKey:'',targetDescription:''}),/[Kk]ademeli/);
assert(T.validate({...base,scope:'group',recordKey:'',targetDescription:'Article 2, Article 3'}));
const csv=T.toCSV([{...base,note:'=2+2'}]);
assert(csv.includes("'="));
console.log('OK: Tarih hesabı, EASA önerileri, kapsam, doğrulama ve CSV testleri');
