import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Globe,
  Layers,
  Leaf,
  Navigation,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import {
  ALL_MAP_REGIONS,
  KERALA_DISTRICTS,
  QUICK_JUMP_IDS,
  getRegionById,
} from '../../data/keralaMapData';
import {
  isBookableStepMode,
  normalizeTravelGuidePayload,
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
import { Kerala3DMapScene, type ExplorerViewMode } from './Kerala3DMapScene';
import { Kerala2DFallbackMap } from './Kerala2DFallbackMap';
import { TravelDrawer } from './TravelDrawer';
import {
  TicketBookingDrawer,
  type BookingSeedContext,
} from './TicketBookingDrawer';
import { UpiPaymentModal } from './UpiPaymentModal';
import { BookedTicketsDrawer } from './BookedTicketsDrawer';
import type { CorridorHazardReport } from '../../shared/corridorHazardMatcher';

export interface TravelDistrictGuideViewProps {
  originId: string;
  destinationId: string | null;
  bookedTickets: BookedETicket[];
  myTicketsOpen: boolean;
  corridorHazardReport: CorridorHazardReport;
  onOriginIdChange: (id: string) => void;
  onDestinationIdChange: (id: string | null) => void;
  onTicketIssued: (ticket: BookedETicket) => void;
  onDeleteBookedTicket: (id: string) => void;
  onMyTicketsOpenChange: (open: boolean) => void;
  onCreateLockedHouseIntimation: (details: {
    districtId: string;
    houseAddress: string;
    travelDates: string;
  }) => string;
}

export function TravelDistrictGuideView({
  originId,
  destinationId,
  bookedTickets,
  myTicketsOpen,
  corridorHazardReport,
  onOriginIdChange,
  onDestinationIdChange,
  onTicketIssued,
  onDeleteBookedTicket,
  onMyTicketsOpenChange,
  onCreateLockedHouseIntimation,
}: TravelDistrictGuideViewProps) {
  const webglCaps = useMemo(() => detectWebGLCapabilities(), []);
  const [use2DFallback, setUse2DFallback] = useState(!webglCaps.supported);
  const [contextLostMessage, setContextLostMessage] = useState<string | null>(
    webglCaps.supported
      ? null
      : 'WebGL is unavailable on this device. Showing interactive 2D Kerala map.'
  );

  // Start in Whole Earth Globe View
  const [viewMode, setViewMode] = useState<ExplorerViewMode>('globe');
  const [showBiodiversity, setShowBiodiversity] = useState<boolean>(true);
  const [travelPreference, setTravelPreference] = useState<TravelPreference>('Balanced');
  const [resetSignal, setResetSignal] = useState<number>(0);

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

  const originNode = useMemo(
    () => getRegionById(originId) ?? KERALA_DISTRICTS[11],
    [originId]
  );

  const destinationNode = useMemo(
    () => (destinationId ? getRegionById(destinationId) ?? null : null),
    [destinationId]
  );

  const fetchTravelGuide = useCallback(
    async (
      origin: MapRegionNode,
      destination: MapRegionNode,
      preference: TravelPreference,
      forceRefresh = false
    ) => {
      if (origin.id === destination.id) {
        setGuide(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const key = `${origin.id}::${destination.id}::${preference}`;
      if (!forceRefresh) {
        const cached = clientCacheRef.current.get(key);
        if (cached) {
          setGuide(cached);
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
            origin: origin.name,
            destination: destination.name,
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
          origin.name,
          destination.name,
          preference
        );
        clientCacheRef.current.set(key, normalized);
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

  const handleDiveToKerala = useCallback(() => {
    setViewMode('terrain');
  }, []);

  const handleBackToGlobe = useCallback(() => {
    setViewMode('globe');
  }, []);

  const handleSelectDestination = useCallback(
    (region: MapRegionNode) => {
      if (region.id === originNode.id) return;
      setViewMode('terrain');
      onDestinationIdChange(region.id);
      void fetchTravelGuide(originNode, region, travelPreference);
    },
    [originNode, travelPreference, fetchTravelGuide, onDestinationIdChange]
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
      setViewMode('terrain');
      void fetchTravelGuide(o, d, travelPreference);
    },
    [travelPreference, fetchTravelGuide, onOriginIdChange, onDestinationIdChange]
  );

  const handleOriginChange = useCallback(
    (newOriginId: string) => {
      const newOrigin = getRegionById(newOriginId);
      if (!newOrigin) return;
      onOriginIdChange(newOrigin.id);
      if (destinationNode && destinationNode.id !== newOrigin.id) {
        void fetchTravelGuide(newOrigin, destinationNode, travelPreference);
      } else if (destinationNode && destinationNode.id === newOrigin.id) {
        onDestinationIdChange(null);
        setGuide(null);
      }
    },
    [destinationNode, travelPreference, fetchTravelGuide, onOriginIdChange, onDestinationIdChange]
  );

  const handlePreferenceChange = useCallback(
    (nextPref: TravelPreference) => {
      setTravelPreference(nextPref);
      if (destinationNode && destinationNode.id !== originNode.id) {
        void fetchTravelGuide(originNode, destinationNode, nextPref);
      }
    },
    [originNode, destinationNode, fetchTravelGuide]
  );

  const handleSwapOriginDestination = useCallback(() => {
    if (!destinationNode || destinationNode.id === originNode.id) return;
    if (destinationNode.kind === 'district') {
      const nextOrigin = destinationNode;
      const nextDest = originNode;
      onOriginIdChange(nextOrigin.id);
      onDestinationIdChange(nextDest.id);
      void fetchTravelGuide(nextOrigin, nextDest, travelPreference);
    }
  }, [originNode, destinationNode, travelPreference, fetchTravelGuide, onOriginIdChange, onDestinationIdChange]);

  const handleBookStep = useCallback((step: TransportStep) => {
    const channel = isBookableStepMode(step.mode);
    setBookingContext({
      channel: channel === 'flight' ? 'flight' : channel === 'bus' ? 'ksrtc' : 'irctc',
      from: step.from,
      to: step.to,
      operatorOrLine: step.operator_or_line,
      baseFareInr: parseBaseFareFromText(
        step.approx_fare,
        channel === 'flight' ? 3200 : 180
      ),
      isFullJourney: false,
    });
    setBookingDrawerOpen(true);
  }, []);

  const handleBookFullJourney = useCallback(() => {
    if (!guide) return;
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
        channel === 'flight' ? 3200 : 260
      ),
      isFullJourney: true,
    });
    setBookingDrawerOpen(true);
  }, [guide]);

  const handleProceedToPayment = useCallback(
    (draft: BookingDraft, computedFareInr: number) => {
      setBookingDrawerOpen(false);
      setPaymentDraft(draft);
      setPaymentFareInr(computedFareInr);
      setPaymentModalOpen(true);
    },
    []
  );

  const handleTicketIssued = useCallback(
    (ticket: BookedETicket) => {
      onTicketIssued(ticket);
    },
    [onTicketIssued]
  );

  const handleDeleteBookedTicket = useCallback(
    (id: string) => {
      onDeleteBookedTicket(id);
    },
    [onDeleteBookedTicket]
  );

  const quickJumpRegions = useMemo(
    () =>
      QUICK_JUMP_IDS.map((id) => getRegionById(id)).filter(
        (r): r is MapRegionNode => Boolean(r && r.id !== originId)
      ),
    [originId]
  );

  const hudGlass = webglCaps.isSoftwareGl
    ? 'bg-white/95'
    : 'bg-white/90 backdrop-blur-md';

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] min-h-[640px] bg-sky-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Left / Background Interactive Living 3D Globe & Lush Kerala Diorama */}
      <div className="relative flex-1 min-h-[400px] lg:min-h-0 overflow-hidden">
        {/* Top Floating Daylight Glass HUD Toolbar */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {viewMode === 'globe' ? (
              <button
                type="button"
                onClick={handleDiveToKerala}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 text-xs font-bold text-white shadow-lg shadow-emerald-900/25 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                Dive into Kerala &amp; South India
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBackToGlobe}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${hudGlass} hover:bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800 shadow-md transition-colors cursor-pointer`}
                >
                  <Globe className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                  Whole Earth Globe View
                </button>

                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${hudGlass} border border-emerald-200 shadow-md`}
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <label
                    htmlFor="travel-origin-select"
                    className="text-[11px] font-mono font-semibold text-slate-500"
                  >
                    Origin
                  </label>
                  <select
                    id="travel-origin-select"
                    value={originId}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    className="bg-transparent text-xs font-bold text-emerald-700 focus:outline-none cursor-pointer pr-1"
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition-colors cursor-pointer ${
                    showBiodiversity
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : `${hudGlass} border-slate-200 text-slate-700 hover:bg-emerald-50`
                  }`}
                >
                  <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                  Biodiversity &amp; Culture
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setResetSignal((n) => n + 1)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${hudGlass} hover:bg-sky-50 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-md transition-colors cursor-pointer`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
              Reset Camera
            </button>

            {webglCaps.supported && (
              <button
                type="button"
                onClick={() => {
                  setUse2DFallback((prev) => !prev);
                  setContextLostMessage(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${hudGlass} hover:bg-sky-50 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-md transition-colors cursor-pointer`}
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ${hudGlass} hover:bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 shadow-md transition-colors cursor-pointer`}
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              My Booked Tickets
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 font-mono text-[10px] text-emerald-800 tabular-nums">
                {bookedTickets.length}
              </span>
            </button>
          </div>
        </div>

        {/* 3D WebGL Scene wrapped in ErrorBoundary with 2D SVG Fallback */}
        {use2DFallback ? (
          <Kerala2DFallbackMap
            viewMode={viewMode}
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
                viewMode={viewMode}
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
              showBiodiversity={showBiodiversity}
              resetSignal={resetSignal}
              isSoftwareGl={webglCaps.isSoftwareGl}
              districtHazardsMap={corridorHazardReport.districtHazardsMap}
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

        {/* Bottom HUD: Living Earth Prompt in Globe View OR Quick-Jump Bar in Terrain View */}
        <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 pointer-events-none">
          {viewMode === 'globe' ? (
            <div
              className={`pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl ${hudGlass} border border-sky-200/90 shadow-xl`}
            >
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">Living Earth Globe:</span> Drag to
                spin Earth or click the glowing golden beacon over India &amp; Kerala.
              </div>
              <button
                type="button"
                onClick={handleDiveToKerala}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white text-xs font-bold shadow-sm cursor-pointer shrink-0"
              >
                Dive into Kerala &amp; South India
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider text-sky-800 ${hudGlass} border border-sky-200 px-2.5 py-1.5 rounded-xl shrink-0 shadow-sm`}
              >
                Quick Jump
              </span>
              {quickJumpRegions.map((region) => {
                const isSelected = region.id === destinationId;
                const isGateway = region.kind === 'gateway';
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => handleQuickJump(region.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border shadow-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-500 to-emerald-500 border-sky-400 text-white shadow-md'
                        : `${hudGlass} hover:bg-emerald-50 border-slate-200/90 text-slate-800`
                    }`}
                  >
                    <span>{region.name}</span>
                    {isGateway && (
                      <span
                        className={`ml-1.5 text-[10px] font-mono font-bold ${
                          isSelected ? 'text-amber-100' : 'text-amber-600'
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${hudGlass} border border-slate-200/90 text-slate-700 shrink-0 shadow-sm cursor-pointer focus:outline-none`}
              >
                <option value="">All 20 Destinations...</option>
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

      {/* Right Daylight Glassmorphism Planner Drawer */}
      <TravelDrawer
        origin={originNode}
        destination={destinationNode}
        travelPreference={travelPreference}
        guide={guide}
        isLoading={isLoading}
        error={error}
        isSoftwareGl={webglCaps.isSoftwareGl}
        routeHazards={corridorHazardReport.routeHazards}
        alternateFeederAdvice={corridorHazardReport.alternateFeederAdvice}
        onPreferenceChange={handlePreferenceChange}
        onApplyPreset={handleApplyPreset}
        onRetry={() => {
          if (destinationNode) {
            void fetchTravelGuide(originNode, destinationNode, travelPreference, true);
          }
        }}
        onSwapOriginDestination={handleSwapOriginDestination}
        onBookStep={handleBookStep}
        onBookFullJourney={handleBookFullJourney}
        onCreateLockedHouseIntimation={onCreateLockedHouseIntimation}
      />

      {/* Interactive 3D Seat Picker Booking Modal (Flight / IRCTC / KSRTC) */}
      <TicketBookingDrawer
        open={bookingDrawerOpen}
        context={bookingContext}
        isSoftwareGl={webglCaps.isSoftwareGl}
        onClose={() => setBookingDrawerOpen(false)}
        onProceedToPayment={handleProceedToPayment}
      />

      {/* Native UPI / Wallet QR Payment Modal */}
      <UpiPaymentModal
        open={paymentModalOpen}
        draft={paymentDraft}
        actualFareInr={paymentFareInr}
        onClose={() => setPaymentModalOpen(false)}
        onTicketIssued={handleTicketIssued}
        onOpenMyTickets={() => onMyTicketsOpenChange(true)}
      />

      {/* My Booked Tickets Drawer */}
      <BookedTicketsDrawer
        open={myTicketsOpen}
        tickets={bookedTickets}
        onClose={() => onMyTicketsOpenChange(false)}
        onDeleteTicket={handleDeleteBookedTicket}
      />
    </div>
  );
}
