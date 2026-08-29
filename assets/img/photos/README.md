# assets/img/photos/

Campaign photographs go here. **Filenames must match `docs/PHOTOS.md` exactly** —
the page markup is written against those names.

Drop the ten originals in as `.jpg`, then run:

    tools/optimize-photos.sh

which produces the `-800.webp`, `-1600.webp` and `-1600.jpg` variants the pages use.
Commit the originals and the variants together.

`tools/check.py` fails the build if any referenced image file is missing, so the
site can never deploy with a broken photograph.
