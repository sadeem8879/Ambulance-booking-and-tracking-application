import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function UserLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e53935',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#ffffff',
          height: 90,
          paddingTop: 8,
          paddingBottom: 24,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          elevation: 15,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 8,
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive,
            ]}>
              <View style={focused ? styles.iconGlow : {}}>
                <IconSymbol 
                  size={28} 
                  name="house.fill" 
                  color={focused ? '#e53935' : '#666'}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Book Ambulance',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive,
            ]}>
              <View style={focused ? styles.iconGlow : {}}>
                <IconSymbol 
                  size={28} 
                  name="heart.fill" 
                  color={focused ? '#e53935' : '#666'}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'Track',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive,
            ]}>
              <View style={focused ? styles.iconGlow : {}}>
                <IconSymbol 
                  size={28} 
                  name="map.fill" 
                  color={focused ? '#e53935' : '#666'}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tracking_temp"
        options={{
          href: null,
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
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginHorizontal: 8,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
  },
  iconGlow: {
    shadowColor: '#e53935',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 6,
  },
});