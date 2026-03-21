Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

function New-Bitmap {
  param(
    [int]$Width,
    [int]$Height,
    [double]$Dpi = 300
  )
  $bmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution([float]$Dpi, [float]$Dpi)
  return $bmp
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )
  $dir = Split-Path -Parent $Path
  if (!(Test-Path $dir)) {
    New-Item -Path $dir -ItemType Directory -Force | Out-Null
  }
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Crop-Image {
  param(
    [System.Drawing.Image]$Source,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height
  )
  $bmp = New-Bitmap -Width $Width -Height $Height -Dpi 300
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $srcRect = New-Object System.Drawing.Rectangle($X, $Y, $Width, $Height)
  $dstRect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($Source, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  return $bmp
}

function Remove-LightGray-Background {
  param(
    [System.Drawing.Bitmap]$Bitmap
  )
  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      $c = $Bitmap.GetPixel($x, $y)
      $isLightGray = ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220 -and
        [Math]::Abs($c.R - $c.G) -lt 12 -and [Math]::Abs($c.G - $c.B) -lt 12)
      if ($isLightGray) {
        $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
      }
    }
  }
}

function Resize-Image {
  param(
    [System.Drawing.Image]$Source,
    [int]$Width,
    [int]$Height,
    [bool]$Nearest = $false
  )
  $bmp = New-Bitmap -Width $Width -Height $Height -Dpi 300
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = if ($Nearest) {
    [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  } else {
    [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  }
  $g.DrawImage($Source, 0, 0, $Width, $Height)
  $g.Dispose()
  return $bmp
}

function Draw-Centered {
  param(
    [System.Drawing.Bitmap]$Canvas,
    [System.Drawing.Image]$Image,
    [int]$TargetWidth,
    [int]$TargetHeight,
    [int]$OffsetX = 0,
    [int]$OffsetY = 0
  )
  $g = [System.Drawing.Graphics]::FromImage($Canvas)
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $x = [int](($Canvas.Width - $TargetWidth) / 2) + $OffsetX
  $y = [int](($Canvas.Height - $TargetHeight) / 2) + $OffsetY
  $g.DrawImage($Image, $x, $y, $TargetWidth, $TargetHeight)
  $g.Dispose()
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$outputRoot = Join-Path $projectRoot 'assets\print-kit'
$rawDir = Join-Path $outputRoot 'raw'
$printDir = Join-Path $outputRoot 'print'

New-Item -Path $rawDir -ItemType Directory -Force | Out-Null
New-Item -Path $printDir -ItemType Directory -Force | Out-Null

$badgesPath = 'C:\Users\Edwin\Desktop\project All-Inn HUB\48b71f18-3b3d-4299-b906-28e38bf3332b.png'
$packPath = 'C:\Users\Edwin\Desktop\project All-Inn HUB\ChatGPT Image 24 feb 2026, 18_56_51.png'

if (!(Test-Path $badgesPath)) { throw "Bronbestand niet gevonden: $badgesPath" }
if (!(Test-Path $packPath)) { throw "Bronbestand niet gevonden: $packPath" }

$badgesImage = [System.Drawing.Image]::FromFile($badgesPath)
$packImage = [System.Drawing.Image]::FromFile($packPath)

try {
  $badgeCrops = @(
    @{ name = 'logo-media'; x = 20; y = 10; w = 430; h = 430 },
    @{ name = 'logo-finance'; x = 555; y = 10; w = 430; h = 430 },
    @{ name = 'logo-home'; x = 1085; y = 10; w = 430; h = 430 },
    @{ name = 'logo-teens'; x = 330; y = 330; w = 400; h = 400 },
    @{ name = 'logo-agenda'; x = 840; y = 330; w = 400; h = 400 },
    @{ name = 'logo-kids'; x = 0; y = 500; w = 390; h = 390 },
    @{ name = 'logo-sports'; x = 1185; y = 500; w = 350; h = 350 },
    @{ name = 'logo-allinn-sports'; x = 560; y = 560; w = 450; h = 450 }
  )

  foreach ($crop in $badgeCrops) {
    $bmp = Crop-Image -Source $badgesImage -X $crop.x -Y $crop.y -Width $crop.w -Height $crop.h
    Remove-LightGray-Background -Bitmap $bmp
    Save-Png -Bitmap $bmp -Path (Join-Path $rawDir "$($crop.name).png")
    $bmp.Dispose()
  }

  $businessSource = Crop-Image -Source $packImage -X 1090 -Y 500 -Width 420 -Height 250
  Save-Png -Bitmap $businessSource -Path (Join-Path $rawDir 'business-card-source.png')

  $mainLogoSource = Crop-Image -Source $packImage -X 470 -Y 35 -Width 420 -Height 355
  Save-Png -Bitmap $mainLogoSource -Path (Join-Path $rawDir 'main-logo-source.png')

  $qrRaw = Crop-Image -Source $packImage -X 885 -Y 560 -Width 155 -Height 155
  $qrUpscaled = Resize-Image -Source $qrRaw -Width 620 -Height 620 -Nearest $true
  Save-Png -Bitmap $qrUpscaled -Path (Join-Path $rawDir 'qr-code-raw.png')

  $qrPrint = New-Bitmap -Width 472 -Height 472 -Dpi 300
  $gQr = [System.Drawing.Graphics]::FromImage($qrPrint)
  $gQr.Clear([System.Drawing.Color]::White)
  $gQr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $gQr.DrawImage($qrUpscaled, 26, 26, 420, 420)
  $gQr.Dispose()
  Save-Png -Bitmap $qrPrint -Path (Join-Path $printDir 'qr-40x40mm-300dpi.png')

  # Visitekaart 85x55mm @ 300dpi => 1004x650
  $businessCard = New-Bitmap -Width 1004 -Height 650 -Dpi 300
  $gBiz = [System.Drawing.Graphics]::FromImage($businessCard)
  $gBiz.Clear([System.Drawing.Color]::FromArgb(10, 10, 10))
  $gBiz.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gBiz.DrawImage($businessSource, 0, 0, 1004, 650)
  $gBiz.Dispose()
  Save-Png -Bitmap $businessCard -Path (Join-Path $printDir 'business-card-85x55mm-300dpi.png')

  # T-shirt front print 300x300mm @ 300dpi => 3543x3543
  $tshirt = New-Bitmap -Width 3543 -Height 3543 -Dpi 300
  $gT = [System.Drawing.Graphics]::FromImage($tshirt)
  $gT.Clear([System.Drawing.Color]::Transparent)
  $gT.Dispose()
  Draw-Centered -Canvas $tshirt -Image $mainLogoSource -TargetWidth 2400 -TargetHeight 2028
  Save-Png -Bitmap $tshirt -Path (Join-Path $printDir 'tshirt-front-300x300mm-300dpi.png')

  # A4 bedrijfsvel 210x297mm @300dpi => 2480x3508
  $a4 = New-Bitmap -Width 2480 -Height 3508 -Dpi 300
  $gA4 = [System.Drawing.Graphics]::FromImage($a4)
  $gA4.Clear([System.Drawing.Color]::FromArgb(248, 248, 248))
  $fontTitle = New-Object System.Drawing.Font('Arial', 52, [System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font('Arial', 26, [System.Drawing.FontStyle]::Bold)
  $brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 10, 10))
  $brushRed = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 0))
  $gA4.DrawString('ALL-INN MEDIA PRINT KIT', $fontTitle, $brushDark, 120, 90)
  $gA4.DrawString('Losse assets voor drukwerk', $fontSub, $brushRed, 125, 180)
  $gA4.DrawImage($mainLogoSource, 140, 290, 900, 760)
  $gA4.DrawImage($businessSource, 1200, 360, 1080, 640)
  $gA4.DrawImage($qrPrint, 1520, 1150, 780, 780)
  $gA4.DrawString('QR 40x40mm @ 300dpi', $fontSub, $brushDark, 1490, 1960)
  $gA4.DrawImage($tshirt, 420, 2050, 1600, 1600)
  $gA4.DrawString('T-shirt print 300x300mm @ 300dpi', $fontSub, $brushDark, 560, 3370)
  $gA4.Dispose()
  $fontTitle.Dispose()
  $fontSub.Dispose()
  $brushDark.Dispose()
  $brushRed.Dispose()
  Save-Png -Bitmap $a4 -Path (Join-Path $printDir 'bedrijfsvel-a4-300dpi.png')

  $qrRaw.Dispose()
  $qrUpscaled.Dispose()
  $qrPrint.Dispose()
  $businessSource.Dispose()
  $mainLogoSource.Dispose()
  $businessCard.Dispose()
  $tshirt.Dispose()
  $a4.Dispose()
}
finally {
  $badgesImage.Dispose()
  $packImage.Dispose()
}

Write-Output "Print kit generated in: $outputRoot"
