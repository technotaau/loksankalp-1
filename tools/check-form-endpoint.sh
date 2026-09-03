#!/usr/bin/env bash
# Verify that a deployed Apps Script form endpoint is reachable the way a
# website visitor reaches it: anonymously, with no Google session.
#
#   tools/check-form-endpoint.sh <exec-url>
#
# Exits non-zero if the endpoint is not usable by the public site.
set -uo pipefail
URL="${1:-}"
[ -n "$URL" ] || { echo "usage: $0 <exec-url>"; exit 2; }

echo "checking: $URL"
body=$(curl -sS -L --max-time 45 "$URL" 2>/dev/null)
code=$(curl -sS -L --max-time 45 -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null)

if printf '%s' "$body" | grep -q '"ok"'; then
  echo "✅ reachable anonymously — HTTP $code"
  printf '   response: %s\n' "$(printf '%s' "$body" | head -c 200)"

  # A deployment keeps serving the code it was deployed with. Pasting a new
  # Code.gs is not enough: the deployment must be pointed at a NEW version.
  stats=$(curl -sS -L --max-time 45 "${URL}?stats=1" 2>/dev/null)
  # Require the version marker, not merely a stats object: an older script
  # returns stats without it, and would otherwise look healthy.
  if printf '%s' "$stats" | grep -q '"version"'; then
    ver=$(printf '%s' "$stats" | grep -o '"version":[0-9]*' | head -1)
    echo "✅ stats endpoint live  (${ver:-version not reported})"
    printf '   %s\n' "$(printf '%s' "$stats" | head -c 260)"
  else
    if printf '%s' "$stats" | grep -q '"stats"'; then
      echo "⚠️  stats work, but this is an older script (no version marker,"
      echo "    so no जिलेवार breakdown either)."
    else
      echo "⚠️  stats endpoint NOT live."
    fi
    echo "    Two things cause this, in order:"
    echo
    echo "    1. The editor still holds an older Code.gs."
    echo "       Open the Sheet > Extensions > Apps Script, select all, delete,"
    echo "       paste the current google-apps-script/Code.gs, then Save."
    echo "    2. The deployment still points at an older version."
    echo "       Deploy > Manage deployments > pencil (edit)"
    echo "       Version:  New version     <-- easy to miss; Deploy alone re-uses the old one"
    echo "       Deploy"
    echo
    echo "    The URL never changes. Confirm with <url>?stats=1 — a correct"
    echo "    deployment reports a \"version\" field."
    exit 1
  fi
  exit 0
fi

echo "❌ NOT reachable anonymously — HTTP $code"
if printf '%s' "$body" | grep -qi 'You need access\|Access Denied\|requesting_access'; then
  echo
  echo "   Google is asking for sign-in, so the deployment is not public."
  echo "   Fix, in the Apps Script editor:"
  echo "     Deploy > Manage deployments > pencil (edit)"
  echo "     Who has access:  Anyone      <-- not 'Anyone with Google account'"
  echo "     Deploy"
  echo "   Editing an existing deployment keeps the same URL."
  echo
  echo "   Self-check: open the URL in a private window while signed out."
  echo "   Correct    -> {\"ok\":true,\"message\":\"लोकसंकल्प फ़ॉर्म सेवा चालू है\"}"
  echo "   Still wrong-> a Google 'You need access' page"
fi
exit 1
