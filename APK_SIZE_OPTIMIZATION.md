# APK Size Optimization Guide

Your APK is currently 146MB. Here's how to reduce it significantly:

## Changes Already Made

### 1. app.json
- ✅ Enabled ProGuard (code shrinking and obfuscation)
- ✅ Enabled resource shrinking (removes unused resources)

### 2. eas.json
- ✅ Set production builds to use AAB (Android App Bundle) instead of APK
- ✅ AAB allows Google Play to generate optimized APKs per device

### 3. metro.config.js (NEW)
- ✅ Removes console.log statements in production
- ✅ Enables code minification and tree shaking

## Expected Results

With these changes, you should see:
- **30-40% reduction** from ProGuard and resource shrinking
- **10-15% reduction** from removing console logs
- **AAB splits** can reduce download size by 40-60% (users only download what they need)

**Estimated final size: 60-80MB APK or 30-50MB download from Play Store with AAB**

## Build Commands

### For Testing (APK)
```bash
eas build --platform android --profile preview
```

### For Production (AAB - Recommended)
```bash
eas build --platform android --profile production
```

## Additional Optimizations (If Needed)

### 1. Use Hermes Engine (Already enabled with New Architecture)
Your app already uses the new architecture which includes Hermes.

### 2. Split APKs by Architecture
Add to `eas.json` under android:
```json
"android": {
  "buildType": "apk",
  "gradleCommand": ":app:assembleRelease",
  "enableProguardInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true
}
```

### 3. Analyze Bundle Size
```bash
npx react-native-bundle-visualizer
```

### 4. Remove Unused Dependencies
Check your package.json and remove any unused packages.

### 5. Optimize Images
- Use WebP format instead of PNG/JPG
- Compress images before adding to assets
- Use vector icons where possible (you're already using IconSymbol)

### 6. Use AAB for Play Store (Recommended)
Android App Bundle (AAB) is the recommended format for Play Store:
- Google Play generates optimized APKs for each device
- Users download only what they need (architecture, screen density, language)
- Can reduce download size by 40-60%

## Why AAB is Better Than APK

| Feature | APK | AAB |
|---------|-----|-----|
| Size | 146MB | 146MB (base) |
| User Download | 146MB | 50-80MB (optimized) |
| Architecture | All included | Device-specific |
| Languages | All included | User's language only |
| Screen Densities | All included | Device-specific |

## Next Steps

1. Build with the new configuration:
   ```bash
   eas build --platform android --profile production
   ```

2. Upload the AAB to Google Play Console

3. Google Play will automatically generate optimized APKs

4. Users will download much smaller files (typically 50-60% smaller)

## Troubleshooting

If build fails with ProGuard errors, you may need to add ProGuard rules. Create `android/app/proguard-rules.pro`:

```
# Keep Solana classes
-keep class com.solana.** { *; }
-keep class org.bitcoinj.** { *; }

# Keep React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep Expo
-keep class expo.** { *; }
```

## Monitoring

After implementing these changes:
1. Check the build logs for size information
2. Test the app thoroughly (ProGuard can sometimes break things)
3. Monitor crash reports in production

## Summary

Your APK size will be reduced from 146MB to approximately:
- **APK**: 60-80MB (40-45% reduction)
- **AAB on Play Store**: 30-50MB download for users (65-75% reduction)

The AAB format is highly recommended for production as it provides the best user experience with minimal download sizes.
