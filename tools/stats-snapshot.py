#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""आँकड़ों की एक तैयार प्रति वेबसाइट के साथ रख दीजिए।

Apps Script ठंडा पड़ा हो तो पहला जवाब देने में 20 सेकंड से ऊपर ले लेता है।
वेबसाइट ख़ुद 0.24 सेकंड में खुलती है। जो आदमी पहली बार आता है उसके पास
कुछ भी सहेजा हुआ नहीं होता, इसलिए वही सबसे लंबा ख़ाली पर्दा देखता है, और
वही आदमी अक्सर सबसे ज़रूरी होता है।

यह script वही आँकड़े लाकर stats.json में रख देती है। पन्ना उसे तुरंत दिखा
देता है और पीछे से असली आँकड़े आने पर चुपचाप बदल देता है।
"""
import json, os, re, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'stats.json')

def endpoint():
    cfg = open(os.path.join(ROOT, 'js', 'config.js'), encoding='utf-8').read()
    m = re.search(r"https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec", cfg)
    if not m:
        sys.exit('js/config.js में endpoint नहीं मिला')
    return m.group(0)

def fetch(url, tries=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'loksankalp-snapshot'})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:                      # ठंडा script पहली बार गिर सकता है
            last = e
            print(f'  कोशिश {i+1} विफल : {e}', file=sys.stderr)
    sys.exit(f'आँकड़े नहीं आए : {last}')

def main():
    res = fetch(endpoint() + '?stats=1')
    if not res.get('ok') or not res.get('stats'):
        sys.exit('जवाब में आँकड़े नहीं थे')
    stats = res['stats']
    # कुछ ज़रूरी खाने न हों तो पुरानी प्रति ही रहने दीजिए : आधी प्रति से
    # कोई प्रति न होना बेहतर है, क्योंकि पन्ना इसी पर भरोसा करके छापता है।
    must = ('sankalp', 'gaon', 'sabhaen', 'kulJile')
    missing = [k for k in must if k not in stats]
    if missing:
        sys.exit(f'अधूरे आँकड़े, ये खाने नहीं हैं : {missing}')

    old = None
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8'))
        except Exception: old = None

    doc = {'ok': True, 'version': res.get('version'), 'stats': stats}
    if old and old.get('stats') == stats:
        print('कोई बदलाव नहीं, फ़ाइल वैसी ही रहने दी।')
        return 0
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    kb = os.path.getsize(OUT) / 1024
    print(f'stats.json लिखी गई : {kb:.0f} KB, संकल्प {stats["sankalp"]:,}, '
          f'गाँव {stats["gaon"]:,}, जिले {stats["kulJile"]}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
