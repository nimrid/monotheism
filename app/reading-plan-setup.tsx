import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSolanaPayment } from '@/hooks/useSolanaPayment';
import { checkTrialStatus, createReadingPlanInDB, fetchReadingPlans, getReadingPlanById, SavedReadingPlan, TrialStatus } from '@/utils/database';
import { saveReadingPlanPreferences } from '@/utils/reading-plan';
import { syncSubscriptionWithBackend } from '@/utils/subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const RECIPIENT_WALLET = 'GaJrqsUVQ5k5dmX8iacT9F4fHJrp9v11qXPzwWcAHkED';
const COST_PER_DAY_SKR = 10;

// Identity used for Mobile Wallet Adapter authorization
const APP_IDENTITY = {
  name: 'Monotheism',
  uri: 'https://monotheism.app',
  icon: 'favicon.ico',
};

export default function ReadingPlanSetupScreen() {
  const { colors } = useTheme();
  const { walletAddress } = useUser();
  const router = useRouter();
  const { paying, payWithSKR } = useSolanaPayment();
  const [days, setDays] = useState('30');
  const [age, setAge] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState<SavedReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    loadSavedPlans();
    loadTrialStatus();
  }, [walletAddress]);

  const loadTrialStatus = async () => {
    if (!walletAddress) return;
    const status = await checkTrialStatus(walletAddress);
    setTrialStatus(status);
  };

  const loadSavedPlans = async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const plans = await fetchReadingPlans(walletAddress);
    setSavedPlans(plans);
    setLoading(false);
  };

  const handleCreatePlan = async () => {
    if (!walletAddress) {
      Alert.alert('Wallet Required', 'Please connect your wallet to create a reading plan');
      return;
    }
    
    const daysNum = parseInt(days);
    const ageNum = parseInt(age);

    if (!planName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your reading plan');
      return;
    }

    if (!daysNum || daysNum < 1 || daysNum > 365) {
      Alert.alert('Invalid Days', 'Please enter a number between 1 and 365');
      return;
    }

    if (!ageNum || ageNum < 5 || ageNum > 100) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 5 and 100');
      return;
    }

    // Check if payment is needed
    const needsPayment = trialStatus && !trialStatus.isTrialAvailable;
    const totalCost = daysNum * COST_PER_DAY_SKR;

    if (needsPayment) {
      // Show payment confirmation
      Alert.alert(
        'Payment Required',
        `This reading plan costs ${totalCost} SKR (${COST_PER_DAY_SKR} SKR per day × ${daysNum} days).\n\nProceed with payment?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay & Create', onPress: () => handlePaymentAndCreate(daysNum, ageNum, totalCost) },
        ]
      );
    } else {
      // Use trial
      await createPlanWithoutPayment(daysNum, ageNum);
    }
  };

  const handlePaymentAndCreate = async (daysNum: number, ageNum: number, totalCost: number) => {
    if (!walletAddress) {
      Alert.alert(
        'Wallet Required',
        'Please connect your wallet first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    try {
      console.log('[ReadingPlan] Starting SKR payment:', totalCost, 'SKR');

      // Provide the Mobile Wallet Adapter signer to the payment hook
      const result = await payWithSKR(
        RECIPIENT_WALLET,
        totalCost,
        async (transaction) => {
          return await transact(async (wallet: any) => {
            // Authorize the app with the wallet
            const authResult = await wallet.authorize({
              cluster: 'mainnet-beta',
              identity: APP_IDENTITY,
            });

            console.log('[ReadingPlan] Wallet authorized:', authResult.accounts[0]?.address);

            // Sign and send the pre-built transaction
            const results = await wallet.signAndSendTransactions({
              transactions: [transaction],
            });

            if (!results || results.length === 0) {
              throw new Error('No transaction result returned from wallet');
            }

            return results[0] as string;
          });
        }
      );

      console.log('[ReadingPlan] Payment confirmed. Signature:', result.signature);

      // Sync subscription to backend (non-blocking on failure)
      syncSubscriptionWithBackend(walletAddress, result.signature, totalCost).catch(
        (e) => console.warn('[ReadingPlan] Backend sync failed (non-fatal):', e)
      );

      // Create plan with payment signature
      await createPlanWithPayment(daysNum, ageNum, result.signature);
    } catch (error: any) {
      console.error('[ReadingPlan] Payment failed:', error);
      const code = error?.code ?? '';
      if (code === 'WALLET_NOT_CONNECTED') return; // alert already shown by hook
      if (code === 'INSUFFICIENT_BALANCE') {
        Alert.alert('Insufficient Balance', error.message);
        return;
      }
      if (code === 'USER_REJECTED') {
        Alert.alert('Cancelled', 'Transaction was cancelled.');
        return;
      }
      Alert.alert(
        'Payment Failed',
        error.message ?? 'Unable to process payment. Please try again.'
      );
    }
  };

  const createPlanWithoutPayment = async (daysNum: number, ageNum: number) => {
    setCreating(true);
    try {
      // Save to database (using trial)
      const savedPlan = await createReadingPlanInDB({
        walletAddress: walletAddress!,
        name: planName.trim(),
        days: daysNum,
        startDate,
        age: ageNum,
      });

      // Also save to local storage for backward compatibility
      await saveReadingPlanPreferences({
        days: daysNum,
        startDate,
        age: ageNum,
        createdAt: new Date().toISOString(),
      });

      // Save the active plan ID for progress tracking
      await AsyncStorage.setItem('@active_plan_id', savedPlan.id);

      Alert.alert('Success', `Reading plan created! (Trial ${trialStatus?.trialsUsed || 0}/2)`);
      
      // Reload plans and trial status
      await loadSavedPlans();
      await loadTrialStatus();
      
      // Clear form
      setPlanName('');
      setDays('30');
      setAge('');
      setStartDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create reading plan. Please try again.');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const createPlanWithPayment = async (daysNum: number, ageNum: number, paymentTxSignature: string) => {
    setCreating(true);
    try {
      // Save to database with payment signature
      const savedPlan = await createReadingPlanInDB({
        walletAddress: walletAddress!,
        name: planName.trim(),
        days: daysNum,
        startDate,
        age: ageNum,
        paymentTxSignature,
      });

      // Also save to local storage for backward compatibility
      await saveReadingPlanPreferences({
        days: daysNum,
        startDate,
        age: ageNum,
        createdAt: new Date().toISOString(),
      });

      // Save the active plan ID for progress tracking
      await AsyncStorage.setItem('@active_plan_id', savedPlan.id);

      Alert.alert('Success', 'Reading plan created successfully!');
      
      // Reload plans
      await loadSavedPlans();
      
      // Clear form
      setPlanName('');
      setDays('30');
      setAge('');
      setStartDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create reading plan. Please try again.');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleLoadPlan = async (plan: SavedReadingPlan) => {
    if (!walletAddress) {
      Alert.alert('Wallet Required', 'Please connect your wallet to load a reading plan');
      return;
    }
    
    try {
      // Load the full plan details
      const fullPlan = await getReadingPlanById(walletAddress, plan.id);
      if (!fullPlan) {
        Alert.alert('Error', 'Failed to load reading plan');
        return;
      }

      // Save to local storage to activate it
      await saveReadingPlanPreferences({
        days: fullPlan.days,
        startDate: fullPlan.startDate,
        age: fullPlan.age,
        createdAt: fullPlan.createdAt,
      });

      // Save the active plan ID for progress tracking
      await AsyncStorage.setItem('@active_plan_id', plan.id);

      // Navigate to reading plan view
      router.push('/reading-plan');
    } catch (error) {
      Alert.alert('Error', 'Failed to load reading plan');
      console.error(error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Create Reading Plan</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Saved Plans Section */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading saved plans...</Text>
            </View>
          ) : savedPlans.length > 0 ? (
            <View style={styles.savedPlansSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Reading Plans</Text>
              {savedPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.savedPlanCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleLoadPlan(plan)}
                >
                  <View style={styles.savedPlanHeader}>
                    <Text style={[styles.savedPlanName, { color: colors.text }]}>{plan.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: plan.status === 'active' ? '#e6f7e6' : '#f0f0f0' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: plan.status === 'active' ? '#2d7a2d' : colors.tertiaryText }
                      ]}>
                        {plan.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.savedPlanDetails}>
                    <Text style={[styles.savedPlanDetail, { color: colors.secondaryText }]}>
                      📅 {plan.days} days
                    </Text>
                    <Text style={[styles.savedPlanDetail, { color: colors.secondaryText }]}>
                      🗓️ Starts {new Date(plan.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.savedPlanFooter}>
                    <Text style={[styles.savedPlanDate, { color: colors.tertiaryText }]}>
                      Created {new Date(plan.createdAt).toLocaleDateString()}
                    </Text>
                    <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📖</Text>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {savedPlans.length > 0 ? 'Create Another Plan' : 'Personalized Bible Reading'}
            </Text>
            <Text style={[styles.infoText, { color: colors.secondaryText }]}>
              Create a custom reading plan tailored to your schedule and reading pace. Complete the entire Bible in your chosen timeframe.
            </Text>
          </View>

          {/* Trial Status Card */}
          {trialStatus && (
            <View style={[styles.trialCard, { backgroundColor: trialStatus.isTrialAvailable ? '#e6f7e6' : '#fff3e6' }]}>
              <Text style={styles.trialIcon}>{trialStatus.isTrialAvailable ? '🎁' : '💰'}</Text>
              <View style={styles.trialContent}>
                {trialStatus.isTrialAvailable ? (
                  <>
                    <Text style={[styles.trialTitle, { color: '#2d7a2d' }]}>
                      Free Trial Available
                    </Text>
                    <Text style={[styles.trialText, { color: '#2d7a2d' }]}>
                      {trialStatus.trialsRemaining} trial{trialStatus.trialsRemaining !== 1 ? 's' : ''} remaining
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.trialTitle, { color: '#ff9500' }]}>
                      Premium Plans
                    </Text>
                    <Text style={[styles.trialText, { color: '#ff9500' }]}>
                      {trialStatus.costPerDay} SKR per day
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Plan Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Plan Name</Text>
              <Text style={[styles.hint, { color: colors.tertiaryText }]}>Give your plan a memorable name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={planName}
                onChangeText={setPlanName}
                placeholder="e.g., Morning Devotional"
                placeholderTextColor={colors.tertiaryText}
              />
            </View>

            {/* Days Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Number of Days</Text>
              <Text style={[styles.hint, { color: colors.tertiaryText }]}>How many days to complete the Bible?</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.tertiaryText}
              />
              <View style={styles.quickOptions}>
                {['30', '90', '180', '365'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.quickOption,
                      { backgroundColor: colors.buttonBg, borderColor: colors.border },
                      days === option && styles.quickOptionActive
                    ]}
                    onPress={() => setDays(option)}
                  >
                    <Text style={[
                      styles.quickOptionText,
                      { color: colors.secondaryText },
                      days === option && styles.quickOptionTextActive
                    ]}>
                      {option} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start Date Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
              <Text style={[styles.hint, { color: colors.tertiaryText }]}>When do you want to begin?</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.tertiaryText}
              />
              <TouchableOpacity
                style={[styles.todayButton, { backgroundColor: colors.buttonBg }]}
                onPress={() => setStartDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[styles.todayButtonText, { color: colors.primary }]}>Start Today</Text>
              </TouchableOpacity>
            </View>

            {/* Age Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Your Age</Text>
              <Text style={[styles.hint, { color: colors.tertiaryText }]}>Helps estimate reading time</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={colors.tertiaryText}
              />
            </View>
          </View>

          {/* Cost Display */}
          {days && (
            <View style={[styles.costCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.costLabel, { color: colors.secondaryText }]}>
                {trialStatus?.isTrialAvailable ? 'Free (Trial)' : `Cost: ${parseInt(days) * COST_PER_DAY_SKR} SKR`}
              </Text>
              {!trialStatus?.isTrialAvailable && (
                <Text style={[styles.costDetail, { color: colors.tertiaryText }]}>
                  {COST_PER_DAY_SKR} SKR × {days} days
                </Text>
              )}
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity 
            style={[styles.createButton, (creating || paying) && styles.createButtonDisabled]} 
            onPress={handleCreatePlan}
            disabled={creating || paying}
          >
            {creating || paying ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.createButtonText}>{paying ? 'Processing Payment...' : 'Creating...'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.createButtonText}>Create My Reading Plan</Text>
                <IconSymbol name="arrow.right" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#fff3e6',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  infoIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickOptionActive: {
    backgroundColor: '#ff9500',
    borderColor: '#ff9500',
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickOptionTextActive: {
    color: '#fff',
  },
  todayButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9500',
    padding: 18,
    borderRadius: 16,
    marginTop: 32,
    gap: 8,
    elevation: 3,
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  savedPlansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  savedPlanCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  savedPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedPlanName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  savedPlanDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  savedPlanDetail: {
    fontSize: 14,
  },
  savedPlanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedPlanDate: {
    fontSize: 12,
  },
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  trialIcon: {
    fontSize: 32,
  },
  trialContent: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trialText: {
    fontSize: 14,
  },
  costCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  costDetail: {
    fontSize: 13,
  },
});
