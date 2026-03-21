# Business And Platform Structure

## Bedrijfsstructuur

```text
Kuijs Services
|
+-- All-Inn Media
    |
    +-- All-Inn Sports
    |   |
    |   +-- All-Inn Ajax
    |   +-- All-Inn NAC
    |   +-- All-Inn AZ
    |   +-- All-Inn Heerenveen
    |   +-- All-Inn Sparta
    |   +-- All-Inn Excelsior
    |   +-- All-Inn Telstar
    |
    +-- All-Inn Finance
    |   |
    |   +-- All-Inn Boekhouding
    |   +-- tools
    |   +-- calculators
    |
    +-- All-Inn Kids
    |
    +-- All-Inn Teens
    |
    +-- All-Inn Home
    |
    +-- All-Inn Marketplace
    |
    +-- All-Inn Entertainment
```

## Betekenis per laag

### 1. Kuijs Services

Het hoofdbedrijf bij de KvK.

### 2. All-Inn Media

Het hoofdmerk voor apps, platformen en digitale producten.

### 3. All-Inn Sports / All-Inn Finance

Dit zijn verticals of categorieen.
Geen losse technische apps, tenzij daar later echt een zelfstandig product uit ontstaat.

### 4. All-Inn Ajax

Dit is een concrete app binnen een verticale.

## Technische vertaling

```text
bedrijf -> merk -> verticale -> app
```

Voorbeeld:

```text
Kuijs Services -> All-Inn Media -> All-Inn Sports -> All-Inn Ajax
```

## Belangrijke regel

`All-Inn Sports` is een categorie en geen aparte app.

Dat betekent:

- wel bruikbaar voor branding
- wel bruikbaar voor een hub-onderdeel
- wel bruikbaar in database/config
- niet automatisch een aparte repo nodig

## Slimme technische structuur

### Platform

Een hoofdplatform met:

- auth
- profiles
- chat
- marketplace
- notifications
- memberships
- hub
- app-config
- branding

### App-laag

Per app verandert vooral:

- naam
- logo
- kleuren
- content
- links
- feature toggles

## Aanbevolen GitHub-logica

### Wel

- 1 hoofdrepo voor platform en gedeelde code
- aparte repo voor legal als nodig

### Niet

- voor iedere verticale direct een aparte repo maken
- `All-Inn Sports` als lege technische repo aanmaken

## Praktische conclusie

Voor jouw model is dit de juiste lijn:

1. `Kuijs Services` = bedrijf
2. `All-Inn Media` = hoofdmerk
3. `All-Inn Sports` = categorie
4. `All-Inn Ajax` = app

Later kunnen meer apps onder dezelfde verticale komen zonder dat de structuur opnieuw hoeft te veranderen.
