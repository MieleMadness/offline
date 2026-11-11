# Fetch exact upstream revisions of the three Offline design skills.
# Run from the repository root on Windows (PowerShell 5.1+).
# Review upstream source before executing any of its bundled scripts.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$destRoot = Join-Path $root ".agents\skills"
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
$specs = @(
    @{Name="emil-design-eng"; Repo="emilkowalski/skills"; Rev="715c1807e08c497cfd1dc4feb450a2a3300ef2a9"; Subdir="skills/emil-design-eng"},
    @{Name="ui-ux-pro-max"; Repo="nextlevelbuilder/ui-ux-pro-max-skill"; Rev="6ae86f61f520d6ca229d2f40e070410638c908c5"; Subdir=".claude/skills/ui-ux-pro-max"},
    @{Name="impeccable"; Repo="pbakaus/impeccable"; Rev="fead7938331bb92129e3c5ce14f600611067bd06"; Subdir=".agents/skills/impeccable"}
)
$tempBase = Join-Path ([System.IO.Path]::GetTempPath()) ("offline-design-skills-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempBase | Out-Null
try {
    foreach ($s in $specs) {
        $zip = Join-Path $tempBase ($s.Name + ".zip")
        $extract = Join-Path $tempBase $s.Name
        $uri = "https://codeload.github.com/$($s.Repo)/zip/$($s.Rev)"
        Write-Host "Fetching $($s.Name) at $($s.Rev)..."
        Invoke-WebRequest -Uri $uri -OutFile $zip -UseBasicParsing
        Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
        $top = Get-ChildItem -LiteralPath $extract -Directory | Select-Object -First 1
        if (-not $top) { throw "No upstream root folder for $($s.Name)" }
        $src = Join-Path $top.FullName ($s.Subdir.Replace("/", [IO.Path]::DirectorySeparatorChar))
        if (-not (Test-Path -LiteralPath (Join-Path $src "SKILL.md"))) { throw "Missing source SKILL.md for $($s.Name)" }
        $dst = Join-Path $destRoot $s.Name
        if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
        Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
        $lic = Join-Path $top.FullName "LICENSE"
        if (Test-Path -LiteralPath $lic) { Copy-Item -LiteralPath $lic -Destination (Join-Path $dst "LICENSE") -Force }
        if ($s.Name -eq "impeccable") {
            $notice = Join-Path $top.FullName "NOTICE.md"
            if (Test-Path -LiteralPath $notice) { Copy-Item -LiteralPath $notice -Destination (Join-Path $dst "NOTICE.md") -Force }
        }
        Write-Host "Installed $($s.Name) -> $dst"
    }
    Write-Host "All three pinned design skills installed. Review and commit resulting changes if desired."
}
finally {
    if (Test-Path -LiteralPath $tempBase) { Remove-Item -LiteralPath $tempBase -Recurse -Force }
}
