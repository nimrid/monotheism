# Safe to Commit - Quick Reference

## ✅ SAFE to Push to GitHub

These files are safe and should be committed:

### Configuration Templates
- ✅ `.env.example` - Template without real values
- ✅ `backend/.env.example` - Template without real values
- ✅ `eas.json.example` - Template without secrets
- ✅ `eas.json` - **NOW SAFE** (secrets removed)

### Code Files
- ✅ All `.ts` and `.tsx` files
- ✅ `utils/api-config.ts` - Uses env variables, no hardcoded secrets
- ✅ `package.json` and `package-lock.json`
- ✅ `app.json` - No secrets
- ✅ `tsconfig.json`

### Documentation
- ✅ All `.md` files (README, guides, etc.)
- ✅ This file!

## ❌ NEVER Commit to GitHub

These files contain secrets and should NEVER be pushed:

### Environment Files
- ❌ `.env` - Contains your actual API keys
- ❌ `backend/.env` - Contains database credentials
- ❌ `.env.local` or `.env.*.local` - Any local env files

### Build Artifacts
- ❌ `node_modules/` - Dependencies (too large)
- ❌ `.expo/` - Expo cache
- ❌ `dist/` or `web-build/` - Build outputs

### Sensitive Files
- ❌ `*.key` - Private keys
- ❌ `*.pem` - Certificates
- ❌ `*.jks` - Android keystores
- ❌ Any file with passwords or secrets

## Current Status

### ✅ Your Repository is Secure

1. **eas.json** - Cleaned, no secrets
2. **.gitignore** - Properly configured
3. **.env files** - Ignored by git
4. **API keys** - Only in local .env (not committed)

### How to Verify

```bash
# Check what will be committed
git status

# Search for potential secrets
git grep -i "e1e92c1793msh"  # Your API key
git grep -i "npg_ZntwDz8Cqb1T"  # Database password

# If found, DO NOT COMMIT!
```

## Before Every Commit

Run this checklist:

```bash
# 1. Check status
git status

# 2. Verify no .env files
# Should NOT see: .env, backend/.env

# 3. Check for secrets in staged files
git diff --cached | grep -i "api.*key"
git diff --cached | grep -i "password"

# 4. If all clear, commit
git add .
git commit -m "Your message"
git push
```

## Quick Commands

### Safe Commit Workflow
```bash
# Add only safe files
git add eas.json
git add eas.json.example
git add .env.example
git add backend/.env.example
git add "*.ts" "*.tsx" "*.md"

# Verify what's staged
git status

# Commit
git commit -m "Update configuration"
git push
```

### Emergency: Accidentally Staged .env
```bash
# Remove from staging (keeps file locally)
git reset HEAD .env
git reset HEAD backend/.env

# Verify it's removed
git status
```

## EAS Secrets Setup

For production builds, use EAS Secrets instead of hardcoding:

```bash
# Set your secrets (one-time setup)
eas secret:create --scope project --name EXPO_PUBLIC_RAPIDAPI_KEY --value "your-actual-key" --type string
eas secret:create --scope project --name EXPO_PUBLIC_RAPIDAPI_HOST --value "iq-bible.p.rapidapi.com" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://monotheism.vercel.app/api" --type string
eas secret:create --scope project --name EXPO_PUBLIC_ENV --value "production" --type string

# Verify secrets are set
eas secret:list

# Now you can build without exposing secrets
eas build --platform android --profile production
```

## Summary

### What Changed
- ✅ Removed API keys from `eas.json`
- ✅ Created `eas.json.example` template
- ✅ Documented security practices
- ✅ Set up EAS Secrets workflow

### What You Need to Do
1. **Set EAS Secrets** (see commands above)
2. **Verify .gitignore** is working: `git status`
3. **Check for exposed secrets**: `git log -p | grep "e1e92c1793msh"`
4. **If found in history**: Regenerate API key and clean git history

### Your .env File (Local Only)
```env
# This file is NOT committed to git
EXPO_PUBLIC_RAPIDAPI_KEY=e1e92c1793mshab429576f3ae3a2p1733cbjsn3659884804ea
EXPO_PUBLIC_RAPIDAPI_HOST=iq-bible.p.rapidapi.com
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENV=development
```

### Your eas.json (Safe to Commit)
```json
{
  "build": {
    "production": {
      // No secrets here!
      // Secrets come from EAS Secrets
    }
  }
}
```

## Need Help?

Check these files:
- `SECURITY_GUIDE.md` - Comprehensive security guide
- `API_CONFIGURATION.md` - API setup documentation
- `.env.example` - Template for environment variables

## Final Check

Before pushing to GitHub:
- [ ] No API keys in `eas.json`
- [ ] `.env` is in `.gitignore`
- [ ] `backend/.env` is in `.gitignore`
- [ ] Ran `git status` - no .env files shown
- [ ] Ran `git grep` - no secrets found
- [ ] EAS Secrets are configured
- [ ] Ready to push! 🚀
