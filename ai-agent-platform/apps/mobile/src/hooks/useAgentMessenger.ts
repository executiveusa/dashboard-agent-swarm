import { useCallback } from 'react';
import type { TaskArchetype } from '@ai-agent-platform/shared';
import { useMessageActions } from './useSharedMessageBus';
import { useLovableCloud } from '../providers/LovableCloudProvider';
import { useOfflineQueue, type QueuedCommand } from './useOfflineQueue';
import { sendAgentMessage, type AgentRequest, type AgentResult } from '../lib/agent';

interface SendOptions {
  archetype?: TaskArchetype;
  source?: 'text' | 'speech';
}

interface CommandPayload {
  request: AgentRequest;
  placeholderId: string;
}

const extractVoiceArtifact = (result: AgentResult) => {
  const candidates: Array<Record<string, unknown> | undefined> = [];
  if (Array.isArray(result.steps)) {
    candidates.push(...(result.steps as Array<Record<string, unknown> | undefined>));
  }
  if (Array.isArray((result as Record<string, unknown>).artifacts)) {
    candidates.push(...((result as Record<string, unknown>).artifacts as Array<Record<string, unknown>>));
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const audioUrl = findString(candidate, ['audioUrl', 'url', 'audio']);
    if (audioUrl) {
      const mimeType = findString(candidate, ['mimeType', 'contentType']);
      return { url: audioUrl, mimeType };
    }
    const base64 = findString(candidate, ['audioBase64', 'base64']);
    if (base64) {
      const mimeType = findString(candidate, ['mimeType', 'contentType']) ?? 'audio/mpeg';
      const normalized = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
      return { url: normalized, mimeType };
    }
  }
  return undefined;
};

const findString = (candidate: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (value && typeof value === 'object') {
      const nested = findString(value as Record<string, unknown>, keys);
      if (nested) return nested;
    }
  }
  return undefined;
};

export const useAgentMessenger = (defaultArchetype: TaskArchetype = 'general') => {
  const { appendUserMessage, appendAssistantMessage, updateMessage, setVoiceMetadata } = useMessageActions();
  const { apiKey, projectId, apiUrl } = useLovableCloud();

  const execute = useCallback(
    async (payload: CommandPayload) => {
      const result = await sendAgentMessage(payload.request, {
        apiKey,
        projectId,
        apiUrl,
      });
      updateMessage(payload.placeholderId, (message) => ({
        ...message,
        content: result.output,
        metadata: { ...message.metadata, pending: false, steps: result.steps, requestId: result.requestId },
        voice: message.voice ? { ...message.voice, status: 'idle', requestId: result.requestId } : undefined,
      }));
      const voice = extractVoiceArtifact(result);
      if (voice) {
        setVoiceMetadata(payload.placeholderId, {
          audioUrl: voice.url,
          mimeType: voice.mimeType,
          cached: voice.url.startsWith('data:'),
          status: 'idle',
          requestId: result.requestId,
        });
      }
      return result;
    },
    [apiKey, apiUrl, projectId, setVoiceMetadata, updateMessage],
  );

  const queue = useOfflineQueue<CommandPayload>(async (command: QueuedCommand<CommandPayload>) => {
    await execute(command.payload);
  });

  const send = useCallback(
    async (instructions: string, options: SendOptions = {}): Promise<AgentResult | { requestId: string; output: string }> => {
      const request: AgentRequest = {
        archetype: options.archetype ?? defaultArchetype,
        instructions,
      };
      appendUserMessage(instructions, { source: options.source ?? 'text' });
      const placeholder = appendAssistantMessage('…', {
        source: 'automation',
        metadata: { pending: true },
        voice: { status: 'loading' },
      });
      if (!queue.isOnline) {
        await queue.enqueue({ request, placeholderId: placeholder.id });
        updateMessage(placeholder.id, (message) => ({
          ...message,
          metadata: { ...message.metadata, queued: true },
          voice: message.voice ? { ...message.voice, status: 'paused' } : undefined,
        }));
        return { requestId: placeholder.id, output: 'Queued for delivery once online.' };
      }
      try {
        const result = await execute({ request, placeholderId: placeholder.id });
        return result;
      } catch (error) {
        updateMessage(placeholder.id, (message) => ({
          ...message,
          content: error instanceof Error ? error.message : 'Agent request failed',
          metadata: { ...message.metadata, pending: false, error: true },
          voice: undefined,
        }));
        throw error;
      }
    },
    [appendAssistantMessage, appendUserMessage, defaultArchetype, execute, queue, updateMessage],
  );

  return { send, queue };
};
