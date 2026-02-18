# 🔐 Security Remediation Guide - WhatsApp Bot Linda

## Executive Summary
Your project contains **secrets and credentials in git history**. This document provides:
1. **Immediate Actions** to prevent future exposure
2. **Git History Cleanup** procedures
3. **Credential Rotation** strategy
4. **Prevention & Monitoring** setup

---

## 🚨 CURRENT SECURITY STATUS

### ⚠️ Secrets Found:
- ✅ **MongoDB URI** in `.env` (committed to git history)
- ✅ **Database Password** in `.env` (committed to git history)
- ✅ **Google API Keys** in `.env` (committed to git history)
- ✅ **.env file itself** in git history

### ✅ Good Practices Implemented:
- `.gitignore` is comprehensive and correct
- `.env.example` is a safe template (no real secrets)
- Current `.env` file is NOT in staging area

---

## 📋 STEP 1: Immediate Prevention (Do This Now)

### 1.1 Make .gitignore Hook Permanent
```powershell
# Create a local hooks directory to ensure .env is never committed
git config core.hooksPath .githooks

# Verify it worked
git config core.hooksPath
# Output should be: .githooks
```

### 1.2 Create a Pre-Commit Hook (PowerShell Version)
```powershell
# Create the hooks directory
mkdir -Force .githooks | Out-Null

# Create a pre-commit hook (PowerShell)
@'
# Pre-commit hook to prevent committing .env
$stagedFiles = git diff --cached --name-only
if ($stagedFiles | Select-String "\.env" -Quiet) {
    Write-Host "❌ ERROR: .env file cannot be committed (contains secrets)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pre-commit checks passed" -ForegroundColor Green
exit 0
'@ | Set-Content .githooks\pre-commit -Encoding UTF8

# Make the hook executable
git config --add core.hooksPath .githooks
git config --add core.safeCrlf warn
```

### 1.3 Double-Check .gitignore
```powershell
# Verify .env is ignored
git check-ignore -v .env
# Output should show: .env

# Check what would have been committed (ignore .env)
git ls-files -o -i --exclude-standard | Select-String "\.env"
# Should be empty
```

---

## 🧹 STEP 2: Git History Cleanup

### Option A: Using git filter-repo (Recommended - Safer)

#### Install git-filter-repo
```powershell
# Download git-filter-repo
$destination = "$env:USERPROFILE\.local\bin"
if (-not (Test-Path $destination)) { mkdir -Force $destination }

$url = "https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo"
Invoke-WebRequest $url -OutFile "$destination\git-filter-repo"

# Add to PATH
$env:PATH += ";$destination"
```

#### Clean History
```powershell
# Create a list of paths to remove
@'
.env
bots-config.json
.env.old
.env.backup
'@ | Out-File -Encoding UTF8 -FilePath "remove-patterns.txt"

# Run git-filter-repo
git filter-repo --paths-from-file remove-patterns.txt --force

# Force push to remote (⚠️ WARNING: This rewrites history)
git push --force-with-lease origin main

# Cleanup
Remove-Item "remove-patterns.txt"
```

### Option B: Using git filter-branch (Alternative)

```powershell
# Backup your current state
git tag backup-before-cleanup

# Remove .env from all history
git filter-branch --tree-filter 'rm -f .env .env.old .env.backup' --prune-empty -f --

# Remove from git cache
git reflog expire --expire=now --all
git gc --aggressive --prune

# Force push (⚠️ WARNING: This rewrites history)
git push --force-with-lease origin main
```

### Option C: Using BFG Repo-Cleaner (Most User-Friendly)

```powershell
# Install BFG using chocolatey (if available)
choco install bfg

# Or download manually
# https://rtyley.github.io/bfg-repo-cleaner/

# Create a list of files to remove
@'
.env
bots-config.json
.env.old
.env.backup
'@ | Out-File -Encoding UTF8 -FilePath "bfg-remove-list.txt"

# Run BFG
bfg --delete-files bfg-remove-list.txt

# Clean up
$repo = git rev-parse --git-dir
bfg --strip-blobs-bigger-than 100M "$repo"

# Final cleanup
git reflog expire --expire=now --all
git gc --aggressive --prune

# Force push
git push --force-with-lease origin main
```

---

## 🔄 STEP 3: Credential Rotation

### ⚠️ CRITICAL: Assume All Credentials Are Compromised

**Action Plan:**

1. **MongoDB Credentials**
   ```powershell
   # Update in MongoDB Atlas:
   # 1. Go to Database Access
   # 2. Change password for user
   # 3. Update .env with new password
   ```

2. **Google API Keys**
   ```powershell
   # Regenerate in Google Cloud Console:
   # 1. Go to Credentials
   # 2. Delete old API keys
   # 3. Create new ones
   # 4. Update .env with new keys
   # 5. Verify in WhatsApp Web.js initialization
   ```

3. **Database Password**
   ```powershell
   # If separate from MongoDB user:
   # 1. Reset database password in MongoDB Atlas
   # 2. Update .env
   # 3. Test connection
   ```

4. **All Firebase Credentials (if used)**
   ```powershell
   # Regenerate Firebase credentials:
   # 1. Delete old service account key
   # 2. Generate new one
   # 3. Update .env or private key file
   ```

### Verification After Rotation
```powershell
# Test MongoDB connection
node -e "const { MongoClient } = require('mongodb'); const uri = process.env.MONGODB_URI; MongoClient.connect(uri).then(client => { console.log('✅ Connected'); client.close() }).catch(e => console.log('❌ Error:', e.message))"

# Test API keys in AccountConfigManager
node -e "require('dotenv').config(); const config = require('./AccountConfigManager.js'); console.log('✅ Config loaded successfully')"
```

---

## 🛡️ STEP 4: Prevent Future Exposure

### 4.1 Update .env.example (Already Done ✓)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
DB_PASSWORD=your_secure_password_here
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_AUTH_CODE=your_auth_code_here
WHATSAPP_BOT_NUMBER=+971505760056
LOG_LEVEL=debug
PORT=3000
```

### 4.2 Create .gitignore Rules (Already Done ✓)
```
# Environment and secrets
.env
.env.local
.env.*.local
.env.production
.env.backup
.env.old

# API Keys and credentials
.credentials/
secrets/
private/
*.key
*.pem

# Database files
*.db
*.sqlite
dump/

# Logs (might contain credentials)
logs/
*.log

# Cache that might contain sensitive data
.cache/
node_modules/
```

### 4.3 Create Pre-Commit Hook (PowerShell)
```powershell
# Save as .git\hooks\pre-commit
@'
#!/bin/powershell
# Pre-commit security check
$stagedFiles = git diff --cached --name-only
$forbidden = @('.env', '.env.backup', '.env.old')

foreach ($file in $forbidden) {
    if ($stagedFiles | Select-String -Pattern "^$([regex]::Escape($file))$") {
        Write-Host "❌ ERROR: $file cannot be committed" -ForegroundColor Red
        exit 1
    }
}

# Check for secret patterns
$secrets = git diff --cached | Select-String -Pattern "password|secret|api_key|MONGODB_URI|DB_PASSWORD" -CaseSensitive -Quiet
if ($secrets) {
    Write-Host "⚠️  WARNING: Potential secrets in commit" -ForegroundColor Yellow
    git diff --cached | Select-String -Pattern "password|secret|api_key" | ForEach-Object { Write-Host "   $_" }
}

Write-Host "✅ Pre-commit checks passed" -ForegroundColor Green
exit 0
'@ | Set-Content -Path .git\hooks\pre-commit -Encoding UTF8 -Force
```

### 4.4 Create Secret Scanner Script
```powershell
# Save as: scan-for-secrets.ps1

param(
    [string]$Path = ".",
    [switch]$GitHistory = $false
)

$secretPatterns = @(
    "mongodb\+srv://.*@",
    "password\s*[:=]",
    "api_?key\s*[:=]",
    "secret\s*[:=]",
    "token\s*[:=]",
    "MONGODB_URI",
    "DB_PASSWORD",
    "GOOGLE_API_KEY"
)

Write-Host "🔍 Scanning for secrets in $Path..." -ForegroundColor Cyan

if ($GitHistory) {
    Write-Host "Scanning git history..." -ForegroundColor Yellow
    git log -p | Select-String -Pattern $secretPatterns -List | ForEach-Object {
        Write-Host "⚠️  Found at: $_" -ForegroundColor Red
    }
} else {
    Get-ChildItem -Path $Path -Recurse -Include "*.js", "*.json", "*.env*", "*.config" |
    Where-Object { $_.FullName -notmatch "node_modules|\.git" } |
    Select-String -Pattern $secretPatterns -List |
    ForEach-Object {
        Write-Host "⚠️  Found at: $_" -ForegroundColor Red
    }
}

Write-Host "✅ Scan complete" -ForegroundColor Green
```

**Usage:**
```powershell
.\scan-for-secrets.ps1
.\scan-for-secrets.ps1 -GitHistory
```

### 4.5 Add to Pre-Deployment Checklist
```
☐ Run secret scanner: .\scan-for-secrets.ps1
☐ Check .env is in .gitignore
☐ Verify .env.example has no real values
☐ Check for recent .env commits: git log --all --diff-filter=D -- .env
☐ Review git config hooks are active: git config core.hooksPath
☐ Test that .env cannot be committed: git add .env (should fail)
```

---

## 📊 STEP 5: Monitoring & Alerts

### 5.1 GitHub Secret Scanning (If Public Repo)
If your repo is public, enable:
1. Go to **Settings → Security & Analysis**
2. Enable **Secret Scanning**
3. Enable **Push Protection**

### 5.2 Weekly Audit
Add to your maintenance schedule:
```powershell
# Weekly secret scan
.\scan-for-secrets.ps1

# Monthly git history review
git log --all --name-only -- ".env*" | Sort-Object | Get-Unique

# Check for exposed credentials reports
git log --all --grep="secret\|password\|api"
```

### 5.3 Team Communication
Share this checklist with your team:
- ✅ Never commit `.env` files
- ✅ Use `.env.example` as template only
- ✅ Rotate credentials if exposed
- ✅ Use pre-commit hooks
- ✅ Report exposed credentials immediately

---

## ✅ VERIFICATION CHECKLIST

After implementing all steps:

```powershell
# 1. Verify .env is not in git
git ls-files | Select-String "\.env"
# Should return nothing

# 2. Verify .env is in .gitignore
git check-ignore -v .env
# Should show: .env

# 3. Verify no secrets in current HEAD
git show HEAD:.env 2>&1 | Select-String "password|secret|api_key"
# After cleanup this should fail (file not found) ✓

# 4. Verify no .env in git history (sample check)
git log --all --full-history --name-only -- ".env" | head -5
# After cleanup, no recent commits should appear

# 5. Verify pre-commit hook works
# Try to commit .env (should fail)
git add .env
git commit -m "test" 2>&1 | Select-String "cannot be committed"
# Should show error

# 6. Verify .env.example is safe (no real values)
Get-Content .env.example | Select-String "mongodb\+srv|password\|api_key|secret"
# Should return nothing
```

---

## 🎯 RECOMMENDED IMMEDIATE ACTIONS (Priority Order)

### Priority 1: URGENT (Do Now)
- [ ] Create backup tag: `git tag backup-before-cleanup`
- [ ] Rotate all credentials (MongoDB, API keys)
- [ ] Update .env with new credentials
- [ ] Test connection with new credentials

### Priority 2: HIGH (Today)
- [ ] Choose cleanup method (Option A, B, or C)
- [ ] Run git history cleanup
- [ ] Force push to remote
- [ ] Verify no secrets remain

### Priority 3: MEDIUM (This Week)
- [ ] Set up pre-commit hooks
- [ ] Create secret scanner script
- [ ] Update team documentation
- [ ] Train team on security practices

### Priority 4: LOW (This Month)
- [ ] Set up automated secret scanning
- [ ] Create weekly audit schedule
- [ ] Archive this guide in team docs

---

## 📞 FAQ

**Q: Will git history cleanup break anything?**
A: It rewrites git history, so anyone with cloned repos needs to re-clone. It's safe, but communicate with your team.

**Q: Can I recover the old commits?**
A: Yes, use `git reflog` or restore the `backup-before-cleanup` tag: `git reset --hard backup-before-cleanup`

**Q: What if I'm not sure if all secrets were rotated?**
A: Assume they were exposed. Rotate everything (MongoDB user password, API keys, service account keys).

**Q: Should I make my repo private?**
A: Yes, if it contains credentials. After cleanup, it can be public again (once credentials are rotated).

**Q: How do I know the cleanup worked?**
A: Run the verification checklist above. All checks should pass. ✅

---

## 📚 Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [git-filter-repo Docs](https://github.com/newren/git-filter-repo/blob/main/Documentation/git-filter-repo.rst)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [git Pre-Commit Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

---

## 🔒 Status Summary

| Item | Status | Action |
|------|--------|--------|
| Secrets Found | ⚠️ YES | Clean history |
| `.env` Committed | ⚠️ YES | Remove from history |
| `.gitignore` Setup | ✅ GOOD | Maintain |
| `.env.example` | ✅ SAFE | No action needed |
| Pre-Commit Hook | ⏳ PENDING | Set up shell script |
| Credential Rotation | ⏳ PENDING | Execute rotation |
| Verification | ⏳ PENDING | Run checklist |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Next Review:** After cleanup completion
