import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#ffffff',
          height: 85,
          paddingTop: 12,
          paddingBottom: 22,
          shadowColor: '#e53935',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: -6 },
          shadowRadius: 16,
          elevation: 20,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 6,
          letterSpacing: 0.3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive,
            ]}>
              <View style={focused ? styles.iconGlow : {}}>
                <IconSymbol 
                  size={26} 
                  name="house.fill" 
                  color={focused ? '#e53935' : color}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive,
            ]}>
              <View style={focused ? styles.iconGlow : {}}>
                <IconSymbol 
                  size={26} 
                  name="paperplane.fill" 
                  color={focused ? '#e53935' : color}
                />
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 12,
  },
  iconContainerActive: {
    backgroundColor: '#e5393520',
  },
  iconGlow: {
    shadowColor: '#e53935',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
});
