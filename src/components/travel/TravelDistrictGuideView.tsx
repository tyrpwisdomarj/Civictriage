import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Armchair,
  Compass,
  Globe,
  Layers,
  Leaf,
  Navigation,
  Plane,
  Radio,
  RotateCcw,
  Ticket,
  TrainFront,
  X,
} from 'lucide-react';
import {
  ALL_MAP_REGIONS,
  KERALA_DISTRICTS,
  QUICK_JUMP_IDS,
  getRegionById,
} from '../../data/keralaMapData';
import {
  AIRLINE_LIVERIES,
  DEFAULT_WORLD_ORIGIN,
  GLOBAL_FEATURED_DESTINATIONS,
  WORLD_ATLAS_COUNTRIES,
  formatWorldLocationLabel,
  getWorldCountryByIso,
  type LiveAirspaceFlight,
  type WorldCountryEntry,
} from '../../data/worldAtlasData';
import {
  isBookableStepMode,
  normalizeTravelGuidePayload,
  type CarrierFlightOption,
  type MapRegionNode,
  type TransportStep,
  type TravelGuideResponse,
  type TravelPreference,
} from '../../shared/travelSchema';
import {
  parseBaseFareFromText,
  type BookedETicket,
  type BookingDraft,
} from '../../shared/bookingSchema';
import {
  WebGLErrorBoundary,
  detectWebGLCapabilities,
} from './WebGLErrorBoundary';
import {
  Kerala3DMapScene,
  type ExplorerViewMode,
  type RegionalLiveVehicle,
} from './Kerala3DMapScene';
import { Kerala2DFallbackMap } from './Kerala2DFallbackMap';
import { TravelDrawer } from './TravelDrawer';
import {
  TicketBookingDrawer,
  type BookingSeedContext,
} from './TicketBookingDrawer';
import { UpiPaymentModal } from './UpiPaymentModal';
import { BookedTicketsDrawer } from './BookedTicketsDrawer';
import type { CorridorHazardReport } from '../../shared/corridorHazardMatcher';
import {
  INDIA_STATES_AND_UTS,
  getIndiaStateByIdOrSlug,
  type IndiaStateSpec,
} from '../../data/indiaStatesData';
import { LiquidSegmentedTabs } from '../LiquidGlassCard';
import type { SpotGalleryRequest } from '../SpotPictureLibraryDrawer';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

export interface WorldDestinationRequest {
  countryIso: string;
  stateId?: string;
  cityId?: string;
  token: number;
}

export interface TravelDistrictGuideViewProps {
  originId: string;
  destinationId: string | null;
  bookedTickets: BookedETicket[];
  myTicketsOpen: boolean;
  corridorHazardReport: CorridorHazardReport;
  externalWorldDest?: WorldDestinationRequest | null;
  externalViewMode?: { mode: ExplorerViewMode; token: number } | null;
  onViewModeChange?: (mode: ExplorerViewMode) => void;
  onOriginIdChange: (id: string) => void;
  onDestinationIdChange: (id: string | null) => void;
  onTicketIssued: (ticket: BookedETicket) => void;
  onDeleteBookedTicket: (id: string) => void;
  onMyTicketsOpenChange: (open: boolean) => void;
  onOpenSpotGallery?: (spot: SpotGalleryRequest) => void;
  onCreateLockedHouseIntimation: (details: {
    districtId: string;
    houseAddress: string;
    travelDates: string;
  }) => string;
}

type ActiveTelemetryTarget =
  | { kind: 'flight'; data: LiveAirspaceFlight }
  | { kind: 'regional'; data: RegionalLiveVehicle };

export function TravelDistrictGuideView({
  originId,
  destinationId,
  bookedTickets,
  myTicketsOpen,
  corridorHazardReport,
  externalWorldDest = null,
  externalViewMode = null,
  onViewModeChange,
  onOriginIdChange,
  onDestinationIdChange,
  onTicketIssued,
  onDeleteBookedTicket,
  onMyTicketsOpenChange,
  onOpenSpotGallery,
  onCreateLockedHouseIntimation,
}: TravelDistrictGuideViewProps) {
  const webglCaps = useMemo(() => detectWebGLCapabilities(), []);
  const [use2DFallback, setUse2DFallback] = useState(!webglCaps.supported);
  const [contextLostMessage, setContextLostMessage] = useState<string | null>(
    webglCaps.supported
      ? null
      : 'WebGL is unavailable on this device. Showing interactive 2D Kerala map.'
  );

  // Start in Photorealistic 3D Blue Marble Earth Globe View (Switchable to Whole India Relief / State Topography / Kerala Diorama)
  const [viewMode, setViewModeState] = useState<ExplorerViewMode>(
    externalViewMode?.mode ?? 'globe'
  );
  const setViewMode = useCallback(
    (next: ExplorerViewMode) => {
      setViewModeState(next);
      onViewModeChange?.(next);
    },
    [onViewModeChange]
  );

  useEffect(() => {
    if (externalViewMode) {
      setViewModeState(externalViewMode.mode);
    }
  }, [externalViewMode]);

  const [selectedIndiaStateId, setSelectedIndiaStateId] = useState<string>('kerala');
  const [selectedStateDistrictLabel, setSelectedStateDistrictLabel] = useState<string | null>(null);
  const [showBiodiversity, setShowBiodiversity] = useState<boolean>(true);
  const [travelPreference, setTravelPreference] = useState<TravelPreference>('Balanced');
  const [resetSignal, setResetSignal] = useState<number>(0);

  const selectedIndiaState = useMemo(
    () => getIndiaStateByIdOrSlug(selectedIndiaStateId),
    [selectedIndiaStateId]
  );

  // Global Cascading Destination Selector (Country -> State -> City / Hub)
  const [destCountryIso, setDestCountryIso] = useState<string>('356');
  const [destStateId, setDestStateId] = useState<string>('in-kl');
  const [destCityId, setDestCityId] = useState<string>('');
  const [globeFocusCoord, setGlobeFocusCoord] = useState<{
    lat: number;
    lon: number;
    token: number;
  } | null>(null);

  // Active Live Vehicle Telemetry HUD
  const [liveTelemetry, setLiveTelemetry] = useState<ActiveTelemetryTarget | null>(null);

  const [guide, setGuide] = useState<TravelGuideResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Booking & UPI Payment modal state
  const [bookingContext, setBookingContext] = useState<BookingSeedContext | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState<boolean>(false);
  const [paymentDraft, setPaymentDraft] = useState<BookingDraft | null>(null);
  const [paymentFareInr, setPaymentFareInr] = useState<number>(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);

  const clientCacheRef = useRef<Map<string, TravelGuideResponse>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const lastExtTokenRef = useRef<number | null>(null);

  const originNode = useMemo(
    () => getRegionById(originId) ?? KERALA_DISTRICTS[11],
    [originId]
  );

  const destinationNode = useMemo(
    () => (destinationId ? getRegionById(destinationId) ?? null : null),
    [destinationId]
  );

  const selectedWorldCountry = useMemo(
    () => getWorldCountryByIso(destCountryIso) ?? WORLD_ATLAS_COUNTRIES[0],
    [destCountryIso]
  );

  const selectedWorldState = useMemo(
    () =>
      selectedWorldCountry.states.find((s) => s.id === destStateId) ??
      selectedWorldCountry.states[0],
    [selectedWorldCountry, destStateId]
  );

  const selectedWorldCity = useMemo(
    () =>
      selectedWorldState?.cities.find((c) => c.id === destCityId) ?? null,
    [selectedWorldState, destCityId]
  );

  const originDisplayLabel = useMemo(() => {
    if (originNode.id === 'pathanamthitta') {
      return formatWorldLocationLabel(DEFAULT_WORLD_ORIGIN);
    }
    return `${originNode.name}, Kerala`;
  }, [originNode]);

  const destinationDisplayLabel = useMemo(() => {
    if (selectedStateDistrictLabel) {
      return selectedStateDistrictLabel;
    }
    if (selectedWorldCity) {
      const airportSuffix = selectedWorldCity.iata
        ? ` (${selectedWorldCity.iata})`
        : '';
      return `${selectedWorldCity.name}${airportSuffix}, ${selectedWorldCountry.name}`;
    }
    if (destinationNode) {
      return destinationNode.name;
    }
    return null;
  }, [selectedStateDistrictLabel, selectedWorldCity, selectedWorldCountry, destinationNode]);

  const globeOriginPoint = useMemo(
    () => ({
      label: originDisplayLabel,
      lat: DEFAULT_WORLD_ORIGIN.city.lat,
      lon: DEFAULT_WORLD_ORIGIN.city.lon,
      code: originNode.code,
    }),
    [originDisplayLabel, originNode.code]
  );

  const globeDestinationPoint = useMemo(() => {
    if (selectedWorldCity) {
      return {
        label: selectedWorldCity.name,
        lat: selectedWorldCity.lat,
        lon: selectedWorldCity.lon,
        code: selectedWorldCity.iata,
      };
    }
    if (destinationNode) {
      // Approximate Kerala / South India coords
      return {
        label: destinationNode.name,
        lat: 10.6 - destinationNode.centroid.y * 0.45,
        lon: 76.4 + destinationNode.centroid.x * 0.45,
        code: destinationNode.code,
      };
    }
    return null;
  }, [selectedWorldCity, destinationNode]);

  const fetchTravelGuideByNames = useCallback(
    async (
      originLabel: string,
      destLabel: string,
      preference: TravelPreference,
      forceRefresh = false
    ) => {
      if (!originLabel || !destLabel || originLabel.toLowerCase() === destLabel.toLowerCase()) {
        setGuide(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const key = `${originLabel.toLowerCase()}::${destLabel.toLowerCase()}::${preference}`;
      if (!forceRefresh) {
        const memCached = clientCacheRef.current.get(key);
        const persistedCached = memCached ?? readAiCache<TravelGuideResponse>(`travel::${key}`);
        if (persistedCached) {
          clientCacheRef.current.set(key, persistedCached);
          setGuide(persistedCached);
          setError(null);
          setIsLoading(false);
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/travel-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: originLabel,
            destination: destLabel,
            travelPreference: preference,
          }),
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            `Travel pathway request failed with status ${response.status}.`;
          throw new Error(message);
        }

        const normalized = normalizeTravelGuidePayload(
          payload,
          originLabel,
          destLabel,
          preference
        );
        clientCacheRef.current.set(key, normalized);
        writeAiCache(`travel::${key}`, normalized);
        setGuide(normalized);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the travel pathway service.'
        );
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSelectGlobalDestination = useCallback(
    (countryIso: string, stateId?: string, cityId?: string, flyOnGlobe = true) => {
      const country = getWorldCountryByIso(countryIso);
      if (!country) return;
      const st =
        (stateId ? country.states.find((s) => s.id === stateId) : undefined) ??
        country.states[0];
      const ct =
        (cityId ? st?.cities.find((c) => c.id === cityId) : undefined) ??
        st?.cities[0];

      setDestCountryIso(country.isoNumeric);
      if (st) setDestStateId(st.id);
      if (ct) setDestCityId(ct.id);

      // Sync Kerala district ID if choosing a Kerala city
      if (country.isoNumeric === '356' && st?.id === 'in-kl' && ct) {
        const keralaMatch = getRegionById(ct.id);
        onDestinationIdChange(keralaMatch ? keralaMatch.id : null);
      } else {
        onDestinationIdChange(null);
      }

      if (flyOnGlobe) {
        setViewMode('globe');
        setGlobeFocusCoord({
          lat: ct?.lat ?? country.lat,
          lon: ct?.lon ?? country.lon,
          token: Date.now(),
        });
      }

      const primaryCityName = country.states[0]?.cities[0]?.name ?? country.name;
      const targetLabel = ct
        ? `${ct.name}${ct.iata ? ` (${ct.iata})` : ''}, ${country.name}`
        : `${primaryCityName}, ${country.name}`;

      void fetchTravelGuideByNames(originDisplayLabel, targetLabel, travelPreference);
    },
    [originDisplayLabel, travelPreference, fetchTravelGuideByNames, onDestinationIdChange]
  );

  // Handle external navigation from HomePortalView or TopBar Global Search
  useEffect(() => {
    if (externalWorldDest && externalWorldDest.token !== lastExtTokenRef.current) {
      lastExtTokenRef.current = externalWorldDest.token;
      handleSelectGlobalDestination(
        externalWorldDest.countryIso,
        externalWorldDest.stateId,
        externalWorldDest.cityId,
        true
      );
    }
  }, [externalWorldDest, handleSelectGlobalDestination]);

  const handleSelectIndiaState = useCallback(
    (stateSpec: IndiaStateSpec) => {
      setSelectedIndiaStateId(stateSpec.id);
      setSelectedStateDistrictLabel(`${stateSpec.capital}, ${stateSpec.name}, India`);
      setViewMode('state');
      void fetchTravelGuideByNames(
        originDisplayLabel,
        `${stateSpec.capital}, ${stateSpec.name}, India`,
        travelPreference
      );
    },
    [originDisplayLabel, travelPreference, fetchTravelGuideByNames]
  );

  const handleSelectIndiaDistrict = useCallback(
    (districtName: string, stateSpec: IndiaStateSpec) => {
      const target = `${districtName}, ${stateSpec.name}, India`;
      setSelectedStateDistrictLabel(target);
      void fetchTravelGuideByNames(originDisplayLabel, target, travelPreference);
    },
    [originDisplayLabel, travelPreference, fetchTravelGuideByNames]
  );

  const handleSelectWorldCountryOnGlobe = useCallback(
    (country: WorldCountryEntry) => {
      setSelectedStateDistrictLabel(null);
      if (country.isoNumeric === '356') {
        setDestCountryIso('356');
        setViewMode('india');
        return;
      }
      handleSelectGlobalDestination(country.isoNumeric, undefined, undefined, true);
    },
    [handleSelectGlobalDestination]
  );

  const handleDiveToKerala = useCallback(() => {
    setSelectedStateDistrictLabel(null);
    setSelectedIndiaStateId('kerala');
    setViewMode('terrain');
  }, []);

  const handleSelectDestination = useCallback(
    (region: MapRegionNode) => {
      if (region.id === originNode.id) return;
      setSelectedStateDistrictLabel(null);
      setViewMode('terrain');
      setDestCountryIso('356');
      setDestStateId('in-kl');
      setDestCityId(region.id);
      onDestinationIdChange(region.id);
      void fetchTravelGuideByNames(originNode.name, region.name, travelPreference);
    },
    [originNode, travelPreference, fetchTravelGuideByNames, onDestinationIdChange]
  );

  const handleQuickJump = useCallback(
    (regionId: string) => {
      const region = getRegionById(regionId);
      if (!region) return;
      handleSelectDestination(region);
    },
    [handleSelectDestination]
  );

  const handleApplyPreset = useCallback(
    (presetOriginId: string, presetDestId: string) => {
      const o = getRegionById(presetOriginId);
      const d = getRegionById(presetDestId);
      if (!o || !d) return;
      onOriginIdChange(o.id);
      onDestinationIdChange(d.id);
      setDestCountryIso('356');
      setDestStateId('in-kl');
      setDestCityId(d.id);
      setViewMode('terrain');
      void fetchTravelGuideByNames(o.name, d.name, travelPreference);
    },
    [travelPreference, fetchTravelGuideByNames, onOriginIdChange, onDestinationIdChange]
  );

  const handleOriginChange = useCallback(
    (newOriginId: string) => {
      const newOrigin = getRegionById(newOriginId);
      if (!newOrigin) return;
      onOriginIdChange(newOrigin.id);
      const nextOriginLabel =
        newOrigin.id === 'pathanamthitta'
          ? formatWorldLocationLabel(DEFAULT_WORLD_ORIGIN)
          : `${newOrigin.name}, Kerala`;
      if (destinationDisplayLabel && destinationNode?.id !== newOrigin.id) {
        void fetchTravelGuideByNames(nextOriginLabel, destinationDisplayLabel, travelPreference);
      } else if (destinationNode && destinationNode.id === newOrigin.id) {
        onDestinationIdChange(null);
        setDestCityId('');
        setGuide(null);
      }
    },
    [
      destinationDisplayLabel,
      destinationNode,
      travelPreference,
      fetchTravelGuideByNames,
      onOriginIdChange,
      onDestinationIdChange,
    ]
  );

  const handlePreferenceChange = useCallback(
    (nextPref: TravelPreference) => {
      setTravelPreference(nextPref);
      if (destinationDisplayLabel) {
        void fetchTravelGuideByNames(originDisplayLabel, destinationDisplayLabel, nextPref);
      }
    },
    [originDisplayLabel, destinationDisplayLabel, fetchTravelGuideByNames]
  );

  const handleSwapOriginDestination = useCallback(() => {
    if (!destinationNode || destinationNode.id === originNode.id) return;
    if (destinationNode.kind === 'district') {
      const nextOrigin = destinationNode;
      const nextDest = originNode;
      onOriginIdChange(nextOrigin.id);
      onDestinationIdChange(nextDest.id);
      setDestCityId(nextDest.id);
      void fetchTravelGuideByNames(nextOrigin.name, nextDest.name, travelPreference);
    }
  }, [
    originNode,
    destinationNode,
    travelPreference,
    fetchTravelGuideByNames,
    onOriginIdChange,
    onDestinationIdChange,
  ]);

  const handleBookCarrier = useCallback((carrier: CarrierFlightOption) => {
    const livery = AIRLINE_LIVERIES[carrier.iata_code];
    setBookingContext({
      channel: carrier.channel,
      from: carrier.from_hub,
      to: carrier.to_hub,
      operatorOrLine: `${carrier.carrier_name} ${carrier.flight_or_service_code} · ${carrier.aircraft_or_vehicle}`,
      baseFareInr: carrier.fare_inr,
      isFullJourney: false,
      airlineCode: carrier.iata_code,
      airlineName: carrier.carrier_name,
      airlineAccentHex: livery?.accentHex,
      aircraftModel: carrier.aircraft_or_vehicle,
      isWideBody: carrier.is_wide_body,
    });
    setBookingDrawerOpen(true);
  }, []);

  const handleBookStep = useCallback((step: TransportStep) => {
    const channel = isBookableStepMode(step.mode);
    setBookingContext({
      channel: channel === 'flight' ? 'flight' : channel === 'bus' ? 'ksrtc' : 'irctc',
      from: step.from,
      to: step.to,
      operatorOrLine: step.operator_or_line,
      baseFareInr: parseBaseFareFromText(
        step.approx_fare,
        channel === 'flight' ? 4200 : 180
      ),
      isFullJourney: false,
    });
    setBookingDrawerOpen(true);
  }, []);

  const handleBookFullJourney = useCallback(() => {
    if (!guide) return;
    if (guide.carrier_options && guide.carrier_options.length > 0) {
      handleBookCarrier(guide.carrier_options[0]);
      return;
    }
    const primaryFlight = guide.transport_steps.find((s) => s.mode === 'Flight');
    const primaryTrain = guide.transport_steps.find((s) => s.mode === 'Train');
    const primaryBus = guide.transport_steps.find(
      (s) => s.mode === 'KSRTC Bus' || s.mode === 'Interstate Bus'
    );
    const preferredStep = primaryFlight ?? primaryTrain ?? primaryBus;
    const channel = primaryFlight ? 'flight' : primaryTrain ? 'irctc' : 'ksrtc';
    setBookingContext({
      channel,
      from: guide.origin,
      to: guide.destination,
      operatorOrLine:
        preferredStep?.operator_or_line || `${guide.origin} – ${guide.destination} Express Corridor`,
      baseFareInr: parseBaseFareFromText(
        preferredStep?.approx_fare ?? guide.estimated_cost_inr,
        channel === 'flight' ? 4200 : 260
      ),
      isFullJourney: true,
    });
    setBookingDrawerOpen(true);
  }, [guide, handleBookCarrier]);

  const handleBookFromTelemetry = useCallback(() => {
    if (!liveTelemetry) return;
    if (liveTelemetry.kind === 'flight') {
      const f = liveTelemetry.data;
      const livery = AIRLINE_LIVERIES[f.airlineCode];
      setBookingContext({
        channel: 'flight',
        from: f.fromCity,
        to: f.toCity,
        operatorOrLine: `${f.airlineName} ${f.flightNumber} · ${f.aircraft}`,
        baseFareInr: f.baseFareInr,
        airlineCode: f.airlineCode,
        airlineName: f.airlineName,
        airlineAccentHex: livery?.accentHex,
        aircraftModel: f.aircraft,
        isWideBody: f.isWideBody,
      });
    } else {
      const v = liveTelemetry.data;
      setBookingContext({
        channel: v.channel,
        from: v.from,
        to: v.to,
        operatorOrLine: `${v.name} (${v.serviceCode}) · ${v.vehicleModel}`,
        baseFareInr: v.fareInr,
      });
    }
    setLiveTelemetry(null);
    setBookingDrawerOpen(true);
  }, [liveTelemetry]);

  const handleProceedToPayment = useCallback(
    (draft: BookingDraft, computedFareInr: number) => {
      setBookingDrawerOpen(false);
      setPaymentDraft(draft);
      setPaymentFareInr(computedFareInr);
      setPaymentModalOpen(true);
    },
    []
  );

  const quickJumpRegions = useMemo(
    () =>
      QUICK_JUMP_IDS.map((id) => getRegionById(id)).filter(
        (r): r is MapRegionNode => Boolean(r && r.id !== originId)
      ),
    [originId]
  );

  const hudGlass = webglCaps.isSoftwareGl
    ? 'bg-white/95 dark:bg-slate-900/95'
    : 'bg-white/88 dark:bg-slate-900/88';

  const isTopographicView = viewMode === 'india' || viewMode === 'state';

  return (
    <div
      className={`relative w-full h-[calc(100vh-4rem)] min-h-[650px] flex flex-col lg:flex-row overflow-hidden ${
        isTopographicView ? 'bg-[#F5F3EE]' : 'bg-[#040b18]'
      }`}
    >
      {/* Left / Background Interactive Blue Marble 3D Earth, Pan-India Relief & Lush Kerala Diorama */}
      <div className="relative flex-1 min-h-[420px] lg:min-h-0 overflow-hidden">
        {/* Top Floating iOS Liquid Glass Switcher HUD */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {/* 3-Way + Kerala Diorama View Switcher Pill */}
            <LiquidSegmentedTabs<ExplorerViewMode>
              layoutId="travel-3d-view-switcher"
              ariaLabel="3D Explorer View Mode"
              value={viewMode}
              onChange={(next) => {
                setViewMode(next);
                if (next === 'globe') setSelectedStateDistrictLabel(null);
              }}
              options={[
                { id: 'globe', label: '🌍 3D World Globe' },
                { id: 'india', label: '🇮🇳 Whole India Relief' },
                { id: 'state', label: '📍 State Topography' },
                { id: 'terrain', label: '🌴 Kerala 3D' },
              ]}
            />

            {/* All 28 States & 8 UTs Selector when in Whole India or State Topography Mode */}
            {isTopographicView && (
              <select
                aria-label="Select any of 28 Indian States or 8 Union Territories"
                value={selectedIndiaStateId}
                onChange={(e) => {
                  const st = getIndiaStateByIdOrSlug(e.target.value);
                  handleSelectIndiaState(st);
                }}
                className={`px-3.5 py-2 rounded-full ${hudGlass} border border-black/10 dark:border-white/15 text-xs font-bold text-[#111315] dark:text-white shadow-md cursor-pointer focus:outline-none`}
              >
                {INDIA_STATES_AND_UTS.map((st) => (
                  <option key={st.id} value={st.id} className="bg-white text-slate-900">
                    {st.name} ({st.code}) · {st.capital}
                  </option>
                ))}
              </select>
            )}

            {viewMode === 'terrain' && (
              <>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${hudGlass} border border-white/80 dark:border-white/15 shadow-md`}
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <label
                    htmlFor="travel-origin-select"
                    className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Origin
                  </label>
                  <select
                    id="travel-origin-select"
                    value={originId}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    className="bg-transparent text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none cursor-pointer pr-1"
                  >
                    {KERALA_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white text-slate-900">
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  aria-pressed={showBiodiversity}
                  onClick={() => setShowBiodiversity((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-md transition-colors cursor-pointer ${
                    showBiodiversity
                      ? 'bg-[#111315] border-[#111315] text-white'
                      : `${hudGlass} border-white/80 text-slate-700 dark:text-slate-200 hover:bg-white`
                  }`}
                >
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  Biodiversity
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setResetSignal((n) => n + 1)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full ${hudGlass} hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-md transition-colors cursor-pointer`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#4F5BD5]" aria-hidden="true" />
              Reset
            </button>

            {webglCaps.supported && (
              <button
                type="button"
                onClick={() => {
                  setUse2DFallback((prev) => !prev);
                  setContextLostMessage(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full ${hudGlass} hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-md transition-colors cursor-pointer`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                {use2DFallback ? '3D View' : '2D Map'}
              </button>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMyTicketsOpenChange(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${hudGlass} hover:bg-white dark:hover:bg-slate-800 border border-white/80 dark:border-white/15 text-xs font-bold text-[#111315] dark:text-white shadow-md transition-colors cursor-pointer`}
            >
              <Ticket className="w-3.5 h-3.5 text-[#4F5BD5]" aria-hidden="true" />
              My Tickets
              <span className="px-2 py-0.5 rounded-full bg-[#4F5BD5] font-mono text-[10px] text-white tabular-nums">
                {bookedTickets.length}
              </span>
            </button>
          </div>
        </div>

        {/* Studio Cartographic Floating Title & Compass Rose HUD (Whole India & State Topography) */}
        {isTopographicView && !use2DFallback && (
          <div className="pointer-events-none absolute top-20 left-4 z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/90 border border-black/10 shadow-md flex items-center justify-center text-[#111315]">
              <Compass className="w-5 h-5 text-[#4F5BD5]" />
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white/90 border border-black/10 shadow-md">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#4F5BD5]">
                {viewMode === 'india'
                  ? 'REPUBLIC OF INDIA · 36 STATES & UTS'
                  : `${selectedIndiaState.isUT ? 'UNION TERRITORY' : 'INDIAN STATE'} · ${selectedIndiaState.capital.toUpperCase()} · ${selectedIndiaState.code}`}
              </p>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[#111315]">
                {viewMode === 'india'
                  ? 'INDIA • 3D TOPOGRAPHIC RELIEF'
                  : `${selectedIndiaState.name.toUpperCase()} • TOPOGRAPHY`}
              </h2>
            </div>
          </div>
        )}

        {/* Live Vehicle Telemetry HUD Overlay (Appears when clicking any flying 3D airplane, train, or KSRTC bus) */}
        {liveTelemetry && (
          <div
            data-testid="live-vehicle-telemetry-hud"
            className="absolute top-20 right-4 z-20 w-76 sm:w-84 rounded-[24px] bg-white/92 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(0,0,0,0.28)] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-[#111315] text-white flex items-center justify-center shrink-0">
                  {liveTelemetry.kind === 'flight' ? (
                    <Plane className="w-4 h-4 text-[#A5B4FC]" />
                  ) : (
                    <TrainFront className="w-4 h-4 text-emerald-400" />
                  )}
                </span>
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-emerald-700">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Live 3D Telemetry
                  </span>
                  <h3 className="text-sm font-extrabold text-[#111315]">
                    {liveTelemetry.kind === 'flight'
                      ? `${liveTelemetry.data.airlineName} ${liveTelemetry.data.flightNumber}`
                      : `${liveTelemetry.data.name}`}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveTelemetry(null)}
                aria-label="Close live vehicle telemetry HUD"
                className="p-1 text-slate-400 hover:text-[#111315] rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="px-3 py-2 rounded-xl bg-[#EFECE8]/85">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  Corridor
                </span>
                <span className="font-bold text-[#111315]">
                  {liveTelemetry.kind === 'flight'
                    ? `${liveTelemetry.data.fromIata} → ${liveTelemetry.data.toIata}`
                    : `${liveTelemetry.data.serviceCode}`}
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#EFECE8]/85">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">
                  {liveTelemetry.kind === 'flight' ? 'Altitude / Speed' : 'Live Telemetry'}
                </span>
                <span className="font-bold text-[#4F5BD5]">
                  {liveTelemetry.kind === 'flight'
                    ? `${liveTelemetry.data.altitudeFt} · ${liveTelemetry.data.speedKts}`
                    : liveTelemetry.data.speedLabel}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600">
              {liveTelemetry.kind === 'flight'
                ? `${liveTelemetry.data.aircraft} · ${liveTelemetry.data.fromCity} to ${liveTelemetry.data.toCity}`
                : `${liveTelemetry.data.vehicleModel} · ${liveTelemetry.data.from} → ${liveTelemetry.data.to}`}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block">Starting Fare</span>
                <span className="text-base font-extrabold font-mono text-emerald-700">
                  ₹
                  {(liveTelemetry.kind === 'flight'
                    ? liveTelemetry.data.baseFareInr
                    : liveTelemetry.data.fareInr
                  ).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBookFromTelemetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111315] hover:bg-[#24272B] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Armchair className="w-3.5 h-3.5 text-[#A5B4FC]" />
                Book Seat in 3D
              </button>
            </div>
          </div>
        )}

        {/* 3D WebGL Scene wrapped in ErrorBoundary with 2D SVG Fallback */}
        {use2DFallback ? (
          <Kerala2DFallbackMap
            viewMode={viewMode === 'globe' ? 'globe' : 'terrain'}
            originId={originId}
            destinationId={destinationId}
            showBiodiversity={showBiodiversity}
            districtHazardsMap={corridorHazardReport.districtHazardsMap}
            onDiveToKerala={handleDiveToKerala}
            onSelectDestination={handleSelectDestination}
            fallbackNotice={contextLostMessage}
            onRetry3D={
              webglCaps.supported
                ? () => {
                    setContextLostMessage(null);
                    setUse2DFallback(false);
                  }
                : undefined
            }
          />
        ) : (
          <WebGLErrorBoundary
            fallback={(errMsg, onRetry) => (
              <Kerala2DFallbackMap
                viewMode={viewMode === 'globe' ? 'globe' : 'terrain'}
                originId={originId}
                destinationId={destinationId}
                showBiodiversity={showBiodiversity}
                districtHazardsMap={corridorHazardReport.districtHazardsMap}
                onDiveToKerala={handleDiveToKerala}
                onSelectDestination={handleSelectDestination}
                fallbackNotice={
                  errMsg || '3D WebGL view encountered an issue. Switched to 2D SVG map.'
                }
                onRetry3D={onRetry}
              />
            )}
          >
            <Kerala3DMapScene
              viewMode={viewMode}
              originId={originId}
              destinationId={destinationId}
              selectedIndiaStateId={selectedIndiaStateId}
              showBiodiversity={showBiodiversity}
              resetSignal={resetSignal}
              isSoftwareGl={webglCaps.isSoftwareGl}
              districtHazardsMap={corridorHazardReport.districtHazardsMap}
              globeOriginPoint={globeOriginPoint}
              globeDestinationPoint={globeDestinationPoint}
              globeFocusCoord={globeFocusCoord}
              selectedCountryIso={destCityId ? destCountryIso : null}
              onSelectWorldCountry={handleSelectWorldCountryOnGlobe}
              onSelectIndiaState={handleSelectIndiaState}
              onSelectIndiaDistrict={handleSelectIndiaDistrict}
              onSelectLiveFlight={(flight) => setLiveTelemetry({ kind: 'flight', data: flight })}
              onSelectRegionalVehicle={(veh) => setLiveTelemetry({ kind: 'regional', data: veh })}
              onDiveToKerala={handleDiveToKerala}
              onSelectDestination={handleSelectDestination}
              onContextLost={() => {
                setContextLostMessage(
                  'WebGL graphics context was interrupted. Switched to interactive 2D SVG map.'
                );
                setUse2DFallback(true);
              }}
            />
          </WebGLErrorBoundary>
        )}

        {/* Bottom HUD: 195-Country Cascading World Selector in Globe View OR Kerala Quick-Jump in Terrain View */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 pointer-events-none">
          {viewMode === 'globe' ? (
            <div
              className={`pointer-events-auto p-3 rounded-[24px] ${hudGlass} border border-white/85 shadow-2xl space-y-2.5`}
            >
              {/* Cascading Country -> State -> City / Airport Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                <select
                  aria-label="Select Destination Country (195 Countries)"
                  value={destCountryIso}
                  onChange={(e) => {
                    const nextCountry = getWorldCountryByIso(e.target.value);
                    if (!nextCountry) return;
                    const firstState = nextCountry.states[0];
                    const firstCity = firstState?.cities[0];
                    handleSelectGlobalDestination(
                      nextCountry.isoNumeric,
                      firstState?.id,
                      firstCity?.id,
                      true
                    );
                  }}
                  className="px-3 py-2 rounded-2xl bg-[#EFECE8]/90 hover:bg-white border border-black/5 text-xs font-bold text-[#111315] cursor-pointer focus:outline-none"
                >
                  {WORLD_ATLAS_COUNTRIES.map((c) => (
                    <option key={c.isoNumeric} value={c.isoNumeric}>
                      {c.name} ({c.iso2})
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Select State or Province"
                  value={selectedWorldState?.id ?? ''}
                  onChange={(e) => {
                    const st = selectedWorldCountry.states.find((s) => s.id === e.target.value);
                    if (!st) return;
                    handleSelectGlobalDestination(
                      selectedWorldCountry.isoNumeric,
                      st.id,
                      st.cities[0]?.id,
                      true
                    );
                  }}
                  className="px-3 py-2 rounded-2xl bg-[#EFECE8]/90 hover:bg-white border border-black/5 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none"
                >
                  {selectedWorldCountry.states.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Select City or Airport Hub"
                  value={destCityId}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    handleSelectGlobalDestination(
                      selectedWorldCountry.isoNumeric,
                      selectedWorldState?.id,
                      e.target.value,
                      true
                    );
                  }}
                  className="px-3 py-2 rounded-2xl bg-[#EFECE8]/90 hover:bg-white border border-black/5 text-xs font-semibold text-[#4F5BD5] cursor-pointer focus:outline-none"
                >
                  <option value="">Choose City / Airport...</option>
                  {(selectedWorldState?.cities ?? []).map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                      {city.iata ? ` (${city.iata})` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleDiveToKerala}
                  className="px-4 py-2 rounded-full bg-[#111315] hover:bg-[#24272B] text-white text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
                >
                  Dive into Kerala 3D
                </button>
              </div>

              {/* Featured Global Hubs & Live Airspace Hint */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#4F5BD5] px-2 shrink-0">
                  Global Hubs
                </span>
                {GLOBAL_FEATURED_DESTINATIONS.map((hub) => (
                  <button
                    key={hub.label}
                    type="button"
                    onClick={() => {
                      if (hub.keralaDistrictId) {
                        const region = getRegionById(hub.keralaDistrictId);
                        if (region) {
                          handleSelectDestination(region);
                          return;
                        }
                      }
                      const country = getWorldCountryByIso(hub.countryIso2);
                      if (!country) return;
                      let matchedStateId = country.states[0]?.id;
                      let matchedCityId = country.states[0]?.cities[0]?.id;
                      if (hub.cityIata) {
                        for (const st of country.states) {
                          const ct = st.cities.find((c) => c.iata === hub.cityIata);
                          if (ct) {
                            matchedStateId = st.id;
                            matchedCityId = ct.id;
                            break;
                          }
                        }
                      }
                      handleSelectGlobalDestination(
                        country.isoNumeric,
                        matchedStateId,
                        matchedCityId,
                        true
                      );
                    }}
                    className="px-3 py-1 rounded-full bg-white/90 hover:bg-[#111315] hover:text-white border border-black/5 text-[11px] font-semibold text-slate-800 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    {hub.label}
                  </button>
                ))}
              </div>
            </div>
          ) : isTopographicView ? (
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] ${hudGlass} border border-black/10 px-3 py-1.5 rounded-full shrink-0 shadow-sm`}
              >
                {viewMode === 'india'
                  ? 'Click any 3D State Slab to Zoom'
                  : `${selectedIndiaState.name} Districts`}
              </span>
              {(viewMode === 'india'
                ? INDIA_STATES_AND_UTS.slice(0, 12).map((st) => ({
                    id: st.id,
                    label: st.name,
                    onClick: () => handleSelectIndiaState(st),
                    active: st.id === selectedIndiaStateId,
                  }))
                : selectedIndiaState.districts.map((dist) => ({
                    id: dist,
                    label: dist,
                    onClick: () => handleSelectIndiaDistrict(dist, selectedIndiaState),
                    active: selectedStateDistrictLabel?.startsWith(dist) ?? false,
                  }))
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.onClick}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border shadow-sm transition-all cursor-pointer ${
                    chip.active
                      ? 'bg-[#111315] border-[#111315] text-white shadow-md'
                      : `${hudGlass} hover:bg-white border-black/10 text-slate-800 dark:text-slate-100`
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] ${hudGlass} border border-white/80 px-3 py-1.5 rounded-full shrink-0 shadow-sm`}
              >
                Quick Jump · Click 3D Train/Bus
              </span>
              {quickJumpRegions.map((region) => {
                const isSelected = region.id === destinationId;
                const isGateway = region.kind === 'gateway';
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => handleQuickJump(region.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border shadow-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#111315] border-[#111315] text-white shadow-md'
                        : `${hudGlass} hover:bg-white border-white/80 text-slate-800`
                    }`}
                  >
                    <span>{region.name}</span>
                    {isGateway && (
                      <span
                        className={`ml-1.5 text-[10px] font-mono font-bold ${
                          isSelected ? 'text-[#A5B4FC]' : 'text-[#4F5BD5]'
                        }`}
                      >
                        HUB
                      </span>
                    )}
                  </button>
                );
              })}

              <label className="sr-only" htmlFor="all-regions-jump">
                Jump to any district or inter-state hub
              </label>
              <select
                id="all-regions-jump"
                value={destinationId ?? ''}
                onChange={(e) => {
                  if (e.target.value) handleQuickJump(e.target.value);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${hudGlass} border border-white/80 text-slate-800 shrink-0 shadow-sm cursor-pointer focus:outline-none`}
              >
                <option value="">All 20 Regional Destinations...</option>
                {ALL_MAP_REGIONS.filter((r) => r.id !== originId).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.kind === 'gateway' ? 'Inter-State' : r.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Right Tactile Frosted Glassmorphism Planner & Multi-Airline Carrier Drawer */}
      <TravelDrawer
        origin={originNode}
        destination={destinationNode}
        originDisplayLabel={originDisplayLabel}
        destinationDisplayLabel={destinationDisplayLabel}
        travelPreference={travelPreference}
        guide={guide}
        isLoading={isLoading}
        error={error}
        isSoftwareGl={webglCaps.isSoftwareGl}
        routeHazards={corridorHazardReport.routeHazards}
        alternateFeederAdvice={corridorHazardReport.alternateFeederAdvice}
        onPreferenceChange={handlePreferenceChange}
        onApplyPreset={handleApplyPreset}
        onApplyGlobalPreset={(cIso, sId, ctId) =>
          handleSelectGlobalDestination(cIso, sId, ctId, true)
        }
        onRetry={() => {
          if (destinationDisplayLabel) {
            void fetchTravelGuideByNames(
              originDisplayLabel,
              destinationDisplayLabel,
              travelPreference,
              true
            );
          }
        }}
        onSwapOriginDestination={handleSwapOriginDestination}
        onBookCarrier={handleBookCarrier}
        onBookStep={handleBookStep}
        onBookFullJourney={handleBookFullJourney}
        onOpenSpotGallery={onOpenSpotGallery}
        onCreateLockedHouseIntimation={onCreateLockedHouseIntimation}
      />

      {/* Interactive 3D Seat Picker Booking Modal (Multi-Airline Flight / IRCTC / KSRTC) */}
      <TicketBookingDrawer
        open={bookingDrawerOpen}
        context={bookingContext}
        isSoftwareGl={webglCaps.isSoftwareGl}
        onClose={() => setBookingDrawerOpen(false)}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* Native UPI / Auto-Verify Payment Modal */}
      <UpiPaymentModal
        open={paymentModalOpen}
        draft={paymentDraft}
        actualFareInr={paymentFareInr}
        onClose={() => setPaymentModalOpen(false)}
        onTicketIssued={onTicketIssued}
        onOpenMyTickets={() => onMyTicketsOpenChange(true)}
      />

      {/* My Booked Tickets Drawer */}
      <BookedTicketsDrawer
        open={myTicketsOpen}
        tickets={bookedTickets}
        onClose={() => onMyTicketsOpenChange(false)}
        onDeleteTicket={onDeleteBookedTicket}
      />
    </div>
  );
}
