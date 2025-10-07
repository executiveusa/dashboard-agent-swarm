'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SharedMessage, VoicePlaybackStatus } from '@ai-agent-platform/shared';
import { useMessageSnapshot, useMessageActions } from './useSharedMessageBus';

interface PlaybackState {
  status: VoicePlaybackStatus;
  messageId?: string;
  error?: string;
}

const AUDIO_MIME_DEFAULT = 'audio/mpeg';

const isAudioUrl = (value?: string) => typeof value === 'string' && value.length > 0;

export const useVoicePlayback = () => {
  const { messages } = useMessageSnapshot();
  const { setVoiceMetadata, setPlayback } = useMessageActions();
  const [state, setState] = useState<PlaybackState>({ status: 'idle' });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeMessageRef = useRef<string | undefined>(undefined);

  const assistantMessages = useMemo(
    () => messages.filter((message) => message.role === 'assistant').reverse(),
    [messages],
  );

  const resetUtterance = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      utteranceRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    resetUtterance();
    if (activeMessageRef.current) {
      setVoiceMetadata(activeMessageRef.current, { status: 'paused' });
    }
    activeMessageRef.current = undefined;
    setState({ status: 'idle' });
    setPlayback({ status: 'idle', activeMessageId: undefined });
  }, [resetUtterance, setPlayback, setVoiceMetadata]);

  const playSpeechSynthesis = useCallback(
    (message: SharedMessage) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setState({ status: 'error', messageId: message.id, error: 'Speech synthesis not supported' });
        setVoiceMetadata(message.id, { status: 'error', error: 'Speech synthesis not supported' });
        return;
      }
      resetUtterance();
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => {
        setState({ status: 'idle' });
        setVoiceMetadata(message.id, { status: 'idle' });
        setPlayback({ status: 'idle', activeMessageId: undefined });
        activeMessageRef.current = undefined;
      };
      utterance.onerror = (event) => {
        const errorMessage = (event as SpeechSynthesisErrorEvent).error ?? 'Speech synthesis failed';
        setState({ status: 'error', messageId: message.id, error: errorMessage });
        setVoiceMetadata(message.id, { status: 'error', error: errorMessage });
        setPlayback({ status: 'error', activeMessageId: message.id });
      };
      utteranceRef.current = utterance;
      activeMessageRef.current = message.id;
      setVoiceMetadata(message.id, { status: 'playing', cached: true });
      setPlayback({ status: 'playing', activeMessageId: message.id });
      setState({ status: 'playing', messageId: message.id });
      window.speechSynthesis.speak(utterance);
    },
    [resetUtterance, setPlayback, setVoiceMetadata],
  );

  const ensureAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const loadAudio = useCallback(async (message: SharedMessage) => {
    if (!message.voice?.audioUrl) return undefined;
    if (message.voice.audioUrl.startsWith('data:')) {
      return message.voice.audioUrl;
    }
    if (message.voice.audioObjectUrl && message.voice.cached) {
      return message.voice.audioObjectUrl;
    }
    try {
      const response = await fetch(message.voice.audioUrl);
      if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setVoiceMetadata(message.id, {
        audioObjectUrl: objectUrl,
        cached: true,
        mimeType: blob.type || message.voice.mimeType || AUDIO_MIME_DEFAULT,
      });
      return objectUrl;
    } catch (audioError) {
      const errorMessage = audioError instanceof Error ? audioError.message : String(audioError);
      setVoiceMetadata(message.id, { status: 'error', error: errorMessage });
      setState({ status: 'error', messageId: message.id, error: errorMessage });
      return undefined;
    }
  }, [setVoiceMetadata]);

  const playMessage = useCallback(
    async (message: SharedMessage) => {
      if (activeMessageRef.current && activeMessageRef.current !== message.id) {
        stop();
      }
      if (!isAudioUrl(message.voice?.audioUrl)) {
        playSpeechSynthesis(message);
        return;
      }
      setVoiceMetadata(message.id, { status: 'loading' });
      setPlayback({ status: 'loading', activeMessageId: message.id });
      setState({ status: 'loading', messageId: message.id });
      const src = await loadAudio(message);
      if (!src) {
        playSpeechSynthesis(message);
        return;
      }
      const audio = ensureAudioElement();
      audio.src = src;
      audio.onended = () => {
        setVoiceMetadata(message.id, { status: 'idle' });
        setPlayback({ status: 'idle', activeMessageId: undefined });
        setState({ status: 'idle' });
        activeMessageRef.current = undefined;
      };
      audio.onerror = () => {
        setVoiceMetadata(message.id, { status: 'error', error: 'Unable to play audio' });
        setState({ status: 'error', messageId: message.id, error: 'Unable to play audio' });
        setPlayback({ status: 'error', activeMessageId: message.id });
      };
      try {
        activeMessageRef.current = message.id;
        setVoiceMetadata(message.id, { status: 'playing' });
        setPlayback({ status: 'playing', activeMessageId: message.id });
        setState({ status: 'playing', messageId: message.id });
        await audio.play();
      } catch (playError) {
        const errorMessage = playError instanceof Error ? playError.message : String(playError);
        setVoiceMetadata(message.id, { status: 'error', error: errorMessage });
        setState({ status: 'error', messageId: message.id, error: errorMessage });
        setPlayback({ status: 'error', activeMessageId: message.id });
      }
    },
    [ensureAudioElement, loadAudio, playSpeechSynthesis, setPlayback, setVoiceMetadata, stop],
  );

  const playLatest = useCallback(() => {
    const latest = assistantMessages.find((message) => message.voice?.status !== 'error');
    if (latest) {
      void playMessage(latest);
    }
  }, [assistantMessages, playMessage]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      resetUtterance();
    };
  }, [resetUtterance]);

  return useMemo(
    () => ({
      state,
      playLatest,
      stop,
      playMessage,
    }),
    [state, playLatest, stop, playMessage],
  );
};
