# PLAY CONSOLE SUBMIT HANDOFF

Laatst bijgewerkt: 2026-03-16

## Wat al klaarstaat

- Android production build klaar
- AAB:
  `https://expo.dev/artifacts/eas/8mqMDrLsPU6xajQYRVtNuk.aab`
- EAS build ID:
  `3b8a1f1d-b572-4e33-857e-a9dbcbfb930b`
- Release notes:
  `GOOGLE-PLAY-RELEASE-NOTES-2026-03-16.md`
- `eas.json` staat op submit naar:
  - `track: production`
  - `releaseStatus: draft`
- Tijdelijke werkende legal links via jsDelivr CDN:
  - `https://cdn.jsdelivr.net/gh/all-inmedia/ajax-all-in-legal@main/privacy.html`
  - `https://cdn.jsdelivr.net/gh/all-inmedia/ajax-all-in-legal@main/delete-account.html`
  - `https://cdn.jsdelivr.net/gh/all-inmedia/ajax-all-in-legal@main/terms.html`

## Wat is getest

- `npm run typecheck` geslaagd
- `npm run lint` geslaagd
- Android production build geslaagd

## Waarom automatische submit nu stopt

`eas submit` geeft nu:

`Google Service Account Keys cannot be set up in --non-interactive mode.`

Dat betekent:

- de Google Play Service Account key is nog niet gekoppeld in EAS
- of hij staat niet lokaal beschikbaar als JSON voor submit

## Snelste route nu

### Route A - handmatig in Play Console

1. Open Play Console
2. Ga naar `ALL-INN AJAX`
3. Ga naar `Productie`
4. Kies `Nieuwe release`
5. Upload de AAB
6. Gebruik de tekst uit `GOOGLE-PLAY-RELEASE-NOTES-2026-03-16.md`
7. Laat de release als concept of stuur hem naar review

### Route B - later automatische submit via EAS

1. Maak in Google Cloud / Play Console een service account key
2. Koppel die aan Expo EAS
3. Daarna werkt:

`npx eas submit --platform android --latest --profile production --non-interactive --wait`

## Belangrijke notitie

De submit-config is bewust veilig gezet:

- productie-track
- draft release

Dus zodra de service account key gekoppeld is, kan de upload zonder directe rollout.
