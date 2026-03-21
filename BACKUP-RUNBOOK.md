# BACKUP RUNBOOK - ALL-INN AJAX

Laatst bijgewerkt: 2026-03-10  
Project: `ALL-INN-AJAX`  
Supabase project: `yehfisrddqmsklrsqpzr.supabase.co`

## 1) Doel

Dit runbook voorkomt dat je code of data kwijtraakt en geeft een vaste herstelroute.

## 2) Wat moet je backuppen

1. Codebase (hele root van deze repo)
2. Supabase database (schema + data)
3. Environment/config bestanden (`.env`, `app.json`, `eas.json`)
4. Belangrijke administratiebestanden:
   - `MIGRATIONS.md`
   - `ACCOUNT-OVERVIEW.md`
   - `BACKUP-RUNBOOK.md`

## 3) Backup frequentie

1. Voor elke release build
2. Voor elke nieuwe migratie
3. Minimaal 1x per week volledige backup

## 4) Snelle code-backup (Windows)

Maak een zip van je projectroot.

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmm"
$src = "C:\dev\Kuijs-Services\All-Inn-Media\all-inn-platform\ALL-INN-AJAX"
$dst = "C:\Users\Edwin\Documents\Backups\ALL-INN-AJAX-$ts.zip"
Compress-Archive -Path "$src\*" -DestinationPath $dst -Force
Write-Output "Backup gemaakt: $dst"
```

Opslaan op 2 plekken:
1. Lokale schijf (bijv. `Documents\Backups`)
2. Cloud (Drive/OneDrive)

## 5) Supabase backup (aanrader: dashboard + SQL dump)

### A) Dashboard check (handmatig)
1. Open Supabase project
2. Check `Status = Healthy`
3. Check `Backups` (automatisch aan waar mogelijk)

### B) SQL dump maken (lokaal)

Vereist:
1. Supabase CLI ingelogd
2. DB connect string beschikbaar

Voorbeeld:

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmm"
$out = "C:\Users\Edwin\Documents\Backups\supabase-db-$ts.sql"
supabase db dump -f $out
Write-Output "DB dump gemaakt: $out"
```

Als `db dump` lokaal niet lukt, maak in dashboard periodiek exports en bewaar die ook op 2 plekken.

## 6) Migratie-veilig werken (altijd zo doen)

1. Nieuwe SQL-file maken in `supabase/migrations` met unieke timestamp
2. Lokaal committen in Git
3. Eerst backup maken
4. Daarna pas migration uitvoeren
5. Resultaat noteren in `MIGRATIONS.md`

## 7) Herstelprocedure (nood)

### A) Code herstellen
1. Huidige map veilig hernoemen
2. Backup zip uitpakken naar nieuwe `ALL-INN-AJAX` map
3. `npm install`
4. `npm run typecheck` en `npm run lint`

### B) Supabase herstellen
1. Controleer of je in het juiste project zit
2. Zet herstelbestand klaar
3. Herstel schema/data via SQL editor of CLI
4. Controleer kern-tabellen en app-login

## 8) Pre-release backup checklist

1. Code zip gemaakt
2. DB dump gemaakt
3. `.env` veilig opgeslagen
4. Laatste migratie in `MIGRATIONS.md` bijgewerkt
5. Build gestart pas na 1 t/m 4

## 9) Naamgeving backups

Gebruik altijd:

1. Code: `ALL-INN-AJAX-YYYYMMDD-HHMM.zip`
2. DB: `supabase-db-YYYYMMDD-HHMM.sql`

## 10) Bewaartermijn

1. Dagelijks: laatste 7 backups
2. Wekelijks: laatste 8 backups
3. Voor releases: bewaar minimaal 1 backup per live release
