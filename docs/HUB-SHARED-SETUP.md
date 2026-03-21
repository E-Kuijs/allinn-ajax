# HUB Shared Setup

De HUB is in deze app nu opgezet als een herbruikbare basis, zodat volgende apps dezelfde structuur kunnen krijgen zonder de schermen opnieuw te bouwen.

## Primaire productielijn

- GitHub owner: `Kuijs-Services`
- Expo owner/workspace: `all-inn-media-ajax`
- Zakelijk contact: `all.inn.media.contact@gmail.com`
- Actieve Supabase ref voor Ajax: `yehfisrddqmsklrsqpzr`
- `edwin3771@gmail.com` blijft alleen de persoonlijke/ChatGPT-lijn

De manifesten en hub-links dragen deze productiemetadata nu ook mee, zodat nieuwe apps direct op dezelfde hoofdlijn kunnen worden opgezet.
Oude lijnen zoals `all-inmedia` en `All-Inn-Media-Sports` behandelen we voorlopig alleen nog als archief- of zijlijn.

## Wat is gedeeld

- `src/core/app-manifests.ts`
  Centrale lijst met de huidige app, de club-volgorde en de eerste finance-apps.
- `src/core/hub-catalog.ts`
  Bevat de categorieen, de huidige app-definitie en de helper om de catalogus op te bouwen.
- `src/core/hub-screens.tsx`
  Bevat de gedeelde schermen voor home, categorie en admin.
- `app/hub/index.tsx`
- `app/hub/[category].tsx`
- `app/hub/admin.tsx`
  Dit zijn nu alleen nog dunne route-wrappers.

## Wat je in een volgende app aanpast

1. Voeg de nieuwe app eerst toe in `src/core/app-manifests.ts`.
2. Vul daar minimaal deze velden in:
   - `id`
   - `tenantSlug`
   - `name`
   - `subtitle`
   - `packageName`
   - `scheme`
   - `launchPriority`
3. Laat `src/core/hub-catalog.ts` de hub-links uit die manifesten opbouwen.
4. Pas daarna pas branding, content en store-links per app aan.

## Waarom dit slim is

- Elke app krijgt dezelfde HUB-opbouw.
- Je onderhoudt de schermlogica nog maar op een plek.
- Nieuwe apps hoeven meestal alleen hun eigen manifest en branding in te vullen.
- De HUB kan later nog steeds doorgroeien naar een aparte app als dat zinvol wordt.

## Huidige aanpak

Voor nu is de HUB dus bedoeld als vaste pagina binnen elke app.
Als de HUB later een volwaardig platform wordt met eigen uploads, beheer en verdienmodel, kan deze gedeelde basis nog steeds dienen als tussenstap of fallback.
