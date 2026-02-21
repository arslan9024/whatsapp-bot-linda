# Complete Test Sequence Script
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        COMPLETE RELINK TEST EXECUTION SEQUENCE               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all processes
Write-Host "STEP 1: Killing all node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "✅ Node processes killed" -ForegroundColor Green
Write-Host ""

# Step 2: Show current status
Write-Host "STEP 2: Checking current environment..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "Current Directory: $currentDir"
& node --version
& npm --version
Write-Host "✅ Environment verified" -ForegroundColor Green
Write-Host ""

# Step 3: Start bot
Write-Host "STEP 3: Starting bot in background..." -ForegroundColor Yellow
Set-Location c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda
$botProcess = Start-Job -ScriptBlock { cd c:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda; npm run dev } -RedirectStandardError bot-error.log -RedirectStandardOutput bot-output.log
Write-Host "Bot started with Job ID: $($botProcess.Id)" -ForegroundColor Green
Start-Sleep -Seconds 10
Write-Host "✅ Bot started and waited for initialization" -ForegroundColor Green
Write-Host ""

# Step 4: Run test script
Write-Host "STEP 4: Running test script..." -ForegroundColor Yellow
$testOutput = & node test-relink-now.js 2>&1
Write-Host $testOutput
Write-Host "✅ Test completed" -ForegroundColor Green
Write-Host ""

# Step 5: Show process info
Write-Host "STEP 5: Showing running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, CPU, StartTime | Format-Table -AutoSize
Write-Host ""

# Step 6: Show bot output if available
Write-Host "STEP 6: Bot Output Status..." -ForegroundColor Yellow
if (Test-Path bot-output.log) {
    $lines = @(Get-Content bot-output.log)
    Write-Host "Bot output log size: $(Get-Item bot-output.log).Length bytes" -ForegroundColor Green
    if ($lines.Count -gt 0) {
        Write-Host "First 30 lines of bot output:" -ForegroundColor Cyan
        $lines[0..29] | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "Bot output log exists but is empty (still initializing)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Bot output log not created yet" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  TEST EXECUTION COMPLETE                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
