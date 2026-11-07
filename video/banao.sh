#!/bin/bash
# लोकसंकल्प : प्रस्तुति वीडियो बनाइए।
#
#   bash video/banao.sh
#
# बनता है : $OUT_DIR/loksankalp-prastuti.mp4  (डिफ़ॉल्ट /tmp/loksankalp-video)
# लगता है : करीब 8 मिनट, और करीब 1.5 GB जगह (फ़्रेम), जो अंत में हट जाती है।
set -e
cd "$(dirname "$0")/.."
OUT_DIR="${OUT_DIR:-/tmp/loksankalp-video}"
mkdir -p "$OUT_DIR"
# कटी हुई तस्वीरें रिपो के भीतर, क्योंकि सर्वर यहीं से परोसता है
KATI="video/kati"
rm -rf "$KATI"; mkdir -p "$KATI"

# 1. जिन तस्वीरों में GPS Map Camera का वॉटरमार्क जला हुआ है, उन्हें काटिए।
#    वॉटरमार्क में स्कूल के अक्षांश-देशांतर और समय तक लिखे हैं, और ये
#    स्कूल की तस्वीरें हैं जिनमें बच्चे हैं। नीचे का 32 प्रतिशत जाता है।
KATNI="lodheran-poora-vidyalaya lodheran-sabha-maidan lodheran-sankalp-pankti lodheran-sabha-baithe"
for f in assets/img/photos/*.jpg; do
  b=$(basename "$f" .jpg)
  case "$b" in *-1400|*-760) continue;; esac
  if echo "$KATNI" | grep -qw "$b"; then
    ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "crop=iw:ih*0.68:0:0" "$KATI/$b.jpg"
  else
    cp "$f" "$KATI/$b.jpg"
  fi
done
echo "तस्वीरें तैयार : $(ls "$KATI" | wc -l) (चार काटी गईं)"

# 2. पन्ना परोसिए। तस्वीरें कटी हुई वाली जगह से आएँगी।
python3 -m http.server 8750 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; rm -rf "$OLDPWD/video/kati" 2>/dev/null || true' EXIT
sleep 1

# 3. फ़्रेम बनाइए। हर फ़्रेम समय से गिनकर बनता है, इसलिए दोबारा बनाने पर
#    बिल्कुल वैसा ही बनेगा।
OUT_DIR="$OUT_DIR" node video/render.mjs video.html

# 4. जोड़िए।
cd "$OUT_DIR"
ffmpeg -y -hide_banner -loglevel error \
  -framerate 24 -i frames/f%05d.jpg \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
  bina-awaz.mp4

# खाली आवाज़ की पट्टी : कुछ प्रोजेक्टर बिना आवाज़ वाली फ़ाइल पर अटक जाते हैं।
ffmpeg -y -hide_banner -loglevel error \
  -i bina-awaz.mp4 -f lavfi -i anullsrc=r=48000:cl=stereo \
  -c:v copy -c:a aac -b:a 96k -shortest -movflags +faststart \
  loksankalp-prastuti.mp4

# हल्की प्रति : WhatsApp और ईमेल के लिए, करीब 15 MB
ffmpeg -y -hide_banner -loglevel error \
  -i bina-awaz.mp4 -f lavfi -i anullsrc=r=48000:cl=stereo \
  -vf scale=1280:720 -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p \
  -c:a aac -b:a 64k -shortest -movflags +faststart \
  loksankalp-halka.mp4

rm -f bina-awaz.mp4
rm -rf frames

echo
ls -la loksankalp-prastuti.mp4 loksankalp-halka.mp4
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate -of default=nw=1 loksankalp-prastuti.mp4
