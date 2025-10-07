import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LovableCloudProvider } from './src/providers/LovableCloudProvider';
import { AuthGate } from './src/components/AuthGate';
import { DashboardScreen } from './src/components/DashboardScreen';
import { ConsoleScreen } from './src/components/ConsoleScreen';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'console', label: 'Console' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <LovableCloudProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate>
          <View style={styles.container}>
            <View style={styles.tabBar}>
              {tabs.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}
                  onPress={() => setTab(item.id)}
                >
                  <Text style={[styles.tabLabel, tab === item.id && styles.tabLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.content}>
              {tab === 'dashboard' ? <DashboardScreen /> : <ConsoleScreen />}
            </View>
          </View>
        </AuthGate>
      </SafeAreaProvider>
    </LovableCloudProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderColor: '#0ea5e9',
  },
  tabLabel: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#f8fafc',
  },
  content: {
    flex: 1,
  },
});
