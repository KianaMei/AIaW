#!/usr/bin/env bash
set -euo pipefail

ALIAS="${ALIAS:-aiaw}"
OUT_DIR="${OUT_DIR:-.secrets}"
KEYSTORE_NAME="${KEYSTORE_NAME:-release.jks}"

if ! command -v keytool >/dev/null 2>&1; then
  echo "Error: keytool not found. Please install JDK (keytool)." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
KS_PATH="$OUT_DIR/$KEYSTORE_NAME"
if [ -f "$KS_PATH" ]; then
  echo "Error: keystore already exists at $KS_PATH" >&2
  exit 1
fi

read -rsp "Enter KEYSTORE_PASSWORD: " STORE_PASS; echo
read -rsp "Enter KEYSTORE_ALIAS_PASSWORD: " KEY_PASS; echo

echo "Generating Android keystore..."
keytool -genkeypair -v \
  -keystore "$KS_PATH" \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias "$ALIAS" \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=Unknown, OU=Unknown, O=Unknown, L=Unknown, S=Unknown, C=US"

if [ ! -f "$KS_PATH" ]; then
  echo "Error: keystore not created" >&2
  exit 1
fi

B64_PATH="$OUT_DIR/RELEASE_KEYSTORE.b64"
if command -v base64 >/dev/null 2>&1; then
  base64 -w0 "$KS_PATH" > "$B64_PATH" 2>/dev/null || base64 "$KS_PATH" > "$B64_PATH"
else
  python3 - <<'PY'
import base64,sys
data=open(sys.argv[1],'rb').read()
open(sys.argv[2],'wb').write(base64.b64encode(data))
PY
fi

printf "%s" "$STORE_PASS" > "$OUT_DIR/KEYSTORE_PASSWORD.txt"
printf "%s" "$ALIAS" > "$OUT_DIR/KEYSTORE_ALIAS.txt"
printf "%s" "$KEY_PASS" > "$OUT_DIR/KEYSTORE_ALIAS_PASSWORD.txt"

echo "Done. Created in $OUT_DIR:"
echo " - $KEYSTORE_NAME"
echo " - RELEASE_KEYSTORE.b64"
echo " - KEYSTORE_PASSWORD.txt"
echo " - KEYSTORE_ALIAS.txt"
echo " - KEYSTORE_ALIAS_PASSWORD.txt"
echo "Remember to set GitHub secrets from these files. Do NOT commit .secrets/"

