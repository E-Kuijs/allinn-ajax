# Premium Email Workflow

Gebruik deze workflow om premium/testadressen snel klaar te zetten vanuit PowerShell.

## Bestand

- Script: `scripts/premium-email.ps1`
- Bronbestand met adressen:
  `C:\dev\Kuijs-Services\All-Inn-Media\prive\e-mail adressen testers\VIP email adressen.txt`

## Handige commando's

Alleen samenvatting:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\premium-email.ps1 summary
```

Alle adressen als 1 regel:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\premium-email.ps1 recipients
```

Mailtemplate tonen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\premium-email.ps1 template
```

PowerShell-klare variabelen tonen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\premium-email.ps1 ps
```

Ontvangers direct naar clipboard:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\premium-email.ps1 recipients -CopyRecipients
```

## Wat het script doet

- leest de adressen uit het VIP-bestand
- haalt lege regels en doublures eruit
- maakt een nette premium-mailtekst
- kan ontvangers of bericht tonen
- kan een PowerShell-ready versie tonen voor gebruik in de console

## Let Op

- dit script verstuurt geen mail
- het maakt alleen de adressen en tekst klaar
- zo houd je controle over wat je uiteindelijk verstuurt
