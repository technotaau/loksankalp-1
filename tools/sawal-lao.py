#!/usr/bin/env python3
"""संकल्प साथी : पूछे गए सवाल लाकर बताता है कि मिलान कहाँ चूक रहा है।

साथी हर पूछा हुआ सवाल केंद्र की शीट में दर्ज करता है : सवाल, मशीन ने
क्या जोड़ा, उसका जोखिम, और आदमी ने उस जोड़ को माना या नहीं। उसमें किसी
की कोई पहचान नहीं होती।

यह औज़ार वही पंक्तियाँ लाकर तीन सूचियाँ बनाता है :

  1. जो सवाल समझ ही नहीं आए        <- सबसे पहले इन्हें देखिए
  2. जहाँ मशीन ने जोड़ा पर आदमी ने नकारा  <- सबसे काम की सूची
  3. जो सवाल बार-बार पूछे जा रहे हैं

चलाइए :
    python3 tools/sawal-lao.py                 # शीट से लाकर
    python3 tools/sawal-lao.py --csv फ़ाइल.csv  # शीट का CSV उतारकर

हर सूची के साथ यह भी बताता है कि आगे क्या करना है।
"""
import argparse
import csv
import io
import json
import pathlib
import re
import sys
import urllib.request
from collections import Counter, defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAATHI = ROOT / 'saathi'
KHANE = ('पूछा गया सवाल', 'मशीन ने क्या जोड़ा', 'जोखिम', 'आदमी ने माना या नहीं')


def endpoint() -> str:
    cfg = (ROOT / 'js' / 'config.js').read_text(encoding='utf-8')
    m = re.search(r"LOKSANKALP_FORM_ENDPOINT\s*=\s*'([^']+)'", cfg)
    if not m:
        print('js/config.js में endpoint नहीं मिला।')
        sys.exit(1)
    return m.group(1)


def shirsh(row: dict, naam: str) -> str:
    for k, v in row.items():
        if (k or '').strip() == naam:
            return (v or '').strip()
    return ''


def lao(args) -> list:
    if args.csv:
        with io.open(args.csv, encoding='utf-8-sig', newline='') as f:
            return list(csv.DictReader(f))
    url = endpoint() + '?sawal=1&kitne=%d' % args.kitne
    with urllib.request.urlopen(url, timeout=60) as r:
        data = json.loads(r.read().decode('utf-8'))
    if not data.get('ok'):
        print('शीट से कुछ नहीं आया।')
        sys.exit(1)
    print('शीट में कुल %s पंक्तियाँ, लाई गईं %d\n'
          % (data.get('kul', '?'), len(data.get('pankti', []))))
    return data.get('pankti', [])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', help='शीट का उतारा हुआ CSV')
    ap.add_argument('--kitne', type=int, default=500, help='कितनी पंक्तियाँ लानी हैं')
    ap.add_argument('--kam', type=int, default=2, help='कम से कम कितनी बार पूछा गया हो')
    args = ap.parse_args()

    rows = lao(args)
    if not rows:
        print('अभी कोई सवाल दर्ज नहीं हुआ। साथी चलने के बाद दोबारा चलाइए।')
        return 0

    samjha_nahi, nakara, sab = Counter(), defaultdict(Counter), Counter()
    for r in rows:
        q = shirsh(r, KHANE[0])
        if not q:
            continue
        sab[q] += 1
        natija = shirsh(r, KHANE[3])
        if natija == 'समझ नहीं आया':
            samjha_nahi[q] += 1
        elif natija == 'नहीं, यह नहीं':
            nakara[shirsh(r, KHANE[1])][q] += 1

    bank = {x['id']: x for x in json.loads((SAATHI / 'bank.json').read_text(encoding='utf-8'))}

    print('=' * 66)
    print('1. जो सवाल समझ ही नहीं आए  (%d अलग-अलग)' % len(samjha_nahi))
    print('=' * 66)
    if not samjha_nahi:
        print('  कोई नहीं।')
    for q, n in samjha_nahi.most_common(40):
        print('  %3d बार  %s' % (n, q))
    if samjha_nahi:
        print('\n  आगे क्या : हर सवाल पर तय कीजिए कि यह किस मौजूदा सवाल का')
        print('  दूसरा रूप है। है, तो उसका वाक्य saathi/roop.json में उस id के')
        print('  नीचे जोड़ दीजिए। कोई मौजूदा सवाल मेल न खाए, तो यह नया सवाल है')
        print('  और bank.json में जोड़ने लायक़ है।')
        print('  अगर वाक्य में कोई शब्द ग़लत सुना गया लगे, तो वह')
        print('  SUNNE_KI_BHOOL का मामला है, और tools/sunne-ki-bhool.py देखिए।')

    print('\n' + '=' * 66)
    print('2. जहाँ मशीन ने जोड़ा पर आदमी ने नकारा  (%d सवालों पर)' % len(nakara))
    print('=' * 66)
    if not nakara:
        print('  कोई नहीं।')
    kram = sorted(nakara.items(), key=lambda kv: -sum(kv[1].values()))
    for sid, poochhe in kram[:25]:
        b = bank.get(sid)
        print('  %s  "%s"' % (sid, (b['q'] if b else '(सूची में नहीं)')[:58]))
        for q, n in poochhe.most_common(5):
            print('      %2d बार नकारा गया :  %s' % (n, q))
    if nakara:
        print('\n  आगे क्या : यह सबसे काम की सूची है। मशीन ग़लत जोड़ लगा रही है।')
        print('  देखिए कि पूछा हुआ सवाल किस दूसरे सवाल पर जाना चाहिए था, और')
        print('  उसका वाक्य उस सही id के नीचे roop.json में डालिए। इससे जोड़')
        print('  वहाँ खिंच जाएगा।')

    print('\n' + '=' * 66)
    print('3. जो सवाल %d या ज़्यादा बार पूछे गए' % args.kam)
    print('=' * 66)
    bar_bar = [(q, n) for q, n in sab.most_common() if n >= args.kam]
    if not bar_bar:
        print('  अभी कोई नहीं।')
    for q, n in bar_bar[:30]:
        print('  %3d बार  %s' % (n, q))

    print('\n' + '=' * 66)
    print('कुल %d पंक्तियाँ, %d अलग-अलग सवाल' % (sum(sab.values()), len(sab)))
    print('बदलाव करने के बाद कसौटी ज़रूर चलाइए :')
    print('  python3 -m http.server 8765 &')
    print('  OUT=/tmp/naap.json node tools/pariksha/milan-naap.cjs')
    return 0


if __name__ == '__main__':
    sys.exit(main())
