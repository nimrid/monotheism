import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  
  // Use system color scheme for tab styling
  const isDark = systemColorScheme === 'dark';
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#fff',
    text: isDark ? '#fff' : '#000',
    secondaryText: isDark ? '#aaa' : '#666',
    tertiaryText: isDark ? '#888' : '#999',
    border: isDark ? '#3a3a3a' : '#f0f0f0',
    buttonBg: isDark ? '#3a3a3a' : '#e8e8e8',
    primary: '#ff9500',
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiaryText,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 85,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          title: 'Read',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bookmark" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
