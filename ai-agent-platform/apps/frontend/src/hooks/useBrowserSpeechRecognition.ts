'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  onTranscript: (transcript: string) => void;
}

interface SpeechRecognitionEventWithResults extends Event {
  results: SpeechRecognitionResultList;
}

type RecognitionInstance = SpeechRecognition & {
  stop(): void;
};

export const useBrowserSpeechRecognition = ({ onTranscript }: Options) => {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepAliveRef = useRef(false);

  useEffect(() => {
    const SpeechRecognitionConstructor =
      (typeof window !== 'undefined' &&
        ((window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
          (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
      null;
    if (SpeechRecognitionConstructor) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionConstructor() as RecognitionInstance;
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language;
      recognition.onresult = (event: SpeechRecognitionEventWithResults) => {
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results.item(i);
          if (result?.isFinal) {
            const transcript = result[0]?.transcript?.trim();
            if (transcript) {
              onTranscript(transcript);
            }
          }
        }
      };
      recognition.onerror = (event) => {
        const speechError = (event as SpeechRecognitionErrorEvent).error;
        setError(speechError);
        keepAliveRef.current = false;
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
        if (keepAliveRef.current) {
          try {
            recognition.start();
            setIsListening(true);
          } catch (startError) {
            setError(startError instanceof Error ? startError.message : String(startError));
            keepAliveRef.current = false;
          }
        }
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    keepAliveRef.current = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError));
      keepAliveRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : String(stopError));
    } finally {
      setIsListening(false);
    }
  }, []);

  return {
    isSupported,
    isListening,
    start,
    stop,
    error,
  };
};
