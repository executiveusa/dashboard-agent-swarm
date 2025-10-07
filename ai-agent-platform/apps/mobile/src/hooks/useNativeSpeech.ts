import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as SpeechRecognition from 'expo-speech-recognition';

interface Options {
  onTranscript: (transcript: string) => void;
}

interface RecognitionResult {
  transcription?: string;
  isFinal?: boolean;
}

export const useNativeSpeech = ({ onTranscript }: Options) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    let mounted = true;
    void SpeechRecognition.isAvailableAsync().then((available) => {
      if (mounted) setIsAvailable(Boolean(available));
    });
    return () => {
      mounted = false;
      void SpeechRecognition.stopAsync().catch(() => undefined);
    };
  }, []);

  const start = useCallback(async () => {
    if (!isAvailable || isListening) return;
    try {
      const session = await SpeechRecognition.startAsync({
        onResult: (result: RecognitionResult) => {
          if (!result) return;
          const transcript = result.transcription?.trim();
          if (transcript && result.isFinal) {
            onTranscript(transcript);
          }
        },
      });
      sessionRef.current = session;
      setIsListening(true);
      setError(null);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
    }
  }, [isAvailable, isListening, onTranscript]);

  const stop = useCallback(async () => {
    if (!sessionRef.current) {
      await SpeechRecognition.stopAsync().catch(() => undefined);
      setIsListening(false);
      return;
    }
    try {
      await sessionRef.current.stop();
    } finally {
      sessionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    return new Promise<void>((resolve, reject) => {
      setIsSpeaking(true);
      Speech.speak(text, {
        onDone: () => {
          setIsSpeaking(false);
          resolve();
        },
        onStopped: () => {
          setIsSpeaking(false);
          resolve();
        },
        onError: (speechError) => {
          setIsSpeaking(false);
          const errorMessage =
            typeof speechError === 'string'
              ? speechError
              : speechError?.message ?? 'Speech synthesis failed';
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
      });
    });
  }, []);

  const cancelSpeech = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return useMemo(
    () => ({
      isAvailable,
      isListening,
      isSpeaking,
      start,
      stop,
      speak,
      cancelSpeech,
      error,
    }),
    [cancelSpeech, error, isAvailable, isListening, isSpeaking, speak, start, stop],
  );
};
