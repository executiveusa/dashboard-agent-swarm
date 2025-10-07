import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import Constants from 'expo-constants';

interface LovableExtraConfig {
  lovableProjectId?: string;
  lovableApiKey?: string;
  lovableApiUrl?: string;
  lovableMemoryUrl?: string;
}

interface LovableCloudContextValue {
  projectId: string;
  apiKey: string;
  apiUrl: string;
  memoryUrl?: string;
  isAuthenticated: boolean;
  setCredentials: (credentials: Partial<LovableCredentials>) => void;
  clearCredentials: () => void;
}

interface LovableCredentials {
  projectId: string;
  apiKey: string;
  apiUrl: string;
  memoryUrl?: string;
}

const LovableCloudContext = createContext<LovableCloudContextValue | undefined>(undefined);

const getInitialCredentials = (): LovableCredentials => {
  const extra = ((Constants as unknown as { expoConfig?: { extra?: LovableExtraConfig } }).expoConfig?.extra ?? {}) as LovableExtraConfig;
  return {
    projectId: extra.lovableProjectId ?? '',
    apiKey: extra.lovableApiKey ?? '',
    apiUrl: extra.lovableApiUrl ?? '/api/lovable',
    memoryUrl: extra.lovableMemoryUrl ?? undefined,
  };
};

export const LovableCloudProvider = ({ children }: PropsWithChildren) => {
  const defaults = useMemo(() => getInitialCredentials(), []);
  const [credentials, setCredentials] = useState<LovableCredentials>(defaults);

  const update = useCallback((next: Partial<LovableCredentials>) => {
    setCredentials((prev) => ({ ...prev, ...next }));
  }, []);

  const clear = useCallback(() => {
    setCredentials({ ...defaults, projectId: '', apiKey: '' });
  }, [defaults]);

  const value = useMemo<LovableCloudContextValue>(
    () => ({
      projectId: credentials.projectId,
      apiKey: credentials.apiKey,
      apiUrl: credentials.apiUrl,
      memoryUrl: credentials.memoryUrl,
      isAuthenticated: Boolean(credentials.projectId && credentials.apiKey),
      setCredentials: update,
      clearCredentials: clear,
    }),
    [clear, credentials, update],
  );

  return <LovableCloudContext.Provider value={value}>{children}</LovableCloudContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLovableCloud = (): LovableCloudContextValue => {
  const context = useContext(LovableCloudContext);
  if (!context) {
    throw new Error('useLovableCloud must be used within a LovableCloudProvider');
  }
  return context;
};
