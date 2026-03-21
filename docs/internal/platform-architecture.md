# All-Inn Media Platform Architecture

## Platformdoel

Een enkele technische basis gebruiken voor meerdere apps, communities en merken.

## Frontend stack

- Expo SDK 54
- React Native
- Expo Router
- EAS Build

## Backend stack

- Supabase
- Postgres
- Row Level Security
- Edge Functions

## Kernmodules

```text
core
|
+-- auth
+-- profiles
+-- memberships
+-- chat
+-- notifications
+-- marketplace
+-- events
+-- lotteries
+-- moderation
+-- content
+-- monetization
```

## Multi-app model

Alle kerngegevens moeten app-scoped zijn.

### Verplichte identifiers

- `app_id`
- `tenant_slug`
- optioneel `club_id` of `vertical_id`

## Databasebasis

### Platformtabellen

- `apps`
- `app_settings`
- `app_content`
- `profiles`
- `memberships`
- `notifications`

### Communitytabellen

- `chat_rooms`
- `chat_messages`
- `blocked_users`
- `profanity_words`

### Commerce tabellen

- `listings`
- `listing_messages`
- `purchases`
- `subscription_plans`

### Events en activatie

- `events`
- `lottery_milestones`
- `lottery_entries`

## Architectuurregels

1. Geen app mag afhankelijk zijn van hardcoded branding in de core.
2. Feature-toegang moet via entitlements en settings lopen.
3. Policies moeten per app en gebruiker afdwingen wie wat mag zien of muteren.
4. Kids, Teens en Finance krijgen aanvullende regels boven op de core.

## Deploymentaanpak

### Fase 1

- All-Inn Ajax stabiliseren

### Fase 2

- core abstraheren waar branding nog hardcoded is

### Fase 3

- tenant-ready content en settings uitbreiden

### Fase 4

- nieuwe apps uitrollen op dezelfde backendbasis

## Technische conclusie

All-Inn Media moet tenant-first ontworpen worden. Zonder tenant-scheiding wordt groei naar meerdere apps duur en foutgevoelig.
