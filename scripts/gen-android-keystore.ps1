param(
  [string]$Alias = "aiaw",
  [string]$OutDir = ".secrets",
  [string]$KeystoreName = "release.jks",
  [string]$StorePassword = "",
  [string]$KeyPassword = ""
)

$ErrorActionPreference = 'Stop'

function Require-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Command '$name' not found. Please install JDK (keytool)."
  }
}

Require-Cmd "keytool"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ksPath = Join-Path $OutDir $KeystoreName

if (Test-Path $ksPath) {
  Write-Error "Keystore already exists at $ksPath. Remove it or choose a different name."
}

if (-not $StorePassword) {
  $storePass = Read-Host -AsSecureString "Enter KEYSTORE_PASSWORD"
  $storePassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass))
} else {
  $storePassPlain = $StorePassword
}

if (-not $KeyPassword) {
  $keyPass = Read-Host -AsSecureString "Enter KEYSTORE_ALIAS_PASSWORD"
  $keyPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPass))
} else {
  $keyPassPlain = $KeyPassword
}

Write-Host "Generating Android keystore..."
& keytool -genkeypair -v `
  -keystore $ksPath `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias $Alias `
  -storepass $storePassPlain `
  -keypass $keyPassPlain `
  -dname "CN=Unknown, OU=Unknown, O=Unknown, L=Unknown, S=Unknown, C=US"

if ($LASTEXITCODE -ne 0) { Write-Error "keytool failed with exit code $LASTEXITCODE" }

$b64Path = Join-Path $OutDir "RELEASE_KEYSTORE.b64"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($ksPath)) | Out-File -NoNewline $b64Path -Encoding ascii

Set-Content -Path (Join-Path $OutDir "KEYSTORE_PASSWORD.txt") -Value $storePassPlain
Set-Content -Path (Join-Path $OutDir "KEYSTORE_ALIAS.txt") -Value $Alias
Set-Content -Path (Join-Path $OutDir "KEYSTORE_ALIAS_PASSWORD.txt") -Value $keyPassPlain

Write-Host "Done. Files created in ${OutDir}:"
Write-Host " - $KeystoreName"
Write-Host " - RELEASE_KEYSTORE.b64"
Write-Host " - KEYSTORE_PASSWORD.txt"
Write-Host " - KEYSTORE_ALIAS.txt"
Write-Host " - KEYSTORE_ALIAS_PASSWORD.txt"
Write-Host "Remember to set GitHub secrets from these files. Do NOT commit .secrets/"
