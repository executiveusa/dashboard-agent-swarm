import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const STORAGE_KEY = 'agent_offline_queue_v1';

export interface QueuedCommand<TPayload = unknown> {
  id: string;
  payload: TPayload;
  createdAt: number;
  attempts: number;
}

const createId = () => `queue_${Math.random().toString(36).slice(2, 10)}`;

const parseQueue = (raw: string | null): QueuedCommand[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as QueuedCommand[];
    }
    return [];
  } catch {
    return [];
  }
};

export const useOfflineQueue = <TPayload,>(
  processor: (command: QueuedCommand<TPayload>) => Promise<void>,
) => {
  const [queue, setQueue] = useState<QueuedCommand<TPayload>[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const processingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!mounted) return;
      setQueue(parseQueue(raw) as QueuedCommand<TPayload>[]);
    };
    void load();
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(Boolean(state.isConnected));
    });
    void Network.getNetworkStateAsync().then((state) => {
      setIsOnline(Boolean(state.isConnected));
    });
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const persistQueue = useCallback(async (next: QueuedCommand<TPayload>[]) => {
    setQueue(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const enqueue = useCallback(
    async (payload: TPayload) => {
      const command: QueuedCommand<TPayload> = {
        id: createId(),
        payload,
        createdAt: Date.now(),
        attempts: 0,
      };
      const next = [...queue, command];
      await persistQueue(next);
      return command;
    },
    [persistQueue, queue],
  );

  const flush = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const nextQueue: QueuedCommand<TPayload>[] = [];
      for (const command of queue) {
        try {
          await processor({ ...command, attempts: command.attempts + 1 });
        } catch (error) {
          console.warn(
            `Queue command failed (id: ${command.id}, attempts: ${command.attempts + 1}, payload: ${JSON.stringify(command.payload)})`,
            error
          );
          nextQueue.push({ ...command, attempts: command.attempts + 1 });
        }
      }
      await persistQueue(nextQueue);
    } finally {
      processingRef.current = false;
    }
  }, [persistQueue, processor, queue]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      void flush();
    }
  }, [flush, isOnline, queue.length]);

  const clear = useCallback(async () => {
    await persistQueue([]);
  }, [persistQueue]);

  return useMemo(
    () => ({ queue, enqueue, flush, clear, isOnline }),
    [queue, enqueue, flush, clear, isOnline],
  );
};
