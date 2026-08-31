# Assembles the page from src/ into three separate files plus a preview:
#
#   index.html              the markup — links the stylesheet and the script
#   styles.css              every rule, in source order (tokens → base →
#                           components → sections)
#   app.js                  the behaviour
#
# fonts/ already sits beside those three and is not generated; the stylesheet
# points at it where it stands.
#
#   preview.artifact.html   the same page as one self-contained fragment, with
#                           the CSS, the JS and every asset inlined. Gitignored;
#                           it exists only so the page can be published as an
#                           artifact, which is a single file by definition.
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

function Read-B64([string]$relative) {
    $path = Join-Path $rootDir $relative
    if (-not (Test-Path $path)) { throw "Missing asset: $path" }
    return [Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
}

# --------------------------------------------------------------------------
# The assets the stylesheet reaches for. Each one is written into the CSS
# twice over: as a relative path for the split build, and as a data URI for
# the single-file preview. The source keeps a placeholder so neither form is
# baked into it.
# --------------------------------------------------------------------------
$assets = [ordered]@{
    '__ASSET_FONT__' = @{ Path = 'fonts/plus-jakarta-sans-latin.woff2'; Mime = 'font/woff2' }
}

# --- the stylesheet, in cascade order -------------------------------------
$css = @(
    Read-Src 'css/01-tokens.css'
    Read-Src 'css/02-base.css'
    Read-Src 'css/03-hero.css'
    Read-Src 'css/04-sections.css'
) -join "`n"

$cssLinked = $css
$cssInline = $css
foreach ($token in $assets.Keys) {
    $asset = $assets[$token]
    $cssLinked = $cssLinked.Replace($token, $asset.Path)
    $cssInline = $cssInline.Replace($token, "data:$($asset.Mime);base64,$(Read-B64 $asset.Path)")
}

# --- the markup -----------------------------------------------------------
# The marquee loops by translating -50%, so the track holds the set twice. The
# second pass is duplicate content and is hidden from assistive tech.
$testimonials = Read-Src 'testimonials.html'
$testimonialTrack = $testimonials + "`n" +
    $testimonials.Replace('<li class="testi-item">', '<li class="testi-item" aria-hidden="true">')

$body = (Read-Src 'body.html').Replace('__TESTIMONIALS__', $testimonialTrack)

$js   = Read-Src 'app.js'
$head = Read-Src 'head.html'

# --------------------------------------------------------------------------
# 1. the three files
# app.js is in the head and is not deferred: it sets the flag that gates the
# hero's entrance, and that has to be on the root element before the body is
# parsed or the hero flashes its resting state first.
# --------------------------------------------------------------------------
# Both links carry a hash of what they point at. GitHub Pages serves these with
# Cache-Control: max-age=600, so without it a visitor who has been on the page
# in the last ten minutes gets the old stylesheet back without the browser so
# much as asking the server — a deployed change that looks like no change at
# all. The hash only moves when the file does, so the cache still does its job
# between releases.
function Get-Stamp([string]$text) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    $hash = [Security.Cryptography.SHA1]::Create().ComputeHash($bytes)
    return (($hash | ForEach-Object { $_.ToString('x2') }) -join '').Substring(0, 8)
}
$cssStamp = Get-Stamp $cssLinked
$jsStamp  = Get-Stamp $js

$page = @"
<!doctype html>
<html lang="en">
<head>
$head
<link rel="stylesheet" href="styles.css?v=$cssStamp">
<script src="app.js?v=$jsStamp"></script>
</head>
<body>
$body
</body>
</html>
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $rootDir 'index.html'), $page, $utf8)
[IO.File]::WriteAllText((Join-Path $rootDir 'styles.css'), $cssLinked, $utf8)
[IO.File]::WriteAllText((Join-Path $rootDir 'app.js'),     $js,        $utf8)

# --------------------------------------------------------------------------
# 2. the single-file preview — no doctype/html/head/body, the host wraps it.
# Everything here runs after the body, so the one line app.js would otherwise
# have run before it is repeated up front; without it the hero paints at rest
# and then plays its entrance.
# --------------------------------------------------------------------------
$fragment = @"
<style>
$cssInline
</style>
<script>document.documentElement.setAttribute('data-hero-anim', 'on');</script>
$body
<script>
$js
</script>
"@

[IO.File]::WriteAllText((Join-Path $rootDir 'preview.artifact.html'), $fragment, $utf8)

foreach ($name in 'index.html', 'styles.css', 'app.js', 'preview.artifact.html') {
    '{0,-24} {1,9:N0} bytes' -f $name, (Get-Item (Join-Path $rootDir $name)).Length
}
