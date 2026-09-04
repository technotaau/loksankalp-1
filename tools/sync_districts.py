#!/usr/bin/env python3
"""Put the same district list into every जिला dropdown on the site.

The list lives in tools/districts.txt, one Devanagari name per line. This
script rewrites the <option> block of every <select name="jila"> it finds,
keeping each file's own indentation.

The options stay in the HTML rather than being injected by JavaScript: the
forms must work on a phone that never finishes loading site.js.

    python3 tools/sync_districts.py            # rewrite
    python3 tools/sync_districts.py --check    # report drift, change nothing
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIST = ROOT / "tools" / "districts.txt"

SELECT = re.compile(
    r'(?P<open><select\b[^>]*\bname="jila"[^>]*>)(?P<body>.*?)(?P<close></select>)',
    re.S,
)


def districts():
    names = [ln.strip() for ln in LIST.read_text(encoding="utf-8").splitlines()]
    names = [n for n in names if n and not n.startswith("#")]
    if len(names) != len(set(names)):
        dupes = sorted({n for n in names if names.count(n) > 1})
        raise SystemExit("districts.txt has repeats: " + ", ".join(dupes))
    return names


def block(indent, names):
    lines = ['<option value="">जिला चुनें</option>']
    lines += ["<option>%s</option>" % n for n in names]
    lines.append("<option>अन्य</option>")
    return "\n" + "\n".join(indent + ln for ln in lines) + "\n" + indent[:-2]


def main():
    check = "--check" in sys.argv
    names = districts()
    touched, drifted = [], []

    for path in sorted(ROOT.glob("*.html")):
        text = path.read_text(encoding="utf-8")
        if 'name="jila"' not in text:
            continue

        def swap(m):
            # Indent the options one step in from the <select> itself.
            line_start = text.rfind("\n", 0, m.start()) + 1
            indent = re.match(r"[ \t]*", text[line_start:]).group(0) + "  "
            return m.group("open") + block(indent, names) + m.group("close")

        new = SELECT.sub(swap, text)
        if new == text:
            continue
        (drifted if check else touched).append(path.name)
        if not check:
            path.write_text(new, encoding="utf-8")

    if check:
        if drifted:
            print("out of date: " + ", ".join(drifted))
            return 1
        print("all जिला dropdowns match districts.txt (%d districts)" % len(names))
        return 0

    print("%d districts written into %d page(s)" % (len(names), len(touched)))
    for name in touched:
        print("  " + name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
