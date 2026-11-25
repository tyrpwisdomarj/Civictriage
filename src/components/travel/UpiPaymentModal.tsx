import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import {
  UPI_MERCHANT_VPA,
  assignSeatCode,
  buildUpiPayUri,
  generateBookingRef,
  generatePnr,
  sanitizeUtrInput,
  type BookedETicket,
  type BookingDraft,
} from '../../shared/bookingSchema';

interface UpiPaymentModalProps {
  open: boolean;
  draft: BookingDraft | null;
  actualFareInr: number;
  onClose: () => void;
  onTicketIssued: (ticket: BookedETicket) => void;
  onOpenMyTickets: () => void;
}

const SUPPORTED_UPI_APPS = ['FamPay', 'GPay', 'PhonePe', 'Paytm', 'BHIM'] as const;

export function UpiPaymentModal({
  open,
  draft,
  actualFareInr,
  onClose,
  onTicketIssued,
  onOpenMyTickets,
}: UpiPaymentModalProps) {
  const [bookingRef, setBookingRef] = useState<string>(() => generateBookingRef());
  const [demoFareMode, setDemoFareMode] = useState<boolean>(false);
  const [qrTab, setQrTab] = useState<'dynamic' | 'static'>('dynamic');
  const [utrInput, setUtrInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [issuedTicket, setIssuedTicket] = useState<BookedETicket | null>(null);

  useEffect(() => {
    if (open && draft) {
      setBookingRef(generateBookingRef());
      setDemoFareMode(false);
      setQrTab('dynamic');
      setUtrInput('');
      setCopied(false);
      setIssuedTicket(null);
    }
  }, [open, draft]);

  const activeAmount = demoFareMode ? 1 : Math.max(1, actualFareInr);

  const upiPayUri = useMemo(
    () => buildUpiPayUri(activeAmount, bookingRef),
    [activeAmount, bookingRef]
  );

  if (!open || !draft) return null;

  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(UPI_MERCHANT_VPA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard is restricted
    }
  };

  const handleConfirmPayment = () => {
    const cleanUtr = sanitizeUtrInput(utrInput);
    const classOrTier =
      draft.channel === 'flight'
        ? draft.flightClass ?? 'Economy'
        : draft.channel === 'irctc'
          ? draft.railClass
          : draft.busTier;

    const ticket: BookedETicket = {
      id: `ETK-${Date.now()}`,
      pnr: generatePnr(draft.channel),
      bookingRef,
      channel: draft.channel,
      from: draft.from,
      to: draft.to,
      operatorOrLine: draft.operatorOrLine,
      classOrTier,
      seatAssignment: assignSeatCode(draft),
      travelDate: draft.travelDate,
      passengerName: draft.passengerName,
      passengerAge: draft.passengerAge,
      passengerCount: draft.passengerCount,
      actualFareInr,
      paidAmountInr: activeAmount,
      isDemoFare: demoFareMode,
      utrNumber: cleanUtr || null,
      upiVpa: UPI_MERCHANT_VPA,
      issuedAt: new Date().toISOString(),
      status: 'CONFIRMED',
    };
    setIssuedTicket(ticket);
    onTicketIssued(ticket);
  };

  const channelBannerLabel =
    issuedTicket?.channel === 'flight'
      ? 'Flight Boarding E-Ticket'
      : issuedTicket?.channel === 'irctc'
        ? 'IRCTC Rail E-Ticket'
        : 'KSRTC Bus E-Ticket';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="UPI Payment Gateway and Digital E-Ticket"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[495px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-2xl">
        {/* Top bar */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {issuedTicket ? 'Confirmed Digital E-Ticket' : 'Native UPI / Wallet QR Payment'}
              </h2>
              <p className="text-[11px] font-mono text-slate-500">Ref: {bookingRef}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {issuedTicket ? (
          /* CONFIRMED DIGITAL E-TICKET CARD */
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-300 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                      {channelBannerLabel}
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 font-mono">
                      PNR: {issuedTicket.pnr}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-[10px] font-mono font-bold text-white">
                  CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">From</p>
                  <p className="font-bold text-slate-900">{issuedTicket.from}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">To</p>
                  <p className="font-bold text-sky-700">{issuedTicket.to}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">Class / Tier</p>
                  <p className="font-bold text-slate-900">{issuedTicket.classOrTier}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">3D Selected Seat(s)</p>
                  <p className="font-bold text-amber-700">{issuedTicket.seatAssignment}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">Passenger</p>
                  <p className="font-bold text-slate-900">
                    {issuedTicket.passengerName} ({issuedTicket.passengerAge}y) ·{' '}
                    {issuedTicket.passengerCount} pax
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500">Travel Date</p>
                  <p className="font-mono font-bold text-slate-900">{issuedTicket.travelDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-dashed border-emerald-300/80">
                <div className="space-y-1 text-xs">
                  <p className="text-[10px] font-mono uppercase text-slate-500">
                    UPI Settled ({issuedTicket.upiVpa})
                  </p>
                  <p className="font-mono font-extrabold text-emerald-700 text-sm tabular-nums">
                    ₹{issuedTicket.paidAmountInr}
                    {issuedTicket.isDemoFare && (
                      <span className="ml-1.5 text-[10px] font-semibold text-amber-700">
                        (₹1 Demo Live Test · Actual ₹{issuedTicket.actualFareInr})
                      </span>
                    )}
                  </p>
                  {issuedTicket.utrNumber && (
                    <p className="text-[11px] font-mono text-slate-600">
                      UTR: {issuedTicket.utrNumber}
                    </p>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
                  <QRCodeSVG
                    value={`CIVICTRIAGE-ETICKET|PNR:${issuedTicket.pnr}|${issuedTicket.from}->${issuedTicket.to}|${issuedTicket.seatAssignment}|${issuedTicket.passengerName}|${issuedTicket.travelDate}`}
                    size={76}
                    level="M"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMyTickets();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                Open My Booked Tickets
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* UPI QR PAYMENT CHECKOUT */
          <div className="p-5 space-y-4">
            {/* Selected Seats & Fare Summary + Demo Mode Toggle */}
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase text-sky-700">
                  Payable via UPI · {draft.selectedSeats?.join(', ') || 'Confirmed Seat'}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums">
                    ₹{activeAmount}
                  </span>
                  {demoFareMode && (
                    <span className="text-xs font-mono text-slate-400 line-through tabular-nums">
                      ₹{actualFareInr}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={demoFareMode}
                onClick={() => setDemoFareMode((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  demoFareMode
                    ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Demo Fare Mode (₹1 Live Test)
              </button>
            </div>

            {/* Dynamic NPCI QR vs Static /wallet-qr.png Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setQrTab('dynamic')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrTab === 'dynamic'
                    ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                Dynamic NPCI QR
              </button>
              <button
                type="button"
                onClick={() => setQrTab('static')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrTab === 'static'
                    ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Static Wallet QR
              </button>
            </div>

            {/* QR Display Area */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3">
              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                {qrTab === 'dynamic' ? (
                  <QRCodeSVG
                    value={upiPayUri}
                    size={188}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <img
                    src="/wallet-qr.png"
                    alt="Static UPI Wallet QR code for 7012692128@fam"
                    width={188}
                    height={188}
                    className="w-[188px] h-[188px] object-contain block"
                  />
                )}
              </div>

              {/* VPA + Copy button */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-sky-200 shadow-xs">
                <span className="text-xs font-mono font-bold text-sky-800 select-all">
                  {UPI_MERCHANT_VPA}
                </span>
                <button
                  type="button"
                  onClick={handleCopyVpa}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[11px] font-semibold text-sky-800 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Supported UPI App Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {SUPPORTED_UPI_APPS.map((appName) => (
                  <span
                    key={appName}
                    className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600"
                  >
                    {appName}
                  </span>
                ))}
              </div>

              {/* Direct Mobile UPI Deep Link */}
              <a
                href={upiPayUri}
                className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                Open UPI App Directly
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>

            {/* Optional 12-digit UTR & Confirm */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="upi-utr-input" className="text-[11px] font-semibold text-slate-600">
                  12-Digit UPI UTR / Reference Number (Optional)
                </label>
                <input
                  id="upi-utr-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={utrInput}
                  onChange={(e) => setUtrInput(sanitizeUtrInput(e.target.value))}
                  placeholder="e.g., 432981746205"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Confirm Payment &amp; Issue E-Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
