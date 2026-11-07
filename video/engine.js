/* लोकसंकल्प का वीडियो : समय से चलने वाला पर्दा।

   हर फ़्रेम समय t (सेकंड) से गिनकर बनता है। CSS की अपनी चाल नहीं चलती,
   इसलिए वही t हमेशा वही तस्वीर देता है। इससे फ़्रेम कभी आगे पीछे नहीं
   होते और वीडियो दोबारा बनाने पर बिल्कुल वैसा ही बनता है। */

const FPS = 24;

/* ---------- समय की चालें ---------- */
const clamp = (x,a,b) => x<a?a:x>b?b:x;
/* 0 से 1, नरम शुरू नरम अंत */
const ease   = p => p<.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;
const easeOut= p => 1-Math.pow(1-p,3);
const easeIn = p => p*p*p;
/* a से b तक, s सेकंड पर शुरू, d सेकंड में */
const tween = (t,s,d,a,b,f) => {
  if(d<=0) return b;
  const p = clamp((t-s)/d, 0, 1);
  return a + (b-a)*(f||easeOut)(p);
};
/* दिखना और छिपना */
function fade(t, aaye, rahe, der){
  der = der===undefined ? 0.6 : der;
  if(t < aaye) return 0;
  if(t < aaye+der) return easeOut((t-aaye)/der);
  if(rahe===undefined || t < aaye+der+rahe) return 1;
  const p = (t-(aaye+der+rahe))/der;
  return p>=1 ? 0 : 1-easeIn(p);
}
/* हिंदी के अंक की तरह अल्पविराम : 2,27,021 */
function ank(n){
  n = Math.round(n);
  const s = String(n);
  if(s.length<=3) return s;
  const akhir = s.slice(-3);
  let baki = s.slice(0,-3), out='';
  while(baki.length>2){ out = ',' + baki.slice(-2) + out; baki = baki.slice(0,-2) }
  return baki + out + ',' + akhir;
}
/* गिनती ऊपर चढ़ती हुई */
const ginti = (t,s,d,tak) => ank(tween(t,s,d,0,tak,easeOut));

/* ---------- पर्दा ---------- */
const E = (tag, cls, html) => { const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e };
const $stage = () => document.getElementById('stage');

let SCENES = [], KUL = 0;

function setScenes(list){
  SCENES = list;
  let t0 = 0;
  SCENES.forEach(s => { s.shuru = t0; t0 += s.der; });
  KUL = t0;
  return KUL;
}

/* किस पर्दे पर हैं, और उस पर्दे का अपना समय */
function kaunsa(t){
  for(let i=0;i<SCENES.length;i++){
    const s=SCENES[i];
    if(t >= s.shuru && t < s.shuru+s.der) return {i, s, lt: t-s.shuru};
  }
  const s=SCENES[SCENES.length-1];
  return {i:SCENES.length-1, s, lt:s.der};
}

/* एक फ़्रेम बनाइए */
function frame(t){
  const {s, lt} = kaunsa(t);
  const st = $stage();
  st.innerHTML = '';
  const fn = DRAW[s.tarah];
  if(!fn) throw new Error('अनजान पर्दा : ' + s.tarah);
  fn(st, s, lt);
  /* पर्दों के बीच का घुलना : हर पर्दे के पहले और आख़िरी आधे सेकंड में */
  const GHUL = 0.5;
  let o = 1;
  if(lt < GHUL)            o = easeOut(lt/GHUL);
  else if(lt > s.der-GHUL) o = 1-easeIn((lt-(s.der-GHUL))/GHUL);
  st.style.opacity = o.toFixed(4);
  document.getElementById('clock').textContent = t.toFixed(2);
  /* नाम का रंग : तस्वीर वाले पर्दे पर उजला, क्रीम पर गहरा।
     पहले और आख़िरी पर्दे पर नाम नहीं, क्योंकि वहाँ नाम ख़ुद बड़ा लिखा है। */
  const mk = document.getElementById('mark');
  if(mk){
    const photoWala = !!st.querySelector('.photo');
    mk.className = photoWala ? 'ulta' : '';
    const chhipa = s.markChhipa || t < 2 || t > KUL-2;
    mk.style.opacity = chhipa ? 0 : (photoWala ? .72 : .5);
  }
}

window.__frame = frame;
window.__setScenes = setScenes;
window.__kul = () => KUL;
window.__fps = FPS;
window.__scenes = () => SCENES;
