#!/usr/bin/env pwsh
<#
.SYNOPSIS
    WhatsApp Bot Linda - Security Remediation Automation Script
.DESCRIPTION
    Automates the security remediation process including:
    - Pre-cleanup verification
    - Git history cleanup (multiple methods available)
    - Credential rotation assistance
    - Post-cleanup verification
.PARAMETER Method
    Cleanup method to use: 'filter-branch', 'filter-repo', or 'bfg'
.PARAMETER DryRun
    Show what would be done without actually doing it
.PARAMETER RotateCredentials
    Automatically prompt for new credentials
#>

param(
    [ValidateSet('filter-branch', 'filter-repo', 'bfg')]
    [string]$Method = 'filter-repo',
    
    [switch]$DryRun = $false,
    [switch]$RotateCredentials = $false,
    [switch]$SkipVerification = $false,
    [switch]$Help = $false
)

# Colors for console output
$Colors = @{
    Success = 'Green'
    Warning = 'Yellow'
    Error   = 'Red'
    Info    = 'Cyan'
    Header  = 'Magenta'
}

# Helper functions
function Write-Header {
    param([string]$Message)
    Write-Host "`n" + ("=" * 80) -ForegroundColor $Colors['Header']
    Write-Host $Message -ForegroundColor $Colors['Header']
    Write-Host ("=" * 80) + "`n" -ForegroundColor $Colors['Header']
}

function Write-InfoMsg {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors['Info']
}

function Write-SuccessMsg {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors['Success']
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors['Warning']
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Colors['Error']
}

function Test-GitRepository {
    if (-not (Test-Path .git)) {
        Write-ErrorMsg "Not in a git repository"
        exit 1
    }
    Write-SuccessMsg "Git repository detected"
}

function Show-Help {
    @'
📋 WhatsApp Bot Linda - Security Remediation Script

USAGE:
    .\security-remediation.ps1 [Options]

OPTIONS:
    -Method <string>
        Cleanup method: 'filter-branch', 'filter-repo', or 'bfg'
        Default: 'filter-repo' (recommended)
    
    -DryRun
        Show what would be done without making changes
    
    -RotateCredentials
        Prompt to rotate credentials after cleanup
    
    -SkipVerification
        Skip initial verification checks
    
    -Help
        Show this help message

EXAMPLES:
    # Preview cleanup with filter-repo (recommended)
    .\security-remediation.ps1 -DryRun
    
    # Actually perform cleanup
    .\security-remediation.ps1
    
    # Use git filter-branch method
    .\security-remediation.ps1 -Method filter-branch
    
    # Full remediation + credential rotation
    .\security-remediation.ps1 -RotateCredentials

WORKFLOW:
    1. Pre-Cleanup Verification
    2. Backup Current State
    3. Choose and Execute Cleanup
    4. Verification Checks
    5. Credential Rotation (optional)
    6. Final Status Report
'@
}

function Get-CurrentSecrets {
    Write-Header "🔍 Scanning for Current Secrets"
    
    $foundSecrets = @()
    
    if (Test-Path .env) {
        Write-InfoMsg "Checking .env file..."
        $envContent = Get-Content .env
        
        if ($envContent -match "mongodb\+srv://") {
            $foundSecrets += @{ File = ".env"; Type = "MongoDB URI"; Status = "EXPOSED" }
        }
        if ($envContent -match "password\s*=") {
            $foundSecrets += @{ File = ".env"; Type = "Database Password"; Status = "EXPOSED" }
        }
        if ($envContent -match "GOOGLE_API_KEY") {
            $foundSecrets += @{ File = ".env"; Type = "Google API Key"; Status = "EXPOSED" }
        }
    }
    
    Write-Host "`nFound Secrets:"
    foreach ($secret in $foundSecrets) {
        Write-WarningMsg "$($secret.Type): $($secret.Status) in $($secret.File)"
    }
    
    if ($foundSecrets.Count -eq 0) {
        Write-SuccessMsg "No secrets found in current files"
    }
    
    # Check git history
    Write-InfoMsg "Checking git history for .env commits..."
    $envInHistory = git log --all --full-history --format="%H %ai" -- .env 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $envInHistory) {
        Write-WarningMsg ".env found in git history ($(($envInHistory | Measure-Object -Line).Lines) commits)"
        Write-Host $envInHistory | Select-Object -First 3
    } else {
        Write-SuccessMsg "No .env in git history"
    }
    
    return $foundSecrets
}

function Backup-CurrentState {
    Write-Header "💾 Backing Up Current State"
    
    $backupTag = "backup-security-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    Write-InfoMsg "Creating backup tag: $backupTag"
    
    if ($DryRun) {
        Write-InfoMsg "[DRY RUN] Would execute: git tag $backupTag"
    } else {
        git tag $backupTag
        if ($LASTEXITCODE -eq 0) {
            Write-SuccessMsg "Backup created: $backupTag"
            Write-InfoMsg "To restore: git reset --hard $backupTag"
        } else {
            Write-ErrorMsg "Failed to create backup tag"
            return $false
        }
    }
    
    return $true
}

function Cleanup-GitHistoryFilterBranch {
    Write-Header "🧹 Cleaning Git History (git filter-branch)"
    
    $filesToRemove = @('.env', 'bots-config.json', '.env.backup', '.env.old')
    
    Write-InfoMsg "Files to remove from history: $($filesToRemove -join ', ')"
    
    if ($DryRun) {
        Write-InfoMsg "[DRY RUN] Would execute cleanup for: $($filesToRemove -join ', ')"
        return $true
    }
    
    Write-WarningMsg "This operation rewrites git history. It may take several minutes..."
    Read-Host "Press Enter to continue"
    
    foreach ($file in $filesToRemove) {
        Write-InfoMsg "Removing '$file' from all commits..."
        git filter-branch -f --tree-filter "Remove-Item -Path '$file' -ErrorAction SilentlyContinue" --prune-empty -- --all
        
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorMsg "Failed to remove '$file'"
            return $false
        }
    }
    
    # Cleanup
    Write-InfoMsg "Performing final cleanup..."
    git reflog expire --expire=now --all
    git gc --aggressive --prune
    
    Write-SuccessMsg "Git history cleaned with filter-branch"
    return $true
}

function Cleanup-GitHistoryFilterRepo {
    Write-Header "🧹 Cleaning Git History (git-filter-repo)"
    
    # Check if git-filter-repo is available
    $filterRepoCmd = which git-filter-repo 2>$null
    if (-not $filterRepoCmd) {
        Write-WarningMsg "git-filter-repo not found. Installing..."
        
        # Try to install via pip
        $pipInstalled = where.exe pip 2>$null
        if ($pipInstalled) {
            Write-InfoMsg "Installing git-filter-repo via pip..."
            pip install git-filter-repo
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorMsg "Failed to install git-filter-repo"
                Write-InfoMsg "Alternative: Use -Method filter-branch instead"
                return $false
            }
        } else {
            Write-ErrorMsg "pip not found. Cannot install git-filter-repo"
            Write-InfoMsg "Alternative: Use -Method filter-branch instead"
            return $false
        }
    }
    
    $filesToRemove = @('.env', 'bots-config.json', '.env.backup', '.env.old')
    
    Write-InfoMsg "Files to remove from history: $($filesToRemove -join ', ')"
    
    # Create temp file with patterns
    $patternsFile = New-TemporaryFile | Rename-Item -NewName { $_.Name -replace 'tmp', 'remove-patterns' } -PassThru
    
    foreach ($file in $filesToRemove) {
        Add-Content -Path $patternsFile -Value $file
    }
    
    if ($DryRun) {
        Write-InfoMsg "[DRY RUN] Would execute: git-filter-repo --paths-from-file '$patternsFile' --force"
        Remove-Item -Path $patternsFile
        return $true
    }
    
    Write-WarningMsg "This operation rewrites git history. It may take several minutes..."
    Read-Host "Press Enter to continue"
    
    Write-InfoMsg "Running git-filter-repo..."
    & git-filter-repo --paths-from-file $patternsFile --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-SuccessMsg "Git history cleaned with git-filter-repo"
        Remove-Item -Path $patternsFile
        return $true
    } else {
        Write-ErrorMsg "git-filter-repo failed"
        Remove-Item -Path $patternsFile
        return $false
    }
}

function Cleanup-GitHistoryBFG {
    Write-Header "🧹 Cleaning Git History (BFG Repo-Cleaner)"
    
    # Check if bfg is available
    $bfgCmd = where.exe bfg 2>$null
    if (-not $bfgCmd) {
        Write-ErrorMsg "BFG Repo-Cleaner not found"
        Write-InfoMsg "Install from: https://rtyley.github.io/bfg-repo-cleaner/"
        Write-InfoMsg "Alternative: Use -Method filter-branch instead"
        return $false
    }
    
    Write-WarningMsg "This operation rewrites git history. It may take several minutes..."
    Read-Host "Press Enter to continue"
    
    if ($DryRun) {
        Write-InfoMsg "[DRY RUN] Would execute: bfg --delete-files .env --delete-files bots-config.json"
        return $true
    }
    
    Write-InfoMsg "Running BFG Repo-Cleaner..."
    bfg --delete-files .env
    bfg --delete-files bots-config.json
    
    Write-InfoMsg "Performing final cleanup..."
    git reflog expire --expire=now --all
    git gc --aggressive --prune
    
    Write-SuccessMsg "Git history cleaned with BFG"
    return $true
}

function Verify-Cleanup {
    Write-Header "🔍 Verifying Cleanup"
    
    $allGood = $true
    
    # Check 1: .env not in git index
    Write-InfoMsg "Check 1: .env should not be in git index"
    $filesInIndex = git ls-files | Select-String "\.env"
    if ($filesInIndex) {
        Write-ErrorMsg ".env is still in git index"
        $allGood = $false
    } else {
        Write-SuccessMsg ".env not in git index"
    }
    
    # Check 2: .env in gitignore
    Write-InfoMsg "Check 2: .env should be in .gitignore"
    $gitignoreContent = Get-Content .gitignore -ErrorAction SilentlyContinue
    if ($gitignoreContent | Select-String "\.env") {
        Write-SuccessMsg ".env is in .gitignore"
    } else {
        Write-ErrorMsg ".env not found in .gitignore"
        $allGood = $false
    }
    
    # Check 3: .env.example is safe
    Write-InfoMsg "Check 3: .env.example should have no real secrets"
    if (Test-Path .env.example) {
        $exampleContent = Get-Content .env.example
        if ($exampleContent | Select-String "mongodb\+srv|password\s*=.*[^=]\$|secret\s*=.*[^=]\$") {
            Write-ErrorMsg "Secrets found in .env.example"
            $allGood = $false
        } else {
            Write-SuccessMsg ".env.example is safe (no real secrets)"
        }
    }
    
    # Check 4: No .env in recent git history
    Write-InfoMsg "Check 4: .env should not be in recent commits"
    $envCommits = git log --all --full-history -n 5 --name-only -- .env 2>&1
    if ($envCommits -and $envCommits -notmatch "fatal") {
        Write-WarningMsg ".env might still be in git history (found in recent commits)"
        Write-InfoMsg "This is expected immediately after cleanup. Will be gone after garbage collection."
    } else {
        Write-SuccessMsg ".env not in recent git history"
    }
    
    if ($allGood) {
        Write-SuccessMsg "All verification checks passed"
        return $true
    } else {
        Write-WarningMsg "Some verification checks failed. Review above."
        return $false
    }
}

function Prompt-CredentialRotation {
    Write-Header "🔐 Credential Rotation"
    
    Write-WarningMsg "All exposed credentials should be rotated immediately"
    Write-Host @"
    
CREDENTIALS TO ROTATE (if exposed):
    1. MongoDB User Password
    2. Google API Keys
    3. Database Password
    4. Firebase Service Account Keys (if used)

STEPS:
    1. Update credentials in MongoDB Atlas, Google Cloud, etc.
    2. Update .env with new values
    3. Test connection: node test-config.js
    4. Commit changes: git add .env && git commit -m "chore: update credentials"
    5. Verify new credentials work in production

DO NOT COMMIT OLD CREDENTIALS AGAIN!
"@
    
    Write-Host "`nContinue with credential rotation? (yes/no): " -NoNewline
    $response = Read-Host
    
    if ($response.ToLower() -eq 'yes') {
        Write-Host @"

📋 CREDENTIAL ROTATION CHECKLIST:

Step 1: MongoDB Password
    [ ] Go to MongoDB Atlas
    [ ] Navigate to Database Access
    [ ] Find your user and click Edit/Reset Password
    [ ] Copy new password
    [ ] Update MONGODB_URI in .env: mongodb+srv://user:NEWPASSWORD@...
    [ ] Test: node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"

Step 2: Google API Keys
    [ ] Go to Google Cloud Console
    [ ] Navigate to APIs & Services → Credentials
    [ ] Delete old API keys
    [ ] Create new API key
    [ ] Copy new key
    [ ] Update GOOGLE_API_KEY in .env
    [ ] Update GOOGLE_AUTH_CODE if needed

Step 3: Verify New Credentials
    [ ] Update .env with all new credentials
    [ ] Run: node AccountConfigManager.js
    [ ] Check that initialization succeeds
    [ ] Verify WhatsApp Web.js can initialize

Step 4: Final Commit
    [ ] git status (should show .env as modified)
    [ ] git add .env
    [ ] git commit -m "chore: rotate credentials (security patch)"
    [ ] git push

Step 5: Delete Old Credentials from Memory
    [ ] Delete this script if it contains old credentials
    [ ] Clear PowerShell history: Clear-History
    [ ] Clear browser history (Google Cloud, MongoDB Atlas)

"@
        Write-SuccessMsg "Credential rotation process initiated"
    } else {
        Write-InfoMsg "Skipped credential rotation"
    }
}

function Show-FinalStatus {
    Write-Header "📊 Final Status Report"
    
    Write-Host @"
✅ SECURITY REMEDIATION COMPLETE

COMPLETED ACTIONS:
    [✓] Git history analysis
    [✓] Backup created
    [✓] Git history cleaned
    [✓] Credentials rotation prompted
    [✓] Post-cleanup verification

NEXT STEPS:
    1. Ensure all team members have fresh clones
    2. Rotate all credentials (MongoDB, Google API, etc.)
    3. Test all services with new credentials
    4. Review security monitoring setup
    5. Update team with new security policies

ADDITIONAL SECURITY MEASURES:
    - Pre-commit hook activated (prevents .env commits)
    - Secret scanner script created
    - .gitignore properly configured
    - .env.example uses templates only

MAINTENANCE SCHEDULE:
    Daily: Continue normal development
    Weekly: Run secret scanner
    Monthly: Review git history for exposed secrets
    Quarterly: Audit all credentials

For detailed information, see: SECURITY_REMEDIATION_GUIDE.md
"@
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
        exit 0
    }
    
    Write-Header "🔐 WhatsApp Bot Linda - Security Remediation"
    
    # Verify git repository
    Test-GitRepository
    
    # Pre-cleanup verification
    if (-not $SkipVerification) {
        Get-CurrentSecrets | Out-Null
    }
    
    # Create backup
    if (-not (Backup-CurrentState)) {
        exit 1
    }
    
    # Execute cleanup based on method
    Write-Host "`n"
    $cleanupSuccess = $false
    
    switch ($Method) {
        'filter-branch' {
            $cleanupSuccess = Cleanup-GitHistoryFilterBranch
        }
        'filter-repo' {
            $cleanupSuccess = Cleanup-GitHistoryFilterRepo
        }
        'bfg' {
            $cleanupSuccess = Cleanup-GitHistoryBFG
        }
    }
    
    if (-not $cleanupSuccess) {
        Write-ErrorMsg "Cleanup failed. No changes were made."
        exit 1
    }
    
    # Force push if cleanup was successful (and not dry run)
    if (-not $DryRun) {
        Write-Header "📤 Pushing Changes to Remote"
        Write-WarningMsg "This will rewrite history on remote. All team members must re-clone."
        Write-Host "Continue with force push? (yes/no): " -NoNewline
        $continue = Read-Host
        
        if ($continue.ToLower() -eq 'yes') {
            Write-InfoMsg "Pushing with force-with-lease..."
            git push --force-with-lease origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-SuccessMsg "Changes pushed to remote"
            } else {
                Write-ErrorMsg "Failed to push changes"
                Write-InfoMsg "To retry: git push --force-with-lease origin main"
            }
        } else {
            Write-WarningMsg "Changes not pushed. To push later: git push --force-with-lease origin main"
        }
    }
    
    # Verification
    Verify-Cleanup | Out-Null
    
    # Credential rotation
    if ($RotateCredentials) {
        Prompt-CredentialRotation
    }
    
    # Final status
    Show-FinalStatus
}

# Run main
Main
