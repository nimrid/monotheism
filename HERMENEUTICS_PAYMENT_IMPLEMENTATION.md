# Hermeneutics Video Payment Implementation

## Overview

Added pay-per-view functionality to the Hermeneutics screen. Users must pay 0.005 SOL to watch each video.

## Changes Made

### 1. Payment Configuration
```typescript
const RECIPIENT_WALLET = 'GaJrqsUVQ5k5dmX8iacT9F4fHJrp9v11qXPzwWcAHkED';
const WATCH_VIDEO_COST = 5000000; // 0.005 SOL (devnet)
```

### 2. Added Wallet Integration
- Imported `useMobileWallet` hook
- Imported Solana transaction utilities
- Added payment state management

### 3. Payment Flow
```typescript
handlePayAndWatch(sermon) {
  1. Check if wallet is connected
  2. Show payment processing indicator
  3. Create and send transaction (0.005 SOL)
  4. On success: Open video player
  5. On failure: Show error alert
}
```

### 4. UI Enhancements

**Description Card:**
- Added pricing badge showing "0.005 SOL per video"
- Includes play icon for visual clarity

**Video Cards:**
- Price badge on each thumbnail (top-right corner)
- Loading indicator during payment processing
- Disabled state while payment is processing

## User Experience

### Before Payment:
1. User sees video grid with price badges
2. Taps on any video
3. If not connected → Prompted to connect wallet
4. If connected → Payment processing starts

### During Payment:
- Play button shows loading spinner
- Card is disabled to prevent double-taps
- Console logs track payment progress

### After Payment:
- **Success**: Video opens in fullscreen modal
- **Failure**: Error alert with helpful message

## Features

✅ Wallet connection check
✅ Payment processing with visual feedback
✅ Error handling with user-friendly messages
✅ Price display on each video
✅ Loading states during payment
✅ Devnet configuration (0.005 SOL)

## Testing Checklist

- [ ] Connect wallet from Profile screen
- [ ] Ensure wallet has at least 0.005 SOL on devnet
- [ ] Tap on a video
- [ ] Confirm payment in wallet app
- [ ] Video should open after payment
- [ ] Try without wallet connected (should prompt)
- [ ] Try with insufficient balance (should show error)

## Price Justification

**0.005 SOL per video** (~$0.50-$1.00 depending on SOL price)

- Educational content from The Bible Project
- High-quality biblical teaching
- Reasonable for premium content
- Lower than typical streaming platforms
- Encourages thoughtful viewing

## Future Enhancements

### Potential Features:
1. **Video Bundles**: Buy 5 videos for 0.02 SOL (20% discount)
2. **Subscription**: Unlimited access for 0.05 SOL/month
3. **Watch History**: Track purchased videos
4. **Favorites**: Save videos for later
5. **Recommendations**: Suggest related videos
6. **Progress Tracking**: Resume where you left off

### Database Integration:
```sql
CREATE TABLE video_purchases (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  video_id VARCHAR(50),
  transaction_signature VARCHAR(255),
  amount_lamports BIGINT,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

This would allow:
- Tracking which videos users have purchased
- Allowing re-watch without repaying
- Analytics on popular videos
- Refund capability if needed

## Pricing Comparison

| Feature | Price | Equivalent |
|---------|-------|------------|
| Bible Dictionary Search | 0.002 SOL | ~$0.20 |
| Hermeneutics Video | 0.005 SOL | ~$0.50 |
| Suggested: AI Question | 0.002 SOL | ~$0.20 |
| Suggested: Commentary | 0.002 SOL | ~$0.20 |

## Revenue Potential

With 12 videos at 0.005 SOL each:
- Full catalog: 0.06 SOL (~$6-12)
- Average user watches: 3-5 videos
- Expected revenue per user: 0.015-0.025 SOL

## Notes

- All prices are in devnet SOL for testing
- Change to mainnet-beta for production
- Consider implementing purchase history
- May want to add video previews (free 30 seconds)
- Could offer first video free as a trial
