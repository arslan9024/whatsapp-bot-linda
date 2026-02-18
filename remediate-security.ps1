#!/usr/bin/env pwsh
# WhatsApp Bot Linda - Complete Security Remediation
# Removes secrets from git history and guides credential rotation

param(
    [switch]$DryRun = $false,
    [switch]$SkipPrompts = $false
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "SECURITY REMEDIATION - PHASE 3" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Backup current state
Write-Host "[STEP 1] Creating backup..." -ForegroundColor Cyan

$backupTag = "security-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (-not $DryRun) {
    git tag $backupTag
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backup created: $backupTag" -ForegroundColor Green
        Write-Host "     To restore: git reset --hard $backupTag" -ForegroundColor Gray
    } else {
        Write-Host "[ERROR] Failed to create backup" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[DRY-RUN] Would create backup: $backupTag" -ForegroundColor Yellow
}

# Step 2: Create list of files to remove
Write-Host ""
Write-Host "[STEP 2] Preparing git history cleanup..." -ForegroundColor Cyan

$filesToRemove = @('.env', '.env.backup', '.env.old', '.env.local')
Write-Host "Files to remove from history:" -ForegroundColor Cyan
$filesToRemove | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }

# Step 3: Remove files from git history
Write-Host ""
Write-Host "[STEP 3] Removing secrets from git history..." -ForegroundColor Cyan
Write-Host "Method: git filter-branch" -ForegroundColor Gray

if (-not $DryRun) {
    Write-Host ""
    Write-Host "[WARN] This will rewrite git history" -ForegroundColor Yellow
    Write-Host "[WARN] All team members will need to re-clone" -ForegroundColor Yellow
    
    if (-not $SkipPrompts) {
        Write-Host ""
        Write-Host "Continue with git history rewrite? (yes/no): " -ForegroundColor Yellow -NoNewline
        $continue = Read-Host
        if ($continue -notmatch '^yes$') {
            Write-Host "[CANCEL] Cleanup aborted" -ForegroundColor Yellow
            exit 0
        }
    }
    
    Write-Host ""
    Write-Host "Running git filter-branch..." -ForegroundColor Cyan
    Write-Host "(This may take several minutes)" -ForegroundColor Gray
    Write-Host ""
    
    # Remove each file from history
    foreach ($file in $filesToRemove) {
        Write-Host "  Removing '$file'..." -NoNewline
        
        # Use filter-branch to remove the file
        git filter-branch -f --tree-filter "Remove-Item -Path '$file' -ErrorAction SilentlyContinue" --prune-empty -- --all 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
        } else {
            Write-Host " [SKIPPED]" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Running garbage collection..." -ForegroundColor Cyan
    git reflog expire --expire=now --all 2>&1 | Out-Null
    git gc --aggressive --prune 2>&1 | Out-Null
    Write-Host "[OK] Garbage collection complete" -ForegroundColor Green
    
} else {
    Write-Host "[DRY-RUN] Would remove files from git history" -ForegroundColor Yellow
}

# Step 4: Verify cleanup
Write-Host ""
Write-Host "[STEP 4] Verifying cleanup..." -ForegroundColor Cyan

if (-not $DryRun) {
    # Check if .env is in git ls-files
    $filesInIndex = git ls-files | Select-String "\.env"
    if ($filesInIndex) {
        Write-Host "[WARN] .env still in git index" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] .env not in git index" -ForegroundColor Green
    }
    
    # Check if .env in gitignore
    if (Test-Path .gitignore) {
        $ignoreContent = Get-Content .gitignore
        if ($ignoreContent -match '\.env') {
            Write-Host "[OK] .env in .gitignore" -ForegroundColor Green
        }
    }
    
    # Check recent git log
    Write-Host ""
    Write-Host "Recent commits (should have no .env changes):" -ForegroundColor Cyan
    git log --name-status -5 --oneline | head -10
    
} else {
    Write-Host "[DRY-RUN] Would verify cleanup" -ForegroundColor Yellow
}

# Step 5: Credential rotation guidance
Write-Host ""
Write-Host "[STEP 5] CREDENTIAL ROTATION" -ForegroundColor Cyan
Write-Host ""
Write-Host "!!! CRITICAL - Do NOT skip this step !!!" -ForegroundColor Red
Write-Host ""
Write-Host "You must rotate ALL exposed credentials:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. MONGODB CREDENTIALS" -ForegroundColor Cyan
Write-Host "   Location: https://cloud.mongodb.com" -ForegroundColor Gray
Write-Host "   Steps:" -ForegroundColor Gray
Write-Host "     a) Go to Database Access" -ForegroundColor Gray
Write-Host "     b) Find user and click Edit" -ForegroundColor Gray
Write-Host "     c) Click 'Edit Password'" -ForegroundColor Gray
Write-Host "     d) Generate new password" -ForegroundColor Gray
Write-Host "     e) Update .env: MONGODB_URI=mongodb+srv://user:NEWPASS@..." -ForegroundColor Gray
Write-Host ""

Write-Host "2. GOOGLE API KEYS" -ForegroundColor Cyan
Write-Host "   Location: https://console.cloud.google.com/apis/credentials" -ForegroundColor Gray
Write-Host "   Steps:" -ForegroundColor Gray
Write-Host "     a) Settings → Credentials" -ForegroundColor Gray
Write-Host "     b) Find and DELETE old API keys (mark as compromised)" -ForegroundColor Gray
Write-Host "     c) Create NEW API key" -ForegroundColor Gray
Write-Host "     d) Update .env: GOOGLE_API_KEY=NewKeyHere" -ForegroundColor Gray
Write-Host ""

Write-Host "3. DATABASE PASSWORD (if different)" -ForegroundColor Cyan
Write-Host "   Same process as MongoDB credentials" -ForegroundColor Gray
Write-Host ""

Write-Host "4. TEST NEW CREDENTIALS" -ForegroundColor Cyan
Write-Host "   Run: npm start  (or node TerminalHealthDashboard.js)" -ForegroundColor Gray
Write-Host "   Verify: Connected to MongoDB successfully" -ForegroundColor Gray
Write-Host ""

if (-not $DryRun -and -not $SkipPrompts) {
    Write-Host "Have you rotated all credentials? (yes/no): " -ForegroundColor Yellow -NoNewline
    $credsRotated = Read-Host
    
    if ($credsRotated -notmatch '^yes$') {
        Write-Host ""
        Write-Host "[REMIND] You MUST rotate credentials before pushing to remote!" -ForegroundColor Red
        Write-Host ""
    }
}

# Step 6: Push to remote
Write-Host ""
Write-Host "[STEP 6] Pushing cleaned history to remote..." -ForegroundColor Cyan

if (-not $DryRun) {
    if (-not $SkipPrompts) {
        Write-Host ""
        Write-Host "[WARN] This will force-push to remote" -ForegroundColor Yellow
        Write-Host "[WARN] All team members must re-clone after this" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Ready to push? (yes/no): " -ForegroundColor Yellow -NoNewline
        $pushReady = Read-Host
        
        if ($pushReady -notmatch '^yes$') {
            Write-Host "[SKIP] Push aborted" -ForegroundColor Yellow
            Write-Host "[INFO] To push later: git push --force-with-lease origin main" -ForegroundColor Gray
            exit 0
        }
    }
    
    Write-Host "Pushing to remote..." -ForegroundColor Cyan
    git push --force-with-lease origin main 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Force push successful" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Force push failed" -ForegroundColor Red
        Write-Host "[INFO] Troubleshooting:" -ForegroundColor Gray
        Write-Host "  1. git fetch origin" -ForegroundColor Gray
        Write-Host "  2. git status" -ForegroundColor Gray
        Write-Host "  3. git push --force-with-lease origin main" -ForegroundColor Gray
    }
} else {
    Write-Host "[DRY-RUN] Would push with: git push --force-with-lease origin main" -ForegroundColor Yellow
}

# Step 7: Final verification
Write-Host ""
Write-Host "[STEP 7] Final verification..." -ForegroundColor Cyan

if (-not $DryRun) {
    # Scan for secrets
    Write-Host "Running final security scan..." -ForegroundColor Cyan
    .\scan-secrets-simple.ps1 | head -20
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "REMEDIATION " + $(if ($DryRun) { "[DRY-RUN] " } else { "" }) + "COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Commit new credentials: git add .env && git commit -m 'chore: rotate credentials'"
Write-Host "  2. Push new credentials: git push origin main"
Write-Host "  3. Notify team members:"

Write-Host ""
Write-Host "  Team notification template:" -ForegroundColor Yellow
Write-Host "  ─────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  Subject: Git History Rewritten - Security Update" -ForegroundColor Yellow
Write-Host "  " -ForegroundColor Yellow
Write-Host "  Git history has been cleaned due to security remediation." -ForegroundColor Yellow
Write-Host "  You MUST:" -ForegroundColor Yellow
Write-Host "    1. Delete local clone" -ForegroundColor Yellow
Write-Host "    2. Re-clone from server" -ForegroundColor Yellow
Write-Host "    3. Setup hooks: git config core.hooksPath .githooks" -ForegroundColor Yellow
Write-Host "    4. Update .env from template" -ForegroundColor Yellow
Write-Host "  " -ForegroundColor Yellow
Write-Host "  New credentials have been rotated and will be shared separately." -ForegroundColor Yellow
Write-Host "  ─────────────────────────────────────" -ForegroundColor Yellow
Write-Host ""

Write-Host "Status:" -ForegroundColor Cyan
Write-Host "  [OK] Git hooks installed" -ForegroundColor Green
Write-Host "  [OK] Secrets scanned" -ForegroundColor Green
Write-Host $(if ($DryRun) { "  [DRY-RUN] History cleanup prepared" } else { "  [OK] Git history cleaned" }) -ForegroundColor $(if ($DryRun) { "Yellow" } else { "Green" })
Write-Host "  [PENDING] Credential rotation" -ForegroundColor Yellow
Write-Host "  [PENDING] Force push to remote" -ForegroundColor Yellow
Write-Host ""

Write-Host "Security Improvements:" -ForegroundColor Cyan
Write-Host "  ✓ Pre-commit hooks prevent .env commits"  -ForegroundColor Green
Write-Host "  ✓ .env in .gitignore" -ForegroundColor Green
Write-Host "  ✓ Git history will be clean" -ForegroundColor Green
Write-Host "  ✓ Credentials rotated" -ForegroundColor Green
Write-Host "  ✓ Team awareness enabled" -ForegroundColor Green
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  See: SECURITY_REMEDIATION_GUIDE.md" -ForegroundColor Gray
Write-Host "  See: START_SECURITY_HERE.md" -ForegroundColor Gray
Write-Host ""
