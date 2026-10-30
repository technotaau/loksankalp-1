# -*- coding: utf-8 -*-
"""पुस्तिकाओं के OCR पाठ को बोलने लायक़ टुकड़ों में बाँटिए।
हर टुकड़े के साथ : कौन सी पुस्तिका, कौन सा पन्ना, ऊपर कौन सा शीर्षक।"""
import glob, os, re, json, collections

SRC='/home/user/loksankalp-1/docs/sankalp-saathi/pustika-paath'
TITLES={
 'abhibhavak-samvad':'अभिभावक संवाद','bhashan-samagri':'भाषण सामग्री',
 'good-parenting':'अच्छी परवरिश','gram-sabha-margdarshika':'ग्राम सभा मार्गदर्शिका',
 'gram-samiti-netritva':'ग्राम समिति नेतृत्व','jeevan-kaushal-mansik-swasthya':'जीवन कौशल और मानसिक स्वास्थ्य',
 'mahilaen-matrishakti':'महिलाएँ और मातृशक्ति','mukhya-parichay-bhag-2':'मुख्य परिचय भाग 2',
 'mukhya-parichay':'मुख्य परिचय','nashamukt-aayojan':'नशामुक्त आयोजन',
 'nashe-ke-dushprabhav':'नशे के दुष्प्रभाव','samajik-sweekriti-samajshastra':'सामाजिक स्वीकृति का समाजशास्त्र',
 'sangati-kishoravastha':'संगति और किशोरावस्था','vidyalay-shikshak-parivartan':'विद्यालय और शिक्षक',
 'volunteer-handbook':'स्वयंसेवक पुस्तिका','yuva-club-model':'युवा क्लब मॉडल'}

ZW=''.join(chr(c) for c in (0x200b,0x200c,0x200d,0xfeff))
def clean(l):
    l=l.translate({ord(c):None for c in ZW})
    # गोली के निशान OCR में देवनागरी अंक बनकर आते हैं : ४, ७, ०, ९
    l=re.sub(r'^[“\"\'\s]*[४७०९‘’•»>\-]+\s+', '· ', l)
    l=re.sub(r'\s[४७०९]\s', ' · ', l)
    l=l.replace('“४','·')
    l=re.sub(r'-{2,}', ' ', l)
    l=re.sub(r'[|¦]', '', l)
    l=re.sub(r'\s+', ' ', l).strip()
    # हर पन्ने के पाद में यही पंक्ति है, और उसके बाद OCR का कचरा। वहीं से काट दीजिए।
    for foot in ('लोकसंकल्प नशे की सामाजिक स्वीकृति के विरुद्ध', 'नशा मुक्त भारत अभियान'):
        k=l.find(foot)
        if k>=0: l=l[:k].strip()
    # आख़िर में बचा हुआ कचरा छाँटिए
    l=re.sub(r'[\s\u0966-\u096F\[\]{}()<>/\\*+=~^_#@$%&.,:;0-9]{6,}$', '', l).strip()
    l=re.sub(r'^[·\s]+$', '', l)
    return l

def is_junk(l):
    if len(l)<3: return True
    dev=len(re.findall(r'[ऀ-ॿ]', l))
    if dev < max(3, len(l)*0.45): return True              # ज़्यादातर कचरा अक्षर
    if re.match(r'^(अध्याय|भाग)\s', l) and len(l)<70: return False
    return False

def is_heading(l):
    if len(l)>72: return False
    if l.endswith('।') or l.endswith('।"'): return False
    if l.startswith('·'): return False
    return l.endswith('?') or l.endswith(':') or (len(l.split())<=9 and not l.endswith(','))

out=[]
for f in sorted(glob.glob(os.path.join(SRC,'*.txt'))):
    slug=os.path.basename(f)[:-4]
    if slug not in TITLES: continue
    raw=open(f,encoding='utf-8').read()
    pages=re.split(r'<<<PAGE (\d+)>>>', raw)[1:]
    pairs=list(zip(pages[0::2], pages[1::2]))
    # जो पंक्ति आधे से ज़्यादा पन्नों पर है, वह सिरा या पाद है
    seen=collections.Counter()
    for _,body in pairs:
        for l in set(clean(x) for x in body.split('\n')):
            if l: seen[l]+=1
    boiler={l for l,n in seen.items() if n> max(3, len(pairs)*0.4)}
    head=''
    for pno, body in pairs:
        p=int(pno)
        lines=[clean(x) for x in body.split('\n')]
        lines=[l for l in lines if l and l not in boiler and not is_junk(l)]
        if len(lines)>=8 and sum(1 for l in lines if l.startswith(('अध्याय','भाग'))) >= 4:
            continue                                        # अनुक्रम वाला पन्ना
        buf=[]
        def flush(force=False):
            global buf, head
            t=' '.join(buf).strip()
            # छोटा टुकड़ा अकेले बोलने लायक़ नहीं होता; उसे आगे वाले के साथ जोड़े रखिए
            if len(t) < 200 and not force: return
            buf=[]
            if len(t)<120: return
            out.append({'b':slug,'t':TITLES[slug],'p':p,'h':head,'x':t,
                        'w': 0.55 if slug=='bhashan-samagri' else 1.0})
        for l in lines:
            if is_heading(l):
                flush(); 
                if len(' '.join(buf))>=120: flush(True)
                else: buf=[]
                head=l.rstrip(':'); continue
            buf.append(l)
            if len(' '.join(buf))>=500: flush(True)
        flush(True)

print(f'कुल टुकड़े : {len(out)}')
ln=[len(c['x']) for c in out]
ln.sort()
print(f'लंबाई : बीच का {ln[len(ln)//2]}, सबसे बड़ा {ln[-1]}, सबसे छोटा {ln[0]}')
by=collections.Counter(c['b'] for c in out)
for k,v in by.most_common(): print(f'  {TITLES[k]:34s} {v:4d}')
json.dump(out, open('kb/chunks.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
print('\nबाइट :', os.path.getsize('kb/chunks.json'))
print('\n--- नमूना ---')
for c in out[:2]+out[len(out)//2:len(out)//2+2]:
    print(f'[{c["t"]} प.{c["p"]}] {c["h"][:40]}')
    print('   ', c['x'][:190], '\n')
