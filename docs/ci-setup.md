AIaW Fork CI Setup (Android + Desktop + Docker)

1) Prepare IDs and endpoints
- Run: `node scripts/prepare-fork.mjs`
- What it updates:
  - `src-tauri/tauri.conf.json` productName, identifier, updater endpoint -> your fork
  - `capacitor.config.ts` appId/appName
  - `android/app/build.gradle` applicationId/namespace

2) Generate keys locally (FREE)
- Android keystore (PowerShell): `./scripts/gen-android-keystore.ps1`
- Android keystore (bash): `bash ./scripts/gen-android-keystore.sh`
  - Outputs under `.secrets/`: `release.jks`, `RELEASE_KEYSTORE.b64`, `KEYSTORE_PASSWORD.txt`, `KEYSTORE_ALIAS.txt`, `KEYSTORE_ALIAS_PASSWORD.txt`

- Tauri update keys (PowerShell): `./scripts/gen-tauri-keys.ps1`
- Tauri update keys (bash): `bash ./scripts/gen-tauri-keys.sh`
  - Save outputs to `.secrets/TAURI_SIGNING_PRIVATE_KEY.txt` and `.secrets/TAURI_PUBKEY.txt`
  - Put the public key into `src-tauri/tauri.conf.json` -> `plugins.updater.pubkey`

3) Set GitHub repo secrets via gh CLI
- Login: `gh auth login`
- Ensure `git remote get-url origin` points to your fork
- PowerShell: `./scripts/set-github-secrets.ps1`
- bash: `bash ./scripts/set-github-secrets.sh`
  - Sets: `RELEASE_KEYSTORE`, `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`, `KEYSTORE_ALIAS_PASSWORD`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

4) Trigger builds
- Create a Release (e.g., v1.8.3-your.1) -> Actions will build:
  - Android APK (build-capacitor)
  - Desktop installers + latest.json (build-tauri)
  - Docker image (docker-image) if DockerHub secrets set

Notes
- Do NOT commit `.secrets/` (already ignored).
- macOS/Windows system code signing is optional and separate from Tauri update signing.
- Public repositories: Actions minutes are free-tier; private repos consume quota.

