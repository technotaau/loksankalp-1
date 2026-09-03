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
