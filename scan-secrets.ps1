#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Secret Scanner - Detects exposed secrets and credentials
.DESCRIPTION
    Scans for passwords, API keys, tokens, and other sensitive data
.PARAMETER Path
    Path to scan (default: current directory)
.PARAMETER GitHistory
    Scan git history instead of current files
.PARAMETER MaxOccurrences
    Maximum occurrences to display (default: 10)
#>

param(
    [string]$Path = ".",
    [switch]$GitHistory = $false,
    [int]$MaxOccurrences = 10
)

# Secret patterns to search for
$secretPatterns = @{
    'MongoDB URI' = 'mongodb\+srv://[^:\s]+:[^@\s]+@'
    'MongoDB Connection String' = 'mongodb://[^@\s]+'
    'Password Assignment' = '(DB_)?PASSWORD\s*[:=]\s*["\']?[^"\s]{6,}'
    'API Key Explicit' = '(API_?KEY|api_?key)\s*[:=]\s*["\']?[A-Za-z0-9_-]{6,}'
    'API Secret' = '(API_SECRET|api_secret)\s*[:=]'
    'Access Token' = '(access_token|accessToken|ACCESS_TOKEN)\s*[:=]'
    'Auth Token' = '(auth_token|authToken|AUTH_TOKEN)\s*[:=]'
    'Session Token' = '(session_token|sessionToken|SESSION_TOKEN)\s*[:=]'
    'Private Key' = '-----BEGIN (RSA |EC )?PRIVATE KEY'
    'AWS Secret' = 'aws_secret_access_key\s*[:=]'
    'Firebase Config' = '(apiKey|authDomain|databaseURL|projectId)\s*[:=]'
    'Google API Key' = 'AIza[0-9A-Za-z\-_]{35}'
    'JWT Token' = 'eyJ[A-Za-z0-9_-]{10,}'
    'Bearer Token' = 'Bearer\s+[A-Za-z0-9_-]{20,}'
}

$Colors = @{
    Success = 'Green'
    Warning = 'Yellow'
    Error   = 'Red'
    Secret  = 'Red'
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n" + ("=" * 70) -ForegroundColor Magenta
    Write-Host $Message -ForegroundColor Magenta
    Write-Host ("=" * 70) + "`n" -ForegroundColor Magenta
}

function Write-SecretFound {
    param(
        [string]$Pattern,
        [string]$Location,
        [string]$Content
    )
    
    Write-Host "🔴 [SECRET FOUND] $Pattern" -ForegroundColor Red
    Write-Host "   Location: $Location" -ForegroundColor Yellow
    
    # Mask sensitive content
    $masked = $Content -replace ':[^@\s]+@', ':***@' -replace '(["\'])[^"\']{6,}["\']', '$1***$1'
    Write-Host "   Content:  $masked" -ForegroundColor Cyan
    Write-Host ""
}

function Scan-Files {
    param([string]$ScanPath)
    
    Write-Header "📁 Scanning Files"
    
    $excludePatterns = @('node_modules', '\.git', '\.next', 'dist', 'build', '\.cache')
    $includeExtensions = @('*.js', '*.json', '*.ts', '*.tsx', '*.env*', '*.config', '*.xml', '*.yml', '*.yaml')
    
    $foundSecrets = 0
    $foundCount = @{}
    
    foreach ($pattern in $secretPatterns.Keys) {
        $foundCount[$pattern] = 0
    }
    
    Get-ChildItem -Path $ScanPath -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $file = $_
        # Check extensions
        $includeFile = $false
        foreach ($ext in $includeExtensions) {
            if ($file.Name -like $ext) {
                $includeFile = $true
                break
            }
        }
        
        if (-not $includeFile) { return $false }
        
        # Exclude paths
        foreach ($exclude in $excludePatterns) {
            if ($file.FullName -like "*$exclude*") {
                return $false
            }
        }
        
        return $true
    } |
    ForEach-Object {
        $file = $_
        Write-Host "   Scanning: $($file.Name)..." -ForegroundColor Gray -NoNewline
        
        try {
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($null -eq $content) { 
                Write-Host " [empty]" -ForegroundColor Gray
                return 
            }
            
            $hasSecret = $false
            foreach ($patternName in $secretPatterns.Keys) {
                $pattern = $secretPatterns[$patternName]
                
                if ($content -match $pattern) {
                    Write-Host " [⚠️  FOUND]" -ForegroundColor Red
                    
                    Write-Host ""
                    Write-SecretFound -Pattern $patternName -Location $file.FullName -Content $matches[0]
                    
                    $foundSecrets++
                    $foundCount[$patternName]++
                    $hasSecret = $true
                    
                    if ($foundSecrets -ge $MaxOccurrences) {
                        Write-Host "📊 Maximum occurrences ($MaxOccurrences) reached. Use -MaxOccurrences to increase." -ForegroundColor Yellow
                        return
                    }
                }
            }
            
            if (-not $hasSecret) {
                Write-Host " [clean]" -ForegroundColor Green
            }
        } catch {
            Write-Host " [error]" -ForegroundColor Red
        }
    }
    
    return $foundSecrets, $foundCount
}

function Scan-GitHistory {
    Write-Header "📜 Scanning Git History"
    
    $foundSecrets = 0
    $foundCount = @{}
    
    foreach ($pattern in $secretPatterns.Keys) {
        $foundCount[$pattern] = 0
    }
    
    foreach ($patternName in $secretPatterns.Keys) {
        $pattern = $secretPatterns[$patternName]
        
        Write-Host "Searching for: $patternName..." -ForegroundColor Cyan -NoNewline
        
        # Search in git history
        $matches = git log --all -p | Select-String -Pattern $pattern -List -ErrorAction SilentlyContinue
        
        if ($matches) {
            Write-Host " [FOUND]" -ForegroundColor Red
            Write-Host ""
            Write-Host "🔴 Found in git history: $patternName" -ForegroundColor Red
            Write-Host "   Recommendation: Run git-filter-repo or BFG to remove from history" -ForegroundColor Yellow
            Write-Host ""
            
            $foundSecrets += ($matches | Measure-Object).Count
            $foundCount[$patternName] += ($matches | Measure-Object).Count
            
            if ($foundSecrets -ge $MaxOccurrences) {
                break
            }
        } else {
            Write-Host " [clean]" -ForegroundColor Green
        }
    }
    
    return $foundSecrets, $foundCount
}

function Show-Summary {
    param(
        [int]$TotalFound,
        [hashtable]$Counts
    )
    
    Write-Header "📊 Scan Summary"
    
    if ($TotalFound -eq 0) {
        Write-Host "✅ No secrets detected!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "❌ Found $TotalFound potential secrets" -ForegroundColor Red
    Write-Host "`nBreakdown by type:" -ForegroundColor Yellow
    
    foreach ($pattern in ($Counts.Keys | Sort-Object)) {
        if ($Counts[$pattern] -gt 0) {
            Write-Host "  - $pattern`: $($Counts[$pattern])" -ForegroundColor Red
        }
    }
    
    Write-Host @"
    
⚠️  NEXT STEPS:
    1. Review each finding above
    2. Determine if secrets need to be rotated
    3. Remove secrets from git history using git-filter-repo or BFG
    4. Update .env with new credentials
    5. Update .gitignore to prevent future exposure
    
For detailed instructions, see: SECURITY_REMEDIATION_GUIDE.md
"@ -ForegroundColor Yellow
    
    return $false
}

# Main execution
function Main {
    Write-Header "🔐 WhatsApp Bot Linda - Secret Scanner"
    
    if ($GitHistory) {
        Write-Host "Scanning git history for secrets..." -ForegroundColor Cyan
        Write-Host "(This may take a minute...)" -ForegroundColor Gray
        Write-Host ""
        
        $result, $counts = Scan-GitHistory
    } else {
        Write-Host "Scanning files for secrets..." -ForegroundColor Cyan
        Write-Host "Excluded: node_modules, .git, .next, dist, build, .cache" -ForegroundColor Gray
        Write-Host ""
        
        $result, $counts = Scan-Files -ScanPath $Path
    }
    
    $allClean = Show-Summary -TotalFound $result -Counts $counts
    
    if ($allClean) {
        exit 0
    } else {
        exit 1
    }
}

Main
