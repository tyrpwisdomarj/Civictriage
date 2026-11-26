import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  CloudSun,
  ExternalLink,
  IndianRupee,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';
import { LiquidGlassCard } from '../LiquidGlassCard';
import type { SpotGalleryRequest } from '../SpotPictureLibraryDrawer';
import {
  WEEKEND_DURATIONS,
  WEEKEND_VIBES,
  type DayTimeBlock,
  type ExpenseCategory,
  type WeekendDuration,
  type WeekendItineraryData,
  type WeekendStopItem,
  type WeekendVibe,
} from '../../data/localLifeData';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

interface WeekendPlannerPanelProps {
  districtName: string;
  itinerary: WeekendItineraryData | null;
  onItineraryChange: (next: WeekendItineraryData) => void;
  onPinStopOnMap: (target: { name: string; district: string }) => void;
  onOpenSpotGallery?: (spot: SpotGalleryRequest) => void;
  onImportCostsToExpenses: (items: WeekendStopItem[], districtName: string) => void;
}

const QUICK_TWEAKS = [
  'Make it more budget-friendly under ₹2,000',
  'Add a scenic sunset viewpoint & specialty cafe',
  'Focus on vegetarian Kerala food & heritage craft',
];

export const WeekendPlannerPanel: React.FC<WeekendPlannerPanelProps> = ({
  districtName,
  itinerary,
  onItineraryChange,
  onPinStopOnMap,
  onOpenSpotGallery,
  onImportCostsToExpenses,
}) => {
  const [duration, setDuration] = useState<WeekendDuration>(
    itinerary?.duration ?? 'Full Weekend (Sat–Sun)'
  );
  const [vibe, setVibe] = useState<WeekendVibe>(
    itinerary?.vibe ?? 'Chill Cafes & Scenic Drives'
  );
  const [groupSize, setGroupSize] = useState<number>(itinerary?.groupSize ?? 3);
  const [budgetInr, setBudgetInr] = useState<number>(itinerary?.budgetInr ?? 3500);
  const [tweakPrompt, setTweakPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedToast, setImportedToast] = useState(false);
  const [pinnedStop, setPinnedStop] = useState<{ name: string; district: string } | null>(
    null
  );

  const allStops = useMemo(() => {
    if (!itinerary) return [];
    return [
      ...itinerary.saturday,
      ...itinerary.sunday,
      ...(itinerary.day3 ?? []),
    ];
  }, [itinerary]);

  const totalEstimated = useMemo(
    () => allStops.reduce((sum, item) => sum + (Number(item.estimatedCostInr) || 0), 0),
    [allStops]
  );

  const handleGenerate = async (customTweak?: string) => {
    const activeTweak = (customTweak ?? tweakPrompt).trim();
    const cacheKey = `weekend_v2::${districtName}::${duration}::${vibe}::${groupSize}::${budgetInr}::${activeTweak}`;
    const cached = readAiCache<WeekendItineraryData>(cacheKey);
    if (cached) {
      onItineraryChange(cached);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'weekend_plan',
          districtName,
          duration,
          vibe,
          groupSize,
          budgetInr,
          query: activeTweak,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && (Array.isArray(data.saturday) || Array.isArray(data.sunday))) {
        const normalizeStop = (s: any, prefix: string, i: number): WeekendStopItem => ({
          id: String(s.id || `${prefix}-${i}`),
          time: String(s.time || '10:00 AM'),
          block: (['Morning', 'Afternoon', 'Evening', 'Night'].includes(s.block)
            ? s.block
            : i === 0
              ? 'Morning'
              : i === 1
                ? 'Afternoon'
                : 'Evening') as DayTimeBlock,
          title: String(s.title || 'Local Highlight'),
          location: String(s.location || districtName),
          distanceFromPrev:
            typeof s.distanceFromPrev === 'string' && s.distanceFromPrev.trim()
              ? s.distanceFromPrev.trim()
              : i === 0
                ? 'Start Point'
                : '4.5 km',
          travelTimeFromPrev:
            typeof s.travelTimeFromPrev === 'string' && s.travelTimeFromPrev.trim()
              ? s.travelTimeFromPrev.trim()
              : i === 0
                ? '0 mins'
                : '14 mins drive',
          estimatedCostInr: Math.max(0, Number(s.estimatedCostInr) || 350),
          category: ([
            'Food & Cafes',
            'Local Transport & Fuel',
            'Travel Tickets',
            'Turf & Lifestyle',
            'Education & Books',
          ].includes(s.category)
            ? s.category
            : 'Turf & Lifestyle') as ExpenseCategory,
          tip: String(s.tip || 'Enjoy the local vibe.'),
          wikiQuery:
            typeof s.wikiQuery === 'string' && s.wikiQuery.trim()
              ? s.wikiQuery.trim()
              : String(s.location || s.title || districtName),
          done: Boolean(s.done),
        });

        const nextPlan: WeekendItineraryData = {
          id: `wk-${Date.now()}`,
          districtName,
          duration,
          vibe,
          groupSize,
          budgetInr,
          headline:
            typeof data.headline === 'string'
              ? data.headline
              : `${districtName} ${vibe} Plan`,
          weatherTip:
            typeof data.weatherTip === 'string'
              ? data.weatherTip
              : 'Pleasant tropical mornings; carry light rainwear for post-4 PM Western Ghats showers.',
          packingTips: Array.isArray(data.packingTips)
            ? data.packingTips.map(String).slice(0, 4)
            : ['Reusable water bottle', 'UPI QR ready', 'Comfortable walking shoes'],
          lastTweakPrompt: activeTweak || undefined,
          saturday: Array.isArray(data.saturday)
            ? data.saturday.map((s: any, i: number) => normalizeStop(s, 'sat', i))
            : [],
          sunday:
            duration === 'Saturday Only'
              ? []
              : Array.isArray(data.sunday)
                ? data.sunday.map((s: any, i: number) => normalizeStop(s, 'sun', i))
                : [],
          day3:
            duration === '3-Day Long Weekend' && Array.isArray(data.day3)
              ? data.day3.map((s: any, i: number) => normalizeStop(s, 'd3', i))
              : undefined,
          createdAt: new Date().toISOString(),
        };
        writeAiCache(cacheKey, nextPlan);
        onItineraryChange(nextPlan);
        if (customTweak) setTweakPrompt(customTweak);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleStop = (day: 'saturday' | 'sunday' | 'day3', id: string) => {
    if (!itinerary) return;
    const list = itinerary[day] ?? [];
    onItineraryChange({
      ...itinerary,
      [day]: list.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  const mapTarget = pinnedStop ?? {
    name: itinerary?.saturday[0]?.location || `${districtName} Town`,
    district: itinerary?.districtName || districtName,
  };
  const mapQuery = `${mapTarget.name}, ${mapTarget.district}, Kerala`;

  const renderDayList = (
    label: string,
    dayKey: 'saturday' | 'sunday' | 'day3',
    stops: WeekendStopItem[]
  ) => (
    <div className="space-y-2.5">
      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        {label} ({stops.length} stops)
      </h3>
      <div className="space-y-2.5">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
              stop.done
                ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200/80 dark:border-emerald-800/50 opacity-85'
                : 'bg-white/75 dark:bg-slate-900/70 border-white/80 dark:border-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleStop(dayKey, stop.id)}
                className="flex items-start gap-2.5 text-left cursor-pointer min-w-0 flex-1"
              >
                {stop.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10.5px] font-mono font-bold text-[#4F5BD5] dark:text-[#A5B4FC]">
                      {stop.time}
                    </span>
                    {stop.block && (
                      <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#7B83EB]/20 text-[#313DA8] dark:text-[#C7D2FE]">
                        {stop.block}
                      </span>
                    )}
                    {stop.distanceFromPrev && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" />
                        {stop.distanceFromPrev}
                        {stop.travelTimeFromPrev ? ` · ${stop.travelTimeFromPrev}` : ''}
                      </span>
                    )}
                  </div>
                  <h4
                    className={`text-xs sm:text-sm font-extrabold text-[#111315] dark:text-white mt-0.5 ${
                      stop.done ? 'line-through' : ''
                    }`}
                  >
                    {stop.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{stop.location}</span>
                  </p>
                </div>
              </button>

              <span className="font-mono text-xs font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full shrink-0 tabular-nums">
                ₹{stop.estimatedCostInr.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pl-6 text-[11px]">
              <p className="text-slate-600 dark:text-slate-300 flex-1 min-w-[150px]">{stop.tip}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenSpotGallery && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSpotGallery({
                        name: stop.wikiQuery || stop.location,
                        region: `${itinerary?.districtName || districtName}, Kerala`,
                        subtitle: `${stop.time} · ${stop.title}`,
                        description: stop.tip,
                        badge: stop.block || 'Weekend Stop',
                        googleMapsQuery: `${stop.location}, ${itinerary?.districtName || districtName}, Kerala`,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    Photos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = {
                      name: stop.location,
                      district: itinerary?.districtName || districtName,
                    };
                    setPinnedStop(next);
                    onPinStopOnMap(next);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFECE8] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[#4F5BD5] dark:text-[#A5B4FC] font-bold cursor-pointer"
                >
                  <MapPin className="w-3 h-3" />
                  Map
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Builder Card */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini Weekend Itinerary Architect · {districtName}</span>
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white">
            Hour-by-Hour Route, Distances, Photos &amp; Live AI Refinements
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Trip Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as WeekendDuration)}
              className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              {WEEKEND_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Weekend Vibe
            </label>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value as WeekendVibe)}
              className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              {WEEKEND_VIBES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1.5 sm:col-span-1 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Users className="w-3 h-3" /> Pax
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 2))}
              className="w-full glass-pill-input px-2.5 py-2.5 text-xs font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <IndianRupee className="w-3 h-3" /> Budget
            </label>
            <input
              type="number"
              min={500}
              step={250}
              value={budgetInr}
              onChange={(e) => setBudgetInr(Math.max(500, Number(e.target.value) || 3000))}
              className="w-full glass-pill-input px-3 py-2.5 text-xs font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGenerate()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
              )}
              <span>Architect</span>
            </button>
          </div>
        </div>

        {/* Live AI Tweak Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={tweakPrompt}
              onChange={(e) => setTweakPrompt(e.target.value)}
              placeholder="Custom AI tweak (e.g., Add a waterfall stop before lunch, strictly veg cafes)..."
              className="flex-1 glass-pill-input px-4 py-2 text-xs font-medium"
            />
            <button
              type="button"
              disabled={loading || !tweakPrompt.trim()}
              onClick={() => void handleGenerate(tweakPrompt)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Apply AI Tweak</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_TWEAKS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={loading}
                onClick={() => void handleGenerate(preset)}
                className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#4F5BD5]/15 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              >
                ✦ {preset}
              </button>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Active Itinerary + Linked Map */}
      {itinerary && (
        <div className="space-y-5">
          <LiquidGlassCard interactive={false} className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/10">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                  {itinerary.headline}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Estimated Total:{' '}
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    ₹{totalEstimated.toLocaleString('en-IN')}
                  </strong>{' '}
                  (Budget ₹{itinerary.budgetInr.toLocaleString('en-IN')} · {itinerary.groupSize}{' '}
                  people · {itinerary.duration || 'Full Weekend (Sat–Sun)'})
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onImportCostsToExpenses(allStops, itinerary.districtName);
                  setImportedToast(true);
                  setTimeout(() => setImportedToast(false), 2600);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                {importedToast
                  ? '✓ Imported to Expense Planner!'
                  : 'Import Estimated Costs to Expense Planner'}
              </button>
            </div>

            {(itinerary.weatherTip || (itinerary.packingTips && itinerary.packingTips.length > 0)) && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#4F5BD5]/8 dark:bg-[#7B83EB]/14 border border-[#4F5BD5]/20 text-xs">
                {itinerary.weatherTip && (
                  <p className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CloudSun className="w-4 h-4 text-[#4F5BD5] dark:text-[#A5B4FC] shrink-0" />
                    <span>{itinerary.weatherTip}</span>
                  </p>
                )}
                {itinerary.packingTips && itinerary.packingTips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {itinerary.packingTips.map((tip) => (
                      <span
                        key={tip}
                        className="px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/70 text-[10.5px] font-bold text-slate-700 dark:text-slate-200"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {renderDayList('Saturday Schedule', 'saturday', itinerary.saturday)}
              {itinerary.sunday.length > 0 &&
                renderDayList('Sunday Schedule', 'sunday', itinerary.sunday)}
            </div>

            {itinerary.day3 && itinerary.day3.length > 0 && (
              <div className="pt-2">
                {renderDayList('Day 3 Long-Weekend Bonus', 'day3', itinerary.day3)}
              </div>
            )}
          </LiquidGlassCard>

          {/* Linked Embedded Google Map for Weekend Stops */}
          <LiquidGlassCard interactive={false} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#111315] dark:text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#4F5BD5]" />
                Pinned Weekend Stop: {mapTarget.name}
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  mapQuery
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline"
              >
                Directions <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-2xl overflow-hidden h-[220px] border border-white/60 dark:border-white/15">
              <iframe
                title={`Weekend stop map: ${mapTarget.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full border-0"
              />
            </div>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};
