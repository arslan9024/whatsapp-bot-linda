#!/usr/bin/env pwsh
# Simple Secret Scanner
# Finds exposed secrets in code and git history

param(
    [string]$Path = ".",
    [switch]$GitHistory = $false,
    [int]$MaxResults = 10
)

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "[SCANNER] Secret Detection Tool" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

if ($GitHistory) {
    Write-Host "[INFO] Scanning git history for secrets..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check for .env in git history
    $envInHistory = git log --all --full-history --name-only -- .env 2>&1
    if ($LASTEXITCODE -eq 0 -and $envInHistory) {
        Write-Host "[FOUND] .env appears in git history:" -ForegroundColor Red
        git log --all --full-history --oneline -- .env | head -5
    } else {
        Write-Host "[OK] .env not found in git history" -ForegroundColor Green
    }
    
    # Check for credential patterns
    Write-Host ""
    Write-Host "[CHECK] Looking for credential patterns..." -ForegroundColor Cyan
    
    $patterns = @(
        'MONGODB_URI',
        'DB_PASSWORD',
        'GOOGLE_API_KEY',
        'password',
        'secret'
    )
    
    $foundAny = $false
    foreach ($pattern in $patterns) {
        $matches = git log --all -p 2>/dev/null | Select-String -Pattern $pattern -List -ErrorAction SilentlyContinue
        if ($matches) {
            Write-Host "[FOUND] Pattern '$pattern' found in git history" -ForegroundColor Red
            $foundAny = $true
        }
    }
    
    if (-not $foundAny) {
        Write-Host "[OK] No secret patterns found in git history" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] Scanning current files for secrets..." -ForegroundColor Cyan
    Write-Host ""
    
    $secretpatterns = @{
        'MONGODB_URI' = 'mongodb\+srv://';
        'DB_PASSWORD' = 'DB_PASSWORD\s*[:=]';
        'GOOGLE_API_KEY' = 'GOOGLE_API_KEY\s*[:=]|\bAIza[0-9A-Za-z_-]{35}\b';
        'Password Pattern' = 'password\s*[:=].*\S';
        'Secret Pattern' = 'secret\s*[:=].*\S';
        '.env file' = '\.env';
    }
    
    $secretCount = @{}
    $found = 0
    
    # Check .env file
    if (Test-Path .env) {
        Write-Host "[ALERT] .env file exists (should not be in repo)" -ForegroundColor Yellow
        $secretCount['.env file'] = 1
        $found++
        
        $envContent = Get-Content .env
        foreach ($key in $secretPatterns.Keys) {
            if ($key -ne '.env file') {
                if ($envContent -match $secretPatterns[$key]) {
                    Write-Host "  [FOUND] $key in .env" -ForegroundColor Red
                    $secretCount[$key] = ($secretCount[$key] -as [int]) + 1
                    $found++
                }
            }
        }
    }
    
    # Check config files
    $checkFiles = @('config.js', 'AccountConfigManager.js', '*.json')
    
    Write-Host ""
    Write-Host "[SCAN] Checking code files..." -ForegroundColor Cyan
    
    foreach ($pattern in $secretPatterns.Keys) {
        if ($pattern -ne '.env file') {
            Get-ChildItem -Path $Path -Recurse -Include $checkFiles -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist' } |
            ForEach-Object {
                try {
                    if (Select-String -Path $_.FullName -Pattern $secretPatterns[$pattern] -Quiet -ErrorAction SilentlyContinue) {
                        if (-not $secretCount.ContainsKey($pattern)) {
                            $secretCount[$pattern] = 0
                        }
                        $secretCount[$pattern]++
                        $found++
                        if ($secretCount[$pattern] -le $MaxResults) {
                            Write-Host "  [FOUND] $pattern in $($_.Name)" -ForegroundColor Red
                        }
                    }
                } catch {
                    # Skip files that can't be read
                }
            }
        }
    }
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "[SUMMARY] Secret Scan Results" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

if ($found -eq 0) {
    Write-Host "[OK] No secrets detected!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your project appears clean." -ForegroundColor Green
} else {
    Write-Host "[ALERT] Found $found potential secrets" -ForegroundColor Red
    Write-Host ""
    Write-Host "Breakdown:" -ForegroundColor Cyan
    foreach ($key in $secretCount.Keys) {
        Write-Host "  - $key : $($secretCount[$key])" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review .env file"
    Write-Host "  2. Ensure .env is in .gitignore"
    Write-Host "  3. Remove secrets from git history if needed"
}

Write-Host ""
