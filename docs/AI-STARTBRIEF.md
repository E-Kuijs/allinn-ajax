# AI Startbrief

Gebruik dit bestand als eerste vaste startpunt bij nieuw werk in deze repo.

## Project

- Projectnaam: `ALL-INN-AJAX`
- Type: Expo / React Native app
- Repo-pad: `C:\dev\Kuijs-Services\All-Inn-Media\all-inn-platform\ALL-INN-AJAX`
- Hoofdrichting:
  - Ajax-fanapp
  - onderdeel van groter All-Inn ecosysteem
  - HUB wordt centrale etalage voor meerdere apps
  - developer wil later ook business-dashboard en beheer-overzicht

## Belangrijkste Richting

- Publieke HUB:
  centrale plek waar gebruikers andere All-Inn apps ontdekken
- Developer HUB:
  snel overzicht van gebruik, groei, promotie, prijs en business-signalen
- Lange termijn:
  losse apps + centrale HUB-app + gedeelde HUB-structuur

## Eerst Lezen

1. `docs/AI-STARTBRIEF.md`
2. `docs/KUIJS-SERVICES-TEXT-SHORTLIST.md`
3. `docs/HUB-SHARED-SETUP.md`
4. `docs/RELEASE-COMMANDS.md`
5. `docs/IMPORTANT-URLS-BACKUP.md`

## Belangrijkste Bestanden

- HUB home:
  `app/hub/index.tsx`
- HUB categorie:
  `app/hub/[category].tsx`
- HUB admin:
  `app/hub/admin.tsx`
- Gedeelde HUB-schermen:
  `src/core/hub-screens.tsx`
- HUB-catalogus:
  `src/core/hub-catalog.ts`
- App-context:
  `src/core/app-context.tsx`
- Media-tab:
  `app/(tabs)/media.tsx`
- Owner-tab:
  `app/(tabs)/owner.tsx`
- Release-helper:
  `scripts/release.ps1`

## Huidige Status

- Lint: groen
- Typecheck: groen
- HUB heeft nu:
  - centrale app-etalage voor gebruikers
  - snelle acties
  - statusblokken
  - business dashboard met 6 KPI-blokken voor developer
- Media heeft nu:
  - supportersblok
  - YouTube subscribe-link
  - inzenden van foto/video
  - link naar HUB
- Owner heeft nu:
  - overzicht van supporter-inzendingen
  - goedkeuren / afkeuren

## Supabase

- Belangrijke tabellen:
  - `profiles`
  - `memberships`
  - `purchases`
  - `donation_ledger`
  - `listings`
  - `chat_messages`
  - `supporter_media_submissions`
- Belangrijke migratie voor media-inzendingen:
  `supabase/migrations/20260315143000_supporter_media_submissions.sql`

## Handige Commando's

- `npm run lint`
- `npm run typecheck`
- `powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 verify`
- `powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 smoke`
- `powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 release-check`

## Andere Buildmappen

Deze staan naast deze app en kunnen later gericht gebruikt worden als bron:

- `..\BUILD-AGENDA`
- `..\BUILD-FINANCE`
- `..\BUILD-HOME`
- `..\BUILD-KIDS`
- `..\BUILD-MEDIA`
- `..\BUILD-MEDIA-HUB`
- `..\BUILD-SPORTS`
- `..\BUILD-TEENS`

## Gevoelig

Niet ongevraagd openen, verplaatsen of hernoemen:

- loginbestanden
- consolebestanden
- privé-documenten
- e-mailbestanden met persoonsgegevens

Zie ook:
- `docs/KUIJS-SERVICES-TEXT-SHORTLIST.md`

## Werkwijze

- Eerst bestaande structuur lezen
- Dan klein en gericht aanpassen
- Bij strategie of structuur:
  werk vanuit HUB-richting en schaalbaarheid
- Bij tekstbestanden buiten deze repo:
  eerst inventariseren, daarna pas verplaatsen of opschonen

## Volgende Logische Taken

- bestanden met label `Hernoemen` uit de shortlist netjes hernoemen
- meerdere apps echt toevoegen aan de HUB-catalogus
- business-dashboard verder uitbreiden met trends of conversie
- centrale contentstructuur maken voor meerdere apps
