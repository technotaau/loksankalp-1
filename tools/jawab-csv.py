#!/usr/bin/env python3
"""संकल्प साथी के कच्चे जवाबों से वह फ़ाइल बनाता है जो Google Sheet में डाली जाती है.

चलाइए:  python3 tools/jawab-csv.py

बनती है: tools/jawab-sheet.csv

शीट में डालने का तरीक़ा (एक बार):
  Google Sheet खोलिए > File > Import > Upload > यह फ़ाइल चुनिए
  Import location : "Insert new sheet(s)"
  नए टैब का नाम बदलकर  जवाब  कर दीजिए

उसके बाद विक्रम सिंह सिर्फ़ "मंज़ूरी" खाने में हाँ लिखते हैं और अपना नाम
"मंज़ूर करने वाला" में. कोड कोई नहीं छूता.

ध्यान: यह फ़ाइल दोबारा बनाने पर शीट की मंज़ूरी मिट जाएगी, इसलिए शीट एक
बार भर जाने के बाद इसे दोबारा import मत कीजिए. नए जवाब शीट में नीचे
हाथ से जोड़े जा सकते हैं, या इस फ़ाइल से सिर्फ़ नई पंक्तियाँ copy कीजिए.
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
KACCHE = ROOT / 'saathi-nmuna' / 'jawab-kacche.json'
BANK = ROOT / 'saathi-nmuna' / 'bank.json'
OUT = ROOT / 'tools' / 'jawab-sheet.csv'

KHANE = ['id', 'सवाल', 'जवाब', 'स्रोत', 'मंज़ूरी', 'मंज़ूर करने वाला', 'तारीख़']


def main() -> int:
    if not KACCHE.exists():
        print('कच्चे जवाबों की फ़ाइल नहीं मिली: %s' % KACCHE)
        return 1
    kacche = json.loads(KACCHE.read_text(encoding='utf-8'))
    bank = {r['id']: r for r in json.loads(BANK.read_text(encoding='utf-8'))}

    rows, chhoote = [], []
    for r in kacche:
        b = bank.get(r['id'])
        if b is None:
            chhoote.append((r['id'], 'यह id bank.json में नहीं है'))
            continue
        if b.get('r') in ('Emergency', 'High'):
            # इन पर लिखा जवाब साथी कभी दिखाता ही नहीं, वह सीधे हेल्पलाइन देता है
            chhoote.append((r['id'], 'जोखिम %s है, इस पर लिखा जवाब दिखता ही नहीं' % b['r']))
            continue
        rows.append([r['id'], b['q'], r.get('a', ''), r.get('src', ''), '', '', ''])

    with OUT.open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(KHANE)
        w.writerows(rows)

    print('बन गई : %s' % OUT)
    print('पंक्तियाँ : %d' % len(rows))
    if chhoote:
        print('\nछोड़ी गई %d :' % len(chhoote))
        for i, why in chhoote:
            print('  %s  %s' % (i, why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
