param(
  [string]$Name = 'E Kuijs',
  [string]$Role = 'Founder',
  [string]$Email = 'All.Inn.Media.contact@gmail.com',
  [string]$Website = 'www.all-inn.media',
  [string]$Phone = '+31 06 45716256',
  [string]$Location = 'Oosterhout'
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$logoPath = Join-Path $projectRoot 'assets\print-kit\raw\logo-media.png'
$outputPath = Join-Path $projectRoot 'assets\print-kit\print\business-card-85x55mm-e-kuijs-300dpi.png'

if (!(Test-Path $logoPath)) {
  throw "Logo niet gevonden: $logoPath"
}

$width = 1004   # 85 mm @ 300 dpi
$height = 650   # 55 mm @ 300 dpi
$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.SetResolution(300, 300)
$g = [System.Drawing.Graphics]::FromImage($bmp)

try {
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $bgRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
  $darkA = [System.Drawing.Color]::FromArgb(8, 8, 10)
  $darkB = [System.Drawing.Color]::FromArgb(20, 20, 24)
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bgRect,
    $darkA,
    $darkB,
    20.0
  )
  $g.FillRectangle($bgBrush, $bgRect)

  $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(212, 175, 55), 3)
  $g.DrawRectangle($goldPen, 8, 8, $width - 16, $height - 16)

  $accentRect = New-Object System.Drawing.Rectangle -ArgumentList 0, ($height - 80), $width, 80
  $accentBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $accentRect,
    [System.Drawing.Color]::FromArgb(150, 230, 0, 0),
    [System.Drawing.Color]::FromArgb(20, 255, 140, 0),
    0.0
  )
  $g.FillRectangle($accentBrush, 0, $height - 80, $width, 80)

  $logo = [System.Drawing.Image]::FromFile($logoPath)
  try {
    $g.DrawImage($logo, 30, 70, 290, 260)
  } finally {
    $logo.Dispose()
  }

  $nameFont = New-Object System.Drawing.Font('Arial', 54, [System.Drawing.FontStyle]::Bold)
  $roleFont = New-Object System.Drawing.Font('Arial', 28, [System.Drawing.FontStyle]::Bold)
  $textFont = New-Object System.Drawing.Font('Arial', 22, [System.Drawing.FontStyle]::Regular)
  $nameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 122))
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(236, 236, 236))
  $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 0))

  $x = 350
  $g.DrawString($Name, $nameFont, $nameBrush, $x, 62)
  $g.DrawString($Role, $roleFont, $redBrush, $x + 6, 145)
  $g.DrawString("Mail: $Email", $textFont, $whiteBrush, $x, 230)
  $g.DrawString("Tel:  $Phone", $textFont, $whiteBrush, $x, 278)
  $g.DrawString("Plaats: $Location", $textFont, $whiteBrush, $x, 326)
  $g.DrawString("Web: $Website", $textFont, $whiteBrush, $x, 374)

  $tagFont = New-Object System.Drawing.Font('Arial', 19, [System.Drawing.FontStyle]::Bold)
  $g.DrawString('ALL-INN MEDIA', $tagFont, $nameBrush, 36, 575)
} finally {
  $g.Dispose()
}

$outDir = Split-Path -Parent $outputPath
if (!(Test-Path $outDir)) {
  New-Item -Path $outDir -ItemType Directory -Force | Out-Null
}
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Output "Created: $outputPath"
