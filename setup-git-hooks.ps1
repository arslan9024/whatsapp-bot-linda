#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Git Hooks Setup - Installs pre-commit hooks to prevent secret commits
.DESCRIPTION
    Configures git hooks to prevent:
    - Committing .env files
    - Committing files with passwords/secrets
    - Committing large files that might contain secrets
#>

param(
    [switch]$Install = $false,
    [switch]$Remove = $false,
    [switch]$Test = $false
)

$Colors = @{
    Success = 'Green'
    Warning = 'Yellow'
    Error   = 'Red'
    Info    = 'Cyan'
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n" + ("=" * 70) -ForegroundColor Magenta
    Write-Host $Message -ForegroundColor Magenta
    Write-Host ("=" * 70) + "`n" -ForegroundColor Magenta
}

function Write-InfoMsg {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors['Info']
}

function Write-SuccessMsg {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor $Colors['Success']
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Colors['Warning']
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors['Error']
}

function Test-GitRepository {
    if (-not (Test-Path .git)) {
        Write-ErrorMsg "Not in a git repository"
        exit 1
    }
    Write-SuccessMsg "Git repository found"
}

function Create-HooksDirectory {
    if (-not (Test-Path .githooks)) {
        mkdir -Force .githooks | Out-Null
        Write-SuccessMsg "Created .githooks directory"
    } else {
        Write-InfoMsg ".githooks directory already exists"
    }
}

function Install-PreCommitHook {
    Write-Header "[PRE-COMMIT] Installing Pre-Commit Hook"
    
    Create-HooksDirectory
    
    $hookContent = @'
#!/usr/bin/env pwsh
# Pre-commit hook to prevent committing secrets and sensitive files

# Hook function to run security checks
function Check-SecretsInCommit {
    param([string]$GitDir)
    
    # Files that should NEVER be committed
    $forbiddenFiles = @('.env', '.env.local', '.env.backup', '.env.old', 'secrets.json', 'credentials.json')
    
    # Secret patterns to check for
    $secretPatterns = @(
        'password\s*[:=].*[^=]\$',
        'secret\s*[:=].*[^=]\$',
        'api_?key\s*[:=].*[^=]\$',
        'apiSecret\s*[:=]',
        'accessToken\s*[:=]',
        'MONGODB_URI\s*[:=]',
        'DB_PASSWORD\s*[:=]',
        'GOOGLE_API_KEY\s*[:=]',
        'private_key|privateKey'
    )
    
    $stagedFiles = & { git diff --cached --name-only 2>&1 }
    $stagedChanges = & { git diff --cached 2>&1 }
    
    # Check for forbidden files
    foreach ($file in $forbiddenFiles) {
        if ($stagedFiles | Select-String -Pattern "^$([regex]::Escape($file))$" -Quiet) {
            Write-Host "❌ ERROR: '$file' cannot be committed (contains secrets)" -ForegroundColor Red
            Write-Host "Add to .gitignore: echo '$file' >> .gitignore" -ForegroundColor Yellow
            return $false
        }
    }
    
    # Check for secret patterns in staged changes
    foreach ($pattern in $secretPatterns) {
        if ($stagedChanges | Select-String -Pattern $pattern -Quiet) {
            Write-Host "⚠️  WARNING: Potential secrets detected in staged files:" -ForegroundColor Yellow
            $stagedChanges | Select-String -Pattern $pattern | ForEach-Object {
                Write-Host "   $_" -ForegroundColor Cyan
            }
            Write-Host ""
            Write-Host "Continue anyway? (y/n): " -NoNewline -ForegroundColor Yellow
            
            $response = Read-Host
            if ($response -notmatch '^[yY]$') {
                return $false
            }
        }
    }
    
    # Check for large files
    $largeFiles = git diff --cached --diff-filter=A --name-only | ForEach-Object {
        $size = (git cat-file -s ":$_" 2>/dev/null) / 1MB
        if ($size -gt 10) {
            $_
        }
    }
    
    if ($largeFiles) {
        Write-Host "⚠️  WARNING: Large files detected (>10MB, might contain secrets):" -ForegroundColor Yellow
        $largeFiles | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Cyan
        }
        Write-Host ""
        Write-Host "Continue anyway? (y/n): " -NoNewline -ForegroundColor Yellow
        
        $response = Read-Host
        if ($response -notmatch '^[yY]$') {
            return $false
        }
    }
    
    return $true
}

# Run checks
if (Check-SecretsInCommit) {
    Write-Host "✅ Pre-commit checks passed" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Pre-commit checks failed" -ForegroundColor Red
    exit 1
}
'@
    
    # Write hook file
    $hookPath = ".githooks\pre-commit"
    
    if (Test-Path $hookPath) {
        Write-WarningMsg "Pre-commit hook already exists. Backing up..."
        Copy-Item -Path $hookPath -Destination "$hookPath.bak" -Force
    }
    
    Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8 -Force
    Write-SuccessMsg "Created pre-commit hook at: $hookPath"
    
    # Configure git to use the hooks directory
    Write-InfoMsg "Configuring git to use .githooks..."
    git config core.hooksPath .githooks
    
    if ($LASTEXITCODE -eq 0) {
        Write-SuccessMsg "Git hooks path configured"
    } else {
        Write-ErrorMsg "Failed to configure git hooks path"
        return $false
    }
    
    return $true
}

function Install-CommitMsgHook {
    Write-Header "[MSG] Installing Commit Message Hook (Optional)"
    
    $hookContent = @'
#!/usr/bin/env pwsh
# Commit message hook to validate commit messages

$commitMsgFile = $args[0]
$commitType = $args[1]

# Only check for commit (not amend, merge, etc.)
if ($commitType -ne "message") { exit 0 }

$message = Get-Content $commitMsgFile -Raw

# Check message is not empty
if ($message -match '^\s*$') {
    Write-Host "ERROR: Commit message cannot be empty" -ForegroundColor Red
    exit 1
}

# Suggest security-related commit types
if ($message -match 'secret|password|credential|api.?key|token') {
    Write-Host "TIP: Consider using a security-related commit type:" -ForegroundColor Cyan
    Write-Host "  chore(security): rotate credentials" -ForegroundColor Gray
    Write-Host "  fix(security): remove exposed secrets" -ForegroundColor Gray
}

exit 0
'@
    
    $hookPath = ".githooks\commit-msg"
    
    if (Test-Path $hookPath) {
        Write-WarningMsg "Commit-msg hook already exists. Skipping..."
        return
    }
    
    Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8
    Write-SuccessMsg "Created commit-msg hook at: $hookPath"
}

function Test-Hooks {
    Write-Header "🧪 Testing Git Hooks"
    
    # Test 1: Try to stage .env (should fail)
    Write-InfoMsg "Test 1: Attempting to stage .env..."
    
    if (Test-Path .env) {
        Write-WarningMsg ".env exists. Testing if it can be committed..."
        
        git add .env
        git diff --cached --name-only | Select-String "\.env" -Quiet
        
        if ($LASTEXITCODE -eq 0) {
            Write-WarningMsg ".env was staged. Testing hook..."
            
            git commit -m "test: attempting to commit .env" 2>&1 | Tee-Object -Variable output | Out-Null
            
            if ($output -match "ERROR.*cannot be committed") {
                Write-SuccessMsg "Hook correctly prevented .env commit"
            } else {
                Write-WarningMsg "Hook may not have prevented .env commit"
            }
        } else {
            Write-InfoMsg ".env was ignored as expected"
        }
        
        # Reset staging area
        git reset -q .env
    }
    
    # Test 2: Create a test commit with a secret pattern
    Write-InfoMsg "Test 2: Testing secret pattern detection..."
    
    # Create test file
    $testFile = "test-secret.txt"
    "password = SomeSecretValue123" | Set-Content $testFile
    
    git add $testFile
    git commit -m "test: secret pattern test" 2>&1 | Tee-Object -Variable output | Out-Null
    
    if ($output -match "WARNING.*potential secrets|password") {
        Write-SuccessMsg "Hook correctly detected secret pattern"
    } else {
        Write-WarningMsg "Hook may not have detected secret pattern"
    }
    
    # Reset
    git reset -q HEAD~1 2>/dev/null
    git reset -q $testFile 2>/dev/null
    Remove-Item $testFile -Force 2>/dev/null
    
    Write-SuccessMsg "Hook testing complete"
}

function Show-Status {
    Write-Header "📊 Git Hooks Status"
    
    Write-Host "Current Configuration:" -ForegroundColor Cyan
    
    # Check hooks path
    $hooksPath = git config core.hooksPath
    if ($hooksPath) {
        Write-SuccessMsg "Hooks path: $hooksPath"
    } else {
        Write-WarningMsg "No custom hooks path configured"
    }
    
    # Check hook files
    Write-Host "`nInstalled Hooks:" -ForegroundColor Cyan
    
    if (Test-Path .githooks) {
        Get-ChildItem .githooks -File | ForEach-Object {
            if (Test-Path $_.FullName) {
                Write-SuccessMsg "  ✓ $($_.Name)"
            }
        }
    } else {
        Write-WarningMsg "  .githooks directory not found"
    }
    
    # Check .gitignore
    Write-Host "`n.gitignore Status:" -ForegroundColor Cyan
    
    if (Test-Path .gitignore) {
        if ((Get-Content .gitignore) -match "\.env") {
            Write-SuccessMsg "  ✓ .env is in .gitignore"
        } else {
            Write-WarningMsg "  .env is NOT in .gitignore"
        }
    } else {
        Write-ErrorMsg "  .gitignore not found"
    }
}

function Remove-Hooks {
    Write-WarningMsg "Removing git hooks..."
    
    # Remove hooks directory
    if (Test-Path .githooks) {
        Remove-Item -Path .githooks -Recurse -Force
        Write-SuccessMsg "Removed .githooks directory"
    }
    
    # Reset git hooks path
    git config --unset core.hooksPath
    Write-SuccessMsg "Removed custom hooks path"
}

# Main
function Main {
    Write-Header "[SECURITY] Git Hooks Setup - WhatsApp Bot Linda"
    
    Test-GitRepository
    
    if ($Remove) {
        Remove-Hooks
        exit 0
    }
    
    if ($Install) {
        Install-PreCommitHook | Out-Null
        Install-CommitMsgHook
        Show-Status
        
        Write-Host ""
        Write-Host "Git hooks installed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "NEXT STEPS:" -ForegroundColor Cyan
        Write-Host "    1. Test that .env cannot be committed:"
        Write-Host "       git add .env"
        Write-Host ""
        Write-Host "    2. Share with team:"
        Write-Host "       git add .githooks/"
        Write-Host "       git commit -m chore-add-security-hooks"
        Write-Host "       git push"
        Write-Host ""
        Write-Host "    3. Team members should:"
        Write-Host "       git pull"
        Write-Host "       git config core.hooksPath .githooks"
        Write-Host ""
        Write-Host "For more details, see: SECURITY_REMEDIATION_GUIDE.md" -ForegroundColor Yellow
        
        exit 0
    }
    
    if ($Test) {
        Test-Hooks
        exit 0
    }
    
    Show-Status
}

Main
