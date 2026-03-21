# GITHUB STRUCTURE OVERVIEW

Laatst gecontroleerd: 2026-03-16

## Praktische conclusie

Op basis van de recente browserchecks lijkt dit nu de juiste GitHub-structuur:

- Persoonlijke hoofdlogin / profiel: `E-Kuijs`
- Oude extra persoonlijke account: `all-inmedia`
- Actieve hoofdrepo voor de app: `Kuijs-Services/ALL-INN-AJAX`
- Actieve legal repo: `Kuijs-Services/ajax-all-in-legal`
- Extra organisatie / zijlijn: `All-Inn-Media-Sports`

Belangrijk:
- `E-Kuijs` is het account waarmee je zichtbaar bent ingelogd.
- `all-inmedia` is ook nog een aparte GitHub-account die in andere tabs/profielen actief kan zijn.
- `Kuijs-Services` lijkt nu de belangrijkste code-lijn waar de echte apprepo en legal repo onder hangen.
- `All-Inn-Media-Sports` bevat nu vooral extra of tijdelijke repo's en is niet de duidelijkste production-hoofdlijn.

## Wat de recente checks lieten zien

### E-Kuijs

- Profiel is actief
- Nieuwe groene profielavatar staat goed
- Deze lijn hoort bij jouw vaste naamstructuur
- Dit account kan nu nog niet verwijderd worden, omdat het volgens GitHub nog eigenaar is van:
  - organisatie: `All-Inn-Media-Sports`
  - enterprise: `all-inn-media`
- Er staat ook een account-overdrachts/successor-uitnodiging open naar `Edwin3771` met status `Pending`

### all-inmedia

- Dit is een aparte oudere GitHub-account
- Deze account verscheen rechtsboven als actieve browserlogin terwijl je op de `Kuijs-Services` organisatiepagina zat
- Deze lijn lijkt nu vooral een oude account/sessie en niet meer de gewenste hoofdlijn
- Deze account nog niet verwijderen zolang:
  - oude repo-verwijzingen of rechten daar nog aan vast kunnen zitten
  - enterprise `all-inn-media` nog relevant blijkt
  - oude redirects of ownership nog niet volledig zijn opgeschoond

### Kuijs-Services

- Repo `ALL-INN-AJAX` bestaat hier
- Repo `ajax-all-in-legal` bestaat hier
- In de legal repo staan:
  - `privacy.html`
  - `terms.html`
  - `delete-account.html`

Dit maakt `Kuijs-Services` op dit moment de duidelijkste bron voor:
- de hoofdapp
- de legal pagina's
- De laatste extra screenshot bevestigt dat deze 2 repo's echt samen onder dezelfde `Kuijs-Services` lijn horen

### All-Inn-Media-Sports

- Bevat in elk geval:
  - `allinnmedia`
  - `andere`
  - `demo-repository`
- Lijkt nu meer een organisatie- of verzamelplek dan de scherpste production-hoofdlijn

## Wat lokaal nog niet gelijk loopt

De lokale git remote in deze repo wijst nog steeds naar:

```text
https://github.com/all-inmedia/ALL-INN-AJAX.git
```

Dus lokaal is dit nog niet aangepast aan de nieuwere GitHub-structuur.

## Aanbevolen lijn vanaf nu

Houd voorlopig dit aan:

- Profiel / persoonlijke GitHub-login: `E-Kuijs`
- Oude account visueel kaal houden: `all-inmedia`
- Productie-codebasis: `Kuijs-Services/ALL-INN-AJAX`
- Productie-legal repo: `Kuijs-Services/ajax-all-in-legal`
- `All-Inn-Media-Sports` alleen gebruiken voor extra of latere organisatie-structuur

Praktisch voor logo's:

- `E-Kuijs`: herkenbaar profiel/logo houden
- `Kuijs-Services`: belangrijk logo laten staan
- `all-inmedia`: mag visueel soberder of leeg, zodat je sneller ziet dat dit niet je hoofdaccount is

## Nog niet direct doen

- Nog niet blind alle oude accounts of repo's verwijderen
- Nog niet lokaal de git remote omzetten zonder definitieve bevestiging
- Nog niet legal links omzetten zonder eerst te checken welke repo publiek en stabiel blijft
- `E-Kuijs` niet proberen te verwijderen zolang:
  - `All-Inn-Media-Sports` nog onder dat account hangt
  - enterprise `all-inn-media` daar nog eigenaarschap heeft

## Beste volgende GitHub-stappen

1. Bevestigen dat `Kuijs-Services` de production-code-owner blijft.
2. Bevestigen dat `ajax-all-in-legal` daar ook moet blijven.
3. `E-Kuijs` voorlopig houden als persoonlijke hoofdlogin en beheeraccount.
4. Pas daarna lokaal de remote van deze repo omzetten naar de definitieve URL.
5. Oude GitHub-lijnen pas verder opschonen nadat organisatie- en enterprise-eigenaarschap netjes is overgedragen of opgeruimd.

## Aanbevolen plek voor volgende repo's

Nieuwe echte productie-repo's horen voortaan onder `Kuijs-Services`.

### Hoofd production repo's

- `Kuijs-Services/ALL-INN-AJAX`
- `Kuijs-Services/ajax-all-in-legal`

### Volgende club-apps

- `Kuijs-Services/ALL-INN-AZ`
- `Kuijs-Services/ALL-INN-HEERENVEEN`
- `Kuijs-Services/ALL-INN-SPARTA`
- `Kuijs-Services/ALL-INN-EXCELSIOR`
- `Kuijs-Services/ALL-INN-TELSTAR`

### Overige product-apps

- `Kuijs-Services/ALL-INN-BOEKHOUDING`

## Wat niet meer de hoofdroute is

- Geen nieuwe production repo's meer onder `all-inmedia`
- Geen nieuwe hoofdrepo's onder `All-Inn-Media-Sports`, behalve als je die organisatie later bewust als aparte sporttak wilt gebruiken
- `All-Inn-Media-Sports` mag voorlopig gebruikt worden voor:
  - demo's
  - forks
  - experimenten
  - tijdelijke tussenstappen
