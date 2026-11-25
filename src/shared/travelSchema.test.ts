import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MAP_REGIONS,
  DEFAULT_ORIGIN_ID,
  INTERSTATE_GATEWAYS,
  KERALA_DISTRICTS,
  ROUTE_PRESETS,
  getRegionById,
} from '../data/keralaMapData.ts';
import {
  computeArcPoints,
  computePolygonArea,
  isBookableStepMode,
  latLonToSpherePoint,
  normalizeTravelGuidePayload,
} from './travelSchema.ts';
import {
  UPI_MERCHANT_VPA,
  assignSeatCode,
  buildUpiPayUri,
  calculateBookingFareInr,
  parseBaseFareFromText,
  sanitizeUtrInput,
} from './bookingSchema.ts';
import { generateCabinLayout } from './seatLayout.ts';

test('contains all 14 Kerala districts, 6 Inter-State Gateways, biodiversity info, and presets', () => {
  assert.equal(KERALA_DISTRICTS.length, 14);
  assert.equal(INTERSTATE_GATEWAYS.length, 6);
  assert.equal(ALL_MAP_REGIONS.length, 20);

  for (const region of ALL_MAP_REGIONS) {
    assert.ok(region.biodiversity.flora.length > 4);
    assert.ok(region.biodiversity.fauna.length > 4);
    assert.ok(region.biodiversity.culture.length > 4);
  }

  assert.equal(getRegionById(DEFAULT_ORIGIN_ID)?.name, 'Pathanamthitta');
  assert.equal(ROUTE_PRESETS.length, 2);
  assert.equal(ROUTE_PRESETS[0].destinationId, 'wayanad');
  assert.equal(ROUTE_PRESETS[1].destinationId, 'bengaluru');
});

test('all 14 Kerala district polygons are non-degenerate and follow accurate N-to-S and W-to-E layout', () => {
  for (const district of KERALA_DISTRICTS) {
    assert.ok(district.polygon && district.polygon.length >= 4);
    assert.ok(computePolygonArea(district.polygon) > 0.3);
  }

  const yOf = (id: string) => getRegionById(id)!.centroid.y;
  const xOf = (id: string) => getRegionById(id)!.centroid.x;

  assert.ok(yOf('kasaragod') < yOf('kannur'));
  assert.ok(yOf('kannur') < yOf('kozhikode'));
  assert.ok(yOf('kozhikode') < yOf('malappuram'));
  assert.ok(yOf('malappuram') < yOf('thrissur'));
  assert.ok(yOf('thrissur') < yOf('ernakulam'));
  assert.ok(yOf('ernakulam') < yOf('kottayam'));
  assert.ok(yOf('kottayam') < yOf('pathanamthitta'));
  assert.ok(yOf('pathanamthitta') < yOf('kollam'));
  assert.ok(yOf('kollam') < yOf('thiruvananthapuram'));

  assert.ok(xOf('kannur') < xOf('wayanad'));
  assert.ok(xOf('thrissur') < xOf('palakkad'));
  assert.ok(xOf('alappuzha') < xOf('kottayam'));
  assert.ok(xOf('kottayam') < xOf('idukki'));
});

test('computeArcPoints and latLonToSpherePoint return valid 3D geometry coordinates', () => {
  const origin = { x: 0.4, y: 0.6, z: 3.6 };
  const dest = { x: 3.65, y: 1.05, z: -6.15 };
  const pts = computeArcPoints(origin, dest, 20);
  assert.equal(pts.length, 21);
  assert.ok(pts[10].y > Math.max(origin.y, dest.y) + 1.0);

  const keralaOnGlobe = latLonToSpherePoint(9.8, 76.6, 4.2);
  const mag = Math.hypot(keralaOnGlobe.x, keralaOnGlobe.y, keralaOnGlobe.z);
  assert.ok(Math.abs(mag - 4.2) < 0.001);
});

test('normalizeTravelGuidePayload structures new hubs, transport_steps, biodiversity, and top 3 tourist spots', () => {
  const normalized = normalizeTravelGuidePayload(
    {
      origin: 'Pathanamthitta',
      destination: 'Wayanad',
      travel_preference: 'Budget KSRTC & Rail',
      route_summary: 'Feed to Thiruvalla railhead, take Malabar Express to Kozhikode, then KSRTC ghat bus.',
      estimated_duration: '9h 45m',
      estimated_cost_inr: '₹410 – ₹690',
      origin_nearest_hubs: {
        railway_station: 'Thiruvalla (TRVL) / Chengannur (CNGR)',
        ksrtc_depot: 'Pathanamthitta KSRTC Central Depot',
        nearest_airport: 'Thiruvananthapuram (TRV) / Cochin (COK)',
      },
      transport_steps: [
        {
          step_number: 1,
          mode: 'KSRTC Bus',
          from: 'Pathanamthitta KSRTC Depot',
          to: 'Thiruvalla Railway Station (TRVL)',
          operator_or_line: 'KSRTC Ordinary / Fast Passenger',
          duration: '50m',
          approx_fare: '₹35 – ₹50',
          tip: 'Frequent buses every 15 mins via Kozhencherry.',
        },
        {
          step_number: 2,
          mode: 'Train',
          from: 'Thiruvalla (TRVL)',
          to: 'Kozhikode (CLT)',
          operator_or_line: '16629 Malabar Express / Jan Shatabdi',
          duration: '6h 15m',
          approx_fare: '₹195 – ₹480',
          tip: 'Book 2S or SL early on IRCTC.',
        },
      ],
      regional_culture_and_biodiversity: {
        signature_flora: 'Evergreen spice & Rosewood forests',
        signature_fauna: 'Asian Elephant & Great Hornbill',
        cultural_highlight: 'Edakkal Neolithic heritage & Theyyam traditions',
        eco_travel_tip: 'Avoid plastic bottles on Thamarassery Ghat.',
      },
      tourist_spots: [
        { name: 'Edakkal Caves', category: 'Heritage', description: 'Ancient petroglyphs', how_to_reach_from_hub: '25 km from Kalpetta KSRTC' },
        { name: 'Banasura Sagar Dam', category: 'Nature', description: 'Largest earthen dam in India', how_to_reach_from_hub: '21 km from Kalpetta' },
        { name: 'Wayanad Wildlife Sanctuary', category: 'Eco', description: 'Nilgiri biosphere reserve', how_to_reach_from_hub: '16 km from Sulthan Bathery' },
        { name: 'Fourth should cap at 3', category: 'Extra', description: 'Ignored', how_to_reach_from_hub: 'N/A' },
      ],
    },
    'Pathanamthitta',
    'Wayanad',
    'Budget KSRTC & Rail'
  );

  assert.equal(normalized.travel_preference, 'Budget KSRTC & Rail');
  assert.equal(normalized.transport_steps.length, 2);
  assert.equal(isBookableStepMode(normalized.transport_steps[0].mode), 'bus');
  assert.equal(isBookableStepMode(normalized.transport_steps[1].mode), 'rail');
  assert.equal(normalized.tourist_spots.length, 3);
  assert.match(normalized.origin_nearest_hubs.railway_station, /TRVL|CNGR/);
});

test('UPI payment URI and IRCTC/KSRTC dynamic fare calculations follow exact spec', () => {
  assert.equal(UPI_MERCHANT_VPA, '7012692128@fam');

  const demoUri = buildUpiPayUri(1, 'KSM123456');
  assert.equal(
    demoUri,
    'upi://pay?pa=7012692128@fam&pn=CivicTriage%20Mobility&am=1&cu=INR&tn=Ticket-KSM123456'
  );

  const baseFare = parseBaseFareFromText('₹220 – ₹480');
  assert.equal(baseFare, 220);

  const rail2S = calculateBookingFareInr({
    channel: 'irctc',
    railClass: '2S',
    busTier: 'Super Fast',
    baseFareInr: 220,
    passengerCount: 1,
  });
  const rail3A = calculateBookingFareInr({
    channel: 'irctc',
    railClass: '3A',
    busTier: 'Super Fast',
    baseFareInr: 220,
    passengerCount: 1,
  });
  assert.ok(rail3A > rail2S);

  const busSuperFast = calculateBookingFareInr({
    channel: 'ksrtc',
    railClass: '2S',
    busTier: 'Super Fast',
    baseFareInr: 180,
    passengerCount: 2,
  });
  const busAc = calculateBookingFareInr({
    channel: 'ksrtc',
    railClass: '2S',
    busTier: 'Low Floor AC',
    baseFareInr: 180,
    passengerCount: 2,
  });
  assert.ok(busAc > busSuperFast);

  assert.equal(sanitizeUtrInput('UTR-4123 9876 5432 999'), '412398765432');
});

test('3D seat layout generator creates authentic Flight 3-3, IRCTC Berth/Chair Car, and KSRTC 2+2 cabins', () => {
  assert.equal(isBookableStepMode('Flight'), 'flight');

  const flightCabin = generateCabinLayout({
    channel: 'flight',
    railClass: '3A',
    flightClass: 'Economy',
    busTier: 'KSRTC Swift Deluxe',
  });
  assert.equal(flightCabin.seats.length, 60); // 10 rows x 6 (A-F)
  assert.ok(flightCabin.seats.some((s) => s.displayLabel === '12A - Window'));
  assert.ok(flightCabin.seats.some((s) => s.status === 'booked'));
  assert.ok(flightCabin.seats.some((s) => s.status === 'available'));

  const rail3A = generateCabinLayout({
    channel: 'irctc',
    railClass: '3A',
    flightClass: 'Economy',
    busTier: 'KSRTC Swift Deluxe',
  });
  assert.equal(rail3A.isSleeperBerth, true);
  assert.equal(rail3A.seats.length, 32); // 4 bays x 8 berths
  assert.ok(rail3A.seats.some((s) => s.berthLevel === 'Middle'));
  assert.ok(rail3A.seats.some((s) => s.berthLevel === 'Side Lower'));

  const rail2A = generateCabinLayout({
    channel: 'irctc',
    railClass: '2A',
    flightClass: 'Economy',
    busTier: 'KSRTC Swift Deluxe',
  });
  assert.equal(rail2A.seats.length, 24); // 4 bays x 6 berths (no Middle)
  assert.ok(!rail2A.seats.some((s) => s.berthLevel === 'Middle'));

  const railCC = generateCabinLayout({
    channel: 'irctc',
    railClass: 'CC / Vande Bharat EC',
    flightClass: 'Economy',
    busTier: 'KSRTC Swift Deluxe',
  });
  assert.equal(railCC.isSleeperBerth, false);
  assert.equal(railCC.seats.length, 40); // 8 rows x 5 (3+2)

  const busCabin = generateCabinLayout({
    channel: 'ksrtc',
    railClass: '3A',
    flightClass: 'Economy',
    busTier: 'KSRTC Swift Deluxe',
  });
  assert.equal(busCabin.seats.length, 36); // 9 rows x 4 (2+2)
  assert.ok(busCabin.seats.some((s) => s.displayLabel === '7A - Window'));

  const flightEco = calculateBookingFareInr({
    channel: 'flight',
    flightClass: 'Economy',
    railClass: '3A',
    busTier: 'Super Fast',
    baseFareInr: 3200,
    passengerCount: 1,
    seatSurchargeInr: 200,
  });
  const flightBiz = calculateBookingFareInr({
    channel: 'flight',
    flightClass: 'Business',
    railClass: '3A',
    busTier: 'Super Fast',
    baseFareInr: 3200,
    passengerCount: 1,
    seatSurchargeInr: 0,
  });
  assert.ok(flightBiz > flightEco);

  const chosenSeat = assignSeatCode({
    channel: 'flight',
    from: 'COK',
    to: 'BLR',
    operatorOrLine: 'IndiGo 6E',
    flightClass: 'Economy',
    railClass: '3A',
    busTier: 'Super Fast',
    seatPreference: 'Window',
    selectedSeats: ['12A - Window'],
    travelDate: '2026-12-01',
    passengerName: 'Test',
    passengerAge: 28,
    passengerCount: 1,
    baseFareInr: 3200,
  });
  assert.equal(chosenSeat, '12A - Window');
});

