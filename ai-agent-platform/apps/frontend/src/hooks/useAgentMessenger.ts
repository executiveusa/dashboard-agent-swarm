'use client';

import { useCallback } from 'react';
import type { AgentRequest, AgentResult } from '../lib/api';
import { sendAgentMessage } from '../lib/api';
import { useMessageActions } from './useSharedMessageBus';
import type { SharedMessage } from '@ai-agent-platform/shared';

type SendOptions = {
  archetype?: AgentRequest['archetype'];
  source?: SharedMessage['source'];
};

interface VoiceArtifact {
  url: string;
  mimeType?: string;
}

const extractVoiceArtifact = (result: AgentResult): VoiceArtifact | undefined => {
  const candidates: Array<Record<string, unknown> | undefined> = [];
  if (Array.isArray(result.steps)) {
    candidates.push(...(result.steps as Array<Record<string, unknown> | undefined>));
  }
  if (Array.isArray((result as Record<string, unknown>).artifacts)) {
    candidates.push(...(((result as Record<string, unknown>).artifacts as Array<Record<string, unknown>>) ?? []));
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const audioUrl = findString(candidate, ['audioUrl', 'url', 'audio']);
    if (audioUrl && audioUrl.startsWith('http')) {
      return { url: audioUrl, mimeType: findString(candidate, ['mimeType', 'contentType']) };
    }
    const base64 = findString(candidate, ['audioBase64', 'base64']);
    if (base64) {
      const mime = findString(candidate, ['mimeType', 'contentType']) ?? 'audio/mpeg';
      const normalized = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
      return { url: normalized, mimeType: mime };
    }
  }
  return undefined;
};

const findString = (value: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
    if (candidate && typeof candidate === 'object') {
      const nested = findString(candidate as Record<string, unknown>, keys);
      if (nested) return nested;
    }
  }
  return undefined;
};

export const useAgentMessenger = (defaultArchetype: AgentRequest['archetype'] = 'general') => {
  const { appendUserMessage, appendAssistantMessage, updateMessage } = useMessageActions();

  const send = useCallback(
    async (instructions: string, options: SendOptions = {}): Promise<AgentResult> => {
      const source = options.source ?? 'text';
      appendUserMessage(instructions, { source });
      const placeholder = appendAssistantMessage('…', {
        source: 'automation',
        metadata: { pending: true },
        voice: { status: 'loading' },
      });
      try {
        const result = await sendAgentMessage({
          archetype: options.archetype ?? defaultArchetype,
          instructions,
        });
        updateMessage(placeholder.id, (message) => ({
          ...message,
          content: result.output,
          metadata: { ...message.metadata, pending: false, steps: result.steps, requestId: result.requestId },
          voice: message.voice ? { ...message.voice, status: 'idle', requestId: result.requestId, lastUpdated: Date.now() } : undefined,
        }));
        const voice = extractVoiceArtifact(result);
        if (voice) {
          updateMessage(placeholder.id, (message) => ({
            ...message,
            voice: {
              status: 'idle',
              audioUrl: voice.url,
              mimeType: voice.mimeType,
              cached: voice.url.startsWith('data:'),
              requestId: result.requestId,
              lastUpdated: Date.now(),
            },
          }));
        }
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
    [appendAssistantMessage, appendUserMessage, defaultArchetype, updateMessage],
  );

  return { send };
};
