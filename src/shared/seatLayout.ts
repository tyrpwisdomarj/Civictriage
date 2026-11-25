import type {
  BookingChannel,
  FlightCabinClass,
  IrctcRailClass,
  KsrtcBusTier,
} from './bookingSchema';

export type SeatStatus = 'available' | 'booked';

export type SeatGeometryKind = 'seat' | 'berth';

export interface CabinSeatItem {
  id: string;
  code: string;
  /** Human-readable seat summary e.g. "12A - Window", "B1-24 Lower", "7A - Window" */
  displayLabel: string;
  positionTag: string;
  row: number;
  column: string;
  /** 3D local coordinates inside the cabin scene */
  x: number;
  y: number;
  z: number;
  /** Orientation around Y axis in radians (0 = facing front -Z) */
  rotY: number;
  width: number;
  depth: number;
  kind: SeatGeometryKind;
  berthLevel?: 'Lower' | 'Middle' | 'Upper' | 'Side Lower' | 'Side Upper';
  isWindow: boolean;
  status: SeatStatus;
  surchargeInr: number;
}

export interface CabinLayoutSpec {
  channel: BookingChannel;
  title: string;
  subtitle: string;
  layoutTag: string;
  coachCode: string;
  cabinWidth: number;
  cabinLength: number;
  isSleeperBerth: boolean;
  seats: CabinSeatItem[];
}

function deterministicBooked(seedKey: string, index: number): boolean {
  let hash = 2166136261 ^ index;
  for (let i = 0; i < seedKey.length; i++) {
    hash ^= seedKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = Math.abs(hash) % 100;
  // ~26% booked, keeping row 1 / seat 1-2 always available for smooth UX
  return index > 1 && bucket < 26;
}

export function generateCabinLayout(params: {
  channel: BookingChannel;
  railClass: IrctcRailClass;
  flightClass: FlightCabinClass;
  busTier: KsrtcBusTier;
}): CabinLayoutSpec {
  const { channel, railClass, flightClass, busTier } = params;

  if (channel === 'flight') {
    const seats: CabinSeatItem[] = [];
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
    // 3-3 narrow-body fuselage: A-B-C | aisle | D-E-F
    const colX: Record<(typeof cols)[number], number> = {
      A: -1.72,
      B: -1.16,
      C: -0.6,
      D: 0.6,
      E: 1.16,
      F: 1.72,
    };
    const rowCount = 10;
    const rowSpacing = 0.88;
    const startZ = -((rowCount - 1) * rowSpacing) / 2 + 0.4;
    let idx = 0;

    for (let r = 1; r <= rowCount; r++) {
      const z = startZ + (r - 1) * rowSpacing;
      // Display realistic flight row numbers (e.g. 3..12) so 12A - Window exists
      const displayRow = r + 2;
      for (const col of cols) {
        const isWindow = col === 'A' || col === 'F';
        const isAisle = col === 'C' || col === 'D';
        const positionTag = isWindow ? 'Window' : isAisle ? 'Aisle' : 'Middle';
        const code = `${displayRow}${col}`;
        const surchargeInr =
          flightClass === 'Business'
            ? 0
            : r === 1 || r === 5
              ? 350
              : isWindow
                ? 200
                : 0;

        seats.push({
          id: `FL-${code}`,
          code,
          displayLabel: `${code} - ${positionTag}`,
          positionTag,
          row: displayRow,
          column: col,
          x: colX[col],
          y: 0.24,
          z,
          rotY: 0,
          width: 0.46,
          depth: 0.48,
          kind: 'seat',
          isWindow,
          status: deterministicBooked(`flight-${flightClass}-${code}`, idx) ? 'booked' : 'available',
          surchargeInr,
        });
        idx++;
      }
    }

    return {
      channel: 'flight',
      title: `Flight 3D Cabin · ${flightClass}`,
      subtitle: '3-3 Fuselage · A–C | Aisle | D–F · Cockpit Forward',
      layoutTag: '3-3 Narrowbody',
      coachCode: flightClass === 'Business' ? 'BUS' : flightClass === 'Premium Economy' ? 'PE' : 'ECO',
      cabinWidth: 4.5,
      cabinLength: rowCount * rowSpacing + 2.6,
      isSleeperBerth: false,
      seats,
    };
  }

  if (channel === 'irctc') {
    const isChairCar = railClass === '2S' || railClass === 'CC / Vande Bharat EC';
    const coachCode =
      railClass === '2S'
        ? 'D3'
        : railClass === 'SL'
          ? 'S4'
          : railClass === '3A'
            ? 'B1'
            : railClass === '2A'
              ? 'A1'
              : 'C1';

    if (isChairCar) {
      // 3+2 Indian Railways Chair Car / Vande Bharat layout
      const seats: CabinSeatItem[] = [];
      const cols = ['A', 'B', 'C', 'D', 'E'] as const;
      const colX: Record<(typeof cols)[number], number> = {
        A: -1.58,
        B: -1.04,
        C: -0.5,
        D: 0.64,
        E: 1.2,
      };
      const rowCount = 8;
      const rowSpacing = 0.88;
      const startZ = -((rowCount - 1) * rowSpacing) / 2;
      let idx = 0;

      for (let r = 1; r <= rowCount; r++) {
        const z = startZ + (r - 1) * rowSpacing;
        for (const col of cols) {
          const isWindow = col === 'A' || col === 'E';
          const isAisle = col === 'C' || col === 'D';
          const positionTag = isWindow ? 'Window' : isAisle ? 'Aisle' : 'Middle';
          const code = `${coachCode}-${r}${col}`;
          seats.push({
            id: `IR-${code}`,
            code,
            displayLabel: `${code} ${positionTag}`,
            positionTag,
            row: r,
            column: col,
            x: colX[col],
            y: 0.24,
            z,
            rotY: 0,
            width: 0.45,
            depth: 0.48,
            kind: 'seat',
            isWindow,
            status: deterministicBooked(`irctc-${railClass}-${code}`, idx) ? 'booked' : 'available',
            surchargeInr: 0,
          });
          idx++;
        }
      }

      return {
        channel: 'irctc',
        title: `IRCTC Coach ${coachCode} · ${railClass}`,
        subtitle: '3+2 Chair Car · Window & Aisle Reclining Seats',
        layoutTag: '3+2 Chair Car',
        coachCode,
        cabinWidth: 4.1,
        cabinLength: rowCount * rowSpacing + 2.0,
        isSleeperBerth: false,
        seats,
      };
    }

    // Authentic Sleeper / AC 3A / AC 2A Berth Coach (4 bays)
    const seats: CabinSeatItem[] = [];
    const hasMiddleBerth = railClass !== '2A';
    const bayCount = 4;
    const baySpacing = 2.45;
    const startZ = -((bayCount - 1) * baySpacing) / 2;
    let berthNum = 1;

    for (let bay = 0; bay < bayCount; bay++) {
      const bayCenterZ = startZ + bay * baySpacing;
      const frontRowZ = bayCenterZ - 0.56;
      const backRowZ = bayCenterZ + 0.56;

      // Left main bay — Front bank (Lower, [Middle], Upper)
      const mainLevels: Array<{
        level: 'Lower' | 'Middle' | 'Upper';
        y: number;
      }> = hasMiddleBerth
        ? [
            { level: 'Lower', y: 0.24 },
            { level: 'Middle', y: 0.78 },
            { level: 'Upper', y: 1.32 },
          ]
        : [
            { level: 'Lower', y: 0.26 },
            { level: 'Upper', y: 1.18 },
          ];

      for (const bank of [
        { z: frontRowZ, rotY: Math.PI },
        { z: backRowZ, rotY: 0 },
      ]) {
        for (const tier of mainLevels) {
          const code = `${coachCode}-${berthNum}`;
          seats.push({
            id: `IR-${code}`,
            code,
            displayLabel: `${code} ${tier.level}`,
            positionTag: tier.level,
            row: bay + 1,
            column: 'Main',
            x: -1.02,
            y: tier.y,
            z: bank.z,
            rotY: bank.rotY,
            width: 1.48,
            depth: 0.52,
            kind: 'berth',
            berthLevel: tier.level,
            isWindow: tier.level === 'Lower',
            status: deterministicBooked(`irctc-berth-${railClass}-${berthNum}`, berthNum - 1)
              ? 'booked'
              : 'available',
            surchargeInr: 0,
          });
          berthNum++;
        }
      }

      // Right side berths across the corridor — Side Lower & Side Upper (oriented along Z)
      const sideLevels: Array<{
        level: 'Side Lower' | 'Side Upper';
        y: number;
      }> = [
        { level: 'Side Lower', y: 0.24 },
        { level: 'Side Upper', y: 1.16 },
      ];

      for (const side of sideLevels) {
        const code = `${coachCode}-${berthNum}`;
        seats.push({
          id: `IR-${code}`,
          code,
          displayLabel: `${code} ${side.level}`,
          positionTag: side.level,
          row: bay + 1,
          column: 'Side',
          x: 1.24,
          y: side.y,
          z: bayCenterZ,
          rotY: 0,
          width: 0.54,
          depth: 1.56,
          kind: 'berth',
          berthLevel: side.level,
          isWindow: true,
          status: deterministicBooked(`irctc-berth-${railClass}-${berthNum}`, berthNum - 1)
            ? 'booked'
            : 'available',
          surchargeInr: 0,
        });
        berthNum++;
      }
    }

    return {
      channel: 'irctc',
      title: `IRCTC Coach ${coachCode} · ${railClass}`,
      subtitle: hasMiddleBerth
        ? 'Lower / Middle / Upper + Side Lower & Side Upper Berths'
        : '2-Tier AC Lower / Upper + Side Lower & Side Upper Berths',
      layoutTag: hasMiddleBerth ? '3-Tier Berths' : '2-Tier AC Berths',
      coachCode,
      cabinWidth: 4.15,
      cabinLength: bayCount * baySpacing + 1.4,
      isSleeperBerth: true,
      seats,
    };
  }

  // KSRTC Bus 2+2 Coach with front Driver Cabin
  const seats: CabinSeatItem[] = [];
  const cols = ['A', 'B', 'C', 'D'] as const;
  const colX: Record<(typeof cols)[number], number> = {
    A: -1.16,
    B: -0.58,
    C: 0.58,
    D: 1.16,
  };
  const rowCount = 9;
  const rowSpacing = 0.86;
  const startZ = -((rowCount - 1) * rowSpacing) / 2 + 0.55;
  let idx = 0;

  for (let r = 1; r <= rowCount; r++) {
    const z = startZ + (r - 1) * rowSpacing;
    for (const col of cols) {
      const isWindow = col === 'A' || col === 'D';
      const positionTag = isWindow ? 'Window' : 'Aisle';
      const code = `${r}${col}`;
      seats.push({
        id: `BUS-${code}`,
        code,
        displayLabel: `${code} - ${positionTag}`,
        positionTag,
        row: r,
        column: col,
        x: colX[col],
        y: 0.24,
        z,
        rotY: 0,
        width: 0.48,
        depth: 0.5,
        kind: 'seat',
        isWindow,
        status: deterministicBooked(`ksrtc-${busTier}-${code}`, idx) ? 'booked' : 'available',
        surchargeInr: 0,
      });
      idx++;
    }
  }

  return {
    channel: 'ksrtc',
    title: `KSRTC 3D Coach · ${busTier}`,
    subtitle: '2+2 Pushback Coach · Front Driver Cabin · Center Aisle',
    layoutTag: '2+2 Pushback Coach',
    coachCode: 'KSRTC',
    cabinWidth: 3.5,
    cabinLength: rowCount * rowSpacing + 2.5,
    isSleeperBerth: false,
    seats,
  };
}
