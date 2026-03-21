# Account Setup Overview

## Doel

Compact overzicht van de hoofdaccounts en rollen per platform voor All-Inn Ajax / All-Inn Media.

## 1. Google Play Console

- Hoofdaccount / owner: `edwin3771@gmail.com`
- Developer account naam: `All-Inn Media`
- Package name: `com.allinmedia.allinajax`
- Huidige status: app staat onder beoordeling / publicatie via Play Store

### Rol

- app publiceren
- store listing beheren
- beleids- en compliance-instellingen beheren
- gebruikers en rechten beheren

## 2. Expo / EAS

- Hoofdaccount: `ekuijs`
- Belangrijk: dit is de actieve build- en signinglijn
- Android keystore staat onder deze account

### Rol

- builds maken
- signing beheren
- credentials beheren
- releases genereren

### Opmerking

Andere Expo workspaces bestaan nog, maar `ekuijs` is de primaire account voor All-Inn Ajax.

## 3. GitHub

- Gewenst hoofdaccount: `E-Kuijs`
- Huidige remote voor deze repo: `https://github.com/all-inmedia/ALL-INN-AJAX.git`

### Rol

- codebeheer
- repositories
- versiebeheer
- legal/privacy repo

### Opmerking

`all-inmedia` host nu nog de bronrepo. Verwijderen pas na repo transfer naar `E-Kuijs`.

## 4. Supabase

- Hoofdaccount: `E-Kuijs / all.inn.media.contact@gmail.com`
- Juiste production project: `ALL-INN-AJAX`
- Project ref: `yehfisrddqmsklrsqpzr`
- Project URL: `https://yehfisrddqmsklrsqpzr.supabase.co`

### Rol

- backend
- auth
- database
- policies
- edge functions
- app-data

## Hoofdstructuur per platform

- Google Play = publiceren
- Expo = bouwen en signen
- GitHub = code en repo's
- Supabase = backend en data

## Aanbevolen vaste lijn

- Google Play: `edwin3771@gmail.com`
- Expo: `ekuijs`
- GitHub: `E-Kuijs`
- Supabase: `E-Kuijs`

## Belangrijke aandachtspunten

1. Gebruik voor Supabase alleen project ref `yehfisrddqmsklrsqpzr`.
2. Verwijder `all-inmedia` op GitHub pas na repo transfer.
3. Verwijder `ekuijs` niet; daar staat de actieve Android keystore.
4. Oude Expo workspaces pas opruimen nadat release en signing stabiel zijn.
