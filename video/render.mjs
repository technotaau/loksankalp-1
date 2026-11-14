/* playwright यहाँ ESM से नहीं मिलता, क्योंकि वह /opt/node-tools में है और
   ESM की खोज NODE_PATH नहीं देखती। createRequire से CJS वाली खोज चलती है। */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'node:fs';
const SP = process.env.OUT_DIR || '/tmp/loksankalp-video';
const OUT = SP+'/frames';
const SE  = Number(process.argv[3] || 0);      /* किस फ़्रेम से शुरू करें */
if(SE===0) fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
  args:['--headless','--no-sandbox','--force-device-scale-factor=1','--disable-lcd-text']});
const pg=await (await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8750/video/'+(process.argv[2]||'video.html'),{waitUntil:'networkidle'});
await pg.evaluate(()=>document.fonts.ready);
/* सारी तस्वीरें पहले ही खुलवा लो, ताकि बीच में रुकावट न आए */
await pg.evaluate(async ()=>{
  const fs = new Set();
  __scenes().forEach(s=>{ if(s.photo) fs.add(s.photo) });
  window.__imgCache = window.__imgCache || {};
  await Promise.all([...fs].map(f=>new Promise(res=>{
    const im=document.createElement('img'); im.src='img/photos/'+f+'.jpg';
    im.onload=()=>{ window.__imgCache[f]=im; res() }; im.onerror=()=>res();
  })));
});
const FPS=await pg.evaluate(()=>__fps), KUL=await pg.evaluate(()=>__kul());
const N=Math.round(KUL*FPS);
console.log('कुल समय', KUL.toFixed(1),'सेकंड |', N,'फ़्रेम | शुरू', SE);
const t0=Date.now();
for(let f=SE; f<N; f++){
  await pg.evaluate(t=>__frame(t), f/FPS);
  /* JPEG, PNG नहीं। नापकर देखा : तस्वीर वाले फ़्रेम को PNG में बदलने में
     674 ms लगते थे और JPEG 96 में 79 ms, यानी साढ़े आठ गुना फ़र्क़। दोगुना
     बड़ा करके मिलाया, अक्षरों के किनारों पर कोई फ़र्क़ नहीं दिखा, और आगे
     H.264 में बदलना ही है। */
  await pg.screenshot({path: OUT+'/f'+String(f).padStart(5,'0')+'.jpg', type:'jpeg', quality:96});
  if(f%240===0 && f) console.log('  '+f+'/'+N+'  ('+((Date.now()-t0)/1000).toFixed(0)+'s)');
}
console.log('हो गया :', ((Date.now()-t0)/1000).toFixed(0),'सेकंड');
if(errs.length) console.log('पन्ने की ख़राबियाँ :', errs.slice(0,5));
await b.close();
