@echo off
setlocal
cd /d "%~dp0"

set "LOCAL_NODE=%LOCALAPPDATA%\MiniConsole\node-v22.11.0"
if exist "%LOCAL_NODE%\node.exe" (
    set "PATH=%LOCAL_NODE%;%PATH%"
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERR] Node.js not found. Please run install.bat first.
    pause
    exit /b 1
)

if "%NODE_ENV%"=="" set "NODE_ENV=production"
if "%PORT%"=="" set "PORT=8080"

if not exist ".next" (
    echo [INFO] .next build folder not found. Running npm run build...
    call npm run build
)

node server.js
pause
