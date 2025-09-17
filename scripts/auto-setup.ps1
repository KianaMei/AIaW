param(
  [string]$Alias = "aiaw",
  [string]$Password = "cshq"
)

$ErrorActionPreference = 'Stop'

function Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Warning $msg }
function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Command '$name' not found"
  }
}

New-Item -ItemType Directory -Force -Path .secrets | Out-Null

Info "Generating Android keystore (alias=$Alias)"
Require-Cmd keytool
& powershell -NoProfile -ExecutionPolicy Bypass -File "$(Join-Path $PSScriptRoot 'gen-android-keystore.ps1')" `
  -Alias $Alias -StorePassword $Password -KeyPassword $Password | Out-Null

Info "Generating Tauri update keys"
Require-Cmd pnpm
pnpm dlx @tauri-apps/cli signer generate --ci -p $Password -w .secrets/TAURI_SIGNING_PRIVATE_KEY.txt -f | Out-Null
Set-Content -Path .secrets/TAURI_SIGNING_PRIVATE_KEY_PASSWORD.txt -Value $Password

# Load public key (first line before separator)
$pubFile = Get-Content -Raw .secrets/TAURI_SIGNING_PRIVATE_KEY.txt.pub
$pubLine = ($pubFile -split "`n")[0].Trim()
if (-not $pubLine) { throw "Failed to read public key" }
Set-Content -Path .secrets/TAURI_PUBKEY.txt -Value $pubLine

Info "Updating src-tauri/tauri.conf.json pubkey"
$confPath = Join-Path (Get-Location) 'src-tauri/tauri.conf.json'
$json = Get-Content -Raw $confPath | ConvertFrom-Json
if (-not $json.plugins) { $json | Add-Member -Name plugins -MemberType NoteProperty -Value @{ } }
if (-not $json.plugins.updater) { $json.plugins | Add-Member -Name updater -MemberType NoteProperty -Value @{ } }
$json.plugins.updater.pubkey = $pubLine
$json | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $confPath

Info "Attempting to push GitHub Secrets (if gh is logged in)"
if (Get-Command gh -ErrorAction SilentlyContinue) {
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$(Join-Path $PSScriptRoot 'set-github-secrets.ps1')" | Out-Null
    Info "GitHub secrets set (if authenticated)."
  } catch {
    Warn "Failed to set GitHub secrets via gh. Run gh auth login and re-run scripts/set-github-secrets.ps1"
  }
} else {
  Warn "GitHub CLI not found. Install from https://cli.github.com/ and run scripts/set-github-secrets.ps1"
}

Info "All done. Files in .secrets are ready; pubkey updated in tauri.conf.json."

