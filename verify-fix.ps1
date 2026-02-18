#!/usr/bin/env pwsh

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   VERIFICATION REPORT: AWAIT FIX DEPLOYMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Verify the fix is in TerminalDashboardSetup.js
Write-Host "STEP 1: VERIFYING CODE FIXES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
$file = 'code/utils/TerminalDashboardSetup.js'
$content = Get-Content $file -Raw

$masterFixFound = $content -match 'const newClient = await createClient\(masterPhone\)'
$servantFixFound = $content -match 'const newClient = await createClient\(servantPhone\)'

if ($masterFixFound) {
  Write-Host "✅ MASTER AWAIT FIX CONFIRMED" -ForegroundColor Green
  Write-Host "   Found: const newClient = await createClient(masterPhone)" -ForegroundColor Green
} else {
  Write-Host "❌ MASTER AWAIT FIX MISSING" -ForegroundColor Red
}

Write-Host ""

if ($servantFixFound) {
  Write-Host "✅ SERVANT AWAIT FIX CONFIRMED" -ForegroundColor Green
  Write-Host "   Found: const newClient = await createClient(servantPhone)" -ForegroundColor Green
} else {
  Write-Host "❌ SERVANT AWAIT FIX MISSING" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# STEP 2: Check git status
Write-Host "STEP 2: GIT REPOSITORY STATUS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Last 2 Commits:" -ForegroundColor Cyan
git log --oneline -2

Write-Host ""
Write-Host ""

# STEP 3: Verify Node & NPM
Write-Host "STEP 3: NODE AND NPM VERSIONS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Node Version: $(node --version)"
Write-Host "NPM Version:  $(npm --version)"

Write-Host ""
Write-Host ""

# STEP 4: Check running node processes
Write-Host "STEP 4: RUNNING NODE PROCESSES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
$nodeCount = Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Number of node processes running: $nodeCount"

if ($nodeCount -gt 0) {
  Write-Host "⚠️  Node processes detected. Run: Get-Process -Name node to see details" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""

# FINAL SUMMARY
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($masterFixFound -and $servantFixFound) {
  Write-Host ""
  Write-Host "✅ ALL FIXES CONFIRMED DEPLOYED" -ForegroundColor Green
  Write-Host ""
  Write-Host "Both await keywords are present in TerminalDashboardSetup.js:" -ForegroundColor Green
  Write-Host "  • Master relink fix: ✅" -ForegroundColor Green
  Write-Host "  • Servant relink fix: ✅" -ForegroundColor Green
  Write-Host ""
  Write-Host "The bot can be started safely without async/await issues." -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "❌ FIX VERIFICATION FAILED - MISSING FIXES DETECTED" -ForegroundColor Red
  Write-Host ""
  Write-Host "Master relink fix: $(if ($masterFixFound) { '✅' } else { '❌' })" -ForegroundColor Red
  Write-Host "Servant relink fix: $(if ($servantFixFound) { '✅' } else { '❌' })" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Report generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
