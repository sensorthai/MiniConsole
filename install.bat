@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo [ERR] Installation failed with code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)
echo.
pause
