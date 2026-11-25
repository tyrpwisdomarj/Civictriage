export type MapNodeKind = 'district' | 'gateway';

export type TravelPreference =
  | 'Balanced'
  | 'Budget KSRTC & Rail'
  | 'Fastest Air & Express';

export const TRAVEL_PREFERENCES: readonly TravelPreference[] = [
  'Balanced',
  'Budget KSRTC & Rail',
  'Fastest Air & Express',
] as const;

export type BiomeGroup = 'western_ghats' | 'coastal_backwaters' | 'interstate_gateway';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface RegionBiodiversityInfo {
  biome: BiomeGroup;
  flora: string;
  fauna: string;
  culture: string;
  badgeText: string;
}

export interface MapRegionNode {
  id: string;
  name: string;
  kind: MapNodeKind;
  regionLabel: string;
  code: string;
  tagline: string;
  elevation: number;
  accentHex: string;
  centroid: Point2D;
  polygon?: Array<[number, number]>;
  biodiversity: RegionBiodiversityInfo;
}

export interface OriginNearestHubs {
  railway_station: string;
  ksrtc_depot: string;
  nearest_airport: string;
}

export type TransportMode =
  | 'Train'
  | 'KSRTC Bus'
  | 'Interstate Bus'
  | 'Flight'
  | 'Local Cab / Auto'
  | 'Ferry / Metro';

export interface TransportStep {
  step_number: number;
  mode: TransportMode;
  from: string;
  to: string;
  operator_or_line: string;
  duration: string;
  approx_fare: string;
  tip: string;
}

export interface RegionalCultureBiodiversity {
  signature_flora: string;
  signature_fauna: string;
  cultural_highlight: string;
  eco_travel_tip: string;
}

export interface TouristSpot {
  name: string;
  category: string;
  description: string;
  how_to_reach_from_hub: string;
}

export interface TravelGuideResponse {
  origin: string;
  destination: string;
  travel_preference: TravelPreference;
  route_summary: string;
  estimated_duration: string;
  estimated_cost_inr: string;
  origin_nearest_hubs: OriginNearestHubs;
  transport_steps: TransportStep[];
  regional_culture_and_biodiversity: RegionalCultureBiodiversity;
  tourist_spots: TouristSpot[];
}

export function computePolygonCentroid(polygon: ReadonlyArray<[number, number]>): Point2D {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-6) {
    const sum = polygon.reduce(
      (acc, [px, py]) => ({ x: acc.x + px, y: acc.y + py }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / polygon.length, y: sum.y / polygon.length };
  }
  return {
    x: Number((cx / (6 * signedArea)).toFixed(3)),
    y: Number((cy / (6 * signedArea)).toFixed(3)),
  };
}

export function computePolygonArea(polygon: ReadonlyArray<[number, number]>): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    area += x0 * y1 - x1 * y0;
  }
  return Math.abs(area) * 0.5;
}

export function computeArcPoints(
  origin: Point3D,
  destination: Point3D,
  segments = 36
): Point3D[] {
  const dx = destination.x - origin.x;
  const dz = destination.z - origin.z;
  const horizontalDist = Math.hypot(dx, dz);
  const peakLift = Math.max(1.35, Math.min(4.2, horizontalDist * 0.34));
  const control: Point3D = {
    x: (origin.x + destination.x) * 0.5,
    y: Math.max(origin.y, destination.y) + peakLift,
    z: (origin.z + destination.z) * 0.5,
  };

  const count = Math.max(2, Math.floor(segments));
  const points: Point3D[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const inv = 1 - t;
    points.push({
      x: inv * inv * origin.x + 2 * inv * t * control.x + t * t * destination.x,
      y: inv * inv * origin.y + 2 * inv * t * control.y + t * t * destination.y,
      z: inv * inv * origin.z + 2 * inv * t * control.z + t * t * destination.z,
    });
  }
  return points;
}

/**
 * Converts latitude/longitude in degrees onto a 3D sphere of given radius.
 */
export function latLonToSpherePoint(latDeg: number, lonDeg: number, radius: number): Point3D {
  const phi = ((90 - latDeg) * Math.PI) / 180;
  const theta = ((lonDeg + 180) * Math.PI) / 180;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeMode(raw: unknown): TransportMode {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower.includes('train') || lower.includes('rail') || lower.includes('vande') || lower.includes('irctc')) {
      return 'Train';
    }
    if (lower.includes('interstate') || lower.includes('volvo')) {
      return 'Interstate Bus';
    }
    if (lower.includes('ksrtc') || lower.includes('bus') || lower.includes('swift')) {
      return 'KSRTC Bus';
    }
    if (lower.includes('flight') || lower.includes('air')) {
      return 'Flight';
    }
    if (lower.includes('ferry') || lower.includes('metro') || lower.includes('boat')) {
      return 'Ferry / Metro';
    }
  }
  return 'Local Cab / Auto';
}

export function isBookableStepMode(mode: TransportMode): 'flight' | 'rail' | 'bus' | null {
  if (mode === 'Flight') return 'flight';
  if (mode === 'Train') return 'rail';
  if (mode === 'KSRTC Bus' || mode === 'Interstate Bus') return 'bus';
  return null;
}

export function normalizeTravelPreference(raw: unknown): TravelPreference {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (
      trimmed === 'Balanced' ||
      trimmed === 'Budget KSRTC & Rail' ||
      trimmed === 'Fastest Air & Express'
    ) {
      return trimmed;
    }
  }
  return 'Balanced';
}

export function normalizeTravelGuidePayload(
  raw: unknown,
  fallbackOrigin: string,
  fallbackDestination: string,
  fallbackPreference: TravelPreference = 'Balanced'
): TravelGuideResponse {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const hubsObj =
    obj.origin_nearest_hubs && typeof obj.origin_nearest_hubs === 'object'
      ? (obj.origin_nearest_hubs as Record<string, unknown>)
      : {};
  const bioObj =
    obj.regional_culture_and_biodiversity &&
    typeof obj.regional_culture_and_biodiversity === 'object'
      ? (obj.regional_culture_and_biodiversity as Record<string, unknown>)
      : {};

  const rawSteps = Array.isArray(obj.transport_steps) ? obj.transport_steps : [];
  const transport_steps: TransportStep[] = rawSteps.slice(0, 6).map((entry, idx) => {
    const step = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return {
      step_number:
        typeof step.step_number === 'number' && Number.isFinite(step.step_number)
          ? Math.max(1, Math.round(step.step_number))
          : idx + 1,
      mode: normalizeMode(step.mode),
      from: asString(step.from, idx === 0 ? fallbackOrigin : 'Transit Hub'),
      to: asString(step.to, fallbackDestination),
      operator_or_line: asString(step.operator_or_line, 'Kerala State / Southern Railway'),
      duration: asString(step.duration, '1h 15m'),
      approx_fare: asString(step.approx_fare, '₹150 – ₹320'),
      tip: asString(step.tip, 'Confirm live departure timings at the hub counter or app.'),
    };
  });

  const rawSpots = Array.isArray(obj.tourist_spots) ? obj.tourist_spots : [];
  const tourist_spots: TouristSpot[] = rawSpots.slice(0, 3).map((entry, idx) => {
    const spot = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    return {
      name: asString(spot.name, `${fallbackDestination} Heritage Point ${idx + 1}`),
      category: asString(spot.category, 'Nature & Heritage'),
      description: asString(spot.description, 'Notable destination highlight.'),
      how_to_reach_from_hub: asString(
        spot.how_to_reach_from_hub,
        'Accessible via local KSRTC feeder or metered cab from the main hub.'
      ),
    };
  });

  return {
    origin: asString(obj.origin, fallbackOrigin),
    destination: asString(obj.destination, fallbackDestination),
    travel_preference: normalizeTravelPreference(obj.travel_preference ?? fallbackPreference),
    route_summary: asString(
      obj.route_summary,
      `Multi-modal corridor connecting ${fallbackOrigin} to ${fallbackDestination}.`
    ),
    estimated_duration: asString(obj.estimated_duration, '4h 30m'),
    estimated_cost_inr: asString(obj.estimated_cost_inr, '₹350 – ₹850'),
    origin_nearest_hubs: {
      railway_station: asString(
        hubsObj.railway_station,
        fallbackOrigin.toLowerCase() === 'pathanamthitta'
          ? 'Thiruvalla (TRVL) / Chengannur (CNGR) — 26–30 km'
          : `${fallbackOrigin} Main Railway Station`
      ),
      ksrtc_depot: asString(hubsObj.ksrtc_depot, `${fallbackOrigin} KSRTC Central Bus Depot`),
      nearest_airport: asString(
        hubsObj.nearest_airport,
        fallbackOrigin.toLowerCase() === 'pathanamthitta'
          ? 'Thiruvananthapuram (TRV) / Cochin (COK)'
          : 'Nearest Kerala International Airport'
      ),
    },
    transport_steps,
    regional_culture_and_biodiversity: {
      signature_flora: asString(
        bioObj.signature_flora,
        'Tropical evergreens, spice plantations & coastal coconut groves'
      ),
      signature_fauna: asString(
        bioObj.signature_fauna,
        'Western Ghats endemic wildlife & migratory wetland birds'
      ),
      cultural_highlight: asString(
        bioObj.cultural_highlight,
        'Traditional temple arts, folk performances & historic spice-route heritage'
      ),
      eco_travel_tip: asString(
        bioObj.eco_travel_tip,
        'Carry reusable water bottles and follow plastic-free green protocol guidelines.'
      ),
    },
    tourist_spots,
  };
}
