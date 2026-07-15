import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionEvent = {
  results: ArrayLike<{ [index: number]: { transcript?: string } | undefined }>;
};

type RecognitionErrorEvent = {
  error: string;
};

type RecognitionInstance = {
  start: () => void;
  stop: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => RecognitionInstance;

interface SpeechRecognitionWindow extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (message: string) => void;
  lang?: string;
  continuous?: boolean;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { onResult, onError, lang = "en-US", continuous = false } = options;
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: RecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(" ");
      if (transcript) {
        onResult?.(transcript.trim());
      }
    };

    recognition.onerror = (event: RecognitionErrorEvent) => {
      const message =
        event.error === "not-allowed"
          ? "Microphone access was denied. Please enable permissions and try again."
          : event.error === "no-speech"
          ? "No speech detected. Try speaking louder or move closer to the microphone."
          : event.error === "aborted"
          ? null
          : `Speech recognition error: ${event.error}`;

      if (message) {
        setError(message);
        onError?.(message);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [continuous, lang, onError, onResult]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      const message = "Speech recognition is not supported in this browser.";
      setError(message);
      onError?.(message);
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access the microphone.";
      setError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
    error,
  };
}
