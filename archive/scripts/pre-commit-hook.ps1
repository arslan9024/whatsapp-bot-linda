# ====================================================================
# GIT PRE-COMMIT HOOK - Phase 22 Security Hardening (Windows PowerShell)
# ====================================================================
# Prevents accidental commits of credentials, secrets, and sensitive files
#
# Installation:
#   1. Copy this file to: .git/hooks/pre-commit (no extension)
#   2. Replace content with this PowerShell script (without .ps1)
#   3. Or use: git config core.hooksPath "hooks"
#
# This hook:
# 1. Prevents committing *.json files in credential directories
# 2. Prevents committing .env files
# 3. Scans for common secret patterns (API keys, passwords, etc.)
# 4. Blocks commits if sensitive files are detected
# ====================================================================

param([switch]$Bypass)

# Get list of staged files
$stagedFiles = git diff --cached --name-only --diff-filter=ACM

# Track if we should block the commit
$blockCommit = $false

Write-Host "`n🔐 Running Pre-Commit Security Checks (Phase 22)`n"

# Check 1: Prevent .env files
Write-Host -NoNewline "  ✓ Checking for .env files... "
if ($stagedFiles | Where-Object { $_ -match '\.env' }) {
    Write-Host "BLOCKED" -ForegroundColor Red
    Write-Host "    ❌ .env files cannot be committed (contains secrets)" -ForegroundColor Red
    $blockCommit = $true
} else {
    Write-Host "OK" -ForegroundColor Green
}

# Check 2: Prevent keys.json in credential directories
Write-Host -NoNewline "  ✓ Checking for credential JSON files... "
$credentialFiles = $stagedFiles | Where-Object {
    $_ -match '(code/GoogleAPI.*\.json|code/Integration/Google.*\.json|.*credentials.*\.json|.*keys.*\.json)'
}

if ($credentialFiles) {
    Write-Host "BLOCKED" -ForegroundColor Red
    Write-Host "    ❌ Credential files cannot be committed:" -ForegroundColor Red
    $credentialFiles | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
    $blockCommit = $true
} else {
    Write-Host "OK" -ForegroundColor Green
}

# Check 3: Scan for common secrets patterns
Write-Host -NoNewline "  ✓ Scanning for secret patterns... "
$secretsFound = $false

foreach ($file in $stagedFiles) {
    try {
        $content = git show ":$file" 2>$null
        if ($content -match '(password|secret|api.?key|private.?key|bearer|authorization|credentials|oauth|token|jwt|aws_secret|db_password)') {
            if (!$secretsFound) {
                Write-Host "BLOCKED" -ForegroundColor Red
            }
            $secretsFound = $true
            Write-Host "    ⚠️  Potential secret in: $file" -ForegroundColor Yellow
            $blockCommit = $true
            break
        }
    } catch {
        # File might not exist yet
    }
}

if (!$secretsFound) {
    Write-Host "OK" -ForegroundColor Green
}

# Check 4: Verify .gitignore has proper credential patterns
Write-Host -NoNewline "  ✓ Verifying .gitignore configuration... "
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "code/GoogleAPI.*\.json" -and $gitignore -match "\.env") {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "WARNING" -ForegroundColor Yellow
        Write-Host "    ⚠️  .gitignore may be missing credential patterns" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "    ⚠️  .gitignore not found" -ForegroundColor Yellow
}

# Final verdict
Write-Host ""
if ($blockCommit -and !$Bypass) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ COMMIT BLOCKED - Credentials detected              ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Phase 22: All credentials must be stored in .env as BASE64" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To fix this commit:" -ForegroundColor Yellow
    Write-Host "  1. Remove sensitive files from staging:" -ForegroundColor Gray
    Write-Host "     git reset HEAD <file>" -ForegroundColor Gray
    Write-Host "  2. Add .env and credential files to .gitignore" -ForegroundColor Gray
    Write-Host "  3. Verify credentials are in .env as GOOGLE_ACCOUNT_*_KEYS_BASE64" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To bypass this check (NOT RECOMMENDED):" -ForegroundColor Gray
    Write-Host "  git commit --no-verify" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ All security checks passed - Safe to commit" -ForegroundColor Green
Write-Host ""
exit 0
