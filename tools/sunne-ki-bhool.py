#!/usr/bin/env python3
"""संकल्प साथी : सुनने की भूल वाली सूची को जाँचता है।

साथी पर सवाल बोलकर पूछा जाता है। बोली हुई बात को अक्षरों में बदलने का
काम फ़ोन की अपनी आवाज़-पहचान सेवा करती है, और वह कभी-कभी ग़लत सुनती है।
12 नवंबर 2026 को गाँव में यह मिला : किसी ने "लत" बोला और फ़ोन ने "लात"
लिखा, जिससे पूरा मिलान टूट गया।

इसीलिए saathi/index.html में SUNNE_KI_BHOOL नाम की एक छोटी सूची है, जो
बोली हुई बात में वे शब्द सुधार देती है। यह औज़ार उस सूची की जाँच करता है।

चलाइए :  python3 tools/sunne-ki-bhool.py

जाँच यह है : **ग़लत शब्द कहीं असली में इस्तेमाल नहीं होना चाहिए।**

अगर "दवाई" को "दवा" में बदलने की पंक्ति डाल दी जाए, तो वह नुक़सान करेगी,
क्योंकि दवाई ख़ुद एक सही शब्द है और सवालों में नौ जगह आता है। इस औज़ार ने
वही सुझाव रोका था।

नया मामला जोड़ने का तरीक़ा :

  1. saathi/index.html में SUNNE_KI_BHOOL में एक पंक्ति जोड़िए
  2. यह औज़ार चलाइए। अगर यह कहे कि शब्द असली में इस्तेमाल होता है,
     तो वह पंक्ति मत रखिए।
  3. साठ सवालों की कसौटी दोबारा चलाइए और देखिए कि गिनती घटी तो नहीं

निकलने का अंक 1 तभी होता है जब कोई पंक्ति नुक़सान कर सकती हो।
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAATHI = ROOT / 'saathi'


def devnagri_shabd(w: str) -> re.Pattern:
    """पूरा शब्द, टुकड़ा नहीं। देवनागरी में \\b काम नहीं करता."""
    return re.compile(r'(?<![ऀ-ॿ])' + re.escape(w) + r'(?![ऀ-ॿ])')


def suchi_padho() -> dict:
    """index.html से SUNNE_KI_BHOOL की जोड़ियाँ निकालिए."""
    html = (SAATHI / 'index.html').read_text(encoding='utf-8')
    m = re.search(r'var SUNNE_KI_BHOOL\s*=\s*\{(.*?)\n  \};', html, re.S)
    if not m:
        print('SUNNE_KI_BHOOL सूची index.html में नहीं मिली।')
        sys.exit(1)
    jod = {}
    for line in m.group(1).split('\n'):
        mm = re.match(r"\s*'([^']+)'\s*:\s*'([^']+)'", line)
        if mm:
            jod[mm.group(1)] = mm.group(2)
    return jod


def main() -> int:
    jod = suchi_padho()
    if not jod:
        print('सूची ख़ाली है। जाँचने को कुछ नहीं।')
        return 0

    # जहाँ-जहाँ असली पाठ है
    kahan = {}
    bank = json.loads((SAATHI / 'bank.json').read_text(encoding='utf-8'))
    kahan['सवाल'] = [r.get('q', '') for r in bank] + [r.get('v') or '' for r in bank]
    roop = json.loads((SAATHI / 'roop.json').read_text(encoding='utf-8'))
    kahan['सवालों के रूप'] = [p for l in roop.values() for p in l]
    for naam, f in (('कोश', 'kosh.json'), ('मंज़ूर जवाब', 'jawab.json')):
        path = SAATHI / f
        if path.exists():
            kahan[naam] = [json.dumps(json.loads(path.read_text(encoding='utf-8')),
                                      ensure_ascii=False)]

    kharab = 0
    print('%-10s %-10s %s' % ('सुना', 'असल में', 'जाँच'))
    print('-' * 62)
    for bad, good in jod.items():
        pat = devnagri_shabd(bad)
        mila = {k: sum(len(pat.findall(t)) for t in v) for k, v in kahan.items()}
        kul = sum(mila.values())
        if kul:
            kharab += 1
            jagah = ', '.join('%s में %d' % (k, n) for k, n in mila.items() if n)
            print('%-10s %-10s ✗ यह शब्द असली में इस्तेमाल होता है : %s' % (bad, good, jagah))
        else:
            print('%-10s %-10s ✓ कहीं असली में नहीं, बदलना सुरक्षित' % (bad, good))

        # सही शब्द सचमुच सूची में है या नहीं, वरना सुधार बेकार है
        if not sum(len(devnagri_shabd(good).findall(t))
                   for v in kahan.values() for t in v):
            print('%-21s ⚠ "%s" भी कहीं नहीं मिला, यानी सुधार से कोई फ़ायदा नहीं होगा'
                  % ('', good))

    print('-' * 62)
    if kharab:
        print('%d पंक्तियाँ नुक़सान कर सकती हैं। उन्हें हटाइए।' % kharab)
        return 1
    print('सब %d पंक्तियाँ सुरक्षित हैं।' % len(jod))
    return 0


if __name__ == '__main__':
    sys.exit(main())
