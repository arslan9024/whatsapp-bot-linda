@echo off
REM Verification Report - Await Fix Deployment
echo.
echo ===============================================================
echo   VERIFICATION REPORT: AWAIT FIX DEPLOYMENT
echo ===============================================================
echo.

echo STEP 1: CHECKING FOR CODE FIXES IN TerminalDashboardSetup.js
echo ---------------------------------------------------------------
findstr /C:"const newClient = await createClient(masterPhone)" code\utils\TerminalDashboardSetup.js >nul
if %errorlevel% equ 0 (
    echo [OK] Master await fix confirmed
) else (
    echo [MISSING] Master await fix not found
)

findstr /C:"const newClient = await createClient(servantPhone)" code\utils\TerminalDashboardSetup.js >nul
if %errorlevel% equ 0 (
    echo [OK] Servant await fix confirmed
) else (
    echo [MISSING] Servant await fix not found
)

echo.
echo STEP 2: GIT LOG - LAST 2 COMMITS
echo ---------------------------------------------------------------
git log --oneline -2

echo.
echo STEP 3: NODE AND NPM VERSIONS
echo ---------------------------------------------------------------
echo Node version:
node --version
echo NPM version:
npm --version

echo.
echo STEP 4: RUNNING NODE PROCESSES
echo ---------------------------------------------------------------
tasklist | find /c "node.exe"

echo.
echo ===============================================================
echo   VERIFICATION COMPLETE
echo ===============================================================
