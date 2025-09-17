param(
  [string]$SecretsDir = ".secrets"
)

$ErrorActionPreference = 'Stop'

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Command '$name' not found. Install GitHub CLI: https://cli.github.com/"
  }
}

Require-Cmd "gh"

function Set-SecretFromFile($name, $file) {
  if (-not (Test-Path $file)) { Write-Warning "Skip $name: $file not found"; return }
  Write-Host "Setting secret: $name from $file"
  Get-Content -Raw $file | gh secret set $name --body - > $null
}

Set-SecretFromFile "RELEASE_KEYSTORE" (Join-Path $SecretsDir "RELEASE_KEYSTORE.b64")
Set-SecretFromFile "KEYSTORE_PASSWORD" (Join-Path $SecretsDir "KEYSTORE_PASSWORD.txt")
Set-SecretFromFile "KEYSTORE_ALIAS" (Join-Path $SecretsDir "KEYSTORE_ALIAS.txt")
Set-SecretFromFile "KEYSTORE_ALIAS_PASSWORD" (Join-Path $SecretsDir "KEYSTORE_ALIAS_PASSWORD.txt")

Set-SecretFromFile "TAURI_SIGNING_PRIVATE_KEY" (Join-Path $SecretsDir "TAURI_SIGNING_PRIVATE_KEY.txt")
Set-SecretFromFile "TAURI_SIGNING_PRIVATE_KEY_PASSWORD" (Join-Path $SecretsDir "TAURI_SIGNING_PRIVATE_KEY_PASSWORD.txt")

Write-Host "All available secrets set. Ensure your 'origin' remote points to your fork."
