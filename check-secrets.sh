#!/bin/bash

# Script to check for exposed secrets before committing
# Usage: ./check-secrets.sh

echo "🔍 Checking for exposed secrets..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files are tracked
echo "1. Checking if .env files are ignored..."
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}❌ .env is tracked by git!${NC}"
    echo "   Run: git rm --cached .env"
    exit 1
else
    echo -e "${GREEN}✅ .env is properly ignored${NC}"
fi

if git ls-files --error-unmatch backend/.env 2>/dev/null; then
    echo -e "${RED}❌ backend/.env is tracked by git!${NC}"
    echo "   Run: git rm --cached backend/.env"
    exit 1
else
    echo -e "${GREEN}✅ backend/.env is properly ignored${NC}"
fi

echo ""

# Check for API keys in staged files
echo "2. Checking staged files for secrets..."
if git diff --cached | grep -i "e1e92c1793msh" > /dev/null; then
    echo -e "${RED}❌ Found RapidAPI key in staged files!${NC}"
    echo "   Remove it before committing!"
    exit 1
else
    echo -e "${GREEN}✅ No RapidAPI key in staged files${NC}"
fi

if git diff --cached | grep -i "npg_ZntwDz8Cqb1T" > /dev/null; then
    echo -e "${RED}❌ Found database password in staged files!${NC}"
    echo "   Remove it before committing!"
    exit 1
else
    echo -e "${GREEN}✅ No database password in staged files${NC}"
fi

echo ""

# Check for secrets in eas.json
echo "3. Checking eas.json for hardcoded secrets..."
if grep -i "e1e92c1793msh" eas.json > /dev/null; then
    echo -e "${RED}❌ Found API key in eas.json!${NC}"
    echo "   Remove it and use EAS Secrets instead"
    exit 1
else
    echo -e "${GREEN}✅ No secrets in eas.json${NC}"
fi

echo ""

# Check git history for secrets (last 10 commits)
echo "4. Checking recent git history for secrets..."
if git log -10 -p | grep -i "e1e92c1793msh" > /dev/null; then
    echo -e "${YELLOW}⚠️  Found API key in git history!${NC}"
    echo "   Consider regenerating the key and cleaning git history"
    echo "   See SECURITY_GUIDE.md for instructions"
else
    echo -e "${GREEN}✅ No secrets in recent git history${NC}"
fi

echo ""

# Check if EAS secrets are configured
echo "5. Checking EAS secrets configuration..."
if command -v eas &> /dev/null; then
    echo "   Run 'eas secret:list' to verify secrets are set"
else
    echo -e "${YELLOW}⚠️  EAS CLI not found. Install with: npm install -g eas-cli${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Security check complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set EAS secrets: eas secret:create --scope project --name EXPO_PUBLIC_RAPIDAPI_KEY --value 'your-key'"
echo "2. Verify: eas secret:list"
echo "3. Commit: git commit -m 'Your message'"
echo "4. Push: git push"
echo ""
echo "For more info, see: SECURITY_GUIDE.md"
