import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let cachedClient: SupabaseClient | undefined;

export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      storageKey: 'ai-agent-platform-edge',
    },
  });
  return cachedClient;
};
