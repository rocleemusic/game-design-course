<#
gdd compile — stitches gdd/*.md into one review draft at resources/build-gdd-vN_draft.md.

Rule (no per-file judgment calls):
  - each file's H1 becomes "## <N>. <Title>", N = the file's numeric prefix
  - each H2 inside a file becomes "### <N>.<i> <Title>", numbered in document order
  - Part headers are inserted from $parts below (the only hand-authored piece,
    since "which files group into a Part" isn't derivable from the files themselves)
  - the boilerplate "See CONTEXT.md for how this fits with the rest of the GDD."
    clause is stripped; nothing else in a file's intro paragraph is touched
  - cross-file links like [`07-cast.md`](07-cast.md) become "#7"; bare mentions
    of a numbered filename (no link syntax) become "#7" too
  - "../resources/X" links collapse to "X" (the draft lives in resources/ itself)
#>

$gddDir = $PSScriptRoot
$resourcesDir = Join-Path $gddDir "..\resources"

$parts = @(
  @{ File = 0;  Title = "Part 0: The World" }
  @{ File = 1;  Title = "Part I: Concept & Pillars" }
  @{ File = 3;  Title = "Part II: Game Mechanics" }
  @{ File = 9;  Title = "Part III: Art, Audio & AI Architecture" }
  @{ File = 12; Title = "Part IV: Technical Strategy & Scope" }
  @{ File = 14; Title = "Part V: Visual Style Guide" }
)

$boilerplate = "See [``CONTEXT.md``](CONTEXT.md) for how this fits with the rest of the GDD. "
$boilerplateNoTrail = "See [``CONTEXT.md``](CONTEXT.md) for how this fits with the rest of the GDD."

$files = Get-ChildItem -Path $gddDir -Filter "??-*.md" | Sort-Object Name
$sections = New-Object System.Collections.Generic.List[string]

foreach ($f in $files) {
  if ($f.Name -notmatch '^(\d{2})-') { continue }
  $num = [int]$matches[1]

  $part = $parts | Where-Object { $_.File -eq $num }
  if ($part) { $sections.Add("# $($part.Title)`n") }

  $lines = [System.IO.File]::ReadAllLines($f.FullName)
  if ($lines[0] -notmatch '^# (.+)$') {
    Write-Output "SKIP (no H1): $($f.Name)"
    continue
  }
  $title = $matches[1]

  $body = $lines[1..($lines.Count - 1)] -join "`n"
  $body = $body.Replace($boilerplate, "").Replace($boilerplateNoTrail, "")

  $sub = 0
  $body = [regex]::Replace($body, '(?m)^## (.+)$', {
    param($m)
    $script:sub++
    "### $num.$script:sub $($m.Groups[1].Value)"
  })

  # cross-file links: [`NN-name.md`](NN-name.md) -> #N
  $body = [regex]::Replace($body, '\[`(\d{2})-[a-z0-9-]+\.md`\]\((\d{2})-[a-z0-9-]+\.md\)', {
    param($m) "#$([int]$m.Groups[1].Value)"
  })
  # bare mentions left over (no link syntax): NN-name.md -> #N
  $body = [regex]::Replace($body, '(\d{2})-[a-z0-9-]+\.md', {
    param($m) "#$([int]$m.Groups[1].Value)"
  })

  # ../resources/X -> X (the draft lives in resources/ itself; strip in both link text and href)
  $body = $body -replace '\.\./resources/', ''

  # drop trailing whitespace left behind where the boilerplate clause was stripped mid-line
  $body = [regex]::Replace($body, '(?m) +$', '')

  $sections.Add("## $num. $title`n$($body.Trim())`n")
}

$existing = @(Get-ChildItem -Path $resourcesDir, (Join-Path $resourcesDir "_archive") -Filter "build-gdd-v*_draft.md" -ErrorAction SilentlyContinue)
$maxV = 0
foreach ($e in $existing) {
  if ($e.Name -match 'build-gdd-v(\d+)_draft\.md') {
    $v = [int]$matches[1]
    if ($v -gt $maxV) { $maxV = $v }
  }
}
$nextV = $maxV + 1
$outPath = Join-Path $resourcesDir "build-gdd-v$nextV`_draft.md"

$header = "# Festival of Souls — Game Design Document`n"
$full = $header + "`n" + ($sections -join "`n")

[System.IO.File]::WriteAllText($outPath, $full, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Compiled -> $outPath"
