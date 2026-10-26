#!/usr/bin/env pwsh
# Simple Git Hooks Installation Script
# Prevents committing .env files and detecting secrets

param(
    [switch]$Install = $true
)

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "[SECURITY] Installing Git Hooks" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

# Check if in git repo
if (-not (Test-Path .git)) {
    Write-Host "[ERROR] Not in a git repository" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Git repository found" -ForegroundColor Cyan

# Create hooks directory
if (-not (Test-Path .githooks)) {
    mkdir -Force .githooks | Out-Null
    Write-Host "[OK] Created .githooks directory" -ForegroundColor Green
} else {
    Write-Host "[INFO] .githooks directory already exists" -ForegroundColor Cyan
}

# Create pre-commit hook
Write-Host ""
Write-Host "[PRE-COMMIT] Creating pre-commit hook..." -ForegroundColor Cyan

$hookContent = @'
#!/usr/bin/env pwsh
# Pre-commit hook to prevent committing secrets

# Check if .env is being committed
$stagedFiles = & { git diff --cached --name-only 2>&1 }

if ($stagedFiles -match '\.env') {
    Write-Host "[ERROR] Cannot commit .env file (contains secrets)" -ForegroundColor Red
    Write-Host "  Add to .gitignore: .env" -ForegroundColor Yellow
    exit 1
}

# Check for secret patterns
$secretPatterns = @(
    'MONGODB_URI',
    'DB_PASSWORD',
    'GOOGLE_API_KEY',
    'password\s*[:=]',
    'secret\s*[:=]'
)

$stagedChanges = & { git diff --cached 2>&1 }
$foundSecret = $false

foreach ($pattern in $secretPatterns) {
    if ($stagedChanges -match $pattern) {
        Write-Host "[WARN] Potential secret detected: $pattern" -ForegroundColor Yellow
        $foundSecret = $true
        break
    }
}

if ($foundSecret) {
    Write-Host "[WARN] Continue with commit? (y/n): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -notmatch '^[yY]$') {
        exit 1
    }
}

Write-Host "[OK] Pre-commit checks passed" -ForegroundColor Green
exit 0
'@

$hookPath = ".githooks/pre-commit"
Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8 -Force
Write-Host "[OK] Created hook at: $hookPath" -ForegroundColor Green

# Configure git to use hooks
Write-Host ""
Write-Host "[CONFIG] Configuring git..." -ForegroundColor Cyan
git config core.hooksPath .githooks

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Git configured to use .githooks" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure git" -ForegroundColor Red
    exit 1
}

# Verify .gitignore
Write-Host ""
Write-Host "[VERIFY] Checking .gitignore..." -ForegroundColor Cyan

if (Test-Path .gitignore) {
    $ignoreContent = Get-Content .gitignore
    if ($ignoreContent -match '\.env') {
        Write-Host "[OK] .env is in .gitignore" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Adding .env to .gitignore..." -ForegroundColor Yellow
        Add-Content -Path .gitignore ".env`n.env.local`n.env.backup"
        Write-Host "[OK] Updated .gitignore" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] No .gitignore found, creating one..." -ForegroundColor Yellow
    ".env" | Set-Content .gitignore
    Write-Host "[OK] Created .gitignore" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "[SUCCESS] Git hooks installed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. .env cannot now be committed"
Write-Host "  2. Share hooks with team: git add .githooks/"
Write-Host "  3. Team members run: git config core.hooksPath .githooks"
Write-Host ""

Write-Host "Status:" -ForegroundColor Cyan
$hooksPath = git config core.hooksPath
Write-Host "  Hooks path: $hooksPath"
Write-Host "  .gitignore: Updated" 
Write-Host "  Ready: YES"
Write-Host ""
