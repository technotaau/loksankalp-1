#!/usr/bin/env python3
"""Google Sheet से मंज़ूर हो चुके जवाब लाकर saathi/jawab.json लिखता है.

चलाइए:  python3 tools/jawab-lao.py

सिर्फ़ वे जवाब आते हैं जिनकी शीट में "मंज़ूरी" हाँ है और मंज़ूर करने वाले
का नाम भरा है. बिना मंज़ूरी वाला जवाब इस फ़ाइल में कभी नहीं जाता, इसलिए
साथी उसे दिखा भी नहीं सकता.

यह औज़ार शीट की बात आँख बंद करके नहीं मानता. हर पंक्ति पर वही जाँच चलती
है जो जवाब लिखते वक़्त चली थी: id असली हो, जोखिम Emergency या High न हो,
em-dash न हो, दवा का नाम या मात्रा न हो, स्रोत का पन्ना कोश में सचमुच हो.
एक भी पंक्ति फ़ेल हो तो कुछ नहीं लिखा जाता और यह बता देता है कि कहाँ.
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = ROOT / 'saathi'
OUT = S / 'jawab.json'

DAWA = re.compile(
    r'(डाइज़|डायज़|नाल्ट्रेक्स|नालट्रेक्स|एकैम्प|एकाम्प|डिसल्फ|बुप्रेनॉर|बुप्रिनॉर'
    r'|मेथाडोन|लोराज़|क्लोनाज़|क्लोर्डाय|baclofen|बैक्लोफ|निकोटीन पैच|चैंपिक|वैरेनिक)',
    re.I)
MATRA = re.compile(r'\d+\s*(mg|मिग्रा|मिलीग्राम|ml|एमएल|गोली|गोलियाँ|खुराक)', re.I)


def endpoint() -> str:
    """index.html में लिखा वही पता पढ़ता है, दो जगह रखने से बचने के लिए."""
    t = (S / 'index.html').read_text(encoding='utf-8')
    m = re.search(r"var ENDPOINT='([^']+)'", t)
    if not m:
        raise SystemExit('index.html में ENDPOINT नहीं मिला')
    return m.group(1)


def main() -> int:
    bank = {r['id']: r for r in json.loads((S / 'bank.json').read_text(encoding='utf-8'))}
    kosh = json.loads((S / 'kosh.json').read_text(encoding='utf-8'))
    panne = {'%s|%s' % (k['t'], k['p']) for k in kosh}
    pustika = {k['t'] for k in kosh}

    url = endpoint() + '?jawab=1'
    print('शीट से पूछ रहे हैं...')
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.loads(r.read().decode('utf-8'))

    if not d.get('ok'):
        print('शीट ने मना किया : %s' % d.get('message', '(कोई कारण नहीं बताया)'))
        return 1
    print('शीट में कुल %d, मंज़ूर %d' % (d.get('kul', 0), d.get('manzoor', 0)))

    kharab, saaf, dekha = [], [], set()
    for r in d.get('jawab', []):
        i, a, src = r.get('id', ''), (r.get('a') or '').strip(), (r.get('src') or '').strip()
        by, on = (r.get('by') or '').strip(), (r.get('on') or '').strip()

        def bol(why):
            kharab.append((i, why))

        if i in dekha:
            bol('शीट में दो बार है')
            continue
        dekha.add(i)
        b = bank.get(i)
        if b is None:
            bol('यह id bank.json में नहीं है')
            continue
        if b.get('r') in ('Emergency', 'High'):
            bol('जोखिम %s है, इस पर लिखा जवाब दिखता ही नहीं' % b['r'])
        if not by:
            bol('मंज़ूर करने वाले का नाम नहीं')
        if not on:
            bol('मंज़ूरी की तारीख़ नहीं')
        if len(a) < 400:
            bol('बहुत छोटा, %d अक्षर' % len(a))
        if len(a) > 1100:
            bol('बहुत लंबा, %d अक्षर' % len(a))
        if '—' in a or '–' in a:
            bol('dash है')
        if DAWA.search(a):
            bol('दवा का नाम है')
        if MATRA.search(a):
            bol('मात्रा या खुराक है')
        if '1800-11-2356' in a:
            bol('जो नंबर छापना मना है वह है')
        if not src:
            bol('स्रोत नहीं लिखा')
        else:
            mila = False
            for part in src.split(';'):
                for m in re.finditer(r'([^;]*?)[,\s]*पन्ना\s*(\d+)', part):
                    naam, pn = m.group(1).strip(' ,'), int(m.group(2))
                    mila = True
                    if '%s|%s' % (naam, pn) in panne:
                        continue
                    if naam in pustika:
                        bol('पुस्तिका सही पर पन्ना %d उसमें नहीं' % pn)
                    elif not naam:
                        bol('स्रोत में पुस्तिका का नाम नहीं')
                    else:
                        bol('यह पुस्तिका कोश में नहीं : %s' % naam[:45])
            if not mila:
                bol('स्रोत में पन्ना नहीं : %s' % src[:50])
        saaf.append({'id': i, 'a': a, 'src': src, 'by': by, 'on': on})

    if kharab:
        print('\n%d ख़राबियाँ मिलीं, इसलिए कुछ नहीं लिखा :' % len(kharab))
        for i, why in kharab:
            print('  ✗ %s : %s' % (i, why))
        return 1

    saaf.sort(key=lambda r: r['id'])
    OUT.write_text(json.dumps(saaf, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('\n✓ %s में %d जवाब लिखे' % (OUT.name, len(saaf)))
    print('अब git में commit और push कीजिए, तभी ये साइट पर दिखेंगे.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
