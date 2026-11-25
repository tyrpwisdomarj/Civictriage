import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  ArrowRight,
  Bus,
  Calendar,
  ExternalLink,
  IndianRupee,
  Plane,
  QrCode,
  TrainFront,
  User,
  X,
} from 'lucide-react';
import {
  BUS_SEAT_PREFERENCES,
  FLIGHT_CABIN_CLASSES,
  IRCTC_CLASSES,
  KSRTC_TIERS,
  OFFICIAL_BOOKING_URLS,
  calculateBookingFareInr,
  getTomorrowIsoDate,
  type BookingChannel,
  type BookingDraft,
  type BusSeatPreference,
  type FlightCabinClass,
  type IrctcRailClass,
  type KsrtcBusTier,
} from '../../shared/bookingSchema';
import { generateCabinLayout, type CabinSeatItem } from '../../shared/seatLayout';
import { SeatPicker3DCanvas } from './SeatPicker3DCanvas';

export interface BookingSeedContext {
  channel: BookingChannel;
  from: string;
  to: string;
  operatorOrLine: string;
  baseFareInr: number;
  isFullJourney?: boolean;
}

interface TicketBookingDrawerProps {
  open: boolean;
  context: BookingSeedContext | null;
  isSoftwareGl: boolean;
  onClose: () => void;
  onProceedToPayment: (draft: BookingDraft, computedFareInr: number) => void;
}

export function TicketBookingDrawer({
  open,
  context,
  isSoftwareGl,
  onClose,
  onProceedToPayment,
}: TicketBookingDrawerProps) {
  const [channel, setChannel] = useState<BookingChannel>('irctc');
  const [flightClass, setFlightClass] = useState<FlightCabinClass>('Economy');
  const [railClass, setRailClass] = useState<IrctcRailClass>('3A');
  const [busTier, setBusTier] = useState<KsrtcBusTier>('KSRTC Swift Deluxe');
  const [seatPreference, setSeatPreference] = useState<BusSeatPreference>('Window');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [travelDate, setTravelDate] = useState<string>(getTomorrowIsoDate);
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerAge, setPassengerAge] = useState<string>('28');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open && context) {
      setChannel(context.channel);
      setValidationError(null);
    }
  }, [open, context]);

  const cabinLayout = useMemo(
    () =>
      generateCabinLayout({
        channel,
        railClass,
        flightClass,
        busTier,
      }),
    [channel, railClass, flightClass, busTier]
  );

  // Auto-preselect one available seat whenever cabin layout changes
  useEffect(() => {
    const firstOpen = cabinLayout.seats.find((s) => s.status === 'available');
    setSelectedSeatIds(firstOpen ? [firstOpen.id] : []);
  }, [cabinLayout]);

  const selectedSeatItems = useMemo(() => {
    const map = new Map(cabinLayout.seats.map((s) => [s.id, s]));
    return selectedSeatIds
      .map((id) => map.get(id))
      .filter((s): s is CabinSeatItem => Boolean(s));
  }, [cabinLayout.seats, selectedSeatIds]);

  const seatSurchargeInr = useMemo(
    () => selectedSeatItems.reduce((sum, s) => sum + s.surchargeInr, 0),
    [selectedSeatItems]
  );

  const effectivePassengerCount = Math.max(1, selectedSeatItems.length);

  const computedFareInr = useMemo(() => {
    if (!context) return 0;
    return calculateBookingFareInr({
      channel,
      flightClass,
      railClass,
      busTier,
      baseFareInr: context.baseFareInr,
      passengerCount: effectivePassengerCount,
      seatSurchargeInr,
    });
  }, [
    context,
    channel,
    flightClass,
    railClass,
    busTier,
    effectivePassengerCount,
    seatSurchargeInr,
  ]);

  if (!open || !context) return null;

  const handleToggleSeat = (seat: CabinSeatItem) => {
    if (seat.status === 'booked') return;
    setValidationError(null);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), seat.id];
      }
      return [...prev, seat.id];
    });
  };

  const handleContinue = () => {
    const cleanName = passengerName.trim();
    const ageNum = Number(passengerAge);
    if (selectedSeatItems.length === 0) {
      setValidationError('Please click at least one available green seat in the 3D cabin.');
      return;
    }
    if (cleanName.length < 2) {
      setValidationError('Please enter the primary passenger full name.');
      return;
    }
    if (!Number.isFinite(ageNum) || ageNum < 5 || ageNum > 105) {
      setValidationError('Please enter a valid passenger age (5–105).');
      return;
    }
    if (!travelDate) {
      setValidationError('Please select a travel date.');
      return;
    }

    setValidationError(null);
    onProceedToPayment(
      {
        channel,
        from: context.from,
        to: context.to,
        operatorOrLine: context.operatorOrLine,
        flightClass,
        railClass,
        busTier,
        seatPreference,
        selectedSeats: selectedSeatItems.map((s) => s.displayLabel),
        seatSurchargeInr,
        travelDate,
        passengerName: cleanName,
        passengerAge: Math.round(ageNum),
        passengerCount: effectivePassengerCount,
        baseFareInr: context.baseFareInr,
      },
      computedFareInr
    );
  };

  const officialUrl =
    channel === 'flight'
      ? OFFICIAL_BOOKING_URLS.flight
      : channel === 'irctc'
        ? OFFICIAL_BOOKING_URLS.irctc
        : OFFICIAL_BOOKING_URLS.ksrtc;

  const officialLabel =
    channel === 'flight'
      ? 'Official Airline Portal'
      : channel === 'irctc'
        ? 'Open IRCTC'
        : 'Open Ente KSRTC';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 bg-slate-900/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Flight, IRCTC and KSRTC 3D Seat Ticket Booking"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[960px] max-h-[94vh] rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Vibrant Daylight Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-sky-700">
              {context.isFullJourney ? 'Full Journey 3D Booking Desk' : '3D Cabin & Seat Reservation'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <h2 className="text-base font-bold text-slate-900">
                Flight, IRCTC &amp; KSRTC 3D Seat Picker
              </h2>
              <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                {context.from}
                <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                <span className="text-sky-700">{context.to}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking drawer"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Channel Switcher Bar (Flight / IRCTC Rail / KSRTC Bus) */}
        <div className="px-5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-xs w-full sm:w-auto sm:min-w-[360px]">
            <button
              type="button"
              onClick={() => setChannel('flight')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                channel === 'flight'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'
              }`}
            >
              <Plane className="w-3.5 h-3.5" aria-hidden="true" />
              Flight 3D
            </button>
            <button
              type="button"
              onClick={() => setChannel('irctc')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                channel === 'irctc'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
              }`}
            >
              <TrainFront className="w-3.5 h-3.5" aria-hidden="true" />
              IRCTC Rail
            </button>
            <button
              type="button"
              onClick={() => setChannel('ksrtc')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                channel === 'ksrtc'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50'
              }`}
            >
              <Bus className="w-3.5 h-3.5" aria-hidden="true" />
              KSRTC Bus
            </button>
          </div>

          <p className="text-[11px] font-medium text-slate-500 truncate max-w-[320px]">
            {context.operatorOrLine}
          </p>
        </div>

        {/* Side-by-side 3D Cabin Viewer (left) + Options & Passenger Form (right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Interactive 3D Vehicle Cabin & Seat Picker */}
          <div className="lg:col-span-7 flex flex-col min-h-[360px]">
            <SeatPicker3DCanvas
              layout={cabinLayout}
              selectedSeatIds={selectedSeatIds}
              isSoftwareGl={isSoftwareGl}
              onToggleSeat={handleToggleSeat}
            />

            {/* Live Selected Seat Chips */}
            <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-900 inline-flex items-center gap-1 mr-1">
                  <Armchair className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  Selected ({selectedSeatItems.length}/4):
                </span>
                {selectedSeatItems.length === 0 ? (
                  <span className="text-xs text-slate-500">Click any green seat above</span>
                ) : (
                  selectedSeatItems.map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleToggleSeat(seat)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono text-[11px] font-bold shadow-xs hover:bg-amber-300 cursor-pointer"
                      title="Click to deselect seat"
                    >
                      {seat.displayLabel}
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
              {seatSurchargeInr > 0 && (
                <span className="text-[11px] font-mono font-semibold text-amber-800">
                  Seat fee +₹{seatSurchargeInr}
                </span>
              )}
            </div>
          </div>

          {/* Right: Class / Tier + Passenger Form */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {channel === 'flight' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">Flight Cabin Class</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {FLIGHT_CABIN_CLASSES.map((cls) => {
                    const selected = flightClass === cls.code;
                    const previewFare = calculateBookingFareInr({
                      channel: 'flight',
                      flightClass: cls.code,
                      railClass,
                      busTier,
                      baseFareInr: context.baseFareInr,
                      passengerCount: effectivePassengerCount,
                    });
                    return (
                      <button
                        key={cls.code}
                        type="button"
                        onClick={() => setFlightClass(cls.code)}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          selected
                            ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{cls.code}</p>
                          <p className="text-[11px] text-slate-500">{cls.label}</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                          ₹{previewFare}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {channel === 'irctc' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  IRCTC Coach &amp; Berth Class
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {IRCTC_CLASSES.map((cls) => {
                    const selected = railClass === cls.code;
                    const previewFare = calculateBookingFareInr({
                      channel: 'irctc',
                      flightClass,
                      railClass: cls.code,
                      busTier,
                      baseFareInr: context.baseFareInr,
                      passengerCount: effectivePassengerCount,
                    });
                    return (
                      <button
                        key={cls.code}
                        type="button"
                        onClick={() => setRailClass(cls.code)}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          selected
                            ? 'bg-sky-50 border-sky-400 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{cls.code}</p>
                          <p className="text-[11px] text-slate-500">{cls.label}</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                          ₹{previewFare}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {channel === 'ksrtc' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">KSRTC Service Tier</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {KSRTC_TIERS.map((entry) => {
                      const selected = busTier === entry.tier;
                      const previewFare = calculateBookingFareInr({
                        channel: 'ksrtc',
                        flightClass,
                        railClass,
                        busTier: entry.tier,
                        baseFareInr: context.baseFareInr,
                        passengerCount: effectivePassengerCount,
                      });
                      return (
                        <button
                          key={entry.tier}
                          type="button"
                          onClick={() => setBusTier(entry.tier)}
                          className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            selected
                              ? 'bg-emerald-50 border-emerald-400 text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{entry.tier}</p>
                            <p className="text-[11px] text-slate-500">{entry.subtitle}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                            ₹{previewFare}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Seating Tag</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BUS_SEAT_PREFERENCES.map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setSeatPreference(pref)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                          seatPreference === pref
                            ? 'bg-teal-50 border-teal-400 text-teal-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Passenger & Journey Details */}
            <div className="space-y-3 pt-3 border-t border-slate-200/80">
              <p className="text-xs font-bold text-slate-800">Passenger &amp; Journey Details</p>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label
                    htmlFor="booking-travel-date"
                    className="text-[11px] font-medium text-slate-600 flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3 text-sky-600" aria-hidden="true" />
                    Travel Date
                  </label>
                  <input
                    id="booking-travel-date"
                    type="date"
                    value={travelDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="booking-passenger-age" className="text-[11px] font-medium text-slate-600">
                    Passenger Age
                  </label>
                  <input
                    id="booking-passenger-age"
                    type="number"
                    min={5}
                    max={105}
                    value={passengerAge}
                    onChange={(e) => setPassengerAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-sky-500 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="booking-passenger-name"
                  className="text-[11px] font-medium text-slate-600 flex items-center gap-1"
                >
                  <User className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                  Primary Passenger Full Name
                </label>
                <input
                  id="booking-passenger-name"
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="e.g., Arjun Nair"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {validationError && (
                <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {validationError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Live Dynamic Fare + Official Portal + Native UPI QR CTA */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              Live Total Fare · {effectivePassengerCount}{' '}
              {effectivePassengerCount === 1 ? 'Seat' : 'Seats'} (incl. fees)
            </p>
            <p
              data-testid="live-booking-fare"
              className="text-xl font-extrabold font-mono text-emerald-700 flex items-center tabular-nums"
            >
              <IndianRupee className="w-4 h-4" aria-hidden="true" />
              {computedFareInr}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-sky-50 border border-slate-200 transition-colors"
            >
              {officialLabel}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={handleContinue}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" aria-hidden="true" />
              Pay via Native UPI QR (₹{computedFareInr})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
