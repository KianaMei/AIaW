#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-.secrets}"
mkdir -p "$OUT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm not found. Install node and run 'npm i -g pnpm'" >&2
  exit 1
fi

cat <<EOF
This will run the Tauri signer to generate update keys (FREE).
It will display a private key and a public key.
Copy them into files below after it prints them:
 - $OUT_DIR/TAURI_SIGNING_PRIVATE_KEY.txt
 - $OUT_DIR/TAURI_PUBKEY.txt
Also create the password file (the same password you enter during generation):
 - $OUT_DIR/TAURI_SIGNING_PRIVATE_KEY_PASSWORD.txt
EOF

pnpm dlx @tauri-apps/cli signer generate

echo "Then set GitHub secrets and update src-tauri/tauri.conf.json pubkey"
