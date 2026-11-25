import { useState } from 'react';
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  ArrowRightLeft,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Home,
  IndianRupee,
  Landmark,
  Leaf,
  MapPin,
  PawPrint,
  Plane,
  RefreshCw,
  Route,
  Shield,
  ShieldAlert,
  Ship,
  Sparkles,
  Ticket,
  TrainFront,
} from 'lucide-react';
import { ROUTE_PRESETS } from '../../data/keralaMapData';
import {
  TRAVEL_PREFERENCES,
  isBookableStepMode,
  type MapRegionNode,
  type TransportMode,
  type TransportStep,
  type TravelGuideResponse,
  type TravelPreference,
} from '../../shared/travelSchema';
import type { CorridorHazardItem } from '../../shared/corridorHazardMatcher';
import { KERALA_POLICE_PORTAL_LINKS } from '../../shared/policeSchema';

interface TravelDrawerProps {
  origin: MapRegionNode;
  destination: MapRegionNode | null;
  travelPreference: TravelPreference;
  guide: TravelGuideResponse | null;
  isLoading: boolean;
  error: string | null;
  isSoftwareGl: boolean;
  routeHazards?: CorridorHazardItem[];
  alternateFeederAdvice?: string | null;
  onPreferenceChange: (pref: TravelPreference) => void;
  onApplyPreset: (originId: string, destinationId: string) => void;
  onRetry: () => void;
  onSwapOriginDestination: () => void;
  onBookStep: (step: TransportStep) => void;
  onBookFullJourney: () => void;
  onCreateLockedHouseIntimation?: (details: {
    districtId: string;
    houseAddress: string;
    travelDates: string;
  }) => string;
}

function getModeIcon(mode: TransportMode) {
  switch (mode) {
    case 'Train':
      return TrainFront;
    case 'KSRTC Bus':
    case 'Interstate Bus':
      return Bus;
    case 'Flight':
      return Plane;
    case 'Ferry / Metro':
      return Ship;
    default:
      return Car;
  }
}

export function TravelDrawer({
  origin,
  destination,
  travelPreference,
  guide,
  isLoading,
  error,
  isSoftwareGl,
  routeHazards = [],
  alternateFeederAdvice = null,
  onPreferenceChange,
  onApplyPreset,
  onRetry,
  onSwapOriginDestination,
  onBookStep,
  onBookFullJourney,
  onCreateLockedHouseIntimation,
}: TravelDrawerProps) {
  const [lockedHouseEnabled, setLockedHouseEnabled] = useState(false);
  const [houseAddress, setHouseAddress] = useState('');
  const [travelDates, setTravelDates] = useState('Next 3 Days');
  const [loggedIntimationRef, setLoggedIntimationRef] = useState<string | null>(null);

  const glassClass = isSoftwareGl
    ? 'bg-white/98'
    : 'bg-white/92 backdrop-blur-md';

  const hasCriticalHazard = routeHazards.some((h) => h.isCritical);

  return (
    <aside
      aria-label="Travel pathway, culture, and ticket booking planner"
      className={`w-full lg:w-[445px] xl:w-[475px] shrink-0 ${glassClass} border-t lg:border-t-0 lg:border-l border-slate-200/80 text-slate-900 shadow-xl flex flex-col max-h-[78vh] lg:max-h-full overflow-hidden z-20`}
    >
      {/* Corridor Header + Preference Selector + Presets */}
      <div className="px-5 py-4 border-b border-slate-200/80 shrink-0 bg-gradient-to-r from-emerald-50/90 via-sky-50/75 to-amber-50/70 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            Route &amp; Culture Engine
          </span>
          {destination && destination.id !== origin.id && (
            <button
              type="button"
              onClick={onSwapOriginDestination}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-sky-800 bg-white hover:bg-sky-50 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Swap origin and destination"
            >
              <ArrowRightLeft className="w-3 h-3" aria-hidden="true" />
              Swap
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            {origin.name}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="truncate text-sky-700">
            {destination ? destination.name : 'Select destination'}
          </span>
        </div>

        {/* Travel Preference Selector */}
        <div
          role="group"
          aria-label="Travel preference"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/95 border border-slate-200 shadow-xs"
        >
          {TRAVEL_PREFERENCES.map((pref) => {
            const active = travelPreference === pref;
            const shortLabel =
              pref === 'Balanced'
                ? 'Balanced'
                : pref === 'Budget KSRTC & Rail'
                  ? 'Budget KSRTC'
                  : 'Fastest Air';
            return (
              <button
                key={pref}
                type="button"
                aria-pressed={active}
                title={pref}
                onClick={() => onPreferenceChange(pref)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>

        {/* 2 Quick-Fill Presets */}
        <div className="grid grid-cols-2 gap-2">
          {ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.originId, preset.destinationId)}
              className="px-3 py-2 rounded-xl bg-white/95 hover:bg-sky-50 border border-slate-200/90 hover:border-sky-300 shadow-xs text-left transition-all cursor-pointer"
            >
              <p className="text-[11px] font-bold text-slate-900 truncate">{preset.label}</p>
              <p className="text-[10px] text-slate-500 truncate">{preset.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Summary metrics + Book Full Journey CTA */}
        {guide && !isLoading && !error && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-sky-800 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                {guide.estimated_duration}
              </span>
              <span className="inline-flex items-center gap-0.5 font-mono font-bold text-emerald-700 tabular-nums">
                <IndianRupee className="w-3 h-3" aria-hidden="true" />
                {guide.estimated_cost_inr.replace(/^₹/, '')}
              </span>
            </div>
            <button
              type="button"
              onClick={onBookFullJourney}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Armchair className="w-3.5 h-3.5" aria-hidden="true" />
              Book Full Journey (3D Seats)
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gradient-to-b from-white via-sky-50/20 to-emerald-50/20">
        {/* Live Corridor Hazard & Safety Alert Banner */}
        {routeHazards.length > 0 && (
          <section
            data-testid="corridor-hazard-alert"
            aria-label="Live Corridor Hazard and Safety Alert"
            className={`rounded-2xl border-2 p-3.5 shadow-sm space-y-2.5 ${
              hasCriticalHazard
                ? 'bg-gradient-to-br from-rose-50 via-red-50/80 to-amber-50 border-rose-300'
                : 'bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 border-amber-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`w-4 h-4 shrink-0 ${
                    hasCriticalHazard ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />
                <h3
                  className={`text-xs font-extrabold tracking-tight ${
                    hasCriticalHazard ? 'text-rose-900' : 'text-amber-950'
                  }`}
                >
                  ⚠️ Live Corridor Hazard &amp; Safety Alert
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  hasCriticalHazard
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {routeHazards.length} Active
              </span>
            </div>

            <div className="space-y-1.5">
              {routeHazards.slice(0, 3).map((hz) => (
                <div
                  key={hz.id}
                  className="p-2.5 rounded-xl bg-white/90 border border-rose-200/70 text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">
                      {hz.districtName}: {hz.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        hz.source === 'police'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {hz.source === 'police' ? 'Police Log' : 'Civic LSG'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">
                    {hz.severityLabel} • {hz.categoryOrDept}
                  </p>
                </div>
              ))}
            </div>

            {alternateFeederAdvice && (
              <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-950 leading-relaxed">
                <span className="font-extrabold text-emerald-800">
                  Alternate Feeder Route:{' '}
                </span>
                {alternateFeederAdvice.replace(/^Alternate Feeder Advised:\s*/i, '')}
              </div>
            )}
          </section>
        )}

        {/* Locked House Travel Intimation (Kerala Police Pol-App / THUNA Beat Patrol) */}
        <section
          aria-label="Locked House Travel Intimation"
          className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Home className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-indigo-950 truncate">
                  Locked House Travel Intimation
                </p>
                <p className="text-[10.5px] text-indigo-700 truncate">
                  Notify {origin.name} Janamaithri Beat Police while away
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={lockedHouseEnabled}
              onClick={() => {
                setLockedHouseEnabled((prev) => !prev);
                setLoggedIntimationRef(null);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                lockedHouseEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${
                  lockedHouseEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {lockedHouseEnabled && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={houseAddress}
                  onChange={(e) => setHouseAddress(e.target.value)}
                  placeholder={`House / Ward in ${origin.name}`}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
                <input
                  type="text"
                  value={travelDates}
                  onChange={(e) => setTravelDates(e.target.value)}
                  placeholder="Travel dates (e.g. 26–29 Nov)"
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
              </div>

              {loggedIntimationRef ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Beat Station Intimation logged! Ref:{' '}
                    <strong className="font-mono">{loggedIntimationRef}</strong>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!onCreateLockedHouseIntimation) return;
                    const refId = onCreateLockedHouseIntimation({
                      districtId: origin.id,
                      houseAddress:
                        houseAddress.trim() || `${origin.name} Municipal Ward Residence`,
                      travelDates: travelDates.trim() || 'Upcoming Trip',
                    });
                    setLoggedIntimationRef(refId);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Log Beat Station Patrol Intimation</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10.5px]">
            <a
              href={KERALA_POLICE_PORTAL_LINKS.thuna}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"
            >
              <span>Kerala Police THUNA</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href={KERALA_POLICE_PORTAL_LINKS.polApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline"
            >
              <span>Pol-App Locked House Service</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {!destination && (
          <div className="py-3 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-emerald-50/70 border border-sky-200/80 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Compass className="w-4 h-4 text-sky-600" aria-hidden="true" />
                Living 3D Earth, Diorama &amp; 3D Seat Booking
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dive from our living green &amp; blue Earth into Kerala&apos;s lush miniature 3D
                world, inspect{' '}
                <span className="text-emerald-700 font-bold">{origin.name}</span> transit hubs,
                pick Flight / IRCTC / KSRTC seats in 3D, and pay via instant UPI QR.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                Origin Regional Spotlight · {origin.name}
              </p>
              <p className="text-xs text-slate-800 font-semibold">
                {origin.biodiversity.culture}
              </p>
              <p className="text-[11px] text-slate-600">
                Flora: {origin.biodiversity.flora} · Fauna: {origin.biodiversity.fauna}
              </p>
            </div>
          </div>
        )}

        {destination && isLoading && (
          <div className="space-y-4 py-2" aria-live="polite">
            <div className="flex items-center gap-2.5 text-xs text-sky-700 font-bold">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              Planning {travelPreference} corridor &amp; eco-guide to {destination.name}...
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-sky-100/60 border border-sky-200/60 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {destination && !isLoading && error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-rose-800">
                  Could not generate route &amp; culture plan
                </p>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry Planner Query
            </button>
          </div>
        )}

        {destination && !isLoading && !error && guide && (
          <>
            {/* Route summary */}
            <p className="text-xs text-slate-700 leading-relaxed bg-sky-50/70 border border-sky-200/70 rounded-xl px-3.5 py-2.5 font-medium">
              {guide.route_summary}
            </p>

            {/* Origin Nearest Hubs */}
            <section aria-labelledby="origin-hubs-heading" className="space-y-2">
              <h3
                id="origin-hubs-heading"
                className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500"
              >
                Origin Nearest Hubs · {guide.origin}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    label: 'Nearest Railway Station',
                    icon: TrainFront,
                    box: 'bg-sky-50/60 border-sky-200/70',
                    accent: 'text-sky-600',
                    value: guide.origin_nearest_hubs.railway_station,
                  },
                  {
                    label: 'KSRTC Depot',
                    icon: Bus,
                    box: 'bg-emerald-50/60 border-emerald-200/70',
                    accent: 'text-emerald-600',
                    value: guide.origin_nearest_hubs.ksrtc_depot,
                  },
                  {
                    label: 'Nearest Airport',
                    icon: Plane,
                    box: 'bg-amber-50/60 border-amber-200/70',
                    accent: 'text-amber-600',
                    value: guide.origin_nearest_hubs.nearest_airport,
                  },
                ].map((hub) => {
                  const Icon = hub.icon;
                  return (
                    <div
                      key={hub.label}
                      className={`px-3 py-2.5 rounded-xl border ${hub.box} flex items-start gap-2.5`}
                    >
                      <Icon className={`w-4 h-4 ${hub.accent} shrink-0 mt-0.5`} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono font-bold uppercase text-slate-500">
                          {hub.label}
                        </p>
                        <p className="text-xs font-bold text-slate-900 leading-snug">{hub.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Multi-Modal Transport Steps with Book Ticket button on Flight, Train & Bus steps */}
            <section aria-labelledby="transport-steps-heading" className="space-y-2.5">
              <h3
                id="transport-steps-heading"
                className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500"
              >
                Multi-Modal Transport Steps
              </h3>
              <ol className="space-y-2.5">
                {guide.transport_steps.map((step) => {
                  const ModeIcon = getModeIcon(step.mode);
                  const bookableChannel = isBookableStepMode(step.mode);
                  return (
                    <li
                      key={`${step.step_number}-${step.from}-${step.to}`}
                      className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-[11px] font-mono font-bold text-white flex items-center justify-center shrink-0">
                            {step.step_number}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 truncate">
                            <ModeIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" aria-hidden="true" />
                            {step.mode}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0 tabular-nums">
                          {step.approx_fare}
                        </span>
                      </div>

                      <div className="text-xs text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold">{step.from}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="font-semibold">{step.to}</span>
                        <span className="ml-auto text-[11px] font-mono text-slate-500 tabular-nums">
                          {step.duration}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-sky-700">
                        {step.operator_or_line}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{step.tip}</p>

                      {bookableChannel && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onBookStep(step)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border shadow-xs transition-all cursor-pointer ${
                              bookableChannel === 'flight'
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                                : bookableChannel === 'rail'
                                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                            }`}
                          >
                            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                            Book Ticket (
                            {bookableChannel === 'flight'
                              ? 'Flight 3D'
                              : bookableChannel === 'rail'
                                ? 'IRCTC'
                                : 'KSRTC'}
                            )
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Regional Culture & Biodiversity */}
            <section
              aria-labelledby="biodiversity-heading"
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/70 border border-emerald-200/80 space-y-2.5 shadow-xs"
            >
              <h3
                id="biodiversity-heading"
                className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"
              >
                <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                Regional Culture &amp; Biodiversity · {guide.destination}
              </h3>

              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                      Signature Flora
                    </span>
                    <p className="text-slate-800 leading-snug">
                      {guide.regional_culture_and_biodiversity.signature_flora}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <PawPrint className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                      Signature Fauna
                    </span>
                    <p className="text-slate-800 leading-snug">
                      {guide.regional_culture_and_biodiversity.signature_fauna}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Landmark className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                      Cultural Highlight
                    </span>
                    <p className="text-slate-800 leading-snug">
                      {guide.regional_culture_and_biodiversity.cultural_highlight}
                    </p>
                  </div>
                </div>

                <div className="px-3 py-2 rounded-xl bg-emerald-100/70 border border-emerald-200 text-[11px] text-emerald-950">
                  <span className="font-bold text-emerald-800">Eco Tip: </span>
                  {guide.regional_culture_and_biodiversity.eco_travel_tip}
                </div>
              </div>
            </section>

            {/* Top 3 Tourist Spots */}
            <section aria-labelledby="tourist-spots-heading" className="space-y-2.5 pb-2">
              <h3
                id="tourist-spots-heading"
                className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                Top 3 Tourist Spots
              </h3>
              <div className="space-y-2.5">
                {guide.tourist_spots.map((spot, index) => (
                  <article
                    key={`${spot.name}-${index}`}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{spot.name}</h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        {spot.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{spot.description}</p>
                    <p className="text-[11px] text-sky-700 font-medium flex items-start gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{spot.how_to_reach_from_hub}</span>
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
