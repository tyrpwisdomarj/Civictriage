import React from 'react';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import { KERALA_EMERGENCY_HELPLINES } from '../shared/policeSchema';

interface EmergencyHelplineStripProps {
  compact?: boolean;
  title?: string;
}

const TONE_CLASSES: Record<
  (typeof KERALA_EMERGENCY_HELPLINES)[number]['tone'],
  { pill: string; number: string }
> = {
  rose: {
    pill: 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-900',
    number: 'bg-rose-600 text-white',
  },
  indigo: {
    pill: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-900',
    number: 'bg-indigo-600 text-white',
  },
  amber: {
    pill: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900',
    number: 'bg-amber-500 text-white',
  },
  sky: {
    pill: 'bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-900',
    number: 'bg-sky-600 text-white',
  },
  emerald: {
    pill: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900',
    number: 'bg-emerald-600 text-white',
  },
};

export const EmergencyHelplineStrip: React.FC<EmergencyHelplineStripProps> = ({
  compact = false,
  title = 'Kerala 24×7 Emergency & Civic Helplines',
}) => {
  if (compact) {
    return (
      <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-200/80">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Kerala Helplines
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KERALA_EMERGENCY_HELPLINES.map((line) => {
            const tone = TONE_CLASSES[line.tone];
            return (
              <a
                key={line.number}
                href={`tel:${line.number}`}
                title={`${line.label}: ${line.detail}`}
                className={`inline-flex items-center gap-1 pr-2 pl-1 py-0.5 rounded-md border text-[10px] font-semibold transition-colors ${tone.pill}`}
              >
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-extrabold font-mono ${tone.number}`}
                >
                  {line.number}
                </span>
                <span>{line.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Kerala Emergency Helplines"
      className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
            <PhoneCall className="w-3.5 h-3.5" />
          </span>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-[11px] text-slate-500">
              Tap any helpline to dial immediately during life-safety, power, water, or cyber emergencies.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          ERSS • Toll-Free
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {KERALA_EMERGENCY_HELPLINES.map((line) => {
          const tone = TONE_CLASSES[line.tone];
          return (
            <a
              key={line.number}
              href={`tel:${line.number}`}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all hover:shadow-sm ${tone.pill}`}
            >
              <span
                className={`px-2 py-1 rounded-lg text-xs font-extrabold font-mono shrink-0 shadow-xs ${tone.number}`}
              >
                {line.number}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">
                  {line.label}
                </p>
                <p className="text-[10px] opacity-80 truncate">{line.detail}</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
