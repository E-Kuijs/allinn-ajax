# ALL-INN BOEKHOUDING MVP

Laatst bijgewerkt: 2026-03-16

## Positionering

`ALL-INN BOEKHOUDING` wordt de finance-app binnen het All-Inn ecosysteem.
De focus ligt op simpele administratie voor zzp, kleine ondernemers en compacte teams.

## Probleem dat de app oplost

- losse bonnetjes raken kwijt
- inkomsten en uitgaven staan verspreid
- btw-momenten zijn onduidelijk
- er is te veel zware software voor kleine gebruikers

## MVP-doel

Binnen 1 app snel kunnen zien:

- wat er is verdiend
- wat eruit is gegaan
- wat nog openstaat
- wat opzij moet voor btw of belasting

## Eerste schermen

1. Dashboard
   - omzet deze maand
   - uitgaven deze maand
   - winstindicatie
   - openstaande facturen

2. Transacties
   - inkomsten toevoegen
   - uitgaven toevoegen
   - categorie kiezen
   - betaalstatus tonen

3. Facturen
   - factuur aanmaken
   - klant koppelen
   - vervaldatum
   - betaald of open

4. Rapportage
   - maandoverzicht
   - kwartaaloverzicht
   - btw-indicatie
   - exportregels

5. Instellingen
   - bedrijfsnaam
   - btw-percentage
   - betaaltermijn
   - notificaties

## Datamodellen die later nodig zijn

- `finance_accounts`
- `finance_contacts`
- `finance_transactions`
- `finance_invoices`
- `finance_invoice_lines`
- `finance_tax_periods`
- `finance_exports`

## Wat we kunnen hergebruiken uit het huidige platform

- auth
- profielen
- memberships
- notificaties
- basis beheerstructuur
- centrale app-config

## Wat nieuw gebouwd moet worden

- transactieboek
- factuurstroom
- btw-logica
- export voor administratie
- finance-specifieke rechten en validatie

## Slimme eerste versie

Niet meteen complexe boekhouding bouwen.
Eerst alleen:

- handmatige invoer
- simpele categorieen
- maandrapport
- openstaande facturen
- export naar csv

## Beste bouwvolgorde

1. dashboard en transacties
2. facturen en klanten
3. rapport en btw
4. export en polish

## Besluit

Deze app is belangrijk omdat hij minder afhankelijk is van clubcontent en op termijn breder verkoopbaar is dan een enkele voetbalcommunity.
