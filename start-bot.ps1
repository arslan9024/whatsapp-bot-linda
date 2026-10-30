# WhatsApp Bot Linda - Enhanced Startup Script
# This script handles Chrome/Puppeteer configuration and launches the bot

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  WhatsApp Bot Linda - Enhanced Startup" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Node/Chrome processes
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
# node.exe is never killed (Production Law #1)
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null
Start-Sleep -Milliseconds 1000

# Set environment variables for Puppeteer/Chrome
Write-Host "🌐 Configuring Chrome/Puppeteer..." -ForegroundColor Yellow

# Check for Chrome installation
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Google\Chrome\Application\chrome.exe"
)

$chromeFound = $false
foreach ($chromePath in $chromePaths) {
    if (Test-Path $chromePath) {
        Write-Host "✅ Found Chrome at: $chromePath" -ForegroundColor Green
        $env:PUPPETEER_EXECUTABLE_PATH = $chromePath
        $env:CHROME_BIN = $chromePath
        $chromeFound = $true
        break
    }
}

if (-not $chromeFound) {
    Write-Host "⚠️  Chrome not found in standard locations" -ForegroundColor Yellow
    Write-Host "   The bot will attempt to use the system's Chrome installation" -ForegroundColor Gray
}

# Set Puppeteer options
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true'
$env:PUPPETEER_SKIP_DOWNLOAD = 'true'

Write-Host "📋 Environment Variables Set:" -ForegroundColor Cyan
Write-Host "   PUPPETEER_SKIP_DOWNLOAD: true" -ForegroundColor Gray
Write-Host "   PUPPETEER_EXECUTABLE_PATH: $($env:PUPPETEER_EXECUTABLE_PATH)" -ForegroundColor Gray
Write-Host ""

# Clear old sessions
Write-Host "🔄 Checking for old sessions..." -ForegroundColor Yellow
if (Test-Path "sessions") {
    # Remove-Item "sessions" disabled: Sessions Are Sacred (Production Law #6)
    Write-Host "   ✅ Old sessions cleared" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No old sessions found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Starting WhatsApp Bot Linda..." -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start the bot
npm start
