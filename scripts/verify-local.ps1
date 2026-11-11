param(
    [switch] $SkipRust,
    [switch] $BuildDesktop,
    [switch] $InstallDependencies
)
# Run from anywhere: powershell -ExecutionPolicy Bypass -File scripts/verify-local.ps1 -BuildDesktop
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
try {
    function Invoke-Checked {
        param([string] $Name, [scriptblock] $Command)
        Write-Host "==> $Name" -ForegroundColor Cyan
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
    }

    if ($InstallDependencies -or -not (Test-Path "node_modules")) {
        if (Test-Path "package-lock.json") {
            Invoke-Checked "Install dependencies from lockfile" { npm ci --no-audit --no-fund }
        } else {
            Invoke-Checked "Install frontend dependencies" { npm install --no-audit --no-fund }
        }
    }

    Invoke-Checked "TypeScript validation" { npm run check }
    Invoke-Checked "Frontend unit tests" { npm run test }
    Invoke-Checked "Frontend production bundle" { npm run build }
    if (-not $SkipRust) {
        if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
            throw "Rust cargo was not found. Install the Tauri Windows prerequisites, or run -SkipRust for frontend-only checks."
        }
        Invoke-Checked "Rust archive/parser tests" { cargo test --manifest-path src-tauri/Cargo.toml }
    }
    if ($BuildDesktop) {
        Invoke-Checked "Build local Windows executable (no installer)" { npx tauri build --no-bundle }
    }

    Write-Host "Local verification completed successfully." -ForegroundColor Green
}
finally {
    Pop-Location
}
