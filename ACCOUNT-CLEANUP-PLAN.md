# ACCOUNT CLEANUP PLAN - ALL-INN AJAX

Laatst gecontroleerd: 2026-03-15

## Doel

Van meerdere losse accounts naar 1 vaste eigenaarslijn per platform, zonder builds, signing, repo's of backend kwijt te raken.

Belangrijk:
- "1 accountlijn" betekent hier 1 vaste hoofdeigenaar en 1 duidelijke structuur.
- Het hoeft niet exact overal dezelfde gebruikersnaam of hetzelfde e-mailadres te zijn.
- Voor sommige platformen is een persoonlijke owner normaal, terwijl op andere platformen een organisatie of merkaccount logischer is.

## Vaste naamlijn

Gebruik voortaan deze standaard:

- Persoonlijke accountnaam waar mogelijk: `E-Kuijs`
- Zakelijke merknaam voor developer / branding: `Kuijs Services`
- Persoonlijke owner e-mail: `edwin3771@gmail.com`
- Zakelijke contact e-mail: `all.inn.media.contact@gmail.com`

Belangrijk:
- Niet elk platform accepteert exact dezelfde tekens in een username.
- Gebruik daarom waar nodig:
  - username / handle: `E-Kuijs`
  - display name: `E-Kuijs`
  - bedrijfs- of profiel-logo: `Kuijs Services`

## Huidig geverifieerd

### Google Play Console

Bron: `ACCOUNT-OVERVIEW.md` en `ACCOUNT-SETUP.md`

- Developer account naam: `All-Inn Media`
- Account type: `Prive`
- Owner e-mail: `edwin3771@gmail.com`
- Dagelijks beheer / contact: `all.inn.media.contact@gmail.com`
- Package name: `com.allinmedia.allinajax`

### Expo / EAS

Lokaal geverifieerd via `npx eas whoami`

- Ingelogde user: `ekuijs`
- E-mail op account: `all.inn.media.contact@gmail.com`
- Accounts:
  - `ekuijs` (Owner)
  - `all-inn-media-ajax` (Admin)
- Huidig gekoppeld EAS project:
  - `projectId`: `02ad4d91-5fe2-443f-be18-02f22c6b19e7`
  - updates URL: `https://u.expo.dev/02ad4d91-5fe2-443f-be18-02f22c6b19e7`

### Git / GitHub

Lokaal geverifieerd via Git-config en remote

- Git user.name: `E kuijs`
- Git user.email: `edwin3771@gmail.com`
- Huidige remote:
  - `https://github.com/all-inmedia/ALL-INN-AJAX.git`
- Huidige branch: `master`

Opmerking:
- GitHub CLI (`gh`) staat op deze machine nu niet beschikbaar.
- Lokaal staat de remote nog onder `all-inmedia`.
- Recente browserchecks wijzen erop dat de actieve GitHub-lijn nu eerder loopt via:
  - profiel: `E-Kuijs`
  - hoofdrepo: `Kuijs-Services/ALL-INN-AJAX`
  - legal repo: `Kuijs-Services/ajax-all-in-legal`
  - extra organisatie: `All-Inn-Media-Sports`

### Supabase

Bron: `ACCOUNT-SETUP.md`

- Gewenst production project: `ALL-INN-AJAX`
- Project ref: `yehfisrddqmsklrsqpzr`
- Project URL: `https://yehfisrddqmsklrsqpzr.supabase.co`

Opmerking:
- Supabase CLI staat lokaal wel op deze machine.
- De actieve login van de CLI is op dit moment niet bevestigd.

### VS Code / Codex / ChatGPT

Lokaal geverifieerd via `C:\Users\Edwin\.codex\auth.json`

- Codex auth mode: `chatgpt`
- Deze lokale Codex / VS Code sessie draait dus op jouw ChatGPT-account
- In Codex web staat GitHub nu nog niet gekoppeld

Belangrijk verschil:
- Lokale Codex IDE / CLI kan werken via ChatGPT-login zonder GitHub-connector
- Codex web vraagt wel om een GitHub-koppeling

## Aanbevolen vaste eindlijn

### Hoofdeigenaar

- Persoon / eindverantwoordelijke: `Edwin`
- Persoonlijke owner e-mail: `edwin3771@gmail.com`
- Zakelijke contact e-mail: `all.inn.media.contact@gmail.com`

### Per platform

- Google Play Console:
  - behouden op `edwin3771@gmail.com`
  - dit is de veiligste lijn voor de bestaande developer owner

- Supabase:
  - behouden op het production project `yehfisrddqmsklrsqpzr`
  - alleen de juiste eigenaar / leden laten staan

- Expo / EAS:
  - nu niet verplaatsen uit `ekuijs` zolang signing en releases daar actief op draaien
  - pas later eventueel overzetten als je bewust naar 1 Expo-organisatie wilt

- GitHub:
  - persoonlijke hoofdlogin houden op `E-Kuijs`
  - production code waarschijnlijk onder `Kuijs-Services` houden
  - legal repo waarschijnlijk ook onder `Kuijs-Services` houden

- VS Code / Codex:
  - blijven op jouw ChatGPT Plus login
  - GitHub pas koppelen nadat je definitief weet welk GitHub-account je wilt houden

## Wat nu veilig is om op te ruimen

### Nu al mogelijk

1. Ongebruikte GitHub-accounts inventariseren.
2. Ongebruikte Expo-workspaces inventariseren.
3. Oude Supabase testprojecten markeren als kandidaat voor verwijdering.
4. VS Code uitloggen van oude GitHub-accounts.
5. Codex web pas koppelen aan het definitieve GitHub-account.

### Nog niet verwijderen

1. `ekuijs` niet verwijderen:
   - huidige Expo/EAS projectlijn en mogelijk signing hangen hier nog aan.
2. `all-inmedia` op GitHub nog niet verwijderen:
   - de legal repo staat daar nog en de werkende links lopen nu via `e-kuijs.github.io/all-inn-legal/...`
3. Oude Supabase projecten niet verwijderen zonder export / backup.
4. Geen remote URLs aanpassen voordat de GitHub transfer echt rond is.

## Veilige volgorde

### Stap 1 - Bevestig welke accounts blijven

Definitieve lijn:
- Play Console owner: `edwin3771@gmail.com`
- GitHub hoofdaccount: `E-Kuijs`
- Expo/EAS build-owner: `ekuijs`
- Supabase production project: `yehfisrddqmsklrsqpzr`
- Codex / ChatGPT: jouw Plus-account

### Stap 2 - GitHub eerst opschonen

Doel:
- definitief bepalen welke GitHub-lijn production wordt:
  - alleen `E-Kuijs`
  - of `E-Kuijs` als profiel met `Kuijs-Services` als production repo-owner

Pas op:
- `all-inmedia` niet meteen wissen zolang oude links of redirects nog relevant kunnen zijn
- `All-Inn-Media-Sports` niet meteen opschonen zolang daar nog forks of tussenrepo's staan

Na repo transfer moet lokaal nog:

```powershell
git remote set-url origin https://github.com/<definitieve-owner>/ALL-INN-AJAX.git
git remote -v
```

### Stap 3 - Codex web daarna koppelen

Pas nadat GitHub definitief juist staat:
- ChatGPT / Codex web openen
- GitHub verbinden met het account dat blijft

### Stap 4 - Play Console gebruikers opschonen

Doel:
- alleen owner en noodzakelijke beheeraccounts laten staan

Let op:
- bij een persoonlijk Play Console account blijft de betaalprofieltoegang bij de oorspronkelijke eigenaar

### Stap 5 - Supabase opschonen

Doel:
- alleen het juiste production project behouden
- oude testprojecten pas verwijderen na backup

Controle voor verwijderen:
- project ref klopt
- database backup bestaat
- edge functions en env-waarden zijn veilig opgeslagen

### Stap 6 - Expo / EAS pas als laatste

Doel:
- alleen overzetten of opschonen als builds stabiel zijn

Belangrijk:
- als je hier te vroeg opruimt, kun je signing of remote credentials kwijtraken

## Lokale aanwijzingen uit deze repo

- De app gebruikt nu:
  - Android package: `com.allinmedia.allinajax`
  - EAS project ID: `02ad4d91-5fe2-443f-be18-02f22c6b19e7`
  - Supabase project ref: `yehfisrddqmsklrsqpzr`

- GitHub Pages op `all-inmedia.github.io` werkt op dit moment niet voor deze legal repo.
- Tijdelijke werkende legal links zijn:
  - `https://e-kuijs.github.io/all-inn-legal/terms.html`
  - `https://e-kuijs.github.io/all-inn-legal/privacy.html`
  - `https://e-kuijs.github.io/all-inn-legal/delete.html`

Conclusie:
- de lokale remote loopt nog achter op de nieuwe GitHub-structuur
- `Kuijs-Services` lijkt nu de sterkste kandidaat voor de production repo-lijn
- maar `all-inmedia` kan nog niet blind weg zolang oude links, forks of redirects nog relevant zijn

## Praktische conclusie

Ja, dit kan nu netjes opgeschoond worden.

Maar de veilige route is:
1. eerst de juiste accounts vastzetten
2. dan GitHub transfer
3. dan Codex web koppelen
4. dan Play Console / Supabase opschonen
5. Expo/EAS helemaal als laatste

## Officiele referenties

- GitHub repo transfer:
  - https://docs.github.com/articles/transferring-a-repository
- GitHub accounts samenvoegen:
  - https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-personal-account/merging-multiple-personal-accounts
- Expo account types en project transfer:
  - https://docs.expo.dev/accounts/account-types/
- Supabase project transfers:
  - https://supabase.com/docs/guides/platform/project-transfer
- Google Play Console gebruikersbeheer:
  - https://support.google.com/googleplay/android-developer/answer/16642750
- Codex met ChatGPT plan:
  - https://help.openai.com/en/articles/11369540-codex-in-chatgpt


