'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAgentMessenger } from './useAgentMessenger';
import { useBrowserSpeechRecognition } from './useBrowserSpeechRecognition';
import { useSharedMessages } from './useSharedMessageBus';
import { useVoicePlayback } from './useVoicePlayback';

export const useVoiceController = () => {
  const { send } = useAgentMessenger('voice');
  const messages = useSharedMessages();
  const [enabled, setEnabled] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const { state: playbackState, playMessage, stop: stopPlayback } = useVoicePlayback();

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      setPendingTranscript(trimmed);
      try {
        await send(trimmed, { source: 'speech', archetype: 'voice' });
      } finally {
        setPendingTranscript(null);
      }
    },
    [send],
  );

  const { isSupported, isListening, start, stop, error } = useBrowserSpeechRecognition({ onTranscript: handleTranscript });

  useEffect(() => {
    if (!enabled) return;
    if (!isSupported) return;
    start();
    return () => {
      stop();
    };
  }, [enabled, isSupported, start, stop]);

  useEffect(() => {
    if (!enabled) {
      stopPlayback();
    }
  }, [enabled, stopPlayback]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stop();
        stopPlayback();
      } else if (isSupported) {
        start();
      }
      return next;
    });
  }, [isSupported, start, stop, stopPlayback]);

  const latestAssistantWithVoice = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === 'assistant' && (message.voice?.audioUrl || message.voice?.cached)),
    [messages],
  );

  useEffect(() => {
    if (!enabled) return;
    if (!latestAssistantWithVoice) return;
    playMessage(latestAssistantWithVoice);
  }, [enabled, latestAssistantWithVoice, playMessage]);

  return {
    enabled,
    toggle,
    isSupported,
    isListening,
    pendingTranscript,
    playbackState,
    error,
  };
};
