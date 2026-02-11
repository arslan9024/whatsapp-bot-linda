@echo off
REM WhatsApp Bot Linda - Windows Batch Startup Script

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════
echo   WhatsApp Bot Linda - Enhanced Startup (Windows Batch)
echo ════════════════════════════════════════════════════════════
echo.

REM Kill any existing Node/Chrome processes
echo [CLEANUP] Terminating existing Node.js and Chrome processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Set environment variables for Puppeteer/Chrome
echo [CONFIG] Configuring Chrome/Puppeteer...

REM Check for Chrome installation paths
set "CHROME_FOUND=0"
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
    set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
    set "CHROME_FOUND=1"
    echo   ✓ Found Chrome at: C:\Program Files\Google\Chrome\Application\chrome.exe
)

if "%CHROME_FOUND%"=="0" (
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        set "PUPPETEER_EXECUTABLE_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        set "CHROME_FOUND=1"
        echo   ✓ Found Chrome at: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
    )
)

if "%CHROME_FOUND%"=="0" (
    echo   ⚠ Chrome not found in standard locations
    echo   The bot will attempt to use the system's Chrome installation
)

REM Set Puppeteer options
set "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
set "PUPPETEER_SKIP_DOWNLOAD=true"

echo.
echo [ENVIRONMENT] Variables Set:
echo   - PUPPETEER_SKIP_DOWNLOAD: true
echo   - PUPPETEER_EXECUTABLE_PATH: %PUPPETEER_EXECUTABLE_PATH%
echo.

REM Clear old sessions
echo [CLEANUP] Checking for old sessions...
if exist "sessions\" (
    rmdir /s /q "sessions" >nul 2>&1
    echo   ✓ Old sessions cleared
) else (
    echo   ℹ No old sessions found
)

echo.
echo ════════════════════════════════════════════════════════════
echo   Starting WhatsApp Bot Linda...
echo ════════════════════════════════════════════════════════════
echo.

REM Start the bot
npm start

pause
