/* लोकसंकल्प के वीडियो के पर्दे।

   PHOTO_DIR : जिन तस्वीरों पर GPS Map Camera का वॉटरमार्क जला हुआ है वे
   काटकर अलग फ़ोल्डर में रखी जाती हैं, बाक़ी रिपो से सीधे आती हैं। banao.sh
   यह फ़ोल्डर बनाता है। देखिए video/README.md।

   हर पर्दा समय lt (उस पर्दे का अपना समय, सेकंड) से बनता है।
   कहीं CSS की अपनी चाल नहीं चलती। */

/* तस्वीर, धीरे धीरे बड़ी होती हुई (Ken Burns) */
function tasveer(file, lt, der, opt){
  opt = opt || {};
  const d = E('div','photo');
  /* तस्वीर का node एक बार बनता है और फिर वही इस्तेमाल होता है।

     पहले हर फ़्रेम पर नया img बनाया जाता था। उससे ब्राउज़र हर बार JPEG
     दोबारा खोलता था, और रफ़्तार 18 फ़्रेम प्रति सेकंड से गिरकर 2 रह गई
     थी। अब node वही रहता है, सिर्फ़ उसका transform बदलता है। */
  if(!window.__imgCache) window.__imgCache = {};
  let im = window.__imgCache[file];
  if(!im){
    im = document.createElement('img');
    im.src = PHOTO_DIR + file + '.jpg';
    window.__imgCache[file] = im;
  }
  /* कुछ तस्वीरों के नीचे GPS Map Camera का वॉटरमार्क जला हुआ है, जिसमें
     जगह के अक्षांश-देशांतर और समय तक लिखे हैं। उन्हें काटकर रखना है।
     cropB = नीचे का कितना हिस्सा हटाना है, 0 से 1 में। */
  const cropB = opt.cropB || 0;
  if(cropB > 0){
    im.style.height = (100/(1-cropB)).toFixed(3) + '%';
    im.style.objectPosition = 'center top';
    im.style.top = '0';
  }
  const z0 = opt.z0===undefined ? 1.06 : opt.z0;
  const z1 = opt.z1===undefined ? 1.16 : opt.z1;
  const s  = tween(lt, 0, der, z0, z1, p=>p);     /* सीधी चाल, झटका नहीं */
  const dx = tween(lt, 0, der, (opt.x0||0), (opt.x1||0), p=>p);
  const dy = tween(lt, 0, der, (opt.y0||0), (opt.y1||0), p=>p);
  im.style.transform = 'translate('+dx.toFixed(2)+'%,'+dy.toFixed(2)+'%) scale('+s.toFixed(4)+')';
  d.appendChild(im);
  if(opt.dhundla!==false){ const v=E('div','veil'); v.style.opacity=(opt.veil===undefined?1:opt.veil); d.appendChild(v) }
  return d;
}

/* नीचे का पट्टा : जगह और तारीख़ */
function patta(st, text, lt, aaye){
  const p = E('div','patta', text);
  p.style.opacity = fade(lt, aaye===undefined?0.6:aaye, 99, 0.7);
  st.appendChild(p);
}

const DRAW = {

  /* 1. नाम */
  naam(st, s, lt){
    const w = E('div','wrap');
    const k = E('div','kesri-line'); k.style.transform='scaleX('+tween(lt,0.2,1.0,0,1).toFixed(3)+')';
    w.appendChild(k);
    const h = E('h1', null, 'लोकसंकल्प');
    h.style.fontSize='150px';
    h.style.opacity = fade(lt,0.35,99);
    h.style.transform = 'translateY('+tween(lt,0.35,1.0,34,0).toFixed(1)+'px)';
    w.appendChild(h);
    const p = E('p','lead', s.sub);
    p.style.opacity = fade(lt,1.0,99);
    w.appendChild(p);
    const q = E('p','small', s.by);
    q.style.opacity = fade(lt,1.8,99);
    w.appendChild(q);
    st.appendChild(w);
  },

  /* 2. दो पंक्तियाँ, दूसरी पहली को काटती हुई */
  dohra(st, s, lt){
    const w = E('div','wrap');
    const a = E('p','phika', s.a);
    a.style.opacity = fade(lt,0.3,99);
    w.appendChild(a);
    const b = E('h1', null, s.b);
    b.style.opacity = fade(lt, s.dusra||2.0, 99);
    b.style.transform = 'translateY('+tween(lt,s.dusra||2.0,0.9,26,0).toFixed(1)+'px)';
    w.appendChild(b);
    st.appendChild(w);
  },

  /* 3. बड़ा सवाल */
  sawal(st, s, lt){
    const w = E('div','wrap');
    const h = E('h1', null, s.text);
    h.style.fontSize = s.bada? '104px':'92px';
    h.style.opacity = fade(lt,0.3,99);
    h.style.transform='translateY('+tween(lt,0.3,1.1,30,0).toFixed(1)+'px)';
    w.appendChild(h);
    if(s.niche){ const p=E('p','lead',s.niche); p.style.opacity=fade(lt,1.6,99); w.appendChild(p) }
    st.appendChild(w);
  },

  /* 4. तीन मिसालें, एक एक करके */
  misal(st, s, lt){
    const w = E('div','wrap');
    if(s.upar){ const u=E('p','small',s.upar); u.style.opacity=fade(lt,0.2,99); w.appendChild(u) }
    s.list.forEach((t,i)=>{
      const p = E('p','misal-line', t);
      const aaye = 0.6 + i*1.5;
      p.style.opacity = fade(lt, aaye, 99);
      p.style.transform = 'translateX('+tween(lt,aaye,0.8,-26,0).toFixed(1)+'px)';
      w.appendChild(p);
    });
    if(s.ant){ const a=E('p','lead',s.ant); a.style.opacity=fade(lt,0.6+s.list.length*1.5+0.5,99); w.appendChild(a) }
    st.appendChild(w);
  },

  /* 5. उद्धरण */
  uddharan(st, s, lt){
    const w = E('div','wrap');
    const q = E('blockquote', null, s.text);
    q.style.opacity = fade(lt,0.3,99);
    q.style.transform='translateY('+tween(lt,0.3,1.1,24,0).toFixed(1)+'px)';
    w.appendChild(q);
    const c = E('p','cite', s.src);
    c.style.opacity = fade(lt,1.6,99);
    w.appendChild(c);
    st.appendChild(w);
  },

  /* 6. चार स्तंभ */
  stambh(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    const g = E('div','grid4');
    s.list.forEach((x,i)=>{
      const c = E('div','pillar');
      const aaye = 0.8 + i*0.75;
      c.style.opacity = fade(lt, aaye, 99);
      c.style.transform = 'translateY('+tween(lt,aaye,0.8,30,0).toFixed(1)+'px)';
      c.appendChild(E('div','pnum', String(i+1)));
      c.appendChild(E('div','pname', x[0]));
      c.appendChild(E('div','pdesc', x[1]));
      g.appendChild(c);
    });
    w.appendChild(g);
    st.appendChild(w);
  },

  /* 7. एक दिन : तारीख़, बात, और उसी दिन की तस्वीर */
  din(st, s, lt){
    st.appendChild(tasveer(s.photo, lt, s.der, s.kb||{}));
    const w = E('div','wrap over');
    const d = E('div','tarikh', s.tarikh);
    d.style.opacity = fade(lt,0.3,99);
    d.style.transform='translateY('+tween(lt,0.3,0.9,18,0).toFixed(1)+'px)';
    w.appendChild(d);
    const h = E('h1','on-photo', s.title);
    h.style.opacity = fade(lt,0.9,99);
    h.style.transform='translateY('+tween(lt,0.9,0.9,24,0).toFixed(1)+'px)';
    w.appendChild(h);
    if(s.niche){ const p=E('p','lead on-photo-sub',s.niche); p.style.opacity=fade(lt,1.7,99); w.appendChild(p) }
    st.appendChild(w);
    if(s.patta) patta(st, s.patta, lt, 1.2);
  },

  /* 8. अख़बार की कतरन */
  katran(st, s, lt){
    const w = E('div','wrap wide katran-wrap');
    const box = E('div','katran-box');
    box.style.opacity = fade(lt,0.3,99);
    box.style.transform = 'translateY('+tween(lt,0.3,1.0,26,0).toFixed(1)+'px) scale('+tween(lt,0,s.der,1.0,1.05,p=>p).toFixed(4)+')';
    const im = document.createElement('img');
    im.src = '../assets/img/media/' + s.file + '.webp';
    box.appendChild(im);
    w.appendChild(box);
    const t = E('div','katran-text');
    t.style.opacity = fade(lt,1.0,99);
    t.appendChild(E('div','akhbar', s.akhbar));
    t.appendChild(E('div','sheerShak', '“' + s.sheershak + '”'));
    w.appendChild(t);
    st.appendChild(w);
  },

  /* 9. गिनती चढ़ती हुई */
  ginti(st, s, lt){
    const w = E('div','wrap wide');
    if(s.title){ const h=E('h2','sheersh',s.title); h.style.opacity=fade(lt,0.2,99); w.appendChild(h) }
    const g = E('div', s.list.length>3? 'grid4':'grid3');
    s.list.forEach((x,i)=>{
      const c = E('div','stat');
      const aaye = 0.7 + i*0.5;
      c.style.opacity = fade(lt, aaye, 99);
      const n = E('div','snum', ginti(lt, aaye, 2.6, x[0]));
      c.appendChild(n);
      c.appendChild(E('div','slabel', x[1]));
      g.appendChild(c);
    });
    w.appendChild(g);
    const f = E('p','small foot', s.foot);
    f.style.opacity = fade(lt, 1.0+s.list.length*0.5, 99);
    w.appendChild(f);
    st.appendChild(w);
  },

  /* 10. पहुँच : जिलों के नाम भरते हुए */
  pahunch(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    const box = E('div','jile');
    const kitne = Math.floor(tween(lt, 0.7, 3.2, 0, s.jile.length, easeOut));
    s.jile.forEach((j,i)=>{
      const c = E('span','jila', j);
      c.style.opacity = i < kitne ? '1' : '0';
      box.appendChild(c);
    });
    w.appendChild(box);
    const r = E('div','reach');
    r.style.opacity = fade(lt, 4.0, 99);
    s.aur.forEach(x=>{ const b=E('div','rbox'); b.appendChild(E('div','rnum',x[0])); b.appendChild(E('div','rlabel',x[1])); r.appendChild(b) });
    w.appendChild(r);
    st.appendChild(w);
  },

  /* 11. सूची : तीन रास्ते, पुस्तिकाएँ वग़ैरह */
  suchi(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    if(s.upShirshak){ const u=E('p','lead',s.upShirshak); u.style.opacity=fade(lt,0.55,99); w.appendChild(u) }
    const g = E('div', s.list.length>3? 'grid4':'grid3');
    s.list.forEach((x,i)=>{
      const c = E('div','card3');
      const aaye = 0.8 + i*0.55;
      c.style.opacity = fade(lt, aaye, 99);
      c.style.transform = 'translateY('+tween(lt,aaye,0.8,26,0).toFixed(1)+'px)';
      c.appendChild(E('div','cname', x[0]));
      if(x[1]) c.appendChild(E('div','cdesc', x[1]));
      g.appendChild(c);
    });
    w.appendChild(g);
    if(s.foot){ const f=E('p','small foot',s.foot); f.style.opacity=fade(lt,1.2+s.list.length*0.55,99); w.appendChild(f) }
    st.appendChild(w);
  },

  /* 12. हेल्पलाइन के नंबर */
  madad(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    const g = E('div','lines5');
    s.list.forEach((x,i)=>{
      const c = E('div','lbox');
      const aaye = 0.7 + i*0.4;
      c.style.opacity = fade(lt, aaye, 99);
      c.style.transform='translateY('+tween(lt,aaye,0.7,22,0).toFixed(1)+'px)';
      c.appendChild(E('div','lnum', x[0]));
      c.appendChild(E('div','ldesc', x[1]));
      g.appendChild(c);
    });
    w.appendChild(g);
    if(s.foot){ const f=E('p','lead foot',s.foot); f.style.opacity=fade(lt,0.7+s.list.length*0.4+0.4,99); w.appendChild(f) }
    st.appendChild(w);
  },

  /* 13. भरोसा : निजता की बातें */
  bharosa(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    const g = E('div','ticks');
    s.list.forEach((x,i)=>{
      const c = E('div','tick');
      const aaye = 0.7 + i*0.5;
      c.style.opacity = fade(lt, aaye, 99);
      c.style.transform='translateX('+tween(lt,aaye,0.7,-22,0).toFixed(1)+'px)';
      c.appendChild(E('span','tmark','✓'));
      c.appendChild(E('span','ttext', x));
      g.appendChild(c);
    });
    w.appendChild(g);
    st.appendChild(w);
  },

  /* 14. लोग */
  log(st, s, lt){
    const w = E('div','wrap wide');
    const h = E('h2','sheersh', s.title);
    h.style.opacity = fade(lt,0.2,99);
    w.appendChild(h);
    const n = E('div','pname-big', s.naam);
    n.style.opacity = fade(lt,0.6,99);
    n.style.transform='translateY('+tween(lt,0.6,0.9,22,0).toFixed(1)+'px)';
    w.appendChild(n);
    const p = E('p','lead', s.pad);
    p.style.opacity = fade(lt,1.1,99);
    w.appendChild(p);
    const g = E('div','ticks center');
    s.list.forEach((x,i)=>{
      const c = E('div','tick');
      const aaye = 1.7 + i*0.55;
      c.style.opacity = fade(lt, aaye, 99);
      c.appendChild(E('span','ttext', x));
      g.appendChild(c);
    });
    w.appendChild(g);
    if(s.foot){ const f=E('p','small foot',s.foot); f.style.opacity=fade(lt,1.7+s.list.length*0.55+0.4,99); w.appendChild(f) }
    st.appendChild(w);
  },

  /* 15. अंत */
  ant(st, s, lt){
    st.appendChild(tasveer(s.photo, lt, s.der, {z0:1.08,z1:1.2}));
    const w = E('div','wrap over');
    const h = E('h1','on-photo', s.naara);
    h.style.fontSize='104px';
    h.style.opacity = fade(lt,0.4,99);
    h.style.transform='translateY('+tween(lt,0.4,1.2,26,0).toFixed(1)+'px)';
    w.appendChild(h);
    const k = E('div','kesri-line on-photo-line');
    k.style.transform='scaleX('+tween(lt,1.4,1.0,0,1).toFixed(3)+')';
    w.appendChild(k);
    const p = E('p','lead on-photo-sub', s.site);
    p.style.opacity = fade(lt,1.9,99);
    w.appendChild(p);
    const q = E('p','small on-photo-sub', s.by);
    q.style.opacity = fade(lt,2.5,99);
    w.appendChild(q);
    st.appendChild(w);
  }
};
