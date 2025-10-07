import type { ExpoConfig } from '@expo/config';

const withDefaults = (config: ExpoConfig): ExpoConfig => ({
  name: 'Agent Mobile',
  slug: 'agent-mobile',
  scheme: 'agentmobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android'],
  sdkVersion: '51.0.0',
  jsEngine: 'hermes',
  extra: {
    lovableProjectId:
      process.env.EXPO_PUBLIC_LOVABLE_PROJECT_ID ?? process.env.LOVABLE_PROJECT_ID ?? '',
    lovableApiKey:
      process.env.EXPO_PUBLIC_LOVABLE_API_KEY ?? process.env.LOVABLE_API_KEY ?? '',
    lovableApiUrl:
      process.env.EXPO_PUBLIC_LOVABLE_API_URL ?? process.env.LOVABLE_API_URL ?? '',
    lovableMemoryUrl:
      process.env.EXPO_PUBLIC_LOVABLE_MEMORY_URL ?? process.env.LOVABLE_MEMORY_URL ?? '',
    agentApiUrl: process.env.EXPO_PUBLIC_AGENT_API_URL ?? process.env.AGENT_API_URL ?? '',
  },
  updates: {
    url: process.env.EXPO_UPDATES_URL,
  },
  ...config,
});

export default ({ config }: { config: ExpoConfig }): ExpoConfig => withDefaults(config);
