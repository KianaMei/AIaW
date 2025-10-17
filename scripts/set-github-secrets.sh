#!/usr/bin/env bash
set -euo pipefail

SECRETS_DIR="${SECRETS_DIR:-.secrets}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh not found. Install GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

set_secret() {
  local name=$1 file=$2
  if [ -f "$file" ]; then
    echo "Setting secret: $name from $file"
    gh secret set "$name" < "$file" >/dev/null
  else
    echo "Skip $name: $file not found"
  fi
}

set_secret RELEASE_KEYSTORE               "$SECRETS_DIR/RELEASE_KEYSTORE.b64"
set_secret KEYSTORE_PASSWORD              "$SECRETS_DIR/KEYSTORE_PASSWORD.txt"
set_secret KEYSTORE_ALIAS                 "$SECRETS_DIR/KEYSTORE_ALIAS.txt"
set_secret KEYSTORE_ALIAS_PASSWORD        "$SECRETS_DIR/KEYSTORE_ALIAS_PASSWORD.txt"

set_secret TAURI_SIGNING_PRIVATE_KEY             "$SECRETS_DIR/TAURI_SIGNING_PRIVATE_KEY.txt"
set_secret TAURI_SIGNING_PRIVATE_KEY_PASSWORD    "$SECRETS_DIR/TAURI_SIGNING_PRIVATE_KEY_PASSWORD.txt"

echo "Done setting secrets. Ensure 'origin' points to your fork."
