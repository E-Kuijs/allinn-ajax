# HUB DISTRIBUTION ROUTES

Laatst bijgewerkt: 2026-03-16

## Doel

De HUB moet apps niet alleen via de Play Store tonen, maar per platform een logische route geven.

## Huidige lijn

### Android

- gesloten testlink via Google Play
- APK-link als directe testroute buiten Play Store

### iPhone

- nog geen TestFlight-link
- daarom geen blinde Play-link
- iPhone-route volgt later via TestFlight of webversie

## ALL-INN AJAX

- Store:
  `https://play.google.com/store/apps/details?id=com.allinmedia.allinajax`
- Gesloten test:
  `https://play.google.com/apps/test/com.allinmedia.allinajax/14`
- APK:
  `https://expo.dev/artifacts/eas/4WzcQUL3iBddmymfMgNgPK.apk`

## Technische uitwerking

De HUB gebruikt nu platformgerichte velden in `src/core/app-manifests.ts`:

- `androidClosedTestUrl`
- `androidApkUrl`
- `iosUrl`
- `webUrl`
- `platformNote`

## Vervolg

1. Nieuwe preview APK build maken voor recentere directe Android-installatie
2. Later iPhone-route toevoegen via TestFlight
3. Daarna per volgende club-app dezelfde distributielogica invullen
