# Shared Fixes - Voetbalapps (2026-03-25)

Deze fixset is toegepast in `ALL-INN-AJAX` en bedoeld als herbruikbare basis voor andere voetbalapps.

## Uitgevoerde fixes

1. Chat-sidebar naam sync
- Eigen profielnaam wordt nu altijd meegenomen in de chat-sidebar (ook direct na profielwijziging).
- Sidebar valt minder snel terug op user-id.

2. Push popup zoek- en naamstabiliteit
- Zoekopdracht werkt nu met varianten: origineel, zonder `@`, en met `@`.
- Extra fallback op `admin_find_popup_users` toegevoegd voor beheerflow.
- Afzendernaam van popup wordt opgeslagen en hergebruikt per user.

3. Gouden sterren weergave
- Gouden sterren kleiner gemaakt.
- Clip-gevoelige schaalanimatie verwijderd; alleen subtiele opacity pulse behouden.
- Layout aangepast zodat alle sterren zichtbaar blijven.

4. Gold/Special mapping op e-mailprefix
- Prefixen toegevoegd voor:
  - `patries2611@...`
  - `ikhaatrood@...`
  - `ajaxvak428@...`
- Deze accounts krijgen daardoor speciale/gold status, ook als het domein verschilt.

## Port checklist voor andere voetbalapps

1. Neem over:
- `app/(tabs)/chat.tsx`
- `app/(tabs)/owner.tsx`
- `components/membership-badge.tsx`
- `src/core/app-context.tsx`
- `src/core/family-emails.ts`

2. Controleer app-specifiek:
- RLS policies op `profiles` en popup-rpc's.
- Of `admin_find_popup_users` in de database bestaat.
- Welke e-mailprefixen per club/app gold moeten zijn.

3. Sneltest na overname:
- Profielnaam wijzigen en direct checken in chat-sidebar.
- Popup zoeken op naam en op username (met en zonder `@`).
- Gold badge visueel controleren op verschillende schermbreedtes.
