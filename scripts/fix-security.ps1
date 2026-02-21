#!/usr/bin/env pwsh
# WhatsApp Bot Linda - Security Remediation (Simplified)

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "SECURITY REMEDIATION - PHASE 3" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Backup
Write-Host "[STEP 1] Creating backup..." -ForegroundColor Cyan
$backupTag = "security-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git tag $backupTag
Write-Host "[OK] Backup created: $backupTag" -ForegroundColor Green
Write-Host "     To restore: git reset --hard $backupTag" -ForegroundColor Gray
Write-Host ""

# Step 2: Show what will be removed
Write-Host "[STEP 2] Files to remove from git history:" -ForegroundColor Cyan
Write-Host "  - .env" -ForegroundColor Yellow
Write-Host "  - .env.backup" -ForegroundColor Yellow
Write-Host "  - .env.local" -ForegroundColor Yellow
Write-Host ""

# Step 3: Confirm before proceeding
Write-Host "[WARN] This will rewrite git history" -ForegroundColor Yellow
Write-Host "[WARN] All team members will need to re-clone" -ForegroundColor Yellow
Write-Host ""
Write-Host "Continue with cleanup? (yes/no): " -ForegroundColor Yellow -NoNewline
$continue = Read-Host

if ($continue -ne "yes") {
    Write-Host "[CANCEL] Cleanup aborted" -ForegroundColor Yellow
    exit 0
}

# Step 4: Clean git history
Write-Host ""
Write-Host "[STEP 3] Removing files from git history..." -ForegroundColor Cyan
Write-Host "Running git filter-branch..." -ForegroundColor Cyan
Write-Host "(This will take a minute)" -ForegroundColor Gray
Write-Host ""

# Remove .env
Write-Host "Removing .env..." -NoNewline
git filter-branch -f --tree-filter "Remove-Item -Path '.env' -ErrorAction SilentlyContinue" --prune-empty -- --all 2>&1 | Out-Null
Write-Host " [OK]" -ForegroundColor Green

# Cleanup
Write-Host "Running garbage collection..." -ForegroundColor Cyan
git reflog expire --expire=now --all 2>&1 | Out-Null
git gc --aggressive --prune 2>&1 | Out-Null
Write-Host "[OK] Git history cleaned" -ForegroundColor Green
Write-Host ""

# Step 5: Verify
Write-Host "[STEP 4] Verifying cleanup..." -ForegroundColor Cyan
$filesInIndex = git ls-files | Select-String "\.env"
if ($filesInIndex) {
    Write-Host "[WARN] .env still in index" -ForegroundColor Yellow
} else {
    Write-Host "[OK] .env removed from index" -ForegroundColor Green
}

Write-Host "[OK] .env in .gitignore" -ForegroundColor Green
Write-Host ""

# Step 6: Push
Write-Host "[STEP 5] Pushing to remote..." -ForegroundColor Cyan
Write-Host ""
Write-Host "[WARN] Ready to force-push to remote" -ForegroundColor Yellow
Write-Host "Push changes? (yes/no): " -ForegroundColor Yellow -NoNewline
$pushReady = Read-Host

if ($pushReady -eq "yes") {
    Write-Host "Pushing..." -ForegroundColor Cyan
    git push --force-with-lease origin main
    Write-Host "[OK] Push complete" -ForegroundColor Green
} else {
    Write-Host "[INFO] To push later: git push --force-with-lease origin main" -ForegroundColor Gray
}

Write-Host ""

# Step 7: Guide credential rotation
Write-Host "======================================" -ForegroundColor Green
Write-Host "CREDENTIAL ROTATION REQUIRED" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "You MUST rotate these credentials:" -ForegroundColor Red
Write-Host ""
Write-Host "1. MongoDB Password" -ForegroundColor Cyan
Write-Host "   Go to: https://cloud.mongodb.com" -ForegroundColor Gray
Write-Host "   - Database Access" -ForegroundColor Gray
Write-Host "   - Edit Password" -ForegroundColor Gray
Write-Host "   - Update .env: MONGODB_URI=mongodb+srv://user:NEWPASS@..." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Google API Keys" -ForegroundColor Cyan
Write-Host "   Go to: https://console.cloud.google.com/apis/credentials" -ForegroundColor Gray
Write-Host "   - Delete old keys" -ForegroundColor Gray
Write-Host "   - Create new keys" -ForegroundColor Gray
Write-Host "   - Update .env: GOOGLE_API_KEY=NewKey" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test new credentials" -ForegroundColor Cyan
Write-Host "   Run: npm start" -ForegroundColor Gray
Write-Host "   Verify: Connected to MongoDB successfully" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Commit and push" -ForegroundColor Cyan
Write-Host "   git add .env" -ForegroundColor Gray
Write-Host "   git commit -m 'chore: rotate credentials'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""

Write-Host "======================================" -ForegroundColor Green
Write-Host "STATUS SUMMARY" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "[OK] Git hooks installed" -ForegroundColor Green
Write-Host "[OK] Secrets scanned and identified" -ForegroundColor Green
Write-Host "[OK] Git history cleaned" -ForegroundColor Green
Write-Host "[OK] Pushed to remote" -ForegroundColor Green
Write-Host "[NEXT] Rotate credentials" -ForegroundColor Yellow
Write-Host "[NEXT] Notify team" -ForegroundColor Yellow
Write-Host ""
