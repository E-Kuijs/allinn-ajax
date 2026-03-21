param(
  [Parameter(Position = 0)]
  [ValidateSet('summary', 'recipients', 'template', 'html', 'ps', 'all')]
  [string]$Action = 'all',

  [string]$VipFilePath = 'C:\dev\Kuijs-Services\All-Inn-Media\prive\e-mail adressen testers\VIP email adressen.txt',

  [string]$SignName = 'Edwin Kuijs',

  [string]$LogoUrl = '',

  [switch]$CopyRecipients,

  [switch]$CopyBody
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-PremiumEmailAddresses {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "VIP-bestand niet gevonden: $Path"
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  $matches = [regex]::Matches($raw, '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', 'IgnoreCase')

  $addresses = @(
    $matches |
      ForEach-Object { $_.Value.Trim().ToLowerInvariant() } |
      Where-Object { $_ -and $_ -notmatch '@getemailviprole\.com$' } |
      Select-Object -Unique
  )

  return $addresses
}

function Get-PremiumEmailTemplate {
  param(
    [Parameter(Mandatory = $true)][string]$SignName,
    [string]$LogoUrl = ''
  )

  $subject = 'ALL-INN AJAX premium update en testuitnodiging'
  $body = @"
Hoi,

Dit is het cadeautje dat ik bedoelde: een gratis premium abonnement op ALL-INN AJAX.

Jullie horen bij de eerste mensen aan wie ik de app wil laten zien, juist omdat jullie mijn directe vrienden zijn. Daarom hebben jullie nu als eersten toegang en mogen jullie hem ook als eersten testen.

Ik bouw de app stap voor stap verder uit. Op dit moment zijn onder andere de HUB-richting, media-inzendingen en beheerverbeteringen doorgevoerd. Het zou mij echt helpen als jullie de app kort willen testen en laten weten of alles goed werkt.

Waar we vooral graag feedback op krijgen:
- inloggen en algemeen gebruik
- media en supporters-inzendingen
- snelheid en duidelijkheid van de app
- dingen die niet goed werken of beter kunnen

Reageren mag gewoon op deze mail met je bevindingen, fouten of ideeen. Ook als het maar iets kleins is.

Alvast bedankt dat jullie mij hiermee willen helpen.

Groet,
$SignName
ALL-INN MEDIA
"@

  $logoBlock = if ($LogoUrl.Trim()) {
    "<p style='margin:0 0 18px 0;'><img src='$LogoUrl' alt='ALL-INN AJAX logo' style='max-width:180px;height:auto;display:block;' /></p>"
  } else {
    ''
  }

  $htmlBody = @"
<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6;font-size:15px;">
  $logoBlock
  <p>Hoi,</p>
  <p>Dit is het cadeautje dat ik bedoelde: een gratis premium abonnement op <strong>ALL-INN AJAX</strong>.</p>
  <p>Jullie horen bij de eerste mensen aan wie ik de app wil laten zien, juist omdat jullie mijn directe vrienden zijn. Daarom hebben jullie nu als eersten toegang en mogen jullie hem ook als eersten testen.</p>
  <p>Ik bouw de app stap voor stap verder uit. Op dit moment zijn onder andere de HUB-richting, media-inzendingen en beheerverbeteringen doorgevoerd. Het zou mij echt helpen als jullie de app kort willen testen en laten weten of alles goed werkt.</p>
  <p><strong>Waar we vooral graag feedback op krijgen:</strong></p>
  <ul>
    <li>inloggen en algemeen gebruik</li>
    <li>media en supporters-inzendingen</li>
    <li>snelheid en duidelijkheid van de app</li>
    <li>dingen die niet goed werken of beter kunnen</li>
  </ul>
  <p>Reageren mag gewoon op deze mail met je bevindingen, fouten of ideeen. Ook als het maar iets kleins is.</p>
  <p>Alvast bedankt dat jullie mij hiermee willen helpen.</p>
  <p>Groet,<br />$SignName<br />ALL-INN MEDIA</p>
</div>
"@

  return @{
    Subject = $subject
    Body = $body
    HtmlBody = $htmlBody
  }
}

$recipients = Get-PremiumEmailAddresses -Path $VipFilePath
$template = Get-PremiumEmailTemplate -SignName $SignName -LogoUrl $LogoUrl
$joinedRecipients = $recipients -join ';'

if ($CopyRecipients) {
  Set-Clipboard -Value $joinedRecipients
}

if ($CopyBody) {
  Set-Clipboard -Value $template.Body
}

switch ($Action) {
  'summary' {
    Write-Output "Premium adressen gevonden: $($recipients.Count)"
    Write-Output "Bronbestand: $VipFilePath"
  }
  'recipients' {
    Write-Output $joinedRecipients
  }
  'template' {
    Write-Output "Onderwerp:"
    Write-Output $template.Subject
    Write-Output ""
    Write-Output "Bericht:"
    Write-Output $template.Body
  }
  'html' {
    Write-Output "Onderwerp:"
    Write-Output $template.Subject
    Write-Output ""
    Write-Output "HTML:"
    Write-Output $template.HtmlBody
  }
  'ps' {
    Write-Output '$premiumRecipients = @('
    foreach ($recipient in $recipients) {
      Write-Output "  '$recipient'"
    }
    Write-Output ')'
    Write-Output ('$premiumRecipientsJoined = "{0}"' -f $joinedRecipients.Replace('"', '\"'))
    Write-Output ('$premiumSubject = "{0}"' -f $template.Subject.Replace('"', '\"'))
    Write-Output '$premiumBody = @'''
    Write-Output $template.Body
    Write-Output "'@"
    Write-Output '$premiumHtmlBody = @'''
    Write-Output $template.HtmlBody
    Write-Output "'@"
  }
  'all' {
    Write-Output "Premium adressen gevonden: $($recipients.Count)"
    Write-Output ""
    Write-Output "Onderwerp:"
    Write-Output $template.Subject
    Write-Output ""
    Write-Output "Ontvangers:"
    Write-Output $joinedRecipients
    Write-Output ""
    Write-Output "Bericht:"
    Write-Output $template.Body
  }
}
