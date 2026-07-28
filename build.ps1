# Assembles the two outputs from src/:
#   index.html              standalone page (open it directly in a browser)
#   preview.artifact.html   body-only fragment for the artifact preview
#
# Run:  pwsh -File build.ps1

$ErrorActionPreference = 'Stop'
$rootDir = $PSScriptRoot
$srcDir  = Join-Path $rootDir 'src'

function Read-Src([string]$relative) {
    $path = Join-Path $srcDir $relative
    if (-not (Test-Path $path)) { throw "Missing source file: $path" }
    return [IO.File]::ReadAllText($path)
}

# --- font: inline the Plus Jakarta Sans latin subset as a data URI ----------
$fontPath = Join-Path $srcDir 'fonts/plus-jakarta-sans-latin.woff2'
if (-not (Test-Path $fontPath)) { throw "Missing font: $fontPath" }
$fontB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($fontPath))

# --- assemble -------------------------------------------------------------
$css = @(
    Read-Src 'css/01-tokens.css'
    Read-Src 'css/02-base.css'
    Read-Src 'css/03-components.css'
    Read-Src 'css/04-sections.css'
    Read-Src 'css/05-work.css'
) -join "`n"

$css = $css.Replace('__FONT_B64__', $fontB64)

# --- images: inline so the page makes zero external requests ---------------
function Read-B64([string]$relative) {
    $path = Join-Path $srcDir $relative
    if (-not (Test-Path $path)) { throw "Missing asset: $path" }
    return [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
}

# Where the shared site chrome points. Swap for the production origin when the
# page is deployed alongside the rest of the site.
$homeUrl = 'https://imageworksc.github.io/imageworks-home/'

# The marquee loops by translating -50%, so the track holds the set twice. The
# second pass is duplicate content and is hidden from assistive tech.
$testimonials = Read-Src 'testimonials.html'
$testimonialsDup = $testimonials.Replace('<li class="testi-item">', '<li class="testi-item" aria-hidden="true">')
$testimonialTrack = $testimonials + "`n" + $testimonialsDup

# The work thumbnails live in the stylesheet, so the duplicated half of the
# marquee reuses them instead of repeating every data URI.
for ($i = 1; $i -le 8; $i++) {
    $css = $css.Replace("__WORK${i}_B64__", (Read-B64 "assets/work-$i.jpg"))
}

$works = Read-Src 'works.html'
$worksDup = $works.Replace('<li class="work-item">', '<li class="work-item" aria-hidden="true">')

$body = (Read-Src 'body.html').
    Replace('__TESTIMONIALS__',  $testimonialTrack).
    Replace('__WORKS__',         ($works + "`n" + $worksDup)).
    Replace('__LOGO_B64__',     (Read-B64 'assets/logo.png')).
    Replace('__FOOTLOGO_B64__', (Read-B64 'assets/footer-logo.png')).
    Replace('__FOOTMAP_B64__',  (Read-B64 'assets/footer-map.jpg')).
    Replace('__HOME__',         $homeUrl)
$js   = (Read-Src 'app.js') + "`n" + (Read-Src 'mesh.js')
$head = Read-Src 'head.html'

$styleBlock  = "<style>`n$css`n</style>"
$scriptBlock = "<script>`n$js`n</script>"

# --- 1. standalone page ---------------------------------------------------
$standalone = @"
<!doctype html>
<html lang="en">
<head>
$head
$styleBlock
</head>
<body>
$body
$scriptBlock
</body>
</html>
"@

# --- 2. artifact fragment (no doctype/html/head/body — the host wraps it) ---
$fragment = @"
$styleBlock
$body
$scriptBlock
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $rootDir 'index.html'), $standalone, $utf8)
[IO.File]::WriteAllText((Join-Path $rootDir 'preview.artifact.html'), $fragment, $utf8)

'{0,-24} {1,9:N0} bytes' -f 'index.html', (Get-Item (Join-Path $rootDir 'index.html')).Length
'{0,-24} {1,9:N0} bytes' -f 'preview.artifact.html', (Get-Item (Join-Path $rootDir 'preview.artifact.html')).Length
