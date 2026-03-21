param(
  [Parameter(Position = 0)]
  [ValidateSet('verify', 'smoke', 'release-check', 'update-preview', 'update-production', 'build-preview', 'build-production')]
  [string]$Action = 'verify',

  [string]$Message,

  [switch]$SkipDoctor,

  [switch]$SkipSmoke,

  [switch]$AllowNativeRisk
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Step {
  param([string]$Text)
  Write-Host ""
  Write-Host "==> $Text" -ForegroundColor Cyan
}

function Invoke-Tool {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string[]]$Arguments = @()
  )

  Write-Host "PS> $FilePath $($Arguments -join ' ')" -ForegroundColor DarkGray
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

function Invoke-NpmScript {
  param([Parameter(Mandatory = $true)][string]$Name)
  Invoke-Tool -FilePath 'npm' -Arguments @('run', $Name)
}

function Get-NativeSensitiveChanges {
  $gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
  if (-not $gitAvailable) {
    return @()
  }

  try {
    $paths = @(
      'app.json',
      'app.config.js',
      'app.config.ts',
      'eas.json',
      'package.json',
      'package-lock.json',
      'ios',
      'android'
    )

    $output = & git diff --name-only HEAD -- @paths 2>$null
    if ($LASTEXITCODE -ne 0) {
      return @()
    }

    return @($output | Where-Object { $_ -and $_.Trim() })
  } catch {
    return @()
  }
}

function Assert-SafeForOtaUpdate {
  if ($AllowNativeRisk) {
    return
  }

  $changed = @(Get-NativeSensitiveChanges)
  if ($changed.Count -eq 0) {
    return
  }

  $joined = ($changed | ForEach-Object { "- $_" }) -join "`n"
  throw @"
OTA update gestopt omdat er native-gevoelige bestanden gewijzigd zijn:
$joined

Gebruik in dit geval liever een nieuwe build:
- build-preview
- build-production

Als je dit bewust wilt negeren, run dan opnieuw met -AllowNativeRisk.
"@
}

function Invoke-Verify {
  Write-Step 'TypeScript check'
  Invoke-NpmScript 'typecheck'

  Write-Step 'Lint check'
  Invoke-NpmScript 'lint'

  if (-not $SkipDoctor) {
    Write-Step 'Expo Doctor'
    Invoke-Tool -FilePath 'npx' -Arguments @('expo-doctor')
  }
}

function Invoke-Smoke {
  Write-Step 'Expo web smoke export'
  Invoke-Tool -FilePath 'npx' -Arguments @('expo', 'export', '--platform', 'web', '--output-dir', '.expo-smoke')
}

function Invoke-ReleaseCheck {
  Invoke-Verify
  if (-not $SkipSmoke) {
    Invoke-Smoke
  }
}

switch ($Action) {
  'verify' {
    Invoke-Verify
  }
  'smoke' {
    Invoke-Smoke
  }
  'release-check' {
    Invoke-ReleaseCheck
  }
  'update-preview' {
    if (-not $Message.Trim()) {
      throw 'Geef een updatebericht mee via -Message "..." voor update-preview.'
    }
    Assert-SafeForOtaUpdate
    Invoke-ReleaseCheck
    Write-Step 'EAS update preview'
    Invoke-Tool -FilePath 'eas' -Arguments @('update', '--channel', 'preview', '--message', $Message)
  }
  'update-production' {
    if (-not $Message.Trim()) {
      throw 'Geef een updatebericht mee via -Message "..." voor update-production.'
    }
    Assert-SafeForOtaUpdate
    Invoke-ReleaseCheck
    Write-Step 'EAS update production'
    Invoke-Tool -FilePath 'eas' -Arguments @('update', '--channel', 'production', '--message', $Message)
  }
  'build-preview' {
    Invoke-ReleaseCheck
    Write-Step 'EAS build preview'
    Invoke-NpmScript 'build:preview'
  }
  'build-production' {
    Invoke-ReleaseCheck
    Write-Step 'EAS build production'
    Invoke-NpmScript 'build:production'
  }
  default {
    throw "Onbekende actie: $Action"
  }
}

Write-Host ""
Write-Host "Klaar: $Action" -ForegroundColor Green
