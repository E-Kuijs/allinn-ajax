# Release Commands

Snelle commando's voor testen, OTA updates en nieuwe builds.

## PowerShell direct

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 verify
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 smoke
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 release-check
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 update-preview -Message "Kleine fix voor favorieten"
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 update-production -Message "Productie hotfix"
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 build-preview
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 build-production
```

## Npm aliases

```powershell
npm run verify
npm run smoke:web
npm run release:check
npm run release:preview -- -Message "Kleine fix voor favorieten"
npm run release:production -- -Message "Productie hotfix"
npm run release:build-preview
npm run release:build-production
```

## Welke kies je?

- `verify`: typecheck + lint + Expo Doctor
- `smoke`: maakt een web export als snelle bundling-check
- `release-check`: `verify` + `smoke`
- `update-preview`: OTA update naar preview-kanaal
- `update-production`: OTA update naar production-kanaal
- `build-preview`: nieuwe preview build
- `build-production`: nieuwe production build

## Wanneer OTA update en wanneer build?

Gebruik meestal een OTA update voor JavaScript/TypeScript/UI/content-wijzigingen.

Gebruik liever een nieuwe build wanneer je native-gevoelige dingen hebt aangepast, zoals:

- `app.json` of app config
- `package.json` of native dependencies
- `eas.json`
- `ios/` of `android/`

De helper blokkeert OTA updates automatisch als dit soort bestanden gewijzigd zijn, tenzij je bewust `-AllowNativeRisk` meegeeft.
