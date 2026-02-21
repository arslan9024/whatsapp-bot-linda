#!/bin/bash
# ====================================================================
# GIT PRE-COMMIT HOOK - Phase 22 Security Hardening
# ====================================================================
# Prevents accidental commits of credentials, secrets, and sensitive files
#
# Installation:
#   cp pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# This hook:
# 1. Prevents committing *.json files in credential directories
# 2. Prevents committing .env files
# 3. Scans for common secret patterns (API keys, passwords, etc.)
# 4. Blocks commits if sensitive files are detected
# ====================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Track if we should block the commit
BLOCK_COMMIT=0

echo "🔐 Running Pre-Commit Security Checks..."
echo ""

# Check 1: Prevent .env files
echo -n "  ✓ Checking for .env files... "
if echo "$STAGED_FILES" | grep -q "\.env"; then
    echo -e "${RED}BLOCKED${NC}"
    echo "    ❌ .env files cannot be committed (contains secrets)"
    BLOCK_COMMIT=1
else
    echo -e "${GREEN}OK${NC}"
fi

# Check 2: Prevent keys.json in credential directories
echo -n "  ✓ Checking for credential JSON files... "
if echo "$STAGED_FILES" | grep -qE "(code/GoogleAPI.*\.json|code/Integration/Google.*\.json|*credentials*.json|*keys*.json)"; then
    echo -e "${RED}BLOCKED${NC}"
    echo "    ❌ Credential files cannot be committed:"
    echo "$STAGED_FILES" | grep -E "(code/GoogleAPI|code/Integration/Google|credentials|keys)" || true
    BLOCK_COMMIT=1
else
    echo -e "${GREEN}OK${NC}"
fi

# Check 3: Scan for common secrets patterns
echo -n "  ✓ Scanning for secret patterns... "
SECRETS_FOUND=0

for file in $STAGED_FILES; do
    if git show ":$file" 2>/dev/null | grep -qiE "(password|secret|api[_-]key|private[_-]key|bearer|authorization|credentials|oauth|token|jwt|aws_secret|db_password)" 2>/dev/null; then
        if [ $SECRETS_FOUND -eq 0 ]; then
            echo -e "${RED}BLOCKED${NC}"
        fi
        SECRETS_FOUND=1
        echo "    ⚠️  Potential secret in: $file"
        BLOCK_COMMIT=1
        break
    fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
fi

# Check 4: Verify .gitignore has proper credential patterns
echo -n "  ✓ Verifying .gitignore configuration... "
if [ -f .gitignore ]; then
    if grep -q "code/GoogleAPI/\*\.json" .gitignore && grep -q "\.env" .gitignore; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}WARNING${NC}"
        echo "    ⚠️  .gitignore may be missing credential patterns"
    fi
else
    echo -e "${YELLOW}WARNING${NC}"
    echo "    ⚠️  .gitignore not found"
fi

# Final verdict
echo ""
if [ $BLOCK_COMMIT -eq 1 ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ COMMIT BLOCKED - Credentials detected              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Phase 22: All credentials must be stored in .env as BASE64"
    echo ""
    echo "To fix this commit:"
    echo "  1. Remove sensitive files from staging:"
    echo "     git reset HEAD <file>"
    echo "  2. Add .env and credential files to .gitignore"
    echo "  3. Verify credentials are in .env as GOOGLE_ACCOUNT_*_KEYS_BASE64"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ All security checks passed - Safe to commit${NC}"
echo ""
exit 0
