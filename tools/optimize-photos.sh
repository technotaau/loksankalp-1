#!/usr/bin/env bash
# Generate responsive variants for every photograph in assets/img/photos/.
# For NAME.jpg produces NAME-800.webp, NAME-1600.webp and NAME-1600.jpg.
# Safe to re-run: a variant newer than its source is left alone.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=assets/img/photos

if command -v magick >/dev/null 2>&1;      then IM="magick"
elif command -v convert >/dev/null 2>&1;   then IM="convert"
else echo "ImageMagick not found. Install it (apt-get install imagemagick) and re-run." >&2; exit 1
fi

shopt -s nullglob
found=0
for src in "$DIR"/*.jpg "$DIR"/*.jpeg "$DIR"/*.JPG; do
  case "$src" in *-800.*|*-1600.*) continue;; esac
  found=1
  base="${src%.*}"
  for spec in "800 78" "1600 80"; do
    set -- $spec; w=$1; q=$2
    out="${base}-${w}.webp"
    if [ ! -f "$out" ] || [ "$src" -nt "$out" ]; then
      $IM "$src" -auto-orient -resize "${w}x${w}>" -strip -quality "$q" "$out"
      echo "  → $(basename "$out")  $(du -h "$out" | cut -f1)"
    fi
  done
  out="${base}-1600.jpg"                       # fallback for browsers without WebP
  if [ ! -f "$out" ] || [ "$src" -nt "$out" ]; then
    $IM "$src" -auto-orient -resize "1600x1600>" -strip -interlace Plane -quality 80 "$out"
    echo "  → $(basename "$out")  $(du -h "$out" | cut -f1)"
  fi
done

[ "$found" = 1 ] || { echo "No source photographs in $DIR — see docs/PHOTOS.md for the filenames."; exit 0; }
echo
echo "Total in $DIR: $(du -sh "$DIR" | cut -f1)"
echo "Anything over ~120 KB at 1600px is worth another pass."
