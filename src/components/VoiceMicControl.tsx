import React from 'react';
import { Mic, MicOff, Languages } from 'lucide-react';
import {
  useSpeechInput,
  type SpeechLanguageCode,
} from '../hooks/useSpeechInput';

interface VoiceMicControlProps {
  onTranscript: (text: string) => void;
  variant?: 'toolbar' | 'compact';
  disabled?: boolean;
  initialLang?: SpeechLanguageCode;
}

export const VoiceMicControl: React.FC<VoiceMicControlProps> = ({
  onTranscript,
  variant = 'toolbar',
  disabled = false,
  initialLang = 'en-IN',
}) => {
  const {
    isSupported,
    isListening,
    lang,
    interimTranscript,
    error,
    toggleLang,
    toggleListening,
  } = useSpeechInput({ initialLang, onTranscript });

  if (!isSupported) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={toggleLang}
          disabled={disabled}
          title={
            lang === 'en-IN'
              ? 'Voice language: English (India) — click to switch to Malayalam'
              : 'Voice language: Malayalam (ml-IN) — click to switch to English'
          }
          className="px-1.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          {lang === 'en-IN' ? 'EN' : 'മല'}
        </button>
        <button
          type="button"
          onClick={toggleListening}
          disabled={disabled}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          title={
            isListening
              ? 'Listening... Click to stop'
              : `Speak in ${lang === 'en-IN' ? 'English (en-IN)' : 'Malayalam (ml-IN)'}`
          }
          className={`relative p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
            isListening
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-500/30 animate-pulse'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={toggleLang}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer disabled:opacity-50"
        title="Switch voice recognition language between English (en-IN) and Malayalam (ml-IN)"
      >
        <Languages className="w-3.5 h-3.5 text-sky-600" />
        <span>{lang === 'en-IN' ? 'English (en-IN)' : 'മലയാളം (ml-IN)'}</span>
      </button>

      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
          isListening
            ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-500/30 animate-pulse'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-3.5 h-3.5" />
            <span>Listening… Stop</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Input</span>
          </>
        )}
      </button>

      {interimTranscript && (
        <span className="text-[11px] italic text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md max-w-[220px] truncate">
          “{interimTranscript}”
        </span>
      )}

      {error && (
        <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
          {error}
        </span>
      )}
    </div>
  );
};
