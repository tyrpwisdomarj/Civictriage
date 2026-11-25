import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLanguageCode = 'en-IN' | 'ml-IN';

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export interface UseSpeechInputOptions {
  initialLang?: SpeechLanguageCode;
  onTranscript: (finalText: string) => void;
}

export interface UseSpeechInputResult {
  isSupported: boolean;
  isListening: boolean;
  lang: SpeechLanguageCode;
  interimTranscript: string;
  error: string | null;
  setLang: (next: SpeechLanguageCode) => void;
  toggleLang: () => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

/**
 * Reusable Web Speech API hook supporting English (en-IN) and Malayalam (ml-IN).
 * Degrades gracefully when SpeechRecognition is unavailable in the browser.
 */
export function useSpeechInput({
  initialLang = 'en-IN',
  onTranscript,
}: UseSpeechInputOptions): UseSpeechInputResult {
  const [isSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionCtor()));
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lang, setLangState] = useState<SpeechLanguageCode>(initialLang);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors if already stopped
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    setInterimTranscript('');

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore
    }

    try {
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res?.[0]?.transcript ?? '';
          if (res.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }
        setInterimTranscript(interimChunk.trim());
        const cleaned = finalChunk.trim();
        if (cleaned) {
          onTranscriptRef.current(cleaned);
        }
      };

      recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
        const code = event?.error || 'unknown';
        if (code !== 'aborted' && code !== 'no-speech') {
          setError(
            code === 'not-allowed'
              ? 'Microphone permission denied.'
              : `Voice input paused (${code}).`
          );
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setError('Unable to start voice recognition.');
      setIsListening(false);
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const setLang = useCallback(
    (next: SpeechLanguageCode) => {
      setLangState(next);
      if (isListening) {
        stopListening();
      }
    },
    [isListening, stopListening]
  );

  const toggleLang = useCallback(() => {
    setLang(lang === 'en-IN' ? 'ml-IN' : 'en-IN');
  }, [lang, setLang]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    lang,
    interimTranscript,
    error,
    setLang,
    toggleLang,
    startListening,
    stopListening,
    toggleListening,
  };
}
