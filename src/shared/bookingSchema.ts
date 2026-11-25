export type BookingChannel = 'flight' | 'irctc' | 'ksrtc';

export type FlightCabinClass = 'Economy' | 'Premium Economy' | 'Business';

export type IrctcRailClass = '2S' | 'SL' | '3A' | '2A' | 'CC / Vande Bharat EC';

export type KsrtcBusTier =
  | 'KSRTC Swift Deluxe'
  | 'Super Fast'
  | 'Low Floor AC'
  | 'Minnals';

export type BusSeatPreference = 'Window' | 'Aisle' | 'Front Rows' | 'Ladies Seat';

export const FLIGHT_CABIN_CLASSES: readonly {
  code: FlightCabinClass;
  label: string;
  multiplier: number;
  baseAdd: number;
}[] = [
  { code: 'Economy', label: 'Standard 3-3 Cabin · 15 kg check-in', multiplier: 1.0, baseAdd: 0 },
  {
    code: 'Premium Economy',
    label: 'Extra legroom & priority boarding',
    multiplier: 1.42,
    baseAdd: 650,
  },
  {
    code: 'Business',
    label: 'Front cabin lounge & complimentary meal',
    multiplier: 2.35,
    baseAdd: 1850,
  },
] as const;

export const IRCTC_CLASSES: readonly {
  code: IrctcRailClass;
  label: string;
  multiplier: number;
  baseAdd: number;
}[] = [
  { code: '2S', label: 'Second Sitting (2S · 3+2 Chair Car)', multiplier: 1.0, baseAdd: 0 },
  { code: 'SL', label: 'Sleeper Class (SL · 3-Tier Berths)', multiplier: 1.55, baseAdd: 40 },
  { code: '3A', label: 'AC 3-Tier (3A · 3-Tier AC Berths)', multiplier: 3.1, baseAdd: 120 },
  { code: '2A', label: 'AC 2-Tier (2A · 2-Tier AC Berths)', multiplier: 4.35, baseAdd: 190 },
  {
    code: 'CC / Vande Bharat EC',
    label: 'Chair Car / Vande Bharat EC (3+2)',
    multiplier: 4.9,
    baseAdd: 240,
  },
] as const;

export const KSRTC_TIERS: readonly {
  tier: KsrtcBusTier;
  subtitle: string;
  multiplier: number;
  baseAdd: number;
}[] = [
  { tier: 'Super Fast', subtitle: 'Express inter-district state carriage', multiplier: 1.0, baseAdd: 0 },
  { tier: 'KSRTC Swift Deluxe', subtitle: 'Air-suspension pushback long-haul', multiplier: 1.45, baseAdd: 45 },
  { tier: 'Low Floor AC', subtitle: 'KURTC Volvo AC semi-sleeper', multiplier: 1.85, baseAdd: 85 },
  { tier: 'Minnals', subtitle: 'Limited-stop overnight super deluxe', multiplier: 1.65, baseAdd: 65 },
] as const;

export const BUS_SEAT_PREFERENCES: readonly BusSeatPreference[] = [
  'Window',
  'Aisle',
  'Front Rows',
  'Ladies Seat',
] as const;

export const OFFICIAL_BOOKING_URLS = {
  flight: 'https://www.airindia.com/',
  irctc: 'https://www.irctc.co.in/nget/train-search',
  ksrtc: 'https://onlineksrtcswift.com/',
} as const;

export const UPI_MERCHANT_VPA = '7012692128@fam';
export const UPI_MERCHANT_NAME = 'CivicTriage Mobility';

export interface BookingDraft {
  channel: BookingChannel;
  from: string;
  to: string;
  operatorOrLine: string;
  flightClass?: FlightCabinClass;
  railClass: IrctcRailClass;
  busTier: KsrtcBusTier;
  seatPreference: BusSeatPreference;
  selectedSeats?: string[];
  seatSurchargeInr?: number;
  travelDate: string;
  passengerName: string;
  passengerAge: number;
  passengerCount: number;
  baseFareInr: number;
}

export interface BookedETicket {
  id: string;
  pnr: string;
  bookingRef: string;
  channel: BookingChannel;
  from: string;
  to: string;
  operatorOrLine: string;
  classOrTier: string;
  seatAssignment: string;
  travelDate: string;
  passengerName: string;
  passengerAge: number;
  passengerCount: number;
  actualFareInr: number;
  paidAmountInr: number;
  isDemoFare: boolean;
  utrNumber: string | null;
  upiVpa: string;
  issuedAt: string;
  status: 'CONFIRMED';
}

/**
 * Extracts a realistic numeric base fare (INR) from a string like "₹180 – ₹340" or "₹3,200".
 */
export function parseBaseFareFromText(fareText: string | undefined, fallback = 180): number {
  if (!fareText) return fallback;
  const matches = fareText.replace(/,/g, '').match(/\d+/g);
  if (!matches || matches.length === 0) return fallback;
  const first = Number(matches[0]);
  if (!Number.isFinite(first) || first < 20) return fallback;
  return Math.min(18000, Math.max(40, Math.round(first)));
}

export function calculateBookingFareInr(draft: {
  channel: BookingChannel;
  flightClass?: FlightCabinClass;
  railClass: IrctcRailClass;
  busTier: KsrtcBusTier;
  baseFareInr: number;
  passengerCount: number;
  seatSurchargeInr?: number;
}): number {
  const count = Math.max(1, Math.min(6, Math.round(draft.passengerCount || 1)));
  const surcharge = Math.max(0, Math.round(draft.seatSurchargeInr ?? 0));

  if (draft.channel === 'flight') {
    const base = Math.max(2450, draft.baseFareInr);
    const cls =
      FLIGHT_CABIN_CLASSES.find((c) => c.code === (draft.flightClass ?? 'Economy')) ??
      FLIGHT_CABIN_CLASSES[0];
    const perPassenger = Math.round((base * cls.multiplier + cls.baseAdd) / 10) * 10;
    const airportFee = 320;
    return perPassenger * count + airportFee + surcharge;
  }

  const base = Math.max(40, draft.baseFareInr);

  if (draft.channel === 'irctc') {
    const cls = IRCTC_CLASSES.find((c) => c.code === draft.railClass) ?? IRCTC_CLASSES[0];
    const perPassenger = Math.round((base * cls.multiplier + cls.baseAdd) / 5) * 5;
    const convenienceFee = cls.code === '2S' || cls.code === 'SL' ? 18 : 36;
    return perPassenger * count + convenienceFee + surcharge;
  }

  const tier = KSRTC_TIERS.find((t) => t.tier === draft.busTier) ?? KSRTC_TIERS[0];
  const perPassenger = Math.round((base * tier.multiplier + tier.baseAdd) / 5) * 5;
  const reservationFee = 15;
  return perPassenger * count + reservationFee + surcharge;
}

export function buildUpiPayUri(amountInr: number, bookingRef: string): string {
  const safeAmount = Math.max(1, Math.round(amountInr * 100) / 100);
  const cleanRef = bookingRef.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'KSM001';
  return `upi://pay?pa=${UPI_MERCHANT_VPA}&pn=CivicTriage%20Mobility&am=${safeAmount}&cu=INR&tn=Ticket-${cleanRef}`;
}

export function generateBookingRef(): string {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `KSM${randomPart}`;
}

export function generatePnr(channel: BookingChannel): string {
  if (channel === 'flight') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `AI${suffix}`;
  }
  if (channel === 'irctc') {
    const num = Math.floor(4100000000 + Math.random() * 4800000000);
    return String(num);
  }
  const num = Math.floor(1000000 + Math.random() * 8999999);
  return `KSRTC-${num}`;
}

export function assignSeatCode(draft: BookingDraft): string {
  if (draft.selectedSeats && draft.selectedSeats.length > 0) {
    return draft.selectedSeats.join(', ');
  }
  const seatNum = Math.floor(10 + Math.random() * 48);
  if (draft.channel === 'flight') {
    return `12A - Window (${draft.flightClass ?? 'Economy'})`;
  }
  if (draft.channel === 'irctc') {
    const coachPrefix =
      draft.railClass === '2S'
        ? 'D3'
        : draft.railClass === 'SL'
          ? 'S4'
          : draft.railClass === '3A'
            ? 'B1'
            : draft.railClass === '2A'
              ? 'A1'
              : 'C1';
    return `${coachPrefix}-${seatNum} Lower`;
  }
  const tag = draft.seatPreference === 'Window' ? 'A' : draft.seatPreference === 'Aisle' ? 'B' : 'A';
  return `${Math.min(9, Math.max(1, seatNum % 9 || 1))}${tag} - ${draft.seatPreference}`;
}

export function sanitizeUtrInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12);
}

export function getTomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
