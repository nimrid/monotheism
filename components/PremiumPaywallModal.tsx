/**
 * PremiumPaywallModal
 * -------------------
 * Shared premium paywall component used by Bible Stories, Parables,
 * and Bible Definitions screens.
 *
 * Props:
 *   visible          – controls modal visibility
 *   onClose          – called when user dismisses the modal
 *   onSuccess        – called after a successful payment + backend sync
 *
 * Internally handles:
 *   - Wallet connection check
 *   - On-chain SKR SPL token transfer (200 SKR, one-time)
 *   - Backend subscription sync
 *   - All error cases with user-friendly alerts
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSolanaPayment } from '@/hooks/useSolanaPayment';
import { syncSubscriptionWithBackend } from '@/utils/subscription';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Config ───────────────────────────────────────────────────────────────────
const RECIPIENT_WALLET =
  process.env.EXPO_PUBLIC_RECIPIENT_WALLET ?? 'GaJrqsUVQ5k5dmX8iacT9F4fHJrp9v11qXPzwWcAHkED';
const PREMIUM_COST_SKR = 400;

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after premium is successfully purchased and synced */
  onSuccess: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PremiumPaywallModal({ visible, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const router = useRouter();
  const { paying, payWithSKR } = useSolanaPayment();
  const { signAndSendTransaction } = useMobileWallet();

  const handlePurchase = async () => {
    if (!walletAddress) {
      Alert.alert(
        'Wallet Required',
        'Please connect your Solana wallet first.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Profile',
            onPress: () => {
              onClose();
              router.push('/(tabs)/profile');
            },
          },
        ]
      );
      return;
    }

    try {
      const result = await payWithSKR(
        RECIPIENT_WALLET,
        PREMIUM_COST_SKR,
        async (transaction) => {
          // Use the useMobileWallet hook's signAndSendTransaction
          const signature = await signAndSendTransaction(transaction, 0);
          return signature;
        }
      );

      // ── Already paid case: subscription was found on backend ──────────────
      if (result.alreadyPaid) {
        Alert.alert(
          '✅ Premium Restored',
          'Your premium subscription is already active — no payment needed!'
        );
        onSuccess();
        onClose();
        return;
      }

      // ── Fresh payment: sync to backend ────────────────────────────────────
      console.log('[Premium] Payment confirmed. Signature:', result.signature);

      const synced = await syncSubscriptionWithBackend(
        walletAddress,
        result.signature,
        PREMIUM_COST_SKR
      );

      if (!synced) {
        Alert.alert(
          'Payment Confirmed',
          'Your SKR payment was confirmed on-chain. Premium access is now active.\n\n(Note: server sync had an issue — your access is still valid.)'
        );
      } else {
        Alert.alert('🎉 Premium Unlocked!', 'You now have lifetime access to all premium content.');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      const code = error?.code ?? '';
      if (code === 'WALLET_NOT_CONNECTED') return;
      if (code === 'USER_REJECTED') {
        Alert.alert('Cancelled', 'Transaction was cancelled.');
        return;
      }
      if (code === 'INSUFFICIENT_BALANCE') {
        Alert.alert('Insufficient Balance', error.message);
        return;
      }
      Alert.alert(
        'Payment Failed',
        error.message ?? 'Unable to process payment. Please try again.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/app-logo.jpg')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Premium Access
            </Text>
          </View>

          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Unlock unlimited access to all Bible Stories, Parables, and
            Definitions — once, forever.
          </Text>

          {/* Feature list */}
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={[styles.featureLabel, { color: colors.text }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Price box */}
          <View style={[styles.priceBox, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {PREMIUM_COST_SKR} SKR
            </Text>
            <Text style={[styles.priceNote, { color: colors.secondaryText }]}>
              One-time · Lifetime access
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              { backgroundColor: colors.primary },
              paying && styles.ctaBtnDisabled,
            ]}
            onPress={handlePurchase}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.ctaBtnText}>Unlock Premium Access</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.secureNote, { color: colors.tertiaryText }]}>
            🔒 Secure · On-chain SKR payment via Solana
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Feature list data ────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📖', label: '373 Bible Stories' },
  { icon: '✝️', label: 'All Parables of Jesus' },
  { icon: '📚', label: "Bible Dictionary" },
  { icon: '📺', label: 'Hermeneutics Video Sermons' },
  { icon: '📅', label: 'Custom Reading Plans' },
  { icon: '♾️', label: 'Lifetime Access' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  priceBox: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 13,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secureNote: {
    fontSize: 13,
    textAlign: 'center',
  },
});
