param(
  [string]$OutDir = ".secrets"
)

$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "This will run the Tauri signer to generate update keys (FREE)."
Write-Host "It will display a private key and a public key."
Write-Host "Copy them into files below when prompted:"
Write-Host " - $OutDir/TAURI_SIGNING_PRIVATE_KEY.txt"
Write-Host " - $OutDir/TAURI_PUBKEY.txt"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Error "pnpm not found. Install node and run 'npm i -g pnpm'"
}

Write-Host "Launching: pnpm dlx @tauri-apps/cli signer generate"
pnpm dlx @tauri-apps/cli signer generate

Write-Host "After the command prints keys:"
Write-Host "Paste PRIVATE key into:  $OutDir/TAURI_SIGNING_PRIVATE_KEY.txt"
Write-Host "Paste PUBLIC key into:    $OutDir/TAURI_PUBKEY.txt"
Write-Host "Create password file:     $OutDir/TAURI_SIGNING_PRIVATE_KEY_PASSWORD.txt (same password you entered)"
Write-Host "Then set GitHub secrets and update src-tauri/tauri.conf.json pubkey"
