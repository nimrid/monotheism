# Security Guide

## ⚠️ IMPORTANT: Protecting Sensitive Data

### Files That Should NEVER Be Committed to Git

1. **`.env`** - Contains API keys and secrets
2. **`backend/.env`** - Contains database credentials
3. **`eas.json`** (if it contains secrets) - Build configuration with keys

### Files That Are Safe to Commit

1. **`.env.example`** - Template without real values
2. **`backend/.env.example`** - Template without real values
3. **`eas.json.example`** - Template without secrets
4. **`eas.json`** (after removing secrets) - Now safe!

## Current Setup

### ✅ Secure Configuration

Your `eas.json` has been cleaned and no longer contains sensitive data. Environment variables are now loaded from:

1. **Local Development**: `.env` file (not committed)
2. **EAS Builds**: EAS Secrets (stored securely in Expo)

### Setting Up EAS Secrets

Instead of hardcoding secrets in `eas.json`, use EAS Secrets:

```bash
# Set secrets for EAS builds
eas secret:create --scope project --name EXPO_PUBLIC_RAPIDAPI_KEY --value "your-key-here" --type string
eas secret:create --scope project --name EXPO_PUBLIC_RAPIDAPI_HOST --value "iq-bible.p.rapidapi.com" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL_PRODUCTION --value "https://monotheism.vercel.app/api" --type string
eas secret:create --scope project --name EXPO_PUBLIC_API_URL_DEVELOPMENT --value "http://localhost:3000/api" --type string

# List all secrets
eas secret:list

# Delete a secret if needed
eas secret:delete --name SECRET_NAME
```

### How EAS Secrets Work

1. **Store Once**: Secrets are stored securely in Expo's infrastructure
2. **Auto-Inject**: EAS automatically injects them during builds
3. **No Exposure**: Secrets never appear in your code or git history
4. **Team Access**: Control who can view/edit secrets

## .gitignore Configuration

Ensure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Backend environment
backend/.env

# EAS (if you want to keep it private)
# eas.json

# Expo
.expo/
dist/
web-build/

# Dependencies
node_modules/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db
```

## Checking Your Repository

### Before Pushing to GitHub

1. **Check for exposed secrets**:
```bash
# Search for potential API keys
git grep -i "api.*key"
git grep -i "secret"
git grep -i "password"
```

2. **Verify .gitignore is working**:
```bash
git status
# .env files should NOT appear in untracked files
```

3. **Check commit history** (if you already committed secrets):
```bash
git log --all --full-history -- .env
git log --all --full-history -- eas.json
```

### If You Already Committed Secrets

**⚠️ CRITICAL: If you've already pushed secrets to GitHub:**

1. **Immediately rotate/regenerate all exposed keys**:
   - RapidAPI key
   - Database credentials
   - Any other API keys

2. **Remove from git history**:
```bash
# Remove file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (⚠️ WARNING: This rewrites history)
git push origin --force --all
```

3. **Alternative: Use BFG Repo-Cleaner** (easier):
```bash
# Install BFG
brew install bfg  # Mac
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove sensitive files
bfg --delete-files .env
bfg --delete-files eas.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Environment Variables Best Practices

### 1. Use Different Keys for Different Environments

```env
# Development
EXPO_PUBLIC_RAPIDAPI_KEY=dev_key_here

# Production (in EAS Secrets)
EXPO_PUBLIC_RAPIDAPI_KEY=prod_key_here
```

### 2. Never Log Secrets

```typescript
// ❌ BAD
console.log('API Key:', process.env.EXPO_PUBLIC_RAPIDAPI_KEY);

// ✅ GOOD
console.log('API Key:', process.env.EXPO_PUBLIC_RAPIDAPI_KEY ? '***' : 'not set');
```

### 3. Validate Environment Variables

```typescript
// utils/env-validator.ts
export function validateEnv() {
  const required = [
    'EXPO_PUBLIC_RAPIDAPI_KEY',
    'EXPO_PUBLIC_RAPIDAPI_HOST',
    'EXPO_PUBLIC_API_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`);
  }
}
```

### 4. Use .env.example as Template

```env
# .env.example (safe to commit)
EXPO_PUBLIC_RAPIDAPI_KEY=your_key_here
EXPO_PUBLIC_RAPIDAPI_HOST=iq-bible.p.rapidapi.com
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENV=development
```

## Backend Security

### Database Credentials

**Never commit `backend/.env`**:

```env
# backend/.env (NOT committed)
DATABASE_URL=postgresql://user:password@host/database
PORT=3000
```

### Vercel Deployment

Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Separate values for Production/Preview/Development

## API Key Security

### RapidAPI Key

Your RapidAPI key is currently exposed in:
- ✅ `.env` (not committed)
- ✅ `eas.json` (removed)
- ❌ Git history (if previously committed)

**Action Required**:
1. Check if key was ever committed: `git log --all -p | grep "e1e92c1793msh"`
2. If found, regenerate key at: https://rapidapi.com/
3. Update `.env` with new key
4. Add new key to EAS Secrets

## Checklist Before Pushing

- [ ] `.env` is in `.gitignore`
- [ ] `backend/.env` is in `.gitignore`
- [ ] No API keys in `eas.json`
- [ ] No database credentials in code
- [ ] `.env.example` has placeholder values only
- [ ] Secrets are set in EAS (for builds)
- [ ] Verified with `git status` (no .env files)
- [ ] Searched for exposed keys: `git grep -i "api.*key"`

## Recovery Steps

### If Secrets Were Exposed

1. **Rotate immediately**:
   - Generate new RapidAPI key
   - Change database password
   - Update all API keys

2. **Update everywhere**:
   - Local `.env` file
   - EAS Secrets
   - Vercel environment variables
   - Any other services

3. **Clean git history** (see above)

4. **Monitor for abuse**:
   - Check RapidAPI usage
   - Monitor database access logs
   - Watch for unusual activity

## Additional Resources

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS Secrets](https://docs.expo.dev/build-reference/variables/)
- [Git Filter-Branch](https://git-scm.com/docs/git-filter-branch)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

## Questions?

If you're unsure whether something is safe to commit:
1. Check if it contains passwords, keys, or credentials → Don't commit
2. Check if it's in `.gitignore` → Safe to have locally
3. Use `.example` files for templates → Safe to commit
4. When in doubt, don't commit it!
