import { useState } from 'react';
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  ArrowRightLeft,
  Bus,
  Camera,
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
import { LiquidGlassCard } from '../LiquidGlassCard';
import type { SpotGalleryRequest } from '../SpotPictureLibraryDrawer';
import { ROUTE_PRESETS } from '../../data/keralaMapData';
import {
  TRAVEL_PREFERENCES,
  isBookableStepMode,
  type CarrierFlightOption,
  type MapRegionNode,
  type TransportMode,
  type TransportStep,
  type TravelGuideResponse,
  type TravelPreference,
} from '../../shared/travelSchema';
import { AIRLINE_LIVERIES } from '../../data/worldAtlasData';
import type { CorridorHazardItem } from '../../shared/corridorHazardMatcher';
import { KERALA_POLICE_PORTAL_LINKS } from '../../shared/policeSchema';

interface TravelDrawerProps {
  origin: MapRegionNode;
  destination: MapRegionNode | null;
  originDisplayLabel?: string;
  destinationDisplayLabel?: string | null;
  travelPreference: TravelPreference;
  guide: TravelGuideResponse | null;
  isLoading: boolean;
  error: string | null;
  isSoftwareGl: boolean;
  routeHazards?: CorridorHazardItem[];
  alternateFeederAdvice?: string | null;
  onPreferenceChange: (pref: TravelPreference) => void;
  onApplyPreset: (originId: string, destinationId: string) => void;
  onApplyGlobalPreset?: (countryIso: string, stateId: string, cityId: string) => void;
  onRetry: () => void;
  onSwapOriginDestination: () => void;
  onBookCarrier: (carrier: CarrierFlightOption) => void;
  onBookStep: (step: TransportStep) => void;
  onBookFullJourney: () => void;
  onOpenSpotGallery?: (spot: SpotGalleryRequest) => void;
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
  originDisplayLabel,
  destinationDisplayLabel,
  travelPreference,
  guide,
  isLoading,
  error,
  isSoftwareGl,
  routeHazards = [],
  alternateFeederAdvice = null,
  onPreferenceChange,
  onApplyPreset,
  onApplyGlobalPreset,
  onRetry,
  onSwapOriginDestination,
  onBookCarrier,
  onBookStep,
  onBookFullJourney,
  onOpenSpotGallery,
  onCreateLockedHouseIntimation,
}: TravelDrawerProps) {
  const [lockedHouseEnabled, setLockedHouseEnabled] = useState(false);
  const [houseAddress, setHouseAddress] = useState('');
  const [travelDates, setTravelDates] = useState('Next 3 Days');
  const [loggedIntimationRef, setLoggedIntimationRef] = useState<string | null>(null);

  const effectiveOriginLabel = originDisplayLabel || origin.name;
  const effectiveDestLabel = destinationDisplayLabel || destination?.name || null;
  const hasActiveDestination = Boolean(effectiveDestLabel);

  const glassClass = isSoftwareGl
    ? 'bg-white/96 dark:bg-slate-900/96'
    : 'bg-white/75 dark:bg-slate-900/78 backdrop-blur-2xl backdrop-saturate-[180%]';

  const hasCriticalHazard = routeHazards.some((h) => h.isCritical);

  return (
    <aside
      aria-label="Travel pathway, carrier selector, world profile, and ticket booking planner"
      className={`w-full lg:w-[455px] xl:w-[490px] shrink-0 ${glassClass} border-t lg:border-t-0 lg:border-l border-white/75 dark:border-white/10 text-[#111315] dark:text-slate-100 shadow-[0_24px_60px_rgba(17,19,21,0.10)] flex flex-col max-h-[78vh] lg:max-h-full overflow-hidden z-20`}
    >
      {/* Corridor Header + Preference Selector + Presets */}
      <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 shrink-0 bg-white/50 dark:bg-slate-900/50 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-[#4F5BD5]" aria-hidden="true" />
            Global Route &amp; Carrier Engine
          </span>
          {destination && destination.id !== origin.id && (
            <button
              type="button"
              onClick={onSwapOriginDestination}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-700 hover:text-[#111315] bg-[#EFECE8] hover:bg-white border border-black/5 transition-colors cursor-pointer"
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
            {effectiveOriginLabel}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="truncate text-[#4F5BD5]">
            {effectiveDestLabel || 'Select destination'}
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

        {/* Quick-Fill Presets (Domestic Kerala + Global International) */}
        <div className="grid grid-cols-2 gap-2">
          {ROUTE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.originId, preset.destinationId)}
              className="px-3 py-2 rounded-2xl bg-[#EFECE8]/85 hover:bg-white border border-black/5 text-left transition-all cursor-pointer"
            >
              <p className="text-[11px] font-bold text-[#111315] truncate">{preset.label}</p>
              <p className="text-[10px] text-slate-500 truncate">{preset.subtitle}</p>
            </button>
          ))}
          {onApplyGlobalPreset && (
            <>
              <button
                type="button"
                onClick={() => onApplyGlobalPreset('784', 'ae-du', 'dubai')}
                className="px-3 py-2 rounded-2xl bg-[#EFECE8]/85 hover:bg-white border border-black/5 text-left transition-all cursor-pointer"
              >
                <p className="text-[11px] font-bold text-[#111315] truncate">
                  PTA → Dubai (DXB)
                </p>
                <p className="text-[10px] text-[#4F5BD5] font-semibold truncate">
                  Emirates · Air India Express
                </p>
              </button>
              <button
                type="button"
                onClick={() => onApplyGlobalPreset('826', 'uk-eng', 'london')}
                className="px-3 py-2 rounded-2xl bg-[#EFECE8]/85 hover:bg-white border border-black/5 text-left transition-all cursor-pointer"
              >
                <p className="text-[11px] font-bold text-[#111315] truncate">
                  PTA → London (LHR)
                </p>
                <p className="text-[10px] text-[#4F5BD5] font-semibold truncate">
                  Air India · Qatar · BA
                </p>
              </button>
            </>
          )}
        </div>

        {/* Summary metrics + Book Full Journey CTA */}
        {guide && !isLoading && !error && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#111315] tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#4F5BD5]" aria-hidden="true" />
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111315] hover:bg-[#24272B] text-white text-xs font-semibold shadow-md cursor-pointer transition-all"
            >
              <Armchair className="w-3.5 h-3.5 text-[#A5B4FC]" aria-hidden="true" />
              Book Full Journey (3D Seats)
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gradient-to-b from-white/70 via-sky-50/20 to-emerald-50/20 dark:from-slate-950/60 dark:via-slate-900/40 dark:to-slate-950/70">
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

        {!hasActiveDestination && (
          <div className="py-3 space-y-4">
            <div className="p-4 rounded-[24px] bg-[#EFECE8]/85 border border-black/5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#111315]">
                <Compass className="w-4 h-4 text-[#4F5BD5]" aria-hidden="true" />
                195-Country Blue Marble Earth &amp; Carrier Desk
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click any country on the 3D globe, select a global city via the cascading selector, or click any flying 3D airplane (Emirates, IndiGo, Qatar, Air India, Singapore Airlines, BA) to compare carriers &amp; pick 3D seats.
              </p>
            </div>

            <div className="p-4 rounded-[24px] bg-white/80 border border-white/80 space-y-1.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                Origin Regional Spotlight · {effectiveOriginLabel}
              </p>
              <p className="text-xs text-[#111315] font-semibold">
                {origin.biodiversity.culture}
              </p>
              <p className="text-[11px] text-slate-600">
                Flora: {origin.biodiversity.flora} · Fauna: {origin.biodiversity.fauna}
              </p>
            </div>
          </div>
        )}

        {hasActiveDestination && isLoading && (
          <div className="space-y-4 py-2" aria-live="polite">
            <div className="flex items-center gap-2.5 text-xs text-[#4F5BD5] font-bold">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              Comparing carriers &amp; planning {travelPreference} route to {effectiveDestLabel}...
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-[#EFECE8]/90 border border-black/5 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {hasActiveDestination && !isLoading && error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-rose-800">
                  Could not generate global route &amp; carrier comparison
                </p>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#111315] text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry Planner Query
            </button>
          </div>
        )}

        {hasActiveDestination && !isLoading && !error && guide && (
          <>
            {/* Route summary */}
            <p className="text-xs text-slate-700 leading-relaxed bg-[#EFECE8]/85 border border-black/5 rounded-2xl px-4 py-3 font-medium">
              {guide.route_summary}
            </p>

            {/* Carrier & Flight Options Comparison List */}
            {guide.carrier_options && guide.carrier_options.length > 0 && (
              <section
                aria-labelledby="carrier-options-heading"
                data-testid="carrier-comparison-list"
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h3
                    id="carrier-options-heading"
                    className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] flex items-center gap-1.5"
                  >
                    <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                    Carrier &amp; Flight Options ({guide.carrier_options.length})
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Live INR Fares
                  </span>
                </div>

                <div className="space-y-2.5">
                  {guide.carrier_options.map((carrier) => {
                    const livery = AIRLINE_LIVERIES[carrier.iata_code];
                    const badgeBg =
                      livery?.accentHex ||
                      (carrier.channel === 'irctc'
                        ? '#0284c7'
                        : carrier.channel === 'ksrtc'
                          ? '#059669'
                          : '#111315');

                    return (
                      <article
                        key={carrier.id}
                        className="p-3.5 rounded-[22px] bg-white/90 border border-black/5 shadow-xs space-y-2.5 hover:border-[#4F5BD5]/35 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-9 h-9 rounded-xl text-white font-mono text-xs font-extrabold flex items-center justify-center shrink-0 shadow-xs"
                              style={{ backgroundColor: badgeBg }}
                            >
                              {carrier.iata_code}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-[#111315] truncate">
                                {carrier.carrier_name}{' '}
                                <span className="font-mono text-[#4F5BD5]">
                                  {carrier.flight_or_service_code}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {carrier.aircraft_or_vehicle} · {carrier.stops_label}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold font-mono text-emerald-700 tabular-nums">
                              ₹{carrier.fare_inr.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500">
                              {carrier.duration}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#EFECE8]/75 text-[11px] text-slate-700">
                          <span className="font-mono font-bold text-[#111315]">
                            {carrier.departure_time} → {carrier.arrival_time}
                          </span>
                          <span className="truncate text-[10.5px] text-slate-600">
                            {carrier.from_hub} → {carrier.to_hub}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10.5px] font-medium text-slate-500 truncate">
                            Baggage: {carrier.baggage_allowance}
                          </span>
                          <button
                            type="button"
                            onClick={() => onBookCarrier(carrier)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111315] hover:bg-[#24272B] text-white text-[11px] font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                          >
                            <Armchair className="w-3 h-3 text-[#A5B4FC]" aria-hidden="true" />
                            Select {carrier.channel === 'flight' ? 'Flight' : 'Service'} &amp; Choose Seat
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Destination World Profile Card */}
            {guide.destination_world_profile && (
              <section
                aria-labelledby="world-profile-heading"
                className="p-4 rounded-[24px] bg-[#EFECE8]/80 border border-black/5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="world-profile-heading"
                    className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5]"
                  >
                    Destination World Profile · {guide.destination_world_profile.country}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-mono font-bold text-[#111315]">
                    {guide.destination_world_profile.currency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="px-3 py-2 rounded-xl bg-white/85 border border-black/5">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      State / Region
                    </span>
                    <span className="font-bold text-[#111315]">
                      {guide.destination_world_profile.state_or_region}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/85 border border-black/5">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      Timezone
                    </span>
                    <span className="font-bold text-[#111315]">
                      {guide.destination_world_profile.timezone}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-[#111315]">Signature Landmark: </strong>
                  {guide.destination_world_profile.signature_landmark}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-[#111315]">Biome &amp; Wildlife: </strong>
                  {guide.destination_world_profile.local_biome_and_wildlife}
                </p>
                <div className="px-3 py-2 rounded-xl bg-white/90 border border-[#4F5BD5]/20 text-[11px] text-slate-700">
                  <strong className="text-[#4F5BD5]">Visa &amp; Entry Tip: </strong>
                  {guide.destination_world_profile.visa_and_entry_tip}
                </div>
              </section>
            )}

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

            {/* Top 3 Tourist Spots (Clickable -> Wikimedia Picture Library) */}
            <section aria-labelledby="tourist-spots-heading" className="space-y-2.5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="tourist-spots-heading"
                  className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  Top 3 Tourist Spots
                </h3>
                <span className="text-[10px] font-semibold text-[#4F5BD5] dark:text-[#A5B4FC]">
                  Tap for Live Photos
                </span>
              </div>
              <div className="space-y-2.5">
                {guide.tourist_spots.map((spot, index) => (
                  <LiquidGlassCard
                    key={`${spot.name}-${index}`}
                    delay={index * 0.05}
                    onClick={() =>
                      onOpenSpotGallery?.({
                        name: spot.name,
                        region: guide.destination,
                        subtitle: `${spot.category} · ${guide.destination}`,
                        description: `${spot.description} Reach via: ${spot.how_to_reach_from_hub}`,
                        badge: spot.category,
                        googleMapsQuery: `${spot.name}, ${guide.destination}`,
                      })
                    }
                    className="p-3.5 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {spot.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 shrink-0">
                        {spot.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {spot.description}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-sky-700 dark:text-sky-300 font-medium flex items-start gap-1.5 min-w-0">
                        <MapPin
                          className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="truncate">{spot.how_to_reach_from_hub}</span>
                      </p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10px] font-bold shrink-0">
                        <Camera className="w-3 h-3" />
                        Photos
                      </span>
                    </div>
                  </LiquidGlassCard>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
