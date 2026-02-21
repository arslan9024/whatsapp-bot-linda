# 🔐 Security Remediation - Quick Reference Card

## 🚨 You Have Exposed Secrets in Git!
**Status**: Critical  
**Time to Fix**: ~45 minutes  
**Risk**: Medium (history rewrite required)

---

## ⚡ FAST TRACK (Just Do These 4 Steps)

### Step 1: Prevent Future Exposure (5 min)
```powershell
.\setup-git-hooks.ps1 -Install
```
**Result**: .env can never be accidentally committed again

---

### Step 2: Clean Git History (15 min)
```powershell
.\security-remediation.ps1 -Method filter-repo
```
**What happens**:
- Creates backup (just in case)
- Removes .env from all git commits
- Cleans git history
- **Asks**: Okay to push to remote? Say YES

**After**: All team must re-clone

---

### Step 3: Rotate Credentials (10 min)
**1. MongoDB Password**
- Go to: https://cloud.mongodb.com
- Database Access → Edit Password
- Copy new password
- Update in .env

**2. Google API Keys** (if used)
- Go to: https://console.cloud.google.com
- APIs & Services → Credentials
- Delete old, create new
- Update in .env

**3. Commit New Credentials**
```powershell
git add .env
git commit -m "chore(security): rotate credentials"
git push origin main
```

---

### Step 4: Verify Everything Works (5 min)
```powershell
# Test secrets are gone from git
git ls-files | Select-String "\.env"
# Should output: (nothing)

# Test hook blocks .env commits
git add .env
git commit -m "test"
# Should output: ❌ ERROR: '.env' file cannot be committed

# Test all services work with new credentials
npm start
# Should show: ✅ Connected to MongoDB
```

---

## 📋 What Got Created For You

### Scripts
- **`setup-git-hooks.ps1`** - Install git hooks to prevent secrets
- **`security-remediation.ps1`** - Automated git history cleanup
- **`scan-secrets.ps1`** - Finds exposed secrets in code and history

### Documentation
- **`SECURITY_REMEDIATION_GUIDE.md`** - Detailed reference guide
- **`SECURITY_ACTION_PLAN.md`** - Complete step-by-step guide
- **`SECURITY_POLICY.md`** - (To be created) Team-wide policy

### What They Do
```
setup-git-hooks.ps1
├─ Prevents .env commits
├─ Detects secret patterns
└─ Blocks large files (database dumps, etc.)

security-remediation.ps1
├─ Backs up current state
├─ Removes .env from git history
├─ Verifies cleanup
└─ Helps push changes safely

scan-secrets.ps1
├─ Scans current directory
├─ Scans git history
└─ Reports all findings
```

---

## ✅ Verification Checklist

After completing all 4 steps, you should have:

- [ ] **Hooks Installed**
  ```powershell
  git config core.hooksPath
  # Output: .githooks
  ```

- [ ] **Git History Cleaned**
  ```powershell
  git log --all --full-history -- .env
  # Output: fatal: pathspec '.env' did not match any files
  ```

- [ ] **New Credentials in Use**
  ```powershell
  node AccountConfigManager.js
  # Shows: ✅ Connected to MongoDB (with new password)
  ```

- [ ] **Hook Works**
  ```powershell
  git add .env && git commit -m "test"
  # Output: ❌ ERROR: '.env' file cannot be committed
  ```

- [ ] **No Secrets in Scans**
  ```powershell
  .\scan-secrets.ps1
  # Output: ✅ No secrets detected!
  ```

---

## 🎯 Commands Cheat Sheet

### Prevention (Do This First)
```powershell
# Install hooks
.\setup-git-hooks.ps1 -Install

# Check hook status
.\setup-git-hooks.ps1

# Test hooks
.\setup-git-hooks.ps1 -Test

# Remove hooks (if needed)
.\setup-git-hooks.ps1 -Remove
```

### Scanning
```powershell
# Scan current files
.\scan-secrets.ps1

# Scan git history
.\scan-secrets.ps1 -GitHistory

# Scan with more details
.\scan-secrets.ps1 -MaxOccurrences 50
```

### Cleanup
```powershell
# Preview what will happen (no changes)
.\security-remediation.ps1 -DryRun

# Do the cleanup (recommended method)
.\security-remediation.ps1 -Method filter-repo

# Alternative cleanup methods
.\security-remediation.ps1 -Method filter-branch
.\security-remediation.ps1 -Method bfg

# Cleanup + credential rotation assistant
.\security-remediation.ps1 -RotateCredentials

# Skip verification questions
.\security-remediation.ps1 -SkipVerification
```

### Git Operations
```powershell
# View git history (check no .env)
git log --all --full-history -- .env

# View current hooks path
git config core.hooksPath

# Restore backup if needed
git reset --hard backup-before-cleanup

# Force push cleaned history (⚠️ requires team re-clone)
git push --force-with-lease origin main
```

---

## 🚨 CRITICAL WARNINGS

### ⚠️ Git history cleanup requires:
- Team members to re-clone after `git push --force-with-lease`
- All local unpushed changes to be saved first
- About 10-15 minutes for the operation

### ⚠️ Credential rotation requires:
- Access to MongoDB Atlas, Google Cloud Console, etc.
- Testing that new credentials work
- Committing the updated .env with new values

### ⚠️ Do NOT:
- Skip credential rotation if repo was ever public
- Push new credentials without removing old ones
- Commit .env.example with real values
- Share this document with the real secrets (use guides instead)

---

## 📞 Troubleshooting

### "git-filter-repo not found"
```powershell
# Install Python first, then:
python -m pip install git-filter-repo

# Or use alternative:
.\security-remediation.ps1 -Method filter-branch
```

### "Cannot find .githooks directory"
```powershell
# Run setup again:
.\setup-git-hooks.ps1 -Install
```

### "Force push failed"
```powershell
# Check if remote changed:
git fetch origin

# Check branch status:
git status

# Try again with:
git push --force-with-lease origin main
```

### Script won't run
```powershell
# Allow script execution:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass:
powershell -ExecutionPolicy Bypass -File .\security-remediation.ps1
```

---

## 📊 Timeline

```
Start: --|
       │
       ├─ Step 1: Install hooks (5 min) ●●●●●
       │
       ├─ Step 2: Clean git (15 min) ●●●●●●●●●●●●●●●
       │
       ├─ Step 3: Rotate credentials (10 min) ●●●●●●●●●●
       │
       └─ Step 4: Verify (5 min) ●●●●●
       │
End:  ──|  Total: ~45 minutes
```

---

## ✨ Success Criteria

You've **successfully remediated** when:

```
✅ Hooks installed (cannot commit .env)
✅ Git history cleaned (no .env in history)
✅ New credentials in use (MongoDB, Google API)
✅ All services working (npm start works)
✅ Team re-cloned (fresh copies with hooks)
✅ Security policy communicated (team aware)
```

---

## 📚 Where to Find More Info

| Topic | File | When |
|-------|------|------|
| **Detailed Steps** | `SECURITY_ACTION_PLAN.md` | Need step-by-step guide |
| **All Options** | `SECURITY_REMEDIATION_GUIDE.md` | Want all technical details |
| **How Scripts Work** | Inside each `.ps1` file | Need to understand code |
| **Team Policy** | Create `SECURITY_POLICY.md` | After completing remediation |

---

## 🎓 Learning Resources

- **Git Security**: https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage
- **Secret Management**: https://owasp.org/www-community/Sensitive_Data_Exposure
- **Pre-commit Hooks**: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
- **GitHub Security**: https://docs.github.com/en/code-security

---

## 📞 Questions?

If something doesn't work:
1. Check the **SECURITY_ACTION_PLAN.md** for detailed steps
2. Read the **Troubleshooting** section above
3. Run with `-Help` flag: `.\security-remediation.ps1 -Help`
4. Review the script output for specific error messages

---

## 🎉 Ready?

Start here:
```powershell
# Step 1: Install hooks
.\setup-git-hooks.ps1 -Install

# Step 2: Check status
.\scan-secrets.ps1

# Then follow SECURITY_ACTION_PLAN.md for remaining steps
```

**You've got this! 🚀**

---

**Quick Card Version**: 1.0  
**Created**: 2026-01-26  
**Time to Complete**: ~45 minutes  
**Status**: READY TO EXECUTE
