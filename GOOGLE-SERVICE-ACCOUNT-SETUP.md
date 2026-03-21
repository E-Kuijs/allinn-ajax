# GOOGLE SERVICE ACCOUNT SETUP

Laatst bijgewerkt: 2026-03-16

## Waarom dit nodig is

EAS Submit kan je AAB pas automatisch naar Google Play uploaden als er een Google Service Account key is gekoppeld.

Op dit moment stopt `eas submit` met:

`Google Service Account Keys cannot be set up in --non-interactive mode.`

## Wat al klaarstaat

- app package: `com.allinmedia.allinajax`
- submit-profiel in `eas.json`
- track: `production`
- releaseStatus: `draft`
- AAB klaar:
  `https://expo.dev/artifacts/eas/8mqMDrLsPU6xajQYRVtNuk.aab`

## Belangrijke Google-regel

Google en Expo geven aan dat je de app minstens één keer handmatig moet uploaden voordat API-submits werken.

Als `ALL-INN AJAX` al eerder handmatig in Play Console is geüpload, dan is dat stuk waarschijnlijk al afgevinkt.

## Stappen in Google Play Console

1. Open Play Console
2. Open je ontwikkelaarsaccount en de app `ALL-INN AJAX`
3. Zoek `API access`
4. Koppel een Google Cloud project als dat nog niet is gedaan
5. Maak onder `Service accounts` een service account
6. Klik daarna op `Grant access`
7. Geef minimaal rechten die nodig zijn voor release/upload in Play Console

## Stappen in Google Cloud

1. Open het gekoppelde Google Cloud project
2. Open `IAM & Admin`
3. Open het zojuist gemaakte service account
4. Maak een nieuwe JSON key
5. Download het JSON-bestand veilig lokaal

## Daarna in Expo / EAS

### Optie A - via Expo dashboard

1. Open Expo project credentials
2. Kies Android
3. Open jouw application identifier
4. Onder `Service Credentials` kies:
   `Add a Google Service Account Key`
5. Upload de JSON key

### Optie B - via CLI

1. Run:
   `eas credentials --platform android`
2. Kies:
   `production`
3. Kies:
   `Google Service Account`
4. Kies:
   `Upload a Google Service Account Key`
5. Selecteer het JSON-bestand

## Daarna werkt dit commando

`npx eas submit --platform android --latest --profile production --non-interactive --wait`

## Veilige route voor jou

Omdat `releaseStatus` nu op `draft` staat:

- de upload gaat naar de `production` track
- maar als concept
- dus niet direct live naar alle gebruikers

## Wat ik daarna meteen kan doen

Zodra de key gekoppeld is, kan ik:

1. de submit opnieuw starten
2. controleren of de AAB echt in Play Console staat
3. de laatste release-tekst nalopen
4. daarna door naar de mailronde

## Officiële bronnen

- Expo Submit Android:
  `https://docs.expo.dev/submit/android/`
- Expo eas.json submit-config:
  `https://docs.expo.dev/eas/json/`
- Expo submit intro:
  `https://docs.expo.dev/submit/introduction/`
- Android Developers over service accounts en API access:
  `https://developer.android.com/games/pgs/publishing/publishing-start`
