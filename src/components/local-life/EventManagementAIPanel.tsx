import React, { useMemo, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  IndianRupee,
  Loader2,
  MapPin,
  Minus,
  PartyPopper,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { LiquidGlassCard, LiquidSheetModal } from '../LiquidGlassCard';
import {
  DEFAULT_ONSPOT_FOOD_CATALOG,
  EVENT_TYPES,
  QUICK_EVENT_SPOTS,
  type EventCateringItem,
  type EventPlanData,
  type EventType,
  type FoodDeliveryStage,
  type OnSpotFoodOrder,
} from '../../data/localLifeData';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

interface EventManagementAIPanelProps {
  districtName: string;
  eventPlan: EventPlanData | null;
  foodOrders: OnSpotFoodOrder[];
  onEventPlanChange: (next: EventPlanData) => void;
  onPlaceFoodOrder: (order: OnSpotFoodOrder) => void;
  onAdvanceFoodOrderStage: (orderId: string, nextStage: FoodDeliveryStage) => void;
}

const DELIVERY_STAGES: FoodDeliveryStage[] = [
  'Preparing',
  'Rider En Route to Pin',
  'Delivered',
];

export const EventManagementAIPanel: React.FC<EventManagementAIPanelProps> = ({
  districtName,
  eventPlan,
  foodOrders,
  onEventPlanChange,
  onPlaceFoodOrder,
  onAdvanceFoodOrderStage,
}) => {
  const [eventType, setEventType] = useState<EventType>(
    eventPlan?.eventType ?? 'Turf Match Refreshments'
  );
  const [guestCount, setGuestCount] = useState<number>(eventPlan?.guestCount ?? 10);
  const [budgetInr, setBudgetInr] = useState<number>(eventPlan?.totalBudgetInr ?? 2800);
  const [spotLocation, setSpotLocation] = useState<string>(
    eventPlan?.spotLocation ?? `${districtName} Town Square`
  );
  const [loading, setLoading] = useState(false);

  // On-Spot Food Cart (item id -> quantity)
  const [cartQty, setCartQty] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_ONSPOT_FOOD_CATALOG.slice(0, 2).forEach((item) => {
      initial[item.id] = item.recommendedQty;
    });
    return initial;
  });

  // UPI Checkout Modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [demoFareMode, setDemoFareMode] = useState(true);
  const [verifyingUpi, setVerifyingUpi] = useState(false);

  const activeCatalog: EventCateringItem[] = useMemo(() => {
    if (eventPlan?.cateringMenu && eventPlan.cateringMenu.length > 0) {
      return eventPlan.cateringMenu;
    }
    return DEFAULT_ONSPOT_FOOD_CATALOG;
  }, [eventPlan]);

  const cartItems = useMemo(() => {
    return activeCatalog
      .map((item) => ({
        ...item,
        qty: cartQty[item.id] ?? 0,
      }))
      .filter((item) => item.qty > 0);
  }, [activeCatalog, cartQty]);

  const cartTotalInr = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPriceInr * item.qty, 0),
    [cartItems]
  );

  const payableInr = demoFareMode ? 1 : cartTotalInr;

  const updateCartQty = (id: string, delta: number) => {
    setCartQty((prev) => {
      const nextVal = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: nextVal };
    });
  };

  const handleGenerateEventPlan = async () => {
    const cleanSpot = spotLocation.trim() || `${districtName} Town Square`;
    const cacheKey = `event_plan::${eventType}::${guestCount}::${budgetInr}::${cleanSpot}::${districtName}`;
    const cached = readAiCache<EventPlanData>(cacheKey);
    if (cached) {
      onEventPlanChange(cached);
      const nextCart: Record<string, number> = {};
      cached.cateringMenu.forEach((item) => {
        nextCart[item.id] = Math.max(1, item.recommendedQty);
      });
      setCartQty(nextCart);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'event_plan',
          districtName,
          eventType,
          guestCount,
          budgetInr,
          spotLocation: cleanSpot,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && typeof data.headline === 'string') {
        const menu: EventCateringItem[] =
          Array.isArray(data.cateringMenu) && data.cateringMenu.length > 0
            ? data.cateringMenu.map((m: any, idx: number) => ({
                id: String(m.id || `evt-food-${idx}`),
                name: String(m.name || DEFAULT_ONSPOT_FOOD_CATALOG[idx % DEFAULT_ONSPOT_FOOD_CATALOG.length].name),
                vendor: String(m.vendor || `${districtName} Local Kitchen`),
                category: (m.category || 'Snacks & Starters') as EventCateringItem['category'],
                unitPriceInr: Math.max(120, Number(m.unitPriceInr) || 450),
                servesCount: Math.max(2, Number(m.servesCount) || 5),
                recommendedQty: Math.max(1, Number(m.recommendedQty) || 1),
                dietTag: (['Veg', 'Non-Veg', 'Beverage'].includes(m.dietTag)
                  ? m.dietTag
                  : 'Veg') as EventCateringItem['dietTag'],
              }))
            : DEFAULT_ONSPOT_FOOD_CATALOG;

        const nextPlan: EventPlanData = {
          id: `evt-${Date.now()}`,
          eventType,
          guestCount,
          spotLocation: cleanSpot,
          districtName,
          totalBudgetInr: budgetInr,
          perPersonSplitInr: Math.max(50, Math.round(budgetInr / Math.max(1, guestCount))),
          headline: data.headline,
          summary:
            typeof data.summary === 'string'
              ? data.summary
              : `Structured ${eventType} plan at ${cleanSpot} for ${guestCount} guests.`,
          timeline: Array.isArray(data.timeline)
            ? data.timeline.map((t: any) => ({
                time: String(t.time || '06:00 PM'),
                title: String(t.title || 'Event Kickoff'),
                ownerNote: String(t.ownerNote || 'Confirm pin & seating.'),
              }))
            : [],
          checklist: Array.isArray(data.checklist)
            ? data.checklist.map((c: any, idx: number) => ({
                id: String(c.id || `chk-${idx}`),
                task: String(c.task || 'Confirm vendor drop-off pin'),
                phase: (['Before Arrival', 'Venue Setup', 'On-Spot Delivery'].includes(c.phase)
                  ? c.phase
                  : 'Venue Setup') as EventPlanData['checklist'][number]['phase'],
                done: Boolean(c.done),
              }))
            : [],
          cateringMenu: menu,
          createdAt: new Date().toISOString(),
        };

        writeAiCache(cacheKey, nextPlan);
        onEventPlanChange(nextPlan);

        const nextCart: Record<string, number> = {};
        menu.slice(0, 3).forEach((item) => {
          nextCart[item.id] = item.recommendedQty;
        });
        setCartQty(nextCart);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (id: string) => {
    if (!eventPlan) return;
    onEventPlanChange({
      ...eventPlan,
      checklist: eventPlan.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    });
  };

  const handleConfirmUpiDispatch = () => {
    if (cartItems.length === 0 || verifyingUpi) return;
    setVerifyingUpi(true);
    window.setTimeout(() => {
      const orderId = `FD-${districtName.slice(0, 3).toUpperCase()}-${Math.floor(
        10000 + Math.random() * 89999
      )}`;
      const utrNumber = `4329${Math.floor(10000000 + Math.random() * 89999999)}`;
      const riders = ['Akhil S. (EV Scooter)', 'Nikhil P. (Fast Dispatch)', 'Faisal K. (Catering Van)'];
      const order: OnSpotFoodOrder = {
        orderId,
        eventHeadline: eventPlan?.headline || `${eventType} @ ${spotLocation}`,
        spotLocation: eventPlan?.spotLocation || spotLocation,
        districtName: eventPlan?.districtName || districtName,
        items: cartItems.map((c) => ({
          id: c.id,
          name: c.name,
          vendor: c.vendor,
          qty: c.qty,
          unitPriceInr: c.unitPriceInr,
        })),
        totalInr: cartTotalInr,
        paidInr: payableInr,
        isDemoFare: demoFareMode,
        utrNumber,
        stage: 'Preparing',
        riderName: riders[Math.floor(Math.random() * riders.length)],
        etaMinutes: 22,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onPlaceFoodOrder(order);
      setVerifyingUpi(false);
      setCheckoutOpen(false);
    }, 950);
  };

  const mapQuery = `${eventPlan?.spotLocation || spotLocation}, ${districtName}, Kerala`;
  const upiUri = `upi://pay?pa=7012692128@fam&pn=${encodeURIComponent(
    'CivicTriage On-Spot Catering'
  )}&am=${payableInr}&cu=INR&tn=${encodeURIComponent(
    `Event Food Pin: ${eventPlan?.spotLocation || spotLocation}`
  )}`;

  return (
    <div className="space-y-5">
      {/* Event Architect Builder */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Event Management AI &amp; On-Spot Catering Dispatch</span>
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white">
            Plan Meetups, Turf Matches &amp; Order Food Straight to Your Pin
          </h2>
        </div>

        {/* Quick Spot Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 mr-1">
            Quick Pins:
          </span>
          {QUICK_EVENT_SPOTS.map((sp) => (
            <button
              key={sp.label}
              type="button"
              onClick={() => setSpotLocation(sp.label)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                spotLocation === sp.label
                  ? 'bg-[#4F5BD5] text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-black/10'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Spot / Venue Pin
            </label>
            <input
              type="text"
              value={spotLocation}
              onChange={(e) => setSpotLocation(e.target.value)}
              placeholder="e.g. Thiruvalla 7s Turf Arena"
              className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Users className="w-3 h-3" /> Guests
            </label>
            <input
              type="number"
              min={2}
              max={150}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(2, Number(e.target.value) || 8))}
              className="w-full glass-pill-input px-3 py-2.5 text-xs font-mono font-bold"
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
              onChange={(e) => setBudgetInr(Math.max(500, Number(e.target.value) || 2500))}
              className="w-full glass-pill-input px-3 py-2.5 text-xs font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGenerateEventPlan()}
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
      </LiquidGlassCard>

      {/* Active Event Plan + Live Google Map Pin */}
      {eventPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <LiquidGlassCard interactive={false} className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/10">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                  {eventPlan.headline}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{eventPlan.summary}</p>
              </div>
              <div className="px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-right shrink-0">
                <p className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300">
                  Per-Person Split
                </p>
                <p className="text-sm font-mono font-extrabold text-emerald-800 dark:text-emerald-200">
                  ₹{eventPlan.perPersonSplitInr.toLocaleString('en-IN')} / guest
                </p>
              </div>
            </div>

            {/* Event Run-Sheet Timeline */}
            {eventPlan.timeline.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Event Run-Sheet Timeline
                </h4>
                <div className="space-y-2">
                  {eventPlan.timeline.map((blk, i) => (
                    <div
                      key={`${blk.time}-${i}`}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/65 border border-white/80 dark:border-white/10"
                    >
                      <span className="font-mono text-[11px] font-extrabold text-[#4F5BD5] dark:text-[#A5B4FC] whitespace-nowrap pt-0.5">
                        {blk.time}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#111315] dark:text-white">
                          {blk.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          {blk.ownerNote}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checkable Event Prep Checklist */}
            {eventPlan.checklist.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Interactive Prep &amp; On-Spot Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventPlan.checklist.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className={`flex items-start gap-2 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        item.done
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200/80 dark:border-emerald-800/50 opacity-85'
                          : 'bg-white/70 dark:bg-slate-900/65 border-white/80 dark:border-white/10'
                      }`}
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-mono font-bold uppercase text-[#4F5BD5] dark:text-[#A5B4FC]">
                          {item.phase}
                        </span>
                        <p
                          className={`text-xs font-semibold text-[#111315] dark:text-white ${
                            item.done ? 'line-through' : ''
                          }`}
                        >
                          {item.task}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </LiquidGlassCard>

          {/* Pinned Event Spot Google Map */}
          <LiquidGlassCard interactive={false} className="lg:col-span-5 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-[#111315] dark:text-white flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#4F5BD5] shrink-0" />
                <span className="truncate">Drop-Off Pin: {eventPlan.spotLocation}</span>
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  mapQuery
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline shrink-0"
              >
                Open Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-2xl overflow-hidden h-[290px] border border-white/60 dark:border-white/15">
              <iframe
                title={`Event delivery pin: ${eventPlan.spotLocation}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full border-0"
              />
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {/* On-Spot Food & Catering Delivery Catalog + Cart */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>On-Spot Event Food &amp; Refreshment Delivery</span>
            </p>
            <h3 className="text-base sm:text-lg font-extrabold text-[#111315] dark:text-white">
              Build Your Crew Tray &amp; Dispatch Straight to {eventPlan?.spotLocation || spotLocation}
            </h3>
          </div>

          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-45 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#A5B4FC] dark:text-[#4F5BD5]" />
            <span>Dispatch via UPI · ₹{cartTotalInr.toLocaleString('en-IN')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {activeCatalog.map((item) => {
            const qty = cartQty[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                  qty > 0
                    ? 'bg-white/90 dark:bg-slate-900/85 border-[#4F5BD5]/45 shadow-sm'
                    : 'bg-white/65 dark:bg-slate-900/55 border-white/80 dark:border-white/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#4F5BD5] dark:text-[#A5B4FC]">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.dietTag === 'Veg'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : item.dietTag === 'Beverage'
                            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.dietTag}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#111315] dark:text-white leading-snug">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {item.vendor} · Serves {item.servesCount}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                    ₹{item.unitPriceInr.toLocaleString('en-IN')}
                  </span>

                  <div className="inline-flex items-center gap-2 bg-black/5 dark:bg-white/10 rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      aria-label={`Remove ${item.name}`}
                      className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-mono text-xs font-extrabold text-[#111315] dark:text-white">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      aria-label={`Add ${item.name}`}
                      className="w-6 h-6 rounded-full bg-[#4F5BD5] text-white flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </LiquidGlassCard>

      {/* Active On-Spot Food Delivery Orders Tracker */}
      {foodOrders.length > 0 && (
        <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5" />
              <span>Live On-Spot Delivery Tracker ({foodOrders.length})</span>
            </p>
            <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
              Confirmed Event Food Orders (Auto-Logged in Expense Tracker)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {foodOrders.map((order) => {
              const stageIdx = DELIVERY_STAGES.indexOf(order.stage);
              const nextStage = DELIVERY_STAGES[stageIdx + 1];
              return (
                <div
                  key={order.orderId}
                  className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 border border-white/80 dark:border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-[#4F5BD5] dark:text-[#A5B4FC]">
                          {order.orderId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {order.stage}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-[#111315] dark:text-white truncate mt-0.5">
                        {order.eventHeadline}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#4F5BD5]" />
                        {order.spotLocation} · Rider: {order.riderName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                        ₹{order.totalInr.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {order.isDemoFare ? 'Paid ₹1 Demo' : 'UPI Paid'}
                      </p>
                    </div>
                  </div>

                  {/* 3-Stage Progress Bar */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {DELIVERY_STAGES.map((st, idx) => (
                      <div
                        key={st}
                        className={`px-2 py-1.5 rounded-xl text-center text-[10px] font-bold ${
                          idx <= stageIdx
                            ? 'bg-[#4F5BD5] text-white'
                            : 'bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {st}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      UTR: {order.utrNumber || 'AUTO-VERIFIED'} · {order.createdAt}
                    </span>
                    {nextStage && (
                      <button
                        type="button"
                        onClick={() => onAdvanceFoodOrderStage(order.orderId, nextStage)}
                        className="px-3 py-1 rounded-full bg-[#EFECE8] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[#4F5BD5] dark:text-[#A5B4FC] font-bold cursor-pointer"
                      >
                        Simulate → {nextStage}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </LiquidGlassCard>
      )}

      {/* UPI On-Spot Food Payment Modal (7012692128@fam) */}
      <LiquidSheetModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="On-Spot Event Catering UPI Checkout"
        maxWidthClass="max-w-lg"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>7012692128@fam · Instant On-Spot Dispatch</span>
              </p>
              <h3 className="text-lg font-extrabold text-[#111315] dark:text-white">
                Confirm Food Delivery to {eventPlan?.spotLocation || spotLocation}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl p-3.5 bg-white/75 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 space-y-1.5">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-200"
              >
                <span className="truncate">
                  {item.qty}× {item.name}
                </span>
                <span className="font-mono font-bold shrink-0">
                  ₹{(item.unitPriceInr * item.qty).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-black/8 dark:border-white/10 text-sm font-extrabold text-[#111315] dark:text-white">
              <span>Order Total</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                ₹{cartTotalInr.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Demo ₹1 Toggle + Scannable QR */}
          <label className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#4F5BD5]/10 dark:bg-[#7B83EB]/18 border border-[#4F5BD5]/25 cursor-pointer">
            <span className="text-xs font-bold text-[#313DA8] dark:text-[#C7D2FE]">
              ₹1 Demo Payment Mode (logs full ₹{cartTotalInr.toLocaleString('en-IN')} to Expense Tracker)
            </span>
            <input
              type="checkbox"
              checked={demoFareMode}
              onChange={(e) => setDemoFareMode(e.target.checked)}
              className="w-4 h-4 accent-[#4F5BD5]"
            />
          </label>

          <div className="flex flex-col items-center gap-2 py-2">
            <div className="p-3 rounded-2xl bg-white shadow-md border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=${encodeURIComponent(
                  upiUri
                )}`}
                alt="UPI QR code for 7012692128@fam"
                className="w-40 h-40"
              />
            </div>
            <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
              UPI ID: 7012692128@fam · Payable Now: ₹{payableInr.toLocaleString('en-IN')}
            </p>
          </div>

          <button
            type="button"
            disabled={verifyingUpi}
            onClick={handleConfirmUpiDispatch}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-70 cursor-pointer"
          >
            {verifyingUpi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auto-Verifying UPI &amp; Assigning Rider…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Auto-Verify UPI &amp; Dispatch Rider to Pin</span>
              </>
            )}
          </button>
        </div>
      </LiquidSheetModal>
    </div>
  );
};
