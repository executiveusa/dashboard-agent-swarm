import { useCallback, useSyncExternalStore } from 'react';
import { messageBus, type MessageSnapshot, type SharedMessage, type VoiceMetadata } from '@ai-agent-platform/shared';

export const useMessageSnapshot = (): MessageSnapshot =>
  useSyncExternalStore(messageBus.subscribe, messageBus.getSnapshot, messageBus.getSnapshot);

export const useSharedMessages = (): SharedMessage[] => useMessageSnapshot().messages;

export const useMessageActions = () => {
  const appendUserMessage = useCallback(
    (content: string, init?: Partial<Omit<SharedMessage, 'id' | 'content' | 'role' | 'createdAt'>>) =>
      messageBus.appendMessage('user', content, init),
    [],
  );

  const appendAssistantMessage = useCallback(
    (content: string, init?: Partial<Omit<SharedMessage, 'id' | 'content' | 'role' | 'createdAt'>>) =>
      messageBus.appendMessage('assistant', content, init),
    [],
  );

  const updateMessage = useCallback((id: string, updater: (message: SharedMessage) => SharedMessage) => {
    messageBus.updateMessage(id, updater);
  }, []);

  const setVoiceMetadata = useCallback((id: string, voice: Partial<VoiceMetadata>) => {
    messageBus.updateMessage(id, (message) => ({
      ...message,
      voice: {
        status: voice.status ?? message.voice?.status ?? 'idle',
        audioUrl: voice.audioUrl ?? message.voice?.audioUrl,
        audioObjectUrl: voice.audioObjectUrl ?? message.voice?.audioObjectUrl,
        mimeType: voice.mimeType ?? message.voice?.mimeType,
        cached: voice.cached ?? message.voice?.cached ?? false,
        requestId: voice.requestId ?? message.voice?.requestId,
        error: voice.error,
        lastUpdated: Date.now(),
      },
    }));
  }, []);

  return { appendUserMessage, appendAssistantMessage, updateMessage, setVoiceMetadata };
};
