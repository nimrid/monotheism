import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

type ReadingSettings = {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  autoScroll: boolean;
  verseNumbers: boolean;
  dailyReminder: boolean;
  reminderTime: string;
  keepScreenOn: boolean;
  nightMode: boolean;
  highlightVerses: boolean;
};

const SETTINGS_KEY = '@reading_settings';

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 'medium',
  autoScroll: false,
  verseNumbers: true,
  dailyReminder: false,
  reminderTime: '09:00',
  keepScreenOn: false,
  nightMode: false,
  highlightVerses: true,
};

export default function ReadingSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: ReadingSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = <K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all reading settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => saveSettings(DEFAULT_SETTINGS),
        },
      ]
    );
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
          <Text style={[styles.title, { color: colors.text }]}>Reading Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Text Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Text Display</Text>
            
            <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="textformat" size={22} color={colors.secondaryText} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Font Size</Text>
                </View>
              </View>
              
              <View style={styles.fontSizeOptions}>
                {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeButton,
                      { backgroundColor: colors.buttonBg, borderColor: colors.border },
                      settings.fontSize === size && styles.fontSizeButtonActive,
                    ]}
                    onPress={() => updateSetting('fontSize', size)}
                  >
                    <Text
                      style={[
                        styles.fontSizeButtonText,
                        { color: colors.secondaryText },
                        settings.fontSize === size && styles.fontSizeButtonTextActive,
                      ]}
                    >
                      {size === 'small' && 'A'}
                      {size === 'medium' && 'A'}
                      {size === 'large' && 'A'}
                      {size === 'xlarge' && 'A'}
                    </Text>
                    <Text
                      style={[
                        styles.fontSizeLabel,
                        { color: colors.tertiaryText },
                        settings.fontSize === size && styles.fontSizeLabelActive,
                      ]}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="number" size={22} color={colors.secondaryText} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Show Verse Numbers</Text>
                </View>
                <Switch
                  value={settings.verseNumbers}
                  onValueChange={(value) => updateSetting('verseNumbers', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="highlighter" size={22} color={colors.secondaryText} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Enable Highlighting</Text>
                </View>
                <Switch
                  value={settings.highlightVerses}
                  onValueChange={(value) => updateSetting('highlightVerses', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>
          </View>

          {/* Reading Experience */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reading Experience</Text>
            
            <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="arrow.down.circle" size={22} color={colors.secondaryText} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, { color: colors.text }]}>Auto-scroll</Text>
                    <Text style={[styles.settingDescription, { color: colors.tertiaryText }]}>
                      Automatically scroll while reading
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.autoScroll}
                  onValueChange={(value) => updateSetting('autoScroll', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="sun.max" size={22} color={colors.secondaryText} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, { color: colors.text }]}>Keep Screen On</Text>
                    <Text style={[styles.settingDescription, { color: colors.tertiaryText }]}>
                      Prevent screen from dimming while reading
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.keepScreenOn}
                  onValueChange={(value) => updateSetting('keepScreenOn', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>
          </View>

          {/* Reminders */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminders</Text>
            
            <View style={[styles.settingCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <IconSymbol name="bell" size={22} color={colors.secondaryText} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, { color: colors.text }]}>Daily Reading Reminder</Text>
                    <Text style={[styles.settingDescription, { color: colors.tertiaryText }]}>
                      Get notified to read daily
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.dailyReminder}
                  onValueChange={(value) => updateSetting('dailyReminder', value)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              {settings.dailyReminder && (
                <>
                  <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <IconSymbol name="clock" size={22} color={colors.secondaryText} />
                      <Text style={[styles.settingText, { color: colors.text }]}>Reminder Time</Text>
                    </View>
                    <View style={styles.settingRight}>
                      <Text style={[styles.settingValue, { color: colors.secondaryText }]}>
                        {settings.reminderTime}
                      </Text>
                      <IconSymbol name="chevron.right" size={20} color={colors.tertiaryText} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={resetSettings}
          >
            <IconSymbol name="arrow.counterclockwise" size={20} color={colors.secondaryText} />
            <Text style={[styles.resetButtonText, { color: colors.secondaryText }]}>
              Reset to Default Settings
            </Text>
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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
  },
  settingDivider: {
    height: 1,
    marginLeft: 58,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  fontSizeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  fontSizeButtonActive: {
    backgroundColor: '#ff9500',
    borderColor: '#ff9500',
  },
  fontSizeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  fontSizeButtonTextActive: {
    color: '#fff',
  },
  fontSizeLabel: {
    fontSize: 12,
  },
  fontSizeLabelActive: {
    color: '#fff',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
