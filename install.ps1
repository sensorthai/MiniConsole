param(
    [switch]$Start,
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$NodeMinMajor = 18
$NodeFallbackVersion = "v22.11.0"
$LocalNodeDir = Join-Path $env:LOCALAPPDATA "MiniConsole\node-$NodeFallbackVersion"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

if (Test-Path $LocalNodeDir) {
    $env:PATH = "$LocalNodeDir;$env:PATH"
}

function Test-NodeVersion {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { return $false }
    try {
        $ver = (& node -v).Trim().TrimStart('v')
        $major = [int]($ver.Split('.')[0])
        return ($major -ge $NodeMinMajor)
    } catch {
        return $false
    }
}

function Install-NodeWindows {
    Write-Warn "Node.js >= v$NodeMinMajor not found. Auto-installing Node.js $NodeFallbackVersion..."

    # 1. Try winget if available
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        try {
            Write-Info "Installing OpenJS.NodeJS.LTS via winget..."
            winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
            $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            if (Test-NodeVersion) { return }
        } catch {
            Write-Warn "winget install did not complete; falling back to portable Node.js ZIP..."
        }
    }

    # 2. Portable official Node.js ZIP (no admin required)
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
    $pkgName = "node-$NodeFallbackVersion-win-$arch"
    $url = "https://nodejs.org/dist/$NodeFallbackVersion/$pkgName.zip"
    $tmpZip = Join-Path $env:TEMP "$pkgName.zip"
    $extractRoot = Join-Path $env:LOCALAPPDATA "MiniConsole"

    Write-Info "Downloading $url ..."
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing

    if (Test-Path $LocalNodeDir) { Remove-Item -Recurse -Force $LocalNodeDir }
    Expand-Archive -Path $tmpZip -DestinationPath $extractRoot -Force
    Rename-Item -Path (Join-Path $extractRoot $pkgName) -NewName "node-$NodeFallbackVersion"
    Remove-Item -Force $tmpZip

    $env:PATH = "$LocalNodeDir;$env:PATH"
    if (-not (Test-NodeVersion)) {
        throw "Failed to install Node.js >= v$NodeMinMajor."
    }
    Write-Ok "Installed portable Node.js $(& node -v) to $LocalNodeDir"
}

# --- Step 1: Check Node.js & npm ---
if ((Test-NodeVersion) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Ok "Node.js $(& node -v) and npm $(& npm -v) detected."
} else {
    Install-NodeWindows
    Write-Ok "Node.js $(& node -v) and npm $(& npm -v) ready."
}

# --- Step 2: Install npm dependencies ---
if (Test-Path "package-lock.json") {
    Write-Info "Installing npm dependencies (npm ci)..."
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        & npm install --no-audit --no-fund
    }
} else {
    Write-Info "Installing npm dependencies (npm install)..."
    & npm install --no-audit --no-fund
}
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
Write-Ok "Dependencies installed."

# --- Step 3: Build Next.js production bundle ---
Write-Info "Building Next.js production server (npm run build)..."
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Next.js build failed." }
Write-Ok "Production build complete (.next ready)."

# --- Step 4: Check port availability ---
$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warn "Port $Port is currently in use. Set PORT=8081 before running start.bat if needed."
} else {
    Write-Ok "Port $Port is available."
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Mini Game Console 3D Server Setup Complete!" -ForegroundColor Green
Write-Host "  Start server : start.bat" -ForegroundColor White
Write-Host "  Default port : $Port" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

if ($Start) {
    $env:NODE_ENV = "production"
    $env:PORT = "$Port"
    & node server.js
}
